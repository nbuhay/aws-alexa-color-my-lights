process.env.NODE_ENV='test';

const assert = require('assert');

function importTest(name, path) {
  describe(name, () => require(path));
}

describe('Mocha Tests', () => {

  describe('Testing Libraries Available', () => {
    it('chai', () => assert.ok(require('chai')));
    it('istanbul', () => assert.ok(require('istanbul')));
    it('sinon', () => assert.ok(require('sinon')));
  });

  describe('Unit Tests', () => {

    describe('color.js', () => {
      importTest('', './color');
    });

  });

});