'use strict';
var chai = require('chai');
var expect = require('chai').expect;
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var index = require('../../dist/index.js');

describe('atomical_decorator test', () => {
   it('success decode p2tr', async () => {
      const result = index.decorateAtomicals([
         {
            "atomical_id": "c7cfa5090640a33367a318f533ea6bd43ffd6f68ec7ecc8d4b2ecf8937ae2039i0",
            "atomical_number": 3,
            "location_info": {
               "location": "c7cfa5090640a33367a318f533ea6bd43ffd6f68ec7ecc8d4b2ecf8937ae2039i0",
               "txid": "c7cfa5090640a33367a318f533ea6bd43ffd6f68ec7ecc8d4b2ecf8937ae2039",
               "index": 0,
               "scripthash": "ad5e6bc8af0c709ad29dea38a3d5f0e96d33bb470fb5cce328b4134ea3b5812a",
               "value": 3000,
               "script": "512009034ea14147937a1fa23c8afe754170ce9ea34571aadd27e29e982d94f06b12"
            },
            "mint_info": {
               "txid": "c7cfa5090640a33367a318f533ea6bd43ffd6f68ec7ecc8d4b2ecf8937ae2039",
               "input_index": 0,
               "index": 0,
               "blockheader": "00e0012000f828de3e34665505b4062e48c26851500874e8a0c605000000000000000000819be0ce1b60d19bd918f259cbdbb28a43e982fea2c023532cfa49ace41a417c6fc327643e020617ce6b8f92",
               "blockheader_info": {
                  "bits": 386269758,
                  "merkleRoot": "7c411ae4ac49fa2c5323c0a2fe82e9438ab2dbcb59f218d99bd1601bcee09b81",
                  "nonce": 2458872782,
                  "prevHash": "00000000000000000005c6a0e87408505168c2482e06b4055566343ede28f800",
                  "timestamp": 1680327535,
                  "transactions": undefined,
                  "version": 536993792,
                  "witnessCommit": undefined,
               },
               "blockhash": "109918d838406f60e79a191a0e87006ff5ad5990504f02000000000000000000",
               "height": 783417,
               "scripthash": "ad5e6bc8af0c709ad29dea38a3d5f0e96d33bb470fb5cce328b4134ea3b5812a",
               "script": "512009034ea14147937a1fa23c8afe754170ce9ea34571aadd27e29e982d94f06b12",
               "value": 3000,
               "data": {
                  "_": {
                     "body": "776f726c64",
                     "content_length": 5,
                     "content_type": "text/plain; charset=utf-8"
                  }
               }
            },
            "state_info": {},
            "history": [
               {
                  "tx_hash": "c7cfa5090640a33367a318f533ea6bd43ffd6f68ec7ecc8d4b2ecf8937ae2039",
                  "height": 783417
               }
            ]
         }
      ]);

      expect(result).to.eql([
         {
            "atomical_id": "c7cfa5090640a33367a318f533ea6bd43ffd6f68ec7ecc8d4b2ecf8937ae2039i0",
            "atomical_number": 3,
            "location_info": {
               "location": "c7cfa5090640a33367a318f533ea6bd43ffd6f68ec7ecc8d4b2ecf8937ae2039i0",
               "txid": "c7cfa5090640a33367a318f533ea6bd43ffd6f68ec7ecc8d4b2ecf8937ae2039",
               "index": 0,
               "scripthash": "ad5e6bc8af0c709ad29dea38a3d5f0e96d33bb470fb5cce328b4134ea3b5812a",
               "value": 3000,
               "script": "512009034ea14147937a1fa23c8afe754170ce9ea34571aadd27e29e982d94f06b12",
               "address": "bc1ppyp5ag2pg7fh58az8j90ua2pwr8fag69wx4d6flzn6vzm98sdvfqg0ts4r"
            },
            "mint_info": {
               "txid": "c7cfa5090640a33367a318f533ea6bd43ffd6f68ec7ecc8d4b2ecf8937ae2039",
               "input_index": 0,
               "index": 0,
               "blockheader": "00e0012000f828de3e34665505b4062e48c26851500874e8a0c605000000000000000000819be0ce1b60d19bd918f259cbdbb28a43e982fea2c023532cfa49ace41a417c6fc327643e020617ce6b8f92",
               "blockheader_info": {
                  "bits": 386269758,
                  "merkleRoot": "7c411ae4ac49fa2c5323c0a2fe82e9438ab2dbcb59f218d99bd1601bcee09b81",
                  "nonce": 2458872782,
                  "prevHash": "00000000000000000005c6a0e87408505168c2482e06b4055566343ede28f800",
                  "timestamp": 1680327535,
                  "transactions": undefined,
                  "version": 536993792,
                  "witnessCommit": undefined,
               },
               "blockhash": "109918d838406f60e79a191a0e87006ff5ad5990504f02000000000000000000",
               "height": 783417,
               "scripthash": "ad5e6bc8af0c709ad29dea38a3d5f0e96d33bb470fb5cce328b4134ea3b5812a",
               "script": "512009034ea14147937a1fa23c8afe754170ce9ea34571aadd27e29e982d94f06b12",
               "address": "bc1ppyp5ag2pg7fh58az8j90ua2pwr8fag69wx4d6flzn6vzm98sdvfqg0ts4r",
               "value": 3000,
               "data": {
                  "_": {
                     "body": "776f726c64",
                     "content_length": 5,
                     "content_type": "text/plain; charset=utf-8"
                  }
               }
            },
            "state_info": {},
            "history": [
               {
                  "tx_hash": "c7cfa5090640a33367a318f533ea6bd43ffd6f68ec7ecc8d4b2ecf8937ae2039",
                  "height": 783417
               }
            ]
         }
      ])
   });

});
