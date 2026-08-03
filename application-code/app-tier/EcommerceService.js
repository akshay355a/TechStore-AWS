'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('./config/database');

let jwtSecret;

function initialize(config) {
    if (!config || typeof config.jwtSecret !== 'string' || config.jwtSecret.trim() === '') {
        throw new Error('JWT_SECRET is required to initialize the ecommerce service');
    }

    jwtSecret = config.jwtSecret;
}

function getJwtSecret() {
    if (!jwtSecret) {
        throw new Error('Ecommerce service is not initialized');
    }

    return jwtSecret;
}

// ══════════════════════════════════════════════
// AUTH SERVICE
// ══════════════════════════════════════════════

async function registerUser(name, email, password) {
    const hash = await bcrypt.hash(password, 10);
    const pool = getPool();

    return new Promise((resolve, reject) => {
        pool.query('SELECT id FROM users WHERE email = ?', [email], (error, results) => {
            if (error) return reject(error);
            if (results.length > 0) return reject(new Error('Email already registered'));

            pool.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                [name, email, hash, 'customer'],
                (insertError, result) => {
                    if (insertError) return reject(insertError);
                    const user = { id: result.insertId, name, email, role: 'customer' };
                    const token = jwt.sign(
                        { id: user.id, email, role: user.role, name },
                        getJwtSecret(),
                        { expiresIn: '24h' }
                    );
                    resolve({ user, token });
                }
            );
        });
    });
}

async function loginUser(email, password) {
    const pool = getPool();

    return new Promise((resolve, reject) => {
        pool.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
            if (error) return reject(error);
            if (results.length === 0) return reject(new Error('Invalid email or password'));

            try {
                const user = results[0];
                const valid = await bcrypt.compare(password, user.password);
                if (!valid) return reject(new Error('Invalid email or password'));

                const token = jwt.sign(
                    { id: user.id, email: user.email, role: user.role, name: user.name },
                    getJwtSecret(),
                    { expiresIn: '24h' }
                );
                resolve({
                    user: { id: user.id, name: user.name, email: user.email, role: user.role },
                    token
                });
            } catch (authError) {
                reject(authError);
            }
        });
    });
}

function verifyToken(token) {
    return jwt.verify(token, getJwtSecret());
}

// ══════════════════════════════════════════════
// PRODUCT SERVICE
// ══════════════════════════════════════════════

function getAllProducts(callback) {
    getPool().query(
        'SELECT * FROM products ORDER BY created_at DESC',
        (error, results) => callback(error, results)
    );
}

function getProductById(id, callback) {
    getPool().query('SELECT * FROM products WHERE id = ?', [id], (error, results) => {
        callback(error, results ? results[0] || null : null);
    });
}

function getProductsByCategory(category, callback) {
    getPool().query(
        'SELECT * FROM products WHERE category = ?',
        [category],
        (error, results) => callback(error, results)
    );
}

function searchProducts(query, callback) {
    getPool().query(
        'SELECT * FROM products WHERE name LIKE ? OR description LIKE ? OR category LIKE ?',
        [`%${query}%`, `%${query}%`, `%${query}%`],
        (error, results) => callback(error, results)
    );
}

function addProduct(product, callback) {
    getPool().query(
        'INSERT INTO products (name, description, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)',
        [product.name, product.description, product.price, product.stock, product.category, product.image_url],
        (error, result) => {
            if (error) return callback(error);
            callback(null, { id: result.insertId, ...product });
        }
    );
}

