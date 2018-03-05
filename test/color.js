const chai = require('chai')
    , should = chai.should()
    , color = require('color');

describe('color.js', () => {

  describe('#spotifyGetCurrentlyPlaying', () => {

    it('should exist', () => should.exist(color.__testonly__.spotifyGetCurrentlyPlaying));
    
  });

});