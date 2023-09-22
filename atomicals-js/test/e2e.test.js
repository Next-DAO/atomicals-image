'use strict';
var chai = require('chai');
var expect = require('chai').expect;
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var index = require('../dist/index.js');
 
require('dotenv').config();

describe('e2e', () => {
   it('hello', async () => {
      console.log('hello')
   });
});