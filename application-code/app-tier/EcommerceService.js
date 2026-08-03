const dbcreds = require('./DbConfig');
const mysql = require('mysql');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'techstore-secret-key-change-in-production';
const useMock = !dbcreds.DB_HOST || dbcreds.DB_HOST.includes('<') || dbcreds.DB_HOST.trim() === '';

// Local JSON file paths
const usersFile = path.join(__dirname, 'data', 'users.json');
const productsFile = path.join(__dirname, 'data', 'products.json');
const ordersFile = path.join(__dirname, 'data', 'orders.json');

// ──────────────────────────────────────────────
// Mock DB Helpers
// ──────────────────────────────────────────────
function ensureDataDir() {
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJSON(filePath, defaultData) {
    ensureDataDir();
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        return defaultData;
    }
}

function writeJSON(filePath, data) {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function nextId(arr) {
    return arr.length > 0 ? Math.max(...arr.map(i => i.id)) + 1 : 1;
}

// ──────────────────────────────────────────────
// MySQL Connection (only when not mocking)
// ──────────────────────────────────────────────
let con;
if (!useMock) {
    con = mysql.createConnection({
        host: dbcreds.DB_HOST,
        user: dbcreds.DB_USER,
        password: dbcreds.DB_PWD,
        database: dbcreds.DB_DATABASE
    });
} else {
    console.log("────────────────────────────────────────────────");
    console.log("WARNING: MySQL not configured. Using local JSON database.");
    console.log("────────────────────────────────────────────────");
}

// ──────────────────────────────────────────────
// Seed default data
// ──────────────────────────────────────────────
async function seedDefaultData() {
    if (!useMock) return;

    const users = readJSON(usersFile, []);
    if (users.length === 0) {
        const hash = await bcrypt.hash('admin123', 10);
        users.push({
            id: 1,
            name: 'Admin',
            email: 'admin@techstore.com',
            password: hash,
            role: 'admin',
            created_at: new Date().toISOString()
        });
        writeJSON(usersFile, users);
        console.log("SUCCESS: Seeded default admin user (admin@techstore.com / admin123)");
    }

    const products = readJSON(productsFile, []);
    if (products.length === 0) {
        const seedProducts = [
            { id: 1, name: "Quantum Pro Wireless Earbuds", description: "Premium noise-cancelling earbuds with 40-hour battery life, spatial audio, and IPX7 waterproofing. Crystal-clear calls with AI-powered noise reduction.", price: 149.99, stock: 50, category: "Audio", image_url: "/images/earbuds.png" },
            { id: 2, name: "NexGen 4K Drone", description: "Professional-grade drone with 4K HDR camera, 45-minute flight time, obstacle avoidance, and GPS return-to-home. Perfect for aerial photography.", price: 899.99, stock: 15, category: "Drones", image_url: "/images/drone.png" },
            { id: 3, name: "HyperDrive 2TB NVMe SSD", description: "Blazing-fast 7,000 MB/s read speeds with PCIe Gen5 interface. Includes built-in heatsink for sustained performance under heavy workloads.", price: 199.99, stock: 100, category: "Storage", image_url: "/images/ssd.png" },
            { id: 4, name: "ArcLight Curved Gaming Monitor 34\"", description: "34-inch UWQHD curved display with 165Hz refresh rate, 1ms response time, HDR600, and RGB ambient lighting. Immersive gaming experience.", price: 549.99, stock: 25, category: "Monitors", image_url: "/images/monitor.png" },
            { id: 5, name: "TitanForce Mechanical Keyboard", description: "Hot-swappable mechanical keyboard with per-key RGB, aircraft-grade aluminum frame, PBT keycaps, and USB-C connectivity. Gateron Pro switches.", price: 129.99, stock: 75, category: "Peripherals", image_url: "/images/keyboard.png" },
            { id: 6, name: "VoltEdge 20000mAh Power Bank", description: "Ultra-slim power bank with 100W PD fast charging, dual USB-C ports, LED display, and airline-safe design. Charges laptops and phones simultaneously.", price: 79.99, stock: 120, category: "Accessories", image_url: "/images/powerbank.png" },
            { id: 7, name: "NeuroLink Smart Watch Ultra", description: "Advanced smartwatch with AMOLED display, blood oxygen monitoring, ECG, 14-day battery, GPS, and 100+ workout modes. Titanium body.", price: 349.99, stock: 40, category: "Wearables", image_url: "/images/smartwatch.png" },
            { id: 8, name: "PhotonX Webcam 4K", description: "Professional 4K webcam with auto-framing, low-light correction, dual stereo mics, and privacy shutter. AI-powered background blur.", price: 169.99, stock: 60, category: "Peripherals", image_url: "/images/webcam.png" }
        ];
        seedProducts.forEach(p => {
            p.created_at = new Date().toISOString();
            p.updated_at = new Date().toISOString();
        });
        writeJSON(productsFile, seedProducts);
        console.log("SUCCESS: Seeded 8 tech gadget products");
    }

    readJSON(ordersFile, { orders: [], orderItems: [] });
}

// ══════════════════════════════════════════════
// AUTH SERVICE
// ══════════════════════════════════════════════

async function registerUser(name, email, password) {
    const hash = await bcrypt.hash(password, 10);

    if (useMock) {
        const users = readJSON(usersFile, []);
        if (users.find(u => u.email === email)) {
            throw new Error('Email already registered');
        }
        const user = { id: nextId(users), name, email, password: hash, role: 'customer', created_at: new Date().toISOString() };
        users.push(user);
        writeJSON(usersFile, users);
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token };
    }

    return new Promise((resolve, reject) => {
        con.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
            if (err) return reject(err);
            if (results.length > 0) return reject(new Error('Email already registered'));
            con.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hash, 'customer'], (err, result) => {
                if (err) return reject(err);
                const user = { id: result.insertId, name, email, role: 'customer' };
                const token = jwt.sign({ id: user.id, email, role: user.role, name }, JWT_SECRET, { expiresIn: '24h' });
                resolve({ user, token });
            });
        });
    });
}

