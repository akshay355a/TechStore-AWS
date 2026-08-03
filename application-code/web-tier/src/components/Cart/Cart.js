import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../CartContext';
import { useAuth } from '../../AuthContext';
import './Cart.css';

function Cart() {
    const { items, updateQuantity, removeItem, clearCart, totalItems, totalPrice } = useCart();
    const { user } = useAuth();

    if (items.length === 0) {
        return (
            <div className="page cart-page">
                <div className="container">
                    <div className="empty-state animate-fade-in">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                        <h3>Your cart is empty</h3>
                        <p>Discover amazing tech gadgets and add them to your cart</p>
                        <Link to="/products" className="btn btn-primary mt-24">Browse Products</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page cart-page">
            <div className="container">
                <div className="page-header">
                    <h1>Shopping Cart</h1>
                    <p>{totalItems} item{totalItems !== 1 ? 's' : ''} in your cart</p>
                </div>

                <div className="cart-layout">
                    <div className="cart-items stagger">
                        {items.map(item => (
                            <div key={item.id} className="card cart-item">
                                <div className="cart-item-image">
                                    <img src={item.image_url} alt={item.name} onError={e => { e.target.style.display = 'none'; }} />
                                </div>
                                <div className="cart-item-details">
                                    <div className="cart-item-name">{item.name}</div>
                                    <div className="cart-item-category">{item.category}</div>
                                </div>
                                <div className="quantity-control">
                                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>+</button>
                                </div>
                                <div className="cart-item-price">${(item.price * item.quantity).toFixed(2)}</div>
                                <button className="cart-item-remove" onClick={() => removeItem(item.id)}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="card cart-summary animate-fade-in">
                        <h3>Order Summary</h3>
                        <div className="summary-row">
                            <span className="label">Subtotal</span>
                            <span className="value">${totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="summary-row">
                            <span className="label">Shipping</span>
                            <span className="value" style={{ color: 'var(--success)' }}>Free</span>
                        </div>
                        <div className="summary-row">
                            <span className="label">Tax (est.)</span>
                            <span className="value">${(totalPrice * 0.08).toFixed(2)}</span>
                        </div>
                        <div className="summary-row total">
                            <span>Total</span>
                            <span>${(totalPrice * 1.08).toFixed(2)}</span>
                        </div>

                        {user ? (
                            <Link to="/checkout" className="btn btn-primary btn-lg w-full">
                                Proceed to Checkout
                            </Link>
                        ) : (
                            <Link to="/login" className="btn btn-primary btn-lg w-full">
                                Sign in to Checkout
                            </Link>
                        )}
                        <button className="clear-cart-btn" onClick={clearCart}>Clear Cart</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Cart;
