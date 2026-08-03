import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { useToast } from '../../ToastContext';
import { productsAPI, ordersAPI } from '../../api';
import './Admin.css';

const statusBadge = (status) => {
    const map = { pending: 'badge-warning', processing: 'badge-info', shipped: 'badge-accent', delivered: 'badge-success', cancelled: 'badge-danger' };
    return map[status] || 'badge-info';
};

function AdminDashboard() {
    const { isAdmin } = useAuth();
    const toast = useToast();
    const [tab, setTab] = useState('products');
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', category: '', image_url: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [prodData, orderData] = await Promise.all([productsAPI.getAll(), ordersAPI.getAll()]);
            setProducts(prodData.products);
            setOrders(orderData.orders);
        } catch (err) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="page admin-page">
                <div className="container">
                    <div className="empty-state">
                        <h3>Access Denied</h3>
                        <p>You need admin privileges to access this page.</p>
                    </div>
                </div>
            </div>
        );
    }

    const openAddModal = () => {
        setEditingProduct(null);
        setForm({ name: '', description: '', price: '', stock: '', category: '', image_url: '' });
        setShowModal(true);
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setForm({
            name: product.name, description: product.description || '', price: String(product.price),
            stock: String(product.stock), category: product.category, image_url: product.image_url || ''
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.price || !form.category) {
            toast.error('Name, price, and category are required');
            return;
        }
        try {
            if (editingProduct) {
                await productsAPI.update(editingProduct.id, form);
                toast.success('Product updated');
            } else {
                await productsAPI.create(form);
                toast.success('Product added');
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this product?')) return;
        try {
            await productsAPI.delete(id);
            toast.success('Product deleted');
            fetchData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleStatusChange = async (orderId, status) => {
        try {
            await ordersAPI.updateStatus(orderId, status);
            toast.success('Order status updated');
            fetchData();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

    return (
        <div className="page admin-page">
            <div className="container">
                <div className="page-header">
                    <h1>Admin Dashboard</h1>
                    <p>Manage your store</p>
                </div>

                <div className="admin-stats stagger">
                    <div className="card stat-card">
                        <div className="stat-icon purple">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                        </div>
                        <div><div className="stat-value">{products.length}</div><div className="stat-label">Products</div></div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-icon green">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </div>
                        <div><div className="stat-value">${totalRevenue.toFixed(0)}</div><div className="stat-label">Revenue</div></div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-icon blue">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div><div className="stat-value">{orders.length}</div><div className="stat-label">Orders</div></div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-icon orange">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        </div>
                        <div><div className="stat-value">{totalStock}</div><div className="stat-label">Total Stock</div></div>
                    </div>
                </div>

                <div className="admin-tabs">
                    <button className={`admin-tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>Products</button>
                    <button className={`admin-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>Orders</button>
                </div>

                {tab === 'products' && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-16">
                            <h2 style={{ fontSize: 18 }}>Products ({products.length})</h2>
                            <button className="btn btn-primary btn-sm" onClick={openAddModal}>+ Add Product</button>
                        </div>
                        <div className="card" style={{ padding: 0 }}>
                            <div className="admin-table-wrapper">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Category</th>
                                            <th>Price</th>
                                            <th>Stock</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(p => (
                                            <tr key={p.id}>
                                                <td>
                                                    <div className="table-product-name">
                                                        <div className="table-thumb"><img src={p.image_url} alt="" onError={e => { e.target.style.display = 'none'; }} /></div>
                                                        <span>{p.name}</span>
                                                    </div>
                                                </td>
                                                <td><span className="badge badge-accent">{p.category}</span></td>
                                                <td style={{ fontWeight: 600 }}>${parseFloat(p.price).toFixed(2)}</td>
                                                <td>
                                                    <span className={`badge ${p.stock > 20 ? 'badge-success' : p.stock > 0 ? 'badge-warning' : 'badge-danger'}`}>
                                                        {p.stock}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="table-actions">
                                                        <button onClick={() => openEditModal(p)}>Edit</button>
                                                        <button className="delete" onClick={() => handleDelete(p.id)}>Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'orders' && (
                    <div className="animate-fade-in">
                        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Orders ({orders.length})</h2>
                        {orders.length === 0 ? (
                            <div className="empty-state"><h3>No orders yet</h3></div>
                        ) : (
                            <div className="card" style={{ padding: 0 }}>
                                <div className="admin-table-wrapper">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Order ID</th>
                                                <th>Customer</th>
                                                <th>Total</th>
                                                <th>Date</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.map(o => (
                                                <tr key={o.id}>
                                                    <td style={{ fontWeight: 600 }}>#{o.id}</td>
                                                    <td>
                                                        <div>{o.customer_name}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.customer_email}</div>
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>${parseFloat(o.total_amount).toFixed(2)}</td>
                                                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                        {new Date(o.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td>
                                                        <select className="status-select" value={o.status} onChange={e => handleStatusChange(o.id, e.target.value)}>
                                                            {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                                                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <h2>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
                            <div className="flex flex-col gap-16">
                                <div className="input-group">
                                    <label>Product Name *</label>
                                    <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
                                </div>
                                <div className="input-group">
                                    <label>Description</label>
                                    <textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Product description" />
                                </div>
                                <div className="form-row">
                                    <div className="input-group">
                                        <label>Price *</label>
                                        <input className="input" type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="99.99" />
                                    </div>
                                    <div className="input-group">
                                        <label>Stock</label>
                                        <input className="input" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="100" />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Category *</label>
                                    <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        <option value="">Select category</option>
                                        {['Audio', 'Drones', 'Storage', 'Monitors', 'Peripherals', 'Accessories', 'Wearables'].map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Image URL</label>
                                    <input className="input" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="/images/product.png" />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleSave}>
                                    {editingProduct ? 'Save Changes' : 'Add Product'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminDashboard;
