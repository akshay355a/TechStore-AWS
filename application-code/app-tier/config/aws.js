'use strict';

const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');

function createSecretsManagerClient() {
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
    return new SecretsManagerClient(region ? { region } : {});
}

module.exports = Object.freeze({
    createSecretsManagerClient
});
