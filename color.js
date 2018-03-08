const https = require('https')
    , http = require('http')
    , qs = require('querystring')
    , fs = require('fs')
    , url = require('url')
    , path = require('path')
    , getPalette = require('get-rgba-palette')
    , getPixels = require('get-pixels')
    , rgbHex = require('rgb-hex')
    , AWS = require('aws-sdk')
    , SPOTIFY_REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN
    , SPOTIFY_ID = process.env.SPOTIFY_ID
    , SPOTIFY_SECRET = process.env.SPOTIFY_SECRET
    , LIFX_APP_TOKEN = process.env.LIFX_APP_TOKEN
    , RGB_COLOR_COUNT = process.env.RGB_COLOR_COUNT
    , RGB_QUALITY = process.env.RGB_QUALITY
    , AWS_DYNAMODB_ENDPOINT = process.env.AWS_DYNAMODB_ENDPOINT

AWS.config.update({ region: 'us-east-1', endpoint: AWS_DYNAMODB_ENDPOINT })

const dynamodb = new AWS.DynamoDB()

let SPOTIFY_ACCESS_TOKEN = process.env.SPOTIFY_ACCESS_TOKEN 
  , SPOTIFY_ALBUM_IMAGE_FILENAME
  , ARTIST
  , ALBUM

async function color() {
  console.log('color start...')
  try {

    // console.log('get Spotify access token')
    // SPOTIFY_ACCESS_TOKEN = await spotifyRefreshToken();

    console.log(`get currently playing track`)
    let currentlyPlaying = await spotifyGetCurrentlyPlaying();

    await spotifyGetAlbumImage(currentlyPlaying);

    console.log(SPOTIFY_ALBUM_IMAGE_FILENAME)
    let computeColors = await getColors(SPOTIFY_ALBUM_IMAGE_FILENAME);

    console.log('save to dynamodb')
    await awsDynamodbPutColors(computeColors);

    console.log('get album hex colors')
    let albumHexColors = await awsDynamodbGetColors();

    console.log('get all lifx lights')
    let lifxLights = await lifxGetAllLights();

    console.log('set colors')
    console.log(await lifxPutColors(albumHexColors, lifxLights));
  } catch(e) { 
    console.error(e)
  }
  console.log('color end')
}

function getUser(userId) {
  return new Promise((resolve, reject) => {
    let docClient = AWS.DynamoDB.DocumentClient()
      , params = {
          TableName: 'AlbumColorUsers',
          Key: {
            'UserId': userId
          }
        }

    docClient.get(params, (err, data) => {
      (err) ? reject(err) : resolve(data);
    })
  })
  .catch((err) => { throw new Error(`getUser: ${err}`) });
}

function spotifyRefreshToken() {
  return new Promise((resolve, reject) => {
    const basic_auth = `${SPOTIFY_ID}:${SPOTIFY_SECRET}`
        , options = {
            hostname: 'accounts.spotify.com',
            method: 'POST',
            path: '/api/token',
            headers: {
              'Authorization': `Basic ${new Buffer(basic_auth).toString('base64')}`,
              'Content-Type':  'application/x-www-form-urlencoded',
            }
          }
        , postData = {
            grant_type: 'refresh_token',
            refresh_token: SPOTIFY_REFRESH_TOKEN
          }

    let req = https.request(options, (res) => {
      let result = '';
      res
        .on('data', (chunk) => result += chunk)
        .on('end', () => {
          (res.statusCode !== 200) ?
            reject(`Spotify API error: ${JSON.parse(result).error}`) :
            resolve(JSON.parse(result).access_token);
        })
        .on('error', (err) => reject(err));
    });

    req.write(qs.stringify(postData))
    req.end();
  })
  .catch((err) => { throw new Error(`spotifyRefreshToken: ${err}`) });
}

function spotifyGetCurrentlyPlaying() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.spotify.com',
      method: 'GET',
      path: '/v1/me/player/currently-playing',
      headers: { 'Authorization': `Bearer ${SPOTIFY_ACCESS_TOKEN}` }
    }

    https.request(options, (res) => {
      let result = '';
      res
        .on('data', (chunk) => result += chunk)
        .on('end', () => {
          (res.statusCode !== 200) ?
            ((res.statusCode !== 204) ?
                reject(result) :
                reject('no song playing')) :
            resolve(JSON.parse(result));
          })
        .on('error', (err) => reject(err));
    }).end();
  })
  .catch((err) => { throw new Error(`spotifyGetCurrentlyPlaying: ${err}`) });
}

