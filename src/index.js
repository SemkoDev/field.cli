#!/usr/bin/env node
require('colors');

const ini = require('ini');
const fs = require('fs');
const program = require('commander');
const { DEFAULT_OPTIONS, Field } = require('./field');
const { DEFAULT_OPTIONS: DEFAULT_BASE_OPTIONS } = require('./base');
const version = require('../package.json').version;

const parseNumber = v => parseInt(v);

// TODO: write tests
// TODO: write README
program
  .version(version)
  .option('-a, --address [value]', 'Optional IOTA address for donations', null)
  .option(
    '-b, --seed [value]',
    'Optional IOTA seed for automatic donation address generation',
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
    process.env.FIELD_HOSTNAME || DEFAULT_OPTIONS.fieldHostname
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
  .option('-s, --silent [value]', 'Silent', DEFAULT_BASE_OPTIONS.silent)
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
