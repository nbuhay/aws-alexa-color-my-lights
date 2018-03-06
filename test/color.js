const https = require('https')
    , chai = require('chai')
    , chaiAsPromised = require('chai-as-promised')
    , assert = chai.assert
    , should = chai.should()
    , sinon = require('sinon')
    , nock = require('nock')
    , __test = require('color').__testonly__

chai.use(chaiAsPromised);

describe('color.js', () => {

  beforeEach(() => {
    SPOTIFY_ID = process.env.SPOTIFY_ID
    SPOTIFY_SECRET = process.env.SPOTIFY_SECRET
    SPOTIFY_REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN
    sandbox = sinon.sandbox.create()
  });

  afterEach(() => sandbox.restore());

  describe('#spotifyRefreshToken', () => {

    it('should exist', () => should.exist(__test.spotifyRefreshToken))

    it('POST options for https://accounts.spotify.com/api/token', () => {
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
          , dummyResponse = { access_token: 'SPOTIFY_DUMMY_ACCESS_TOKEN' }

      let httpsReqSpy = sandbox.spy(https, 'request')

      nock('https://accounts.spotify.com')
        .post('/api/token')
        .reply(200, dummyResponse)

      return __test.spotifyRefreshToken()
        .then(() => {
          assert(httpsReqSpy.calledOnce);

          // verify spy called with options as args
          let spyPassedArgs = httpsReqSpy.firstCall.args[0];

          Object.keys(options).forEach((key) => {
            should.exist(spyPassedArgs[key]);
            if (key === 'headers') {
              Object.keys(options.headers).forEach((header) => {
                options.headers[header].should.equal(spyPassedArgs.headers[header]);
              })
            } else {
              options[key].should.equal(spyPassedArgs[key]);
            }
          })
        })
    })

    it('should throw Error when response is not 200', () => {
      const stubRes = { error: 'Test Error' }
          , expectedErrMsg = `spotifyRefreshToken: Spotify API error: ${stubRes.error}`

      // let httpsReqSpy = sandbox.spy(https, 'request')

      nock('https://accounts.spotify.com')
        .post('/api/token')
        .reply(500, stubRes)

      return __test.spotifyRefreshToken()
        .should.eventually.be.rejectedWith(expectedErrMsg);
    })

    it('should return Spotify access_token on 200', () => {
      const dummyResponse = { access_token: 'SPOTIFY_DUMMY_ACCESS_TOKEN' }

      let httpsReqSpy = sandbox.spy(https, 'request')

      nock('https://accounts.spotify.com')
        .post('/api/token')
        .reply(200, dummyResponse)

      return __test.spotifyRefreshToken().then((access_token) => 
        access_token.should.equal(dummyResponse.access_token))
    })

  })

  describe('#spotifyGetCurrentlyPlaying', () => {

    it('should exist', () => should.exist(__test.spotifyGetCurrentlyPlaying));
    
  })

})