function spotifyGetAlbumImage(currentTrack) {
  return new Promise((resolve, reject) => {
    let spotify_img_url = url.parse(currentTrack.item.album.images[0].url)
    const  options = {
      hostname: spotify_img_url.hostname,
      method: 'GET',
      path: spotify_img_url.path
    }

    https.request(options, (res) => {
      ARTIST = currentTrack.item.album.artists[0].name.split(' ').join('')
      ALBUM = currentTrack.item.album.name.split(' ').join('')
      SPOTIFY_ALBUM_IMAGE_FILENAME = `${ARTIST}.${ALBUM}.jpg`
      
      let wstream = fs.createWriteStream(SPOTIFY_ALBUM_IMAGE_FILENAME)

      res
        .on('data', (chunk) => wstream.write(chunk))
        .on('end', () => {
          wstream.end();
          resolve();
        })
        .on('error', (err) => reject(err));
    }).end();
  })
  .catch((err) => { throw new Error(`spotifyGetAlbumImage: ${err}`) });
}

function getColors(spotifyAlbumImageFilename) {
  return new Promise((resolve, reject) => {

    getPixels(spotifyAlbumImageFilename, (err, pixels) => {
      if (err) reject(err);
      console.log(pixels)
      console.log(`got data ${pixels.shape.slice()}`)

      let colors = getPalette(pixels.data, parseInt(RGB_COLOR_COUNT), parseInt(RGB_QUALITY));
      console.log(`Generated Colors:  ${RGB_COLOR_COUNT}`);
      console.log(`Color Quality:  ${RGB_QUALITY}`);
      console.log(colors)
      colors = colors.map((color) => rgbHex(color[0], color[1], color[2]))
      console.log(colors)
      resolve(colors);
    })
  })
  .catch((err) => { throw new Error(`getColors: ${err}`) });
}

function awsDynamodbPutColors(colors) {
  return new Promise((resolve, reject) => {
    const colorsHex = colors.map(color => { return { S: color }})
        , params = {
            Item: {
              "Artist" : {
                S: ARTIST
              },
              "Album" : {
                S: ALBUM
              },
              "Colors": {
                L: colorsHex
              }
            },
            ReturnConsumedCapacity: "TOTAL",
            TableName: "AlbumColor"
          }

    dynamodb.putItem(params, (err, data) => (err) ? reject(err) : resolve(data))
  })
  .catch((err) => { throw new Error(`awsDynamodbPutColors: ${err}`) });
}

function awsDynamodbGetColors() {
  return new Promise((resolve, reject) => {
    const params = {
      Key: {
        "Artist": {
          S: ARTIST
        },
        "Album": {
          S: ALBUM
        }
      },
      TableName: "AlbumColor"
    }

    dynamodb.getItem(params, (err, data) => {
      (err) ?
        reject(err) :
        resolve(data.Item.Colors.L.map((hexColor) => { return hexColor.S }));
    })
  })
  .catch((err) => { throw new Error(`awsDynamodbGetColors: ${err}`) });
}

function lifxGetAllLights() {
  return new Promise((resolve, reject) => {
    const options = {
            hostname: 'api.lifx.com',
            method: 'GET',
            path: '/v1/lights/all',
            headers: { 'Authorization': `Bearer ${LIFX_APP_TOKEN}` }
          }

    https.request(options, (res) => {
      let result = '';
      res
        .on('data', (chunk) => result += chunk)
        .on('end', () => resolve(JSON.parse(result)
          .map((lifxLight) => { return lifxLight.id })))
        .on('error', (err) => reject(err))
      }).end();
  })
  .catch((err) => { throw new Error(`lifxGetAllLights: ${err}`) });
}

function lifxPutColors(albumHexColors, lifxLights) {
  lifxLights.map((lifxLight) => {
    return new Promise((resolve, reject) => {
      const options = {
              hostname: 'api.lifx.com',
              method: 'PUT',
              path: `/v1/lights/id:${lifxLight}/state`,
              headers: {
                'Authorization': `Bearer ${LIFX_APP_TOKEN}`,
                'Content-Type':  'application/json',
              }
            }
          , color = Math.floor(Math.random() * albumHexColors.length)  
          , postData = { 'color': albumHexColors[color] }

      console.log(`lifx light: ${lifxLight}: color: ${albumHexColors[color]}`)
      let req = https.request(options, (res) => {
        let result = '';
        res
          .on('data', (chunk) => result += chunk)
          .on('end', () => resolve(result))
          .on('error', (err) => reject(err));
      });

      req.write(JSON.stringify(postData))
      req.end();
    })
    .catch((err) => { throw new Error(err)})
  })
  
  return Promise.all(lifxLights)
    .catch((err) => { throw new Error(`lifxPutColors: ${err}`) });
}

module.exports = {
  color
}

/* start-test-block */
module.exports.__testonly__ =  {
  getUser: getUser,
  spotifyRefreshToken: spotifyRefreshToken,
  spotifyGetCurrentlyPlaying: spotifyGetCurrentlyPlaying,
  spotifyGetAlbumImage: spotifyGetAlbumImage,
  getColors: getColors,
  awsDynamodbPutColors: awsDynamodbPutColors,
  awsDynamodbGetColors: awsDynamodbGetColors,
  lifxGetAllLights: lifxGetAllLights,
  lifxPutColors: lifxPutColors
}
/* end-test-block */