function updateProduct(id, updates, callback) {
    const fields = [];
    const values = [];
    ['name', 'description', 'price', 'stock', 'category', 'image_url'].forEach(key => {
        if (updates[key] !== undefined) {
            fields.push(`${key} = ?`);
            values.push(updates[key]);
        }
    });
    values.push(id);

    getPool().query(
        `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
        values,
        (error, result) => callback(error, result)
    );
}

function deleteProduct(id, callback) {
    getPool().query(
        'DELETE FROM products WHERE id = ?',
        [id],
        (error, result) => callback(error, result)
    );
}

// ══════════════════════════════════════════════
// ORDER SERVICE
// ══════════════════════════════════════════════

function rollbackOrder(connection, error, callback) {
    connection.rollback(() => {
        connection.release();
        callback(error);
    });
}

function createOrder(userId, customerEmail, customerName, shippingAddress, items, callback) {
    getPool().getConnection((connectionError, connection) => {
        if (connectionError) return callback(connectionError);

        connection.beginTransaction(transactionError => {
            if (transactionError) {
                connection.release();
                return callback(transactionError);
            }

            let totalAmount = 0;
            const itemDetails = [];

            const processItems = index => {
                if (index >= items.length) {
                    connection.query(
                        'INSERT INTO orders (user_id, customer_email, customer_name, shipping_address, total_amount, status) VALUES (?, ?, ?, ?, ?, ?)',
                        [userId, customerEmail, customerName, shippingAddress, totalAmount, 'pending'],
                        (orderError, result) => {
                            if (orderError) return rollbackOrder(connection, orderError, callback);

                            const orderId = result.insertId;
                            const insertItems = itemDetails.map(item => new Promise((resolve, reject) => {
                                connection.query(
                                    'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                                    [orderId, item.productId, item.quantity, item.price],
                                    insertError => insertError ? reject(insertError) : resolve()
                                );
                            }));

                            Promise.all(insertItems)
                                .then(() => {
                                    connection.commit(commitError => {
                                        if (commitError) {
                                            return rollbackOrder(connection, commitError, callback);
                                        }

                                        connection.release();
                                        callback(null, {
                                            order: {
                                                id: orderId,
                                                total_amount: totalAmount,
                                                status: 'pending'
                                            },
                                            items: itemDetails
                                        });
                                    });
                                })
                                .catch(insertError => rollbackOrder(connection, insertError, callback));
                        }
                    );
                    return;
                }

                const item = items[index];
                connection.query(
                    'SELECT * FROM products WHERE id = ? FOR UPDATE',
                    [item.productId],
                    (productError, results) => {
                        if (productError) return rollbackOrder(connection, productError, callback);
                        if (results.length === 0) {
                            return rollbackOrder(
                                connection,
                                new Error(`Product ${item.productId} not found`),
                                callback
                            );
                        }

                        const product = results[0];
                        if (product.stock < item.quantity) {
                            return rollbackOrder(
                                connection,
                                new Error(`Insufficient stock for ${product.name}`),
                                callback
                            );
                        }

                        connection.query(
                            'UPDATE products SET stock = stock - ? WHERE id = ?',
                            [item.quantity, item.productId],
                            updateError => {
                                if (updateError) return rollbackOrder(connection, updateError, callback);
                                totalAmount += product.price * item.quantity;
                                itemDetails.push({
                                    productId: item.productId,
                                    quantity: item.quantity,
                                    price: product.price
                                });
                                processItems(index + 1);
                            }
                        );
                    }
                );
            };

            processItems(0);
        });
    });
}

function getOrdersByUser(userId, callback) {
    getPool().query(
        'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (error, results) => callback(error, results)
    );
}

function getAllOrders(callback) {
    getPool().query(
        'SELECT * FROM orders ORDER BY created_at DESC',
        (error, results) => callback(error, results)
    );
}

function getOrderDetails(orderId, callback) {
    getPool().query('SELECT * FROM orders WHERE id = ?', [orderId], (orderError, orderResults) => {
        if (orderError) return callback(orderError);
        if (orderResults.length === 0) return callback(new Error('Order not found'));

        getPool().query(
            'SELECT oi.*, p.name as product_name, p.image_url, p.category FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
            [orderId],
            (itemError, itemResults) => {
                if (itemError) return callback(itemError);
                callback(null, { order: orderResults[0], items: itemResults });
            }
        );
    });
}

function updateOrderStatus(orderId, status, callback) {
    getPool().query(
        'UPDATE orders SET status = ? WHERE id = ?',
        [status, orderId],
        (error, result) => callback(error, result)
    );
}

module.exports = {
    initialize,
    registerUser,
    loginUser,
    verifyToken,
    getAllProducts,
    getProductById,
    getProductsByCategory,
    searchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    createOrder,
    getOrdersByUser,
    getAllOrders,
    getOrderDetails,
    updateOrderStatus
};
