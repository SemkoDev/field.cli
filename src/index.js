#!/usr/bin/env node
require('colors');

const ini = require('ini');
const { isTrytes } = require('iota.lib.js/lib/utils/inputValidator');
const { isValidChecksum } = require('iota.lib.js/lib/utils/utils');
const fs = require('fs');
const program = require('commander');
const { DEFAULT_OPTIONS, Field } = require('./field');
const { DEFAULT_OPTIONS: DEFAULT_BASE_OPTIONS } = require('./base');
const version = require('../package.json').version;

const parseNumber = v => parseInt(v);
const parseServers = val => val.split(' ');
const parseSeed = seed => {
  if (seed && !isTrytes(seed, 81)) {
    throw new Error(
      'Wrong seed format provided! Has to be a 81-trytes string!'
    );
  }
  return seed;
};

const parseAddress = address => {
  if (address) {
    if (!isTrytes(address, 90)) {
      throw new Error(
        'Wrong donation address provided. Has to be a 90-trytes string (81+checksum)!'
      );
    }
    if (!isValidChecksum(address)) {
      throw new Error('Please check your donation address: wrong checksum!');
    }
  }
  return address;
};

// TODO: write tests
program
  .version(version)
  .option(
    '-a, --address [value]',
    'Optional IOTA address for donations',
    parseAddress,
    null
  )
  .option(
    '-b, --seed [value]',
    'Optional IOTA seed for automatic donation address generation',
    parseSeed,
    null
  )
  .option('-c, --config [value]', 'Config file path', null)
  .option(
    '-d, --disableIRI [value]',
    'Do not allow public IRI connections through the Field',
    DEFAULT_OPTIONS.disableIRI
  )
  .option(
    '-f, --fieldHostname [value]',
    'Hostname of the Field endpoint',
    parseServers,
    process.env.FIELD_HOSTNAME
      ? parseServers(process.env.FIELD_HOSTNAME)
      : DEFAULT_OPTIONS.fieldHostname
  )
  .option(
    '-h, --IRIHostname [value]',
    'IRI API hostname',
    process.env.IRI_HOSTNAME || DEFAULT_OPTIONS.IRIHostname
  )
  .option(
    '-i, --IRIPort [value]',
    'IRI API port',
    parseNumber,
    process.env.IRI_PORT || DEFAULT_OPTIONS.IRIPort
  )
  .option(
    '-n, --name [value]',
    'Name of your node instance',
    DEFAULT_OPTIONS.name
  )
  .option('-p, --port [value]', 'Field port', parseNumber, DEFAULT_OPTIONS.port)
  .option(
    '-s, --silent [value]',
    'Silent',
    parseSeed,
    DEFAULT_BASE_OPTIONS.silent
  )
  .option('-w, --pow [value]', 'Allow attachToTange / PoW', DEFAULT_OPTIONS.pow)
  .option(
    '-y, --customFieldId [value]',
    'Generate a custom field ID, instead of using machine ID'
  )
  .parse(process.argv);

const configPath = process.env.FIELD_CONFIG || program.config;

const field = new Field(
  configPath ? ini.parse(fs.readFileSync(configPath, 'utf-8')).field : program
);

const terminate = () =>
  field.end().then(() => {
    process.exit(0);
  });

process.on('SIGINT', terminate);
process.on('SIGTERM', terminate);

field.start().then(() => {
  //
});
