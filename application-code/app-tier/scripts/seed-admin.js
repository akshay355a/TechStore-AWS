'use strict';

const bcrypt = require('bcryptjs');
const { loadDatabaseSecret, loadAdminSecret, loadLocalAdminConfig, isProduction } = require('../config/secrets');
const { loadConfig } = require('../DbConfig');
const { initializeDatabase, getPool, closeDatabase } = require('../config/database');
const logger = require('../config/logger');

const BCRYPT_ROUNDS = 12;

function query(sql, values) {
    return new Promise((resolve, reject) => {
        getPool().query(sql, values, (error, results) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(results);
        });
    });
}

async function seedAdmin() {
    let databaseConfig;
    let adminConfig;

    if (isProduction()) {
        [databaseConfig, adminConfig] = await Promise.all([
            loadDatabaseSecret({ requireJwtSecret: false }),
            loadAdminSecret()
        ]);
    } else {
        databaseConfig = await loadConfig();
        adminConfig = loadLocalAdminConfig();
    }

    const passwordHash = await bcrypt.hash(adminConfig.password, BCRYPT_ROUNDS);
    await initializeDatabase(databaseConfig);

    const existingUsers = await query(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [adminConfig.email]
    );

    if (existingUsers.length > 0) {
        process.stdout.write('Admin already exists.\n');
        return;
    }

    try {
        await query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [adminConfig.name, adminConfig.email, passwordHash, 'admin']
        );
        process.stdout.write('Admin created successfully.\n');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            process.stdout.write('Admin already exists.\n');
            return;
        }
        throw error;
    }
}

async function main() {
    let exitCode = 0;

    try {
        await seedAdmin();
    } catch (error) {
        exitCode = 1;
        logger.error('Admin seed failed', { error });
    }

    try {
        await closeDatabase();
    } catch (error) {
        exitCode = 1;
        logger.error('Database cleanup after admin seed failed', { error });
    }

    process.exitCode = exitCode;
}

main();

