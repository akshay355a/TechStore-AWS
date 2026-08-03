import React, { useEffect, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { useCart } from '../../CartContext';
import './Navbar.css';

function Navbar() {
    const { user, logout, isAdmin } = useAuth();
    const { totalItems } = useCart();
    const location = useLocation();
    const history = useHistory();
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const isActive = path => location.pathname === path || (path !== '/' && location.pathname.startsWith(`${path}/`)) ? 'active' : '';

    useEffect(() => {
        setMenuOpen(false);
        if (location.pathname.startsWith('/products')) {
            setSearchQuery(new URLSearchParams(location.search).get('search') || '');
        }
    }, [location.pathname, location.search]);

    const handleSearch = event => {
        event.preventDefault();
        const query = searchQuery.trim();
        history.push(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
    };

    return (
        <header className="navbar">
            <div className="navbar-inner">
                <Link to="/" className="navbar-brand" aria-label="TechStore home">
                    <span className="brand-mark">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                    </span>
                    <span className="brand-name">TechStore</span>
                </Link>

                <form className="navbar-search" role="search" onSubmit={handleSearch}>
                    <span className="material-icons-round" aria-hidden="true">search</span>
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={event => setSearchQuery(event.target.value)}
                        placeholder="Search products, categories, and more"
                        aria-label="Search the TechStore catalog"
                    />

                </form>

                <button
                    className={`mobile-menu-toggle ${menuOpen ? 'open' : ''}`}
                    type="button"
                    aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    aria-expanded={menuOpen}
                    aria-controls="primary-navigation"
                    onClick={() => setMenuOpen(open => !open)}
                >
                    <span />
                    <span />
                    <span />
                </button>

                <nav id="primary-navigation" className={`navbar-links ${menuOpen ? 'open' : ''}`} aria-label="Primary navigation">
                    <Link to="/" className={isActive('/')}>
                        <span className="material-icons-round" aria-hidden="true">home</span>
                        <span>Home</span>
                    </Link>
                    <Link to="/products" className={isActive('/products')}>
                        <span className="material-icons-round" aria-hidden="true">inventory_2</span>
                        <span>Products</span>
                    </Link>

                    {user && (
                        <Link to="/orders" className={isActive('/orders')}>
                            <span className="material-icons-round" aria-hidden="true">receipt_long</span>
                            <span>Orders</span>
                        </Link>
                    )}

                    {isAdmin && (
                        <Link to="/admin" className={isActive('/admin')}>
                            <span className="material-icons-round" aria-hidden="true">dashboard</span>
                            <span>Admin</span>
                        </Link>
                    )}

                    <Link to="/cart" className={`${isActive('/cart')} cart-badge`}>
                        <span className="material-icons-round" aria-hidden="true">shopping_cart</span>
                        <span>Cart</span>
                        {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
                    </Link>

                    {user ? (
                        <>
                            <div className="user-menu" title="Signed-in profile">
                                <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                                <span className="user-copy"><small>Profile</small><strong>{user.name}</strong></span>
                            </div>
                            <button className="logout-button" type="button" onClick={logout}>
                                <span className="material-icons-round" aria-hidden="true">logout</span>
                                <span>Logout</span>
                            </button>
                        </>
                    ) : (
                        <Link to="/login" className="login-link">
                            <span className="material-icons-round" aria-hidden="true">person</span>
                            <span>Log in</span>
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
}

export default Navbar;
