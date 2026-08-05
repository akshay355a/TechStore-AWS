'use strict';

const { loadConfig } = require('../DbConfig');
const { isProduction } = require('../config/secrets');
const { loadDatabaseSecret } = require('../config/secrets');
const { initializeDatabase, getPool, closeDatabase } = require('../config/database');
const logger = require('../config/logger');

const PRODUCTS = [
    {
        name: 'Mechanical Keyboard',
        description: 'Premium RGB mechanical keyboard with Cherry MX switches, aluminum frame, and customizable backlighting. Perfect for gaming and typing enthusiasts.',
        price: 79.99,
        stock: 50,
        category: 'Accessories',
        image_url: '/images/keyboard.png'
    },
    {
        name: '4K Ultra HD Monitor',
        description: '27-inch 4K IPS display with HDR support, 144Hz refresh rate, and USB-C connectivity. Stunning visuals for work and play.',
        price: 449.99,
        stock: 25,
        category: 'Monitors',
        image_url: '/images/monitor.png'
    },
    {
        name: 'Wireless Earbuds',
        description: 'True wireless earbuds with active noise cancellation, 30-hour battery life, and premium sound quality. IPX5 water resistant.',
        price: 129.99,
        stock: 100,
        category: 'Audio',
        image_url: '/images/earbuds.png'
    },
    {
        name: 'Smart Watch Pro',
        description: 'Advanced fitness tracking smartwatch with GPS, heart rate monitor, blood oxygen sensor, and 7-day battery life. Water resistant to 50m.',
        price: 299.99,
        stock: 40,
        category: 'Wearables',
        image_url: '/images/smartwatch.png'
    },
    {
        name: 'Portable Power Bank',
        description: '20000mAh portable charger with 65W USB-C fast charging, dual ports, and LED display. Charge laptops and phones on the go.',
        price: 59.99,
        stock: 75,
        category: 'Accessories',
        image_url: '/images/powerbank.png'
    },
    {
        name: 'HD Webcam',
        description: '1080p HD webcam with auto-focus, built-in microphone, noise reduction, and adjustable ring light. Ideal for video calls and streaming.',
        price: 89.99,
        stock: 60,
        category: 'Accessories',
        image_url: '/images/webcam.png'
    },
    {
        name: 'FPV Racing Drone',
        description: 'High-performance FPV drone with 4K camera, 3-axis gimbal, 30-minute flight time, and obstacle avoidance sensors.',
        price: 599.99,
        stock: 15,
        category: 'Drones',
        image_url: '/images/drone.png'
    },
    {
        name: 'NVMe SSD 1TB',
        description: 'Ultra-fast PCIe Gen 4 NVMe solid state drive with 7000MB/s read speeds. Dramatically reduce boot and load times.',
        price: 109.99,
        stock: 80,
        category: 'Storage',
        image_url: '/images/ssd.png'
    }
];

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

async function seedProducts() {
    let databaseConfig;

    if (isProduction()) {
        databaseConfig = await loadDatabaseSecret({ requireJwtSecret: false });
    } else {
        databaseConfig = await loadConfig();
    }

    await initializeDatabase(databaseConfig);

    const existing = await query('SELECT COUNT(*) AS count FROM products');
    if (existing[0].count > 0) {
        process.stdout.write(`Products already exist (${existing[0].count} found). Skipping seed.\n`);
        return;
    }

    for (const product of PRODUCTS) {
        await query(
            'INSERT INTO products (name, description, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [product.name, product.description, product.price, product.stock, product.category, product.image_url]
        );
    }

    process.stdout.write(`${PRODUCTS.length} products seeded successfully.\n`);
}

async function main() {
    let exitCode = 0;

    try {
        await seedProducts();
    } catch (error) {
        exitCode = 1;
        logger.error('Product seed failed', { error });
    }

    try {
        await closeDatabase();
    } catch (error) {
        exitCode = 1;
        logger.error('Database cleanup after product seed failed', { error });
    }

    process.exitCode = exitCode;
}

main();