async function loginUser(email, password) {
    if (useMock) {
        const users = readJSON(usersFile, []);
        const user = users.find(u => u.email === email);
        if (!user) throw new Error('Invalid email or password');
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) throw new Error('Invalid email or password');
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token };
    }

    return new Promise((resolve, reject) => {
        con.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
            if (err) return reject(err);
            if (results.length === 0) return reject(new Error('Invalid email or password'));
            const user = results[0];
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) return reject(new Error('Invalid email or password'));
            const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
            resolve({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
        });
    });
}

function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

// ══════════════════════════════════════════════
// PRODUCT SERVICE
// ══════════════════════════════════════════════

function getAllProducts(callback) {
    if (useMock) {
        const products = readJSON(productsFile, []);
        return callback(null, products);
    }
    con.query('SELECT * FROM products ORDER BY created_at DESC', (err, results) => callback(err, results));
}

function getProductById(id, callback) {
    if (useMock) {
        const products = readJSON(productsFile, []);
        const product = products.find(p => p.id == id);
        return callback(null, product || null);
    }
    con.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => callback(err, results[0] || null));
}

function getProductsByCategory(category, callback) {
    if (useMock) {
        const products = readJSON(productsFile, []);
        const filtered = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
        return callback(null, filtered);
    }
    con.query('SELECT * FROM products WHERE category = ?', [category], (err, results) => callback(err, results));
}

function searchProducts(query, callback) {
    if (useMock) {
        const products = readJSON(productsFile, []);
        const q = query.toLowerCase();
        const filtered = products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
        );
        return callback(null, filtered);
    }
    con.query('SELECT * FROM products WHERE name LIKE ? OR description LIKE ? OR category LIKE ?',
        [`%${query}%`, `%${query}%`, `%${query}%`], (err, results) => callback(err, results));
}

function addProduct(product, callback) {
    if (useMock) {
        const products = readJSON(productsFile, []);
        const newProduct = {
            id: nextId(products),
            name: product.name,
            description: product.description,
            price: parseFloat(product.price),
            stock: parseInt(product.stock),
            category: product.category,
            image_url: product.image_url || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        products.push(newProduct);
        writeJSON(productsFile, products);
        return callback(null, newProduct);
    }
    con.query('INSERT INTO products (name, description, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?)',
        [product.name, product.description, product.price, product.stock, product.category, product.image_url],
        (err, result) => {
            if (err) return callback(err);
            callback(null, { id: result.insertId, ...product });
        });
}

function updateProduct(id, updates, callback) {
    if (useMock) {
        const products = readJSON(productsFile, []);
        const idx = products.findIndex(p => p.id == id);
        if (idx === -1) return callback(new Error('Product not found'));
        Object.assign(products[idx], updates, { updated_at: new Date().toISOString() });
        if (updates.price) products[idx].price = parseFloat(updates.price);
        if (updates.stock !== undefined) products[idx].stock = parseInt(updates.stock);
        writeJSON(productsFile, products);
        return callback(null, products[idx]);
    }
    const fields = [];
    const values = [];
    ['name', 'description', 'price', 'stock', 'category', 'image_url'].forEach(key => {
        if (updates[key] !== undefined) { fields.push(`${key} = ?`); values.push(updates[key]); }
    });
    values.push(id);
    con.query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values, (err, result) => callback(err, result));
}

function deleteProduct(id, callback) {
    if (useMock) {
        let products = readJSON(productsFile, []);
        products = products.filter(p => p.id != id);
        writeJSON(productsFile, products);
        return callback(null);
    }
    con.query('DELETE FROM products WHERE id = ?', [id], (err, result) => callback(err, result));
}

// ══════════════════════════════════════════════
// ORDER SERVICE
// ══════════════════════════════════════════════

