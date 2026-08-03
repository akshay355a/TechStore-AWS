'use strict';

const { GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { createSecretsManagerClient } = require('./aws');
const logger = require('./logger');

const DATABASE_SECRET_NAME = 'cloudinv/database';
const ADMIN_SECRET_NAME = 'cloudinv/admin';

function getSecretPayload(response, secretName) {
    if (response.SecretString) {
        return response.SecretString;
    }

    if (response.SecretBinary) {
        return Buffer.from(response.SecretBinary).toString('utf8');
    }

    throw new Error(`Secret ${secretName} has no SecretString or SecretBinary value`);
}

function requireString(secret, field, secretName) {
    if (typeof secret[field] !== 'string' || secret[field].trim() === '') {
        throw new Error(`Secret ${secretName} is missing required field: ${field}`);
    }

    return secret[field];
}

async function loadSecret(secretName) {
    const client = createSecretsManagerClient();

    try {
        const response = await client.send(new GetSecretValueCommand({
            SecretId: secretName
        }));

        let parsedSecret;
        try {
            parsedSecret = JSON.parse(getSecretPayload(response, secretName));
        } catch (error) {
            throw new Error(`Secret ${secretName} must contain valid JSON: ${error.message}`);
        }

        return parsedSecret;
    } catch (error) {
        if (error.message.startsWith(`Secret ${secretName}`)) {
            throw error;
        }
        throw new Error(`Unable to load secret ${secretName} from AWS Secrets Manager: ${error.message}`);
    } finally {
        client.destroy();
    }
}

function validateDatabaseSecret(secret, requireJwtSecret) {
    const port = Number(secret.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Secret ${DATABASE_SECRET_NAME} field port must be an integer from 1 to 65535`);
    }

    const config = {
        host: requireString(secret, 'host', DATABASE_SECRET_NAME),
        username: requireString(secret, 'username', DATABASE_SECRET_NAME),
        password: requireString(secret, 'password', DATABASE_SECRET_NAME),
        database: requireString(secret, 'database', DATABASE_SECRET_NAME),
        port
    };

    if (requireJwtSecret) {
        config.jwtSecret = requireString(secret, 'JWT_SECRET', DATABASE_SECRET_NAME);
    }

    return Object.freeze(config);
}

function validateAdminSecret(secret) {
    return Object.freeze({
        email: requireString(secret, 'email', ADMIN_SECRET_NAME),
        password: requireString(secret, 'password', ADMIN_SECRET_NAME),
        name: requireString(secret, 'name', ADMIN_SECRET_NAME)
    });
}

async function loadDatabaseSecret(options = {}) {
    const requireJwtSecret = options.requireJwtSecret !== false;
    const secret = await loadSecret(DATABASE_SECRET_NAME);
    const config = validateDatabaseSecret(secret, requireJwtSecret);
    logger.info('✓ Secret loaded', { secretName: DATABASE_SECRET_NAME });
    return config;
}

async function loadAdminSecret() {
    const secret = await loadSecret(ADMIN_SECRET_NAME);
    const config = validateAdminSecret(secret);
    logger.info('✓ Secret loaded', { secretName: ADMIN_SECRET_NAME });
    return config;
}

async function loadSecrets() {
    return loadDatabaseSecret({ requireJwtSecret: true });
}

module.exports = Object.freeze({
    loadSecrets,
    loadDatabaseSecret,
    loadAdminSecret
});
