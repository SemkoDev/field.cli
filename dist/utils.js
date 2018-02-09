'use strict';

var ip = require('ip');
var dns = require('dns');

/**
 * Resolves IP or hostname to IP. If failed, returns the input.
 * @param {string} ipOrHostName
 * @returns {Promise<string>}
 */
function getIP(ipOrHostName) {
    return new Promise(function (resolve) {
        if (ip.isV4Format(ipOrHostName) || ip.isV6Format(ipOrHostName)) {
            return resolve(ipOrHostName);
        }
        dns.resolve(ipOrHostName, 'A', function (error, results) {
            resolve(error ? ipOrHostName : results[0]);
        });
    });
}

module.exports = {
    getIP: getIP
};