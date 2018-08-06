#!/usr/bin/env node
'use strict';

require('colors');

var ini = require('ini');

var _require = require('iota.lib.js/lib/utils/inputValidator'),
    isTrytes = _require.isTrytes;

var _require2 = require('iota.lib.js/lib/utils/utils'),
    isValidChecksum = _require2.isValidChecksum;

var fs = require('fs');
var program = require('commander');

var _require3 = require('./field'),
    DEFAULT_OPTIONS = _require3.DEFAULT_OPTIONS,
    Field = _require3.Field;

var _require4 = require('./base'),
    DEFAULT_BASE_OPTIONS = _require4.DEFAULT_OPTIONS;

var version = require('../package.json').version;

var parseNumber = function parseNumber(v) {
  return parseInt(v);
};
var parseServers = function parseServers(val) {
  return val.split(' ');
};
var parseSeed = function parseSeed(seed) {
  if (seed && !isTrytes(seed, 81)) {
    throw new Error('Wrong seed format provided! Has to be a 81-trytes string!');
  }
  return seed;
};

var parseAddress = function parseAddress(address) {
  if (address) {
    if (!isTrytes(address, 90)) {
      throw new Error('Wrong donation address provided. Has to be a 90-trytes string (81+checksum)!');
    }
    if (!isValidChecksum(address)) {
      throw new Error('Please check your donation address: wrong checksum!');
    }
  }
  return address;
};

// TODO: write tests
program.version(version).option('-a, --address [value]', 'Optional IOTA address for donations', parseAddress, null).option('-b, --seed [value]', 'Optional IOTA seed for automatic donation address generation', parseSeed, null).option('-c, --config [value]', 'Config file path', null).option('-d, --disableIRI [value]', 'Do not allow public IRI connections through the Field', DEFAULT_OPTIONS.disableIRI).option('-f, --fieldHostname [value]', 'Hostname of the Field endpoint', parseServers, process.env.FIELD_HOSTNAME ? parseServers(process.env.FIELD_HOSTNAME) : DEFAULT_OPTIONS.fieldHostname).option('-h, --IRIHostname [value]', 'IRI API hostname', process.env.IRI_HOSTNAME || DEFAULT_OPTIONS.IRIHostname).option('-i, --IRIPort [value]', 'IRI API port', parseNumber, process.env.IRI_PORT || DEFAULT_OPTIONS.IRIPort).option('-n, --name [value]', 'Name of your node instance', DEFAULT_OPTIONS.name).option('-p, --port [value]', 'Field port', parseNumber, DEFAULT_OPTIONS.port).option('-s, --silent [value]', 'Silent', parseSeed, DEFAULT_BASE_OPTIONS.silent).option('-w, --pow [value]', 'Allow attachToTange / PoW', DEFAULT_OPTIONS.pow).option('-y, --customFieldId [value]', 'Generate a custom field ID, instead of using machine ID').parse(process.argv);

var configPath = process.env.FIELD_CONFIG || program.config;

var field = new Field(configPath ? ini.parse(fs.readFileSync(configPath, 'utf-8')).field : program);

var terminate = function terminate() {
  return field.end().then(function () {
    process.exit(0);
  });
};

process.on('SIGINT', terminate);
process.on('SIGTERM', terminate);

field.start().then(function () {
  //
});