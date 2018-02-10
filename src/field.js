const { machineIdSync } = require('node-machine-id');
const { URL } = require('url');
const IOTA = require('iota.lib.js');
const hoxy = require('hoxy');
const request = require('request');
const { version } = require('../package.json');
const { Base } = require('./base');
const { getIP } = require('./utils');

const DEFAULT_OPTIONS = {
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

const ALLOWED_COMMANDS = [
    'getNodeInfo', 'getTips', 'findTransactions', 'getTrytes', 'getInclusionStates',
    'getBalances', 'getTransactionsToApprove', 'broadcastTransactions', 'storeTransactions',
    'attachToTangle'
];

class Field extends Base {
    constructor (options) {
        const id = machineIdSync();
        const publicId = id.slice(0, 16);
        const _cleanOpts = (options) => {
            return {
                ...options,
                port: parseInt(options.port),
                IRIPort: parseInt(options.IRIPort),
            }
        };

        super({
            ...DEFAULT_OPTIONS,
            ..._cleanOpts(options), name: options.name || `CarrIOTA Field Node #${publicId}`
        });
        this.api = (new IOTA({ host: `http://${this.opts.IRIHostname}`, port: this.opts.IRIPort })).api;
        this.proxy = null;
        this.updater = null;
        this.iriChecker = null;
        this.iriData = null;
        this.id = id;
        this.publicId = publicId;
        this.log(`Field Client v.${version}`.bold.green);
        this.log(`Field ID: ${this.id}`);
        this.log(`Public ID: ${this.publicId}`);
        if (this.opts.disableIRI) {
            this.log('Public IRI access through the Field is disabled');
        }
        this.connRefused = (reason) => {
            if (reason.code === 'ECONNREFUSED') {
                this.log(`Proxy error: IRI connection refused: http://${this.opts.IRIHostname}:${this.opts.IRIPort}`.red)
            }
        };
    }

    /**
     * Starts proxy server and regular updates and IRI checks.
     * @returns {Promise}
     */
    start () {
        // 1: Start the proxy server
        this.proxy = hoxy.createServer({
            upstreamProxy: `${this.opts.IRIHostname}:${this.opts.IRIPort}`
        }).listen(this.opts.port);
        this.proxy.intercept({
            phase: 'request',
            as: 'string'
        }, (req, resp) => {
            let json = null;
            try {
                json = JSON.parse(req.string)
            } catch (e) {
                json = {}
            }

            //!req.headers['field-ping'] && console.log('REQ', json, req.headers);

            if (!ALLOWED_COMMANDS.includes(json.command) || (json.command === 'attachToTangle' && !this.opts.pow)) {
                resp.statusCode = 400;
                resp.json = { error: `Command [${json.command}] is unknown` };
                return;
            }
            if (!this.iriData) {
                resp.statusCode = 504;
                resp.json = { error: 'iri not ready' };
                return;
            }
            if (req.headers['field-id'] !== this.id) {
                resp.statusCode = 401;
                resp.json = { error: 'wrong field id' };
                return;
            }
            if (req.headers['field-ping']) {
                resp.statusCode = 200;
                resp.json = { status: 'ok', fieldPublicId: this.opts.publicId };
            }
        });
        this.proxy.intercept({
            phase: 'response',
            as: 'json'
        }, (req, resp) => {
            resp.json.fieldPublicId = this.publicId;
            resp.json.fieldName = this.opts.name;
            resp.json.fieldVersion = version;
        });
        process.on('unhandledRejection', this.connRefused);

        // 2. Check for IRI status:
        this.iriChecker = setInterval(() => this.checkIRI(), 30000);

        // 3. Start updater
        this.updater = setInterval(() => this.sendUpdates(), 20000);

        return new Promise((resolve) => {
            this.checkIRI(resolve)
        })
    }

    /**
     * Destroys IRI and proxy server, stopping all updates.
     * @returns {Promise}
     */
    end () {
        const proxy = this.proxy;
        this.proxy = null;
        clearInterval(this.iriChecker);
        clearInterval(this.updater);

        return new Promise((resolve) => {
            proxy.close(resolve);
        })
    }

    /**
     * Returns true if the proxy and IRI are ready.
     * @returns {boolean}
     */
    isReady () {
        return !!this.proxy && !!this.iriData;
    }

    /**
     * Regular call to the IRI upstream server to check its health.
     * @param {function} callback
     */
    checkIRI (callback) {
        this.api.getNodeInfo((error, data) => {
            if (error) {
                this.log('IRI down. Retrying in 30s...'.red);
                this.iriData = null;
            } else {
                if (!this.iriData) {
                    this.log('IRI online!'.green);
                }
                this.iriData = data;
            }
            callback && callback()
        });
    }

    /**
     * Regular call to send node info to the Field Server
     */
    sendUpdates () {
        // If IRI down, do not send anything
        if (!this.iriData) {
            return
        }
        Promise.all([
            this.getAddress(),
            this.getNeighbors()
        ]).then((tokens) => {
            const address = tokens[0];
            const neighbors = tokens[1];
            const json = {
                iri: this.iriData,
                neighbors,
                field: {
                    id: this.id,
                    port: this.opts.port,
                    version,
                    name: this.opts.name,
                    disableIRI: this.opts.disableIRI,
                    pow: this.opts.pow,
                    address,
                }
            };
            request({
                url: `http://${this.opts.fieldHostname}/api/v1/update`,
                method: 'POST',
                json
            }, (err, resp, body) => {
                if (err || resp.statusCode !== 200) {
                    this.log(`Field update error to ${this.opts.fieldHostname}:`.red, resp && resp.statusCode, err && err.code, body);
                }
                //this.log('Update response:', body);
            })
        })
    }

    /**
     * Returns an address for the node donations
     * @returns {Promise<string>}
     */
    getAddress () {
        return new Promise((resolve) => {
            if (this.opts.address) {
                return resolve(this.opts.address.toUpperCase())
            }
            if (!this.opts.seed) {
                resolve(null)
            }
            this.api.getNewAddress(this.opts.seed, (err, address) => {
                resolve(err ? null : address)
            })
        })
    }

    /**
     * Returns IPs of IRI neighbors
     * @returns {Promise<string[]>}
     */
    getNeighbors () {
        return new Promise((resolve) => {
            this.api.getNeighbors((error, neighbors) => {
                if (error) {
                    this.log('Could not get IRI neighbors...'.yellow);
                    return resolve([])
                }
                Promise
                    .all(neighbors.map((n) => (new URL(`${n.connectionType}://${n.address}`)).hostname).map(getIP))
                    .then(resolve);
            });
        })
    }
}

module.exports = {
    DEFAULT_OPTIONS,
    Field
};
