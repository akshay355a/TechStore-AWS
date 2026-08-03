const ecommerceService = require('./EcommerceService');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 4000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// Strip /api prefix for local development compatibility
app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) {
        req.url = req.url.replace('/api', '');
    } else if (req.url === '/api') {
        req.url = '/';
    }
    next();
});

// Serve product images statically
app.use('/images', express.static(path.join(__dirname, 'images')));

// ══════════════════════════════════════════════
// AUTH MIDDLEWARE
// ══════════════════════════════════════════════

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = ecommerceService.verifyToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

function adminMiddleware(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
}

// ══════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ══════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════

app.post('/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        const result = await ecommerceService.registerUser(name, email, password);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const result = await ecommerceService.loginUser(email, password);
        res.json(result);
    } catch (err) {
        res.status(401).json({ message: err.message });
    }
});

app.get('/auth/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

// ══════════════════════════════════════════════
// PRODUCT ROUTES (Public)
// ══════════════════════════════════════════════

app.get('/products', (req, res) => {
    const { category, search } = req.query;

    if (search) {
        return ecommerceService.searchProducts(search, (err, products) => {
            if (err) return res.status(500).json({ message: 'Error searching products', error: err.message });
            res.json({ products });
        });
    }

    if (category) {
        return ecommerceService.getProductsByCategory(category, (err, products) => {
            if (err) return res.status(500).json({ message: 'Error fetching products', error: err.message });
            res.json({ products });
        });
    }

    ecommerceService.getAllProducts((err, products) => {
        if (err) return res.status(500).json({ message: 'Error fetching products', error: err.message });
        res.json({ products });
    });
});

app.get('/products/:id', (req, res) => {
    ecommerceService.getProductById(req.params.id, (err, product) => {
        if (err) return res.status(500).json({ message: 'Error fetching product', error: err.message });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json({ product });
    });
});

// ══════════════════════════════════════════════
// PRODUCT ROUTES (Admin)
// ══════════════════════════════════════════════

app.post('/products', authMiddleware, adminMiddleware, (req, res) => {
    const { name, description, price, stock, category, image_url } = req.body;
    if (!name || !price || !category) {
        return res.status(400).json({ message: 'Name, price, and category are required' });
    }
    ecommerceService.addProduct({ name, description, price, stock: stock || 0, category, image_url }, (err, product) => {
        if (err) return res.status(500).json({ message: 'Error adding product', error: err.message });
        res.status(201).json({ product, message: 'Product added successfully' });
    });
});

app.put('/products/:id', authMiddleware, adminMiddleware, (req, res) => {
    ecommerceService.updateProduct(req.params.id, req.body, (err, product) => {
        if (err) return res.status(500).json({ message: 'Error updating product', error: err.message });
        res.json({ product, message: 'Product updated successfully' });
    });
});

app.delete('/products/:id', authMiddleware, adminMiddleware, (req, res) => {
    ecommerceService.deleteProduct(req.params.id, (err) => {
        if (err) return res.status(500).json({ message: 'Error deleting product', error: err.message });
        res.json({ message: 'Product deleted successfully' });
    });
});

// ══════════════════════════════════════════════
// ORDER ROUTES
// ══════════════════════════════════════════════

app.post('/orders', authMiddleware, (req, res) => {
    const { shippingAddress, items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Order items are required' });
    }
    if (!shippingAddress) {
        return res.status(400).json({ message: 'Shipping address is required' });
    }

    ecommerceService.createOrder(
        req.user.id,
        req.user.email,
        req.user.name,
        shippingAddress,
        items,
        (err, order) => {
            if (err) return res.status(400).json({ message: err.message });
            res.status(201).json({ ...order, message: 'Order placed successfully' });
        }
    );
});

app.get('/orders', authMiddleware, (req, res) => {
    if (req.user.role === 'admin') {
        return ecommerceService.getAllOrders((err, orders) => {
            if (err) return res.status(500).json({ message: 'Error fetching orders', error: err.message });
            res.json({ orders });
        });
    }
    ecommerceService.getOrdersByUser(req.user.id, (err, orders) => {
        if (err) return res.status(500).json({ message: 'Error fetching orders', error: err.message });
        res.json({ orders });
    });
});

app.get('/orders/:id', authMiddleware, (req, res) => {
    ecommerceService.getOrderDetails(req.params.id, (err, data) => {
        if (err) return res.status(500).json({ message: err.message });
        if (req.user.role !== 'admin' && data.order.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }
        res.json(data);
    });
});

app.put('/orders/:id/status', authMiddleware, adminMiddleware, (req, res) => {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }
    ecommerceService.updateOrderStatus(req.params.id, status, (err, order) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json({ message: 'Order status updated', order });
    });
});

// ══════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════

ecommerceService.seedDefaultData().then(() => {
    app.listen(port, () => {
        console.log(`SERVER:   TechStore API listening at http://localhost:${port}`);
        console.log(`PRODUCTS: GET  http://localhost:${port}/products`);
        console.log(`AUTH:     POST http://localhost:${port}/auth/login`);
        console.log(`HEALTH:   GET  http://localhost:${port}/health`);
    });
});
