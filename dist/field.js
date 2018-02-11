'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('node-machine-id'),
    machineIdSync = _require.machineIdSync;

var _require2 = require('url'),
    URL = _require2.URL;

var IOTA = require('iota.lib.js');
var hoxy = require('hoxy');
var request = require('request');

var _require3 = require('../package.json'),
    version = _require3.version;

var _require4 = require('./base'),
    Base = _require4.Base;

var _require5 = require('./utils'),
    getIP = _require5.getIP;

var DEFAULT_OPTIONS = {
    name: null,
    port: 21310,
    fieldHostname: 'field.carriota.com',
    IRIHostname: 'localhost',
    IRIPort: 14265,
    logIdent: 'FIELD',
    disableIRI: false,
    pow: false,
    address: null,
    seed: null
};

var ALLOWED_COMMANDS = ['getNodeInfo', 'getTips', 'findTransactions', 'getTrytes', 'getInclusionStates', 'getBalances', 'getTransactionsToApprove', 'broadcastTransactions', 'storeTransactions', 'attachToTangle', 'wereAddressesSpentFrom', 'getMissingTransactions', 'checkConsistency'];

var Field = function (_Base) {
    _inherits(Field, _Base);

    function Field(options) {
        _classCallCheck(this, Field);

        var id = machineIdSync();
        var publicId = id.slice(0, 16);
        var _cleanOpts = function _cleanOpts(options) {
            return _extends({}, options, {
                port: parseInt(options.port),
                IRIPort: parseInt(options.IRIPort)
            });
        };

        var _this = _possibleConstructorReturn(this, (Field.__proto__ || Object.getPrototypeOf(Field)).call(this, _extends({}, DEFAULT_OPTIONS, _cleanOpts(options), { name: options.name || 'CarrIOTA Field Node #' + publicId
        })));

        _this.api = new IOTA({ host: 'http://' + _this.opts.IRIHostname, port: _this.opts.IRIPort }).api;
        _this.proxy = null;
        _this.updater = null;
        _this.iriChecker = null;
        _this.iriData = null;
        _this.id = id;
        _this.publicId = publicId;
        _this.log(('Field Client v.' + version).bold.green);
        _this.log('Field ID: ' + _this.id);
        _this.log('Public ID: ' + _this.publicId);
        if (_this.opts.disableIRI) {
            _this.log('Public IRI access through the Field is disabled');
        }
        _this.connRefused = function (reason) {
            if (reason.code === 'ECONNREFUSED') {
                _this.log(('Proxy error: IRI connection refused: http://' + _this.opts.IRIHostname + ':' + _this.opts.IRIPort).red);
            }
        };
        return _this;
    }

    /**
     * Starts proxy server and regular updates and IRI checks.
     * @returns {Promise}
     */


    _createClass(Field, [{
        key: 'start',
        value: function start() {
            var _this2 = this;

            // 1: Start the proxy server
            this.proxy = hoxy.createServer({
                upstreamProxy: this.opts.IRIHostname + ':' + this.opts.IRIPort
            }).listen(this.opts.port);
            this.proxy.intercept({
                phase: 'request',
                as: 'string'
            }, function (req, resp) {
                var json = null;
                try {
                    json = JSON.parse(req.string);
                } catch (e) {
                    json = {};
                }

                //!req.headers['field-ping'] && console.log('REQ', json, req.headers);

                if (!ALLOWED_COMMANDS.includes(json.command) || json.command === 'attachToTangle' && !_this2.opts.pow) {
                    resp.statusCode = 400;
                    resp.json = { error: 'Command [' + json.command + '] is unknown' };
                    return;
                }
                if (!_this2.iriData) {
                    resp.statusCode = 504;
                    resp.json = { error: 'iri not ready' };
                    return;
                }
                if (req.headers['field-id'] !== _this2.id) {
                    resp.statusCode = 401;
                    resp.json = { error: 'wrong field id' };
                    return;
                }
                if (req.headers['field-ping']) {
                    resp.statusCode = 200;
                    resp.json = { status: 'ok', fieldPublicId: _this2.opts.publicId };
                }
            });
            this.proxy.intercept({
                phase: 'response',
                as: 'json'
            }, function (req, resp) {
                resp.json.fieldPublicId = _this2.publicId;
                resp.json.fieldName = _this2.opts.name;
                resp.json.fieldVersion = version;
            });
            process.on('unhandledRejection', this.connRefused);

            // 2. Check for IRI status:
            this.iriChecker = setInterval(function () {
                return _this2.checkIRI();
            }, 30000);

            // 3. Start updater
            this.updater = setInterval(function () {
                return _this2.sendUpdates();
            }, 20000);

            return new Promise(function (resolve) {
                _this2.checkIRI(resolve);
            });
        }

        /**
         * Destroys IRI and proxy server, stopping all updates.
         * @returns {Promise}
         */

    }, {
        key: 'end',
        value: function end() {
            var proxy = this.proxy;
            this.proxy = null;
            clearInterval(this.iriChecker);
            clearInterval(this.updater);

            return new Promise(function (resolve) {
                proxy.close(resolve);
            });
        }

        /**
         * Returns true if the proxy and IRI are ready.
         * @returns {boolean}
         */

    }, {
        key: 'isReady',
        value: function isReady() {
            return !!this.proxy && !!this.iriData;
        }

        /**
         * Regular call to the IRI upstream server to check its health.
         * @param {function} callback
         */

    }, {
        key: 'checkIRI',
        value: function checkIRI(callback) {
            var _this3 = this;

            this.api.getNodeInfo(function (error, data) {
                if (error) {
                    _this3.log('IRI down. Retrying in 30s...'.red);
                    _this3.iriData = null;
                } else {
                    if (!_this3.iriData) {
                        _this3.log('IRI online!'.green);
                    }
                    _this3.iriData = data;
                }
                callback && callback();
            });
        }

        /**
         * Regular call to send node info to the Field Server
         */

    }, {
        key: 'sendUpdates',
        value: function sendUpdates() {
            var _this4 = this;

            // If IRI down, do not send anything
            if (!this.iriData) {
                return;
            }
            Promise.all([this.getAddress(), this.getNeighbors()]).then(function (tokens) {
                var address = tokens[0];
                var neighbors = tokens[1];
                var json = {
                    iri: _this4.iriData,
                    neighbors: neighbors,
                    field: {
                        id: _this4.id,
                        port: _this4.opts.port,
                        version: version,
                        name: _this4.opts.name,
                        disableIRI: _this4.opts.disableIRI,
                        pow: _this4.opts.pow,
                        address: address
                    }
                };
                request({
                    url: 'http://' + _this4.opts.fieldHostname + '/api/v1/update',
                    method: 'POST',
                    json: json
                }, function (err, resp, body) {
                    if (err || resp.statusCode !== 200) {
                        _this4.log(('Field update error to ' + _this4.opts.fieldHostname + ':').red, resp && resp.statusCode, err && err.code, body);
                    }
                    //this.log('Update response:', body);
                });
            });
        }

        /**
         * Returns an address for the node donations
         * @returns {Promise<string>}
         */

    }, {
        key: 'getAddress',
        value: function getAddress() {
            var _this5 = this;

            return new Promise(function (resolve) {
                if (_this5.opts.address) {
                    return resolve(_this5.opts.address.toUpperCase());
                }
                if (!_this5.opts.seed) {
                    resolve(null);
                }
                _this5.api.getNewAddress(_this5.opts.seed, { checksum: true }, function (err, address) {
                    resolve(err ? null : address);
                });
            });
        }

        /**
         * Returns IPs of IRI neighbors
         * @returns {Promise<string[]>}
         */

    }, {
        key: 'getNeighbors',
        value: function getNeighbors() {
            var _this6 = this;

            return new Promise(function (resolve) {
                _this6.api.getNeighbors(function (error, neighbors) {
                    if (error) {
                        _this6.log('Could not get IRI neighbors...'.yellow);
                        return resolve([]);
                    }
                    Promise.all(neighbors.map(function (n) {
                        return new URL(n.connectionType + '://' + n.address).hostname;
                    }).map(getIP)).then(resolve);
                });
            });
        }
    }]);

    return Field;
}(Base);

module.exports = {
    DEFAULT_OPTIONS: DEFAULT_OPTIONS,
    Field: Field
};