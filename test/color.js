const https = require('https')
    , chai = require('chai')
    , assert = chai.assert
    , should = chai.should()
    , sinon = require('sinon')
    , nock = require('nock')
    , __test = require('color').__testonly__

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

    it('POST https://accounts.spotify.com/api/token', () => {
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

          // spy called with options as args
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
    
  })

  describe('#spotifyGetCurrentlyPlaying', () => {

    it('should exist', () => should.exist(__test.spotifyGetCurrentlyPlaying));
    
  })

})