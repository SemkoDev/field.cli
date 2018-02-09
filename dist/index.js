#!/usr/bin/env node
'use strict';

require('colors');

var ini = require('ini');
var fs = require('fs');
var program = require('commander');

var _require = require('./field'),
    DEFAULT_OPTIONS = _require.DEFAULT_OPTIONS,
    Field = _require.Field;

var _require2 = require('./base'),
    DEFAULT_BASE_OPTIONS = _require2.DEFAULT_OPTIONS;

var version = require('../package.json').version;

var parseNumber = function parseNumber(v) {
    return parseInt(v);
};

// TODO: write tests
// TODO: write README
program.version(version).option('-a, --address [value]', 'Optional IOTA address for donations', null).option('-b, --seed [value]', 'Optional IOTA seed for automatic donation address generation', null).option('-c, --config [value]', 'Config file path', null).option('-d, --disableIRI [value]', 'Do not allow public IRI connections through the Field', DEFAULT_OPTIONS.disableIRI).option('-f, --fieldHostname [value]', 'Hostname of the Field endpoint', process.env.FIELD_HOSTNAME || DEFAULT_OPTIONS.fieldHostname).option('-h, --IRIHostname [value]', 'IRI API hostname', process.env.IRI_HOSTNAME || DEFAULT_OPTIONS.IRIHostname).option('-i, --IRIPort [value]', 'IRI API port', parseNumber, process.env.IRI_PORT || DEFAULT_OPTIONS.IRIPort).option('-n, --name [value]', 'Name of your node instance', DEFAULT_OPTIONS.name).option('-p, --port [value]', 'Field port', parseNumber, DEFAULT_OPTIONS.port).option('-s, --silent [value]', 'Silent', DEFAULT_BASE_OPTIONS.silent).option('-w, --pow [value]', 'Allow attachToTange / PoW', DEFAULT_OPTIONS.pow).parse(process.argv);

var configPath = process.env.NELSON_CONFIG || program.config;

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