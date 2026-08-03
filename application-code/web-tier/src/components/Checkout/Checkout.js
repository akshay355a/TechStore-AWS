import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useCart } from '../../CartContext';
import { useAuth } from '../../AuthContext';
import { useToast } from '../../ToastContext';
import { ordersAPI } from '../../api';
import './Checkout.css';

function Checkout() {
    const { items, totalPrice, clearCart } = useCart();
    const { user } = useAuth();
    const toast = useToast();
    const history = useHistory();

    const [address, setAddress] = useState({ line1: '', line2: '', city: '', state: '', zip: '' });
    const [loading, setLoading] = useState(false);
    const [orderComplete, setOrderComplete] = useState(null);

    if (!user) {
        history.push('/login');
        return null;
    }

    if (items.length === 0 && !orderComplete) {
        history.push('/cart');
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!address.line1 || !address.city || !address.state || !address.zip) {
            toast.error('Please fill in all required address fields');
            return;
        }

        setLoading(true);
        try {
            const shippingAddress = `${address.line1}${address.line2 ? ', ' + address.line2 : ''}, ${address.city}, ${address.state} ${address.zip}`;
            const orderItems = items.map(item => ({ productId: item.id, quantity: item.quantity }));
            const result = await ordersAPI.create({ shippingAddress, items: orderItems });
            setOrderComplete(result);
            clearCart();
            toast.success('Order placed successfully!');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (orderComplete) {
        return (
            <div className="page checkout-page">
                <div className="container">
                    <div className="order-success">
                        <div className="success-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <h1>Order Confirmed!</h1>
                        <p>Thank you for your purchase. Your order has been placed successfully.</p>
                        <div className="order-id">Order #{orderComplete.order.id}</div>
                        <p>Total: <strong>${orderComplete.order.total_amount.toFixed(2)}</strong></p>
                        <div className="flex justify-center gap-16 mt-32">
                            <Link to="/orders" className="btn btn-primary">View Orders</Link>
                            <Link to="/products" className="btn btn-secondary">Continue Shopping</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const tax = totalPrice * 0.08;
    const total = totalPrice + tax;

    return (
        <div className="page checkout-page">
            <div className="container">
                <div className="page-header">
                    <h1>Checkout</h1>
                    <p>Complete your order</p>
                </div>

                <form className="checkout-layout" onSubmit={handleSubmit}>
                    <div className="checkout-form">
                        <div className="card checkout-section">
                            <h3>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                Shipping Address
                            </h3>
                            <div className="flex flex-col gap-16">
                                <div className="input-group">
                                    <label>Address Line 1 *</label>
                                    <input className="input" placeholder="123 Main Street" value={address.line1} onChange={e => setAddress({ ...address, line1: e.target.value })} required />
                                </div>
                                <div className="input-group">
                                    <label>Address Line 2</label>
                                    <input className="input" placeholder="Apt, Suite, Unit (optional)" value={address.line2} onChange={e => setAddress({ ...address, line2: e.target.value })} />
                                </div>
                                <div className="form-row">
                                    <div className="input-group">
                                        <label>City *</label>
                                        <input className="input" placeholder="New York" value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} required />
                                    </div>
                                    <div className="input-group">
                                        <label>State *</label>
                                        <input className="input" placeholder="NY" value={address.state} onChange={e => setAddress({ ...address, state: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="input-group" style={{ maxWidth: 200 }}>
                                    <label>ZIP Code *</label>
                                    <input className="input" placeholder="10001" value={address.zip} onChange={e => setAddress({ ...address, zip: e.target.value })} required />
                                </div>
                            </div>
                        </div>

                        <div className="card checkout-section">
                            <h3>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                                Payment
                            </h3>
                            <div className="payment-mock">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                <strong>Mock Payment Gateway</strong>
                                <br />Payment will be simulated. No real charges will be made.
                            </div>
                        </div>
                    </div>

                    <div className="card cart-summary">
                        <h3>Order Summary</h3>
                        <div className="checkout-items-summary">
                            {items.map(item => (
                                <div key={item.id} className="checkout-item">
                                    <div className="checkout-item-thumb">
                                        <img src={item.image_url} alt={item.name} onError={e => { e.target.style.display = 'none'; }} />
                                    </div>
                                    <div className="checkout-item-info">
                                        <div className="name">{item.name}</div>
                                        <div className="qty">Qty: {item.quantity}</div>
                                    </div>
                                    <div className="checkout-item-price">${(item.price * item.quantity).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                        <div className="summary-row">
                            <span className="label">Subtotal</span>
                            <span className="value">${totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="summary-row">
                            <span className="label">Shipping</span>
                            <span className="value" style={{ color: 'var(--success)' }}>Free</span>
                        </div>
                        <div className="summary-row">
                            <span className="label">Tax</span>
                            <span className="value">${tax.toFixed(2)}</span>
                        </div>
                        <div className="summary-row total">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                        <button className="btn btn-primary btn-lg w-full mt-16" type="submit" disabled={loading}>
                            {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Checkout;
