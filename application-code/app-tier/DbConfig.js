'use strict';

const { loadSecrets } = require('./config/secrets');

async function loadConfig() {
    return loadSecrets();
}

module.exports = Object.freeze({
    loadConfig
});
