import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { useToast } from '../../ToastContext';
import { ordersAPI } from '../../api';
import './Orders.css';

const statusBadge = (status) => {
    const map = {
        pending: 'badge-warning',
        processing: 'badge-info',
        shipped: 'badge-accent',
        delivered: 'badge-success',
        cancelled: 'badge-danger',
    };
    return map[status] || 'badge-info';
};

const formatDate = value => new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
});

function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const toast = useToast();

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const data = await ordersAPI.getAll();
                const ordersWithItems = await Promise.all(data.orders.map(async order => {
                    try {
                        const details = await ordersAPI.getById(order.id);
                        return { ...order, items: details.items || [] };
                    } catch {
                        return { ...order, items: [] };
                    }
                }));
                setOrders(ordersWithItems);
            } catch (err) {
                toast.error('Failed to load orders');
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    if (!user) return null;

    if (loading) {
        return (
            <main className="page orders-page">
                <div className="container">
                    <div className="page-header"><h1>My Orders</h1></div>
                    {[1, 2, 3].map(i => <div key={i} className="skeleton order-list-skeleton" />)}
                </div>
            </main>
        );
    }

    return (
        <main className="page orders-page">
            <div className="container orders-container">
                <div className="page-header orders-page-header">
                    <div>
                        <span className="orders-eyebrow">Purchase history</span>
                        <h1>My Orders</h1>
                        <p>Track deliveries, view order details, and access invoices.</p>
                    </div>
                    <span className="orders-count">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
                </div>

                {orders.length === 0 ? (
                    <div className="empty-state card">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <h3>No orders yet</h3>
                        <p>Your purchases and delivery updates will appear here.</p>
                        <Link to="/products" className="btn btn-primary mt-24">Start shopping</Link>
                    </div>
                ) : (
                    <div className="orders-list stagger">
                        {orders.map(order => {
                            const orderTotal = parseFloat(order.total_amount) * 1.08;
                            return (
                                <article key={order.id} className="card order-card">
                                    <header className="order-header">
                                        <div>
                                            <span className="order-id-label">Order #{order.id}</span>
                                            <span className="order-date">Placed {formatDate(order.created_at)}</span>
                                        </div>
                                        <span className={`badge ${statusBadge(order.status)}`}>{order.status}</span>
                                    </header>

                                    <div className="order-card-body">
                                        <div className="order-products-preview">
                                            {order.items.length > 0 ? order.items.slice(0, 3).map(item => (
                                                <Link to={`/products/${item.product_id}`} className="order-product-preview" key={item.id}>
                                                    <div className="order-product-image">
                                                        {item.image_url ? <img src={item.image_url} alt={item.product_name} /> : <span className="material-icons-round" aria-hidden="true">image_not_supported</span>}
                                                    </div>
                                                    <div>
                                                        <strong>{item.product_name}</strong>
                                                        <span>Qty {item.quantity} · ${parseFloat(item.price).toFixed(2)}</span>
                                                    </div>
                                                </Link>
                                            )) : (
                                                <div className="order-items-unavailable">Item details are available on the order page.</div>
                                            )}
                                            {order.items.length > 3 && <span className="more-items">+{order.items.length - 3} more items</span>}
                                        </div>

                                        <div className="order-card-summary">
                                            <div className="order-meta-item">
                                                <span className="label">Order total</span>
                                                <span className="value">${orderTotal.toFixed(2)}</span>
                                            </div>
                                            <div className="order-meta-item">
                                                <span className="label">Deliver to</span>
                                                <span className="value customer-name">{order.customer_name || user.name}</span>
                                            </div>
                                            <Link to={`/orders/${order.id}`} className="order-details-link">
                                                View order details
                                                <span className="material-icons-round" aria-hidden="true">arrow_forward</span>
                                            </Link>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}

export default Orders;
