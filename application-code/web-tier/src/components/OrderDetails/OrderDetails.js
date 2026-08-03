import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { ordersAPI } from '../../api';
import './OrderDetails.css';

const TRACKING_STEPS = [
    { status: 'pending', label: 'Order placed', detail: 'We received your order' },
    { status: 'processing', label: 'Processing', detail: 'Items are being prepared' },
    { status: 'shipped', label: 'Shipped', detail: 'Your package is on the way' },
    { status: 'delivered', label: 'Delivered', detail: 'Package delivered' },
];

const formatDate = (value, options = {}) => new Date(value).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', ...options,
});

function OrderDetails() {
    const { id } = useParams();
    const { user } = useAuth();
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        window.scrollTo(0, 0);
        ordersAPI.getById(id)
            .then(data => {
                if (active) setDetails(data);
            })
            .catch(err => {
                if (active) setError(err.message || 'Unable to load order');
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [id]);

    if (!user) return null;

    if (loading) {
        return (
            <main className="page order-detail-page">
                <div className="container order-detail-container">
                    <div className="skeleton order-detail-title-skeleton" />
                    <div className="skeleton order-track-skeleton" />
                    <div className="order-detail-loading-grid">
                        <div className="skeleton" />
                        <div className="skeleton" />
                    </div>
                </div>
            </main>
        );
    }

    if (error || !details) {
        return (
            <main className="page order-detail-page">
                <div className="container order-detail-container">
                    <div className="empty-state card">
                        <h3>Order unavailable</h3>
                        <p>{error || 'We could not find this order.'}</p>
                        <Link to="/orders" className="btn btn-primary mt-24">Back to my orders</Link>
                    </div>
                </div>
            </main>
        );
    }

    const { order, items } = details;
    const subtotal = parseFloat(order.total_amount);
    const tax = subtotal * 0.08;
    const total = subtotal + tax;
    const currentStep = TRACKING_STEPS.findIndex(step => step.status === order.status);
    const isCancelled = order.status === 'cancelled';
    const estimatedDate = new Date(order.created_at);
    estimatedDate.setDate(estimatedDate.getDate() + 5);

    return (
        <main className="page order-detail-page">
            <div className="container order-detail-container">
                <nav className="order-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/orders">My orders</Link><span>/</span><span aria-current="page">Order #{order.id}</span>
                </nav>

                <header className="order-detail-header">
                    <div>
                        <span className="order-detail-eyebrow">Order details</span>
                        <h1>Order #{order.id}</h1>
                        <p>Placed on {formatDate(order.created_at)} · {items.length} item{items.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="order-header-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                            Print invoice
                        </button>
                        <span className={`order-status-pill ${order.status}`}>{order.status}</span>
                    </div>
                </header>

                <section className={`tracking-card card ${isCancelled ? 'cancelled' : ''}`}>
                    <div className="tracking-card-heading">
                        <div>
                            <span>Delivery status</span>
                            <h2>{isCancelled ? 'This order was cancelled' : order.status === 'delivered' ? 'Delivered successfully' : `Expected by ${formatDate(estimatedDate)}`}</h2>
                        </div>
                        {!isCancelled && order.status !== 'delivered' && <span className="live-status"><i /> Live tracking</span>}
                    </div>

                    {isCancelled ? (
                        <div className="cancelled-message">This order will not be processed or shipped. Contact support if you need assistance.</div>
                    ) : (
                        <div className="order-timeline">
                            {TRACKING_STEPS.map((step, index) => {
                                const complete = index <= currentStep;
                                const active = index === currentStep;
                                return (
                                    <div className={`timeline-step ${complete ? 'complete' : ''} ${active ? 'active' : ''}`} key={step.status}>
                                        <div className="timeline-marker">{complete ? <span className="material-icons-round" aria-hidden="true">check</span> : index + 1}</div>
                                        <div className="timeline-copy">
                                            <strong>{step.label}</strong>
                                            <span>{active ? step.detail : complete ? 'Completed' : 'Upcoming'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <div className="order-content-grid">
                    <div className="order-main-column">
                        <section className="card ordered-items-card">
                            <div className="order-card-title">
                                <h2>Items in this order</h2>
                                <span>{items.reduce((sum, item) => sum + item.quantity, 0)} units</span>
                            </div>
                            <div className="ordered-items-list">
                                {items.map(item => (
                                    <div className="ordered-item" key={item.id}>
                                        <Link to={`/products/${item.product_id}`} className="ordered-item-image">
                                            {item.image_url ? <img src={item.image_url} alt={item.product_name} /> : <span className="material-icons-round" aria-hidden="true">image_not_supported</span>}
                                        </Link>
                                        <div className="ordered-item-copy">
                                            {item.category && <span>{item.category}</span>}
                                            <Link to={`/products/${item.product_id}`}>{item.product_name}</Link>
                                            <small>Quantity: {item.quantity}</small>
                                        </div>
                                        <div className="ordered-item-price">
                                            <strong>${(parseFloat(item.price) * item.quantity).toFixed(2)}</strong>
                                            {item.quantity > 1 && <span>${parseFloat(item.price).toFixed(2)} each</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="card invoice-card" id="invoice">
                            <div className="invoice-heading">
                                <div>
                                    <span className="invoice-brand">TechStore</span>
                                    <h2>Invoice</h2>
                                </div>
                                <div>
                                    <strong>Invoice TS-{String(order.id).padStart(6, '0')}</strong>
                                    <span>Issued {formatDate(order.created_at)}</span>
                                </div>
                            </div>
                            <div className="invoice-parties">
                                <div><span>Billed to</span><strong>{order.customer_name}</strong><p>{order.customer_email}</p></div>
                                <div><span>Payment status</span><strong>Paid</strong><p>Demo payment gateway</p></div>
                            </div>
                            <div className="invoice-totals">
                                <div><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></div>
                                <div><span>Shipping</span><strong className="free-shipping">Free</strong></div>
                                <div><span>Tax (8%)</span><strong>${tax.toFixed(2)}</strong></div>
                                <div className="invoice-grand-total"><span>Total paid</span><strong>${total.toFixed(2)}</strong></div>
                            </div>
                        </section>
                    </div>

                    <aside className="order-side-column">
                        <section className="card detail-info-card">
                            <div className="info-card-icon material-icons-round" aria-hidden="true">location_on</div>
                            <div>
                                <h3>Delivery address</h3>
                                <strong>{order.customer_name}</strong>
                                <p>{order.shipping_address || 'No delivery address recorded'}</p>
                                <span>{order.customer_email}</span>
                            </div>
                        </section>

                        <section className="card detail-info-card">
                            <div className="info-card-icon material-icons-round" aria-hidden="true">credit_card</div>
                            <div>
                                <h3>Payment method</h3>
                                <strong>Demo payment gateway</strong>
                                <p>No real card was charged</p>
                                <span>Payment confirmed</span>
                            </div>
                        </section>

                        <section className="card order-help-card">
                            <h3>Need help?</h3>
                            <p>Get support for delivery, returns, or a problem with your order.</p>
                            <a href="mailto:support@techstore.com">Contact support <span className="material-icons-round" aria-hidden="true">arrow_forward</span></a>
                        </section>
                    </aside>
                </div>
            </div>
        </main>
    );
}

export default OrderDetails;