function createOrder(userId, customerEmail, customerName, shippingAddress, items, callback) {
    if (useMock) {
        const data = readJSON(ordersFile, { orders: [], orderItems: [] });
        const products = readJSON(productsFile, []);

        let totalAmount = 0;
        const orderItemsList = [];

        for (const item of items) {
            const product = products.find(p => p.id == item.productId);
            if (!product) return callback(new Error(`Product ${item.productId} not found`));
            if (product.stock < item.quantity) return callback(new Error(`Insufficient stock for ${product.name}`));
            product.stock -= item.quantity;
            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;
            orderItemsList.push({ productId: item.productId, quantity: item.quantity, price: product.price, productName: product.name });
        }
        writeJSON(productsFile, products);

        const order = {
            id: nextId(data.orders),
            user_id: userId,
            customer_email: customerEmail,
            customer_name: customerName,
            shipping_address: shippingAddress,
            total_amount: Math.round(totalAmount * 100) / 100,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        data.orders.push(order);

        orderItemsList.forEach(oi => {
            data.orderItems.push({
                id: nextId(data.orderItems),
                order_id: order.id,
                product_id: oi.productId,
                product_name: oi.productName,
                quantity: oi.quantity,
                price: oi.price
            });
        });
        writeJSON(ordersFile, data);
        return callback(null, { order, items: orderItemsList });
    }

    // MySQL version
    con.beginTransaction(err => {
        if (err) return callback(err);
        let totalAmount = 0;
        const itemDetails = [];

        const processItems = (idx) => {
            if (idx >= items.length) {
                con.query('INSERT INTO orders (user_id, customer_email, customer_name, shipping_address, total_amount, status) VALUES (?, ?, ?, ?, ?, ?)',
                    [userId, customerEmail, customerName, shippingAddress, totalAmount, 'pending'], (err, result) => {
                        if (err) return con.rollback(() => callback(err));
                        const orderId = result.insertId;
                        const insertItems = itemDetails.map(i =>
                            new Promise((resolve, reject) => {
                                con.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                                    [orderId, i.productId, i.quantity, i.price], (err) => err ? reject(err) : resolve());
                            })
                        );
                        Promise.all(insertItems)
                            .then(() => con.commit(err => {
                                if (err) return con.rollback(() => callback(err));
                                callback(null, { order: { id: orderId, total_amount: totalAmount, status: 'pending' }, items: itemDetails });
                            }))
                            .catch(err => con.rollback(() => callback(err)));
                    });
                return;
            }

            const item = items[idx];
            con.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [item.productId], (err, results) => {
                if (err) return con.rollback(() => callback(err));
                if (results.length === 0) return con.rollback(() => callback(new Error(`Product ${item.productId} not found`)));
                const product = results[0];
                if (product.stock < item.quantity) return con.rollback(() => callback(new Error(`Insufficient stock for ${product.name}`)));

                con.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.productId], (err) => {
                    if (err) return con.rollback(() => callback(err));
                    totalAmount += product.price * item.quantity;
                    itemDetails.push({ productId: item.productId, quantity: item.quantity, price: product.price });
                    processItems(idx + 1);
                });
            });
        };
        processItems(0);
    });
}

function getOrdersByUser(userId, callback) {
    if (useMock) {
        const data = readJSON(ordersFile, { orders: [], orderItems: [] });
        const userOrders = data.orders.filter(o => o.user_id == userId);
        return callback(null, userOrders);
    }
    con.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, results) => callback(err, results));
}

function getAllOrders(callback) {
    if (useMock) {
        const data = readJSON(ordersFile, { orders: [], orderItems: [] });
        return callback(null, data.orders);
    }
    con.query('SELECT * FROM orders ORDER BY created_at DESC', (err, results) => callback(err, results));
}

function getOrderDetails(orderId, callback) {
    if (useMock) {
        const data = readJSON(ordersFile, { orders: [], orderItems: [] });
        const order = data.orders.find(o => o.id == orderId);
        if (!order) return callback(new Error('Order not found'));
        const products = readJSON(productsFile, []);
        const items = data.orderItems
            .filter(oi => oi.order_id == orderId)
            .map(item => {
                const product = products.find(p => p.id == item.product_id);
                return {
                    ...item,
                    image_url: product?.image_url || '',
                    category: product?.category || '',
                };
            });
        return callback(null, { order, items });
    }
    con.query('SELECT * FROM orders WHERE id = ?', [orderId], (err, orderResults) => {
        if (err) return callback(err);
        if (orderResults.length === 0) return callback(new Error('Order not found'));
        con.query('SELECT oi.*, p.name as product_name, p.image_url, p.category FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
            [orderId], (err, itemResults) => {
                if (err) return callback(err);
                callback(null, { order: orderResults[0], items: itemResults });
            });
    });
}

function updateOrderStatus(orderId, status, callback) {
    if (useMock) {
        const data = readJSON(ordersFile, { orders: [], orderItems: [] });
        const order = data.orders.find(o => o.id == orderId);
        if (!order) return callback(new Error('Order not found'));
        order.status = status;
        writeJSON(ordersFile, data);
        return callback(null, order);
    }
    con.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], (err, result) => callback(err, result));
}

// ══════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════

module.exports = {
    seedDefaultData,
    // Auth
    registerUser,
    loginUser,
    verifyToken,
    // Products
    getAllProducts,
    getProductById,
    getProductsByCategory,
    searchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    // Orders
    createOrder,
    getOrdersByUser,
    getAllOrders,
    getOrderDetails,
    updateOrderStatus
};
