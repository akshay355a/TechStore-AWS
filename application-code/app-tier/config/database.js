'use strict';

const fs = require('fs');
const mysql = require('mysql2');
const logger = require('./logger');

let pool;

function getPositiveIntegerEnvironmentValue(name, defaultValue) {
    if (process.env[name] === undefined) {
        return defaultValue;
    }

    const value = Number(process.env[name]);
    if (!Number.isInteger(value) || value < 1) {
        throw new Error(`${name} must be a positive integer`);
    }

    return value;
}

function loadRdsCaBundle() {
    const bundlePath = process.env.RDS_CA_BUNDLE_PATH;
    if (!bundlePath) {
        throw new Error('RDS_CA_BUNDLE_PATH is required');
    }

    try {
        return fs.readFileSync(bundlePath, 'utf8');
    } catch (error) {
        throw new Error(`Unable to read the RDS CA bundle: ${error.message}`);
    }
}

function getConnection(databasePool) {
    return new Promise((resolve, reject) => {
        databasePool.getConnection((error, connection) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(connection);
        });
    });
}

function ping(connection) {
    return new Promise((resolve, reject) => {
        connection.ping(error => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

function endPool(databasePool) {
    return new Promise((resolve, reject) => {
        databasePool.end(error => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

async function initializeDatabase(config) {
    if (pool) {
        throw new Error('Database pool has already been initialized');
    }

    const connectionLimit = getPositiveIntegerEnvironmentValue('DB_CONNECTION_LIMIT', 10);

    const poolOptions = {
        host: config.host,
        user: config.username,
        password: config.password,
        database: config.database,
        port: config.port,
        connectionLimit,
        waitForConnections: true,
        queueLimit: 0,
        connectTimeout: 10000,
        acquireTimeout: 10000,
        charset: 'utf8mb4',
        timezone: 'Z',
        multipleStatements: false
    };

    if (process.env.NODE_ENV === 'production') {
        const rdsCaBundle = loadRdsCaBundle();
        poolOptions.ssl = {
            ca: rdsCaBundle,
            rejectUnauthorized: true
        };
    }

    const candidatePool = mysql.createPool(poolOptions);

    candidatePool.on('error', error => {
        logger.error('Unexpected database pool error', { error });
    });

    let connection;
    try {
        connection = await getConnection(candidatePool);
        await ping(connection);
        pool = candidatePool;
        logger.info('✓ Database connected', { connectionLimit });
        return pool;
    } catch (error) {
        if (connection) {
            connection.release();
            connection = undefined;
        }
        await endPool(candidatePool).catch(() => undefined);
        throw new Error(`Unable to connect to the RDS MySQL database: ${error.message}`);
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

function getPool() {
    if (!pool) {
        throw new Error('Database pool is not initialized');
    }

    return pool;
}

async function closeDatabase() {
    if (!pool) {
        return;
    }

    const activePool = pool;
    pool = undefined;
    await endPool(activePool);
    logger.info('Database pool closed');
}

module.exports = Object.freeze({
    initializeDatabase,
    getPool,
    closeDatabase
});
