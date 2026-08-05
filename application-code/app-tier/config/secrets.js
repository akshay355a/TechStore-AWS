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

function isProduction() {
    return process.env.NODE_ENV === 'production';
}

function loadLocalDatabaseConfig() {
    const host = process.env.DB_HOST;
    const username = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME;
    const jwtSecret = process.env.JWT_SECRET;

    if (!host || !username || !database) {
        throw new Error(
            'Local development requires DB_HOST, DB_USER, and DB_NAME in the environment. ' +
            'Copy .env.example to .env and fill in your local values.'
        );
    }
    if (!jwtSecret) {
        throw new Error(
            'JWT_SECRET is required. Set it in your .env file.'
        );
    }

    const port = Number(process.env.DB_PORT || 3306);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('DB_PORT must be an integer from 1 to 65535');
    }

    logger.info('✓ Using local database configuration (development mode)');
    return Object.freeze({ host, username, password: password || '', database, port, jwtSecret });
}

function loadLocalAdminConfig() {
    return Object.freeze({
        email: process.env.ADMIN_EMAIL || 'admin@techstore.com',
        password: process.env.ADMIN_PASSWORD || 'Admin123',
        name: process.env.ADMIN_NAME || 'Administrator'
    });
}

async function loadSecrets() {
    if (!isProduction()) {
        return loadLocalDatabaseConfig();
    }
    return loadDatabaseSecret({ requireJwtSecret: true });
}

module.exports = Object.freeze({
    loadSecrets,
    loadDatabaseSecret,
    loadAdminSecret,
    loadLocalAdminConfig,
    isProduction
});
