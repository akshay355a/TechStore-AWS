import React, { useState, useEffect, useCallback } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { productsAPI } from '../../api';
import { useCart } from '../../CartContext';
import { useToast } from '../../ToastContext';
import './Home.css';

const CATEGORIES = [
    { name: 'All', icon: 'apps' },
    { name: 'Audio', icon: 'headset' },
    { name: 'Drones', icon: 'flight' },
    { name: 'Storage', icon: 'storage' },
    { name: 'Monitors', icon: 'desktop_windows' },
    { name: 'Peripherals', icon: 'keyboard' },
    { name: 'Accessories', icon: 'battery_charging_full' },
    { name: 'Wearables', icon: 'watch' },
];

function Home() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [sort, setSort] = useState('default');
    const [bannerIdx, setBannerIdx] = useState(0);
    const [addedIds, setAddedIds] = useState(new Set());
    const { addItem } = useCart();
    const toast = useToast();
    const history = useHistory();

    useEffect(() => {
        productsAPI.getAll()
            .then(data => setProducts(data.products))
            .catch(() => toast.error('Failed to load products'))
            .finally(() => setLoading(false));
    }, []);

    // Auto-rotate banner
    useEffect(() => {
        const timer = setInterval(() => setBannerIdx(i => (i + 1) % 3), 5000);
        return () => clearInterval(timer);
    }, []);

    const handleAdd = useCallback((e, product) => {
        e.stopPropagation();
        if (product.stock <= 0) return;
        addItem(product);
        setAddedIds(prev => new Set([...prev, product.id]));
        toast.success(`${product.name} added to cart`);
        setTimeout(() => {
            setAddedIds(prev => { const n = new Set(prev); n.delete(product.id); return n; });
        }, 1500);
    }, [addItem, toast]);

    const openProduct = product => history.push(`/products/${product.id}`);

    const handleProductKeyDown = (event, product) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openProduct(product);
        }
    };

    // Filter + sort
    let filtered = products.filter(p => {
        const catMatch = category === 'All' || p.category === category;
        const searchMatch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
        return catMatch && searchMatch;
    });

    if (sort === 'price-low') filtered = [...filtered].sort((a, b) => a.price - b.price);
    else if (sort === 'price-high') filtered = [...filtered].sort((a, b) => b.price - a.price);
    else if (sort === 'name') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

    // Pick 4 "deals" (just the first 4 products with fake discount)
    const deals = products.slice(0, 4);
    const dealDiscount = product => 10 + ((Number(product.id) || 1) * 7 % 20);

    return (
        <div className="page" style={{ paddingTop: 'var(--nav-height)' }}>

            {/* ══ BANNER CAROUSEL ══ */}
            <div className="banner-carousel">
                <div className={`banner-slide banner-slide-1 ${bannerIdx === 0 ? 'active' : ''}`}>
                    <div className="banner-text">
                        <span className="banner-tag"><span className="material-icons-round" aria-hidden="true">local_fire_department</span> Hot Deals</span>
                        <h2>Summer Tech Sale</h2>
                        <p>Up to 30% off on audio gear, drones, and wearables. Limited time only.</p>
                        <button className="btn btn-primary" onClick={() => setCategory('Audio')}>Shop Audio <span className="material-icons-round" aria-hidden="true">arrow_forward</span></button>
                    </div>
                    <div className="banner-visual banner-visual-audio" aria-hidden="true">
                        <div className="visual-ring visual-ring-outer" />
                        <div className="visual-ring visual-ring-inner" />
                        <img className="visual-product" src="/images/earbuds.png" alt="" />
                        <span className="visual-float visual-float-one">30% OFF</span>
                        <span className="visual-float visual-float-two">Immersive sound</span>
                    </div>
                </div>
                <div className={`banner-slide banner-slide-2 ${bannerIdx === 1 ? 'active' : ''}`}>
                    <div className="banner-text">
                        <span className="banner-tag"><span className="material-icons-round" aria-hidden="true">auto_awesome</span> New Arrival</span>
                        <h2>ArcLight Curved Monitor</h2>
                        <p>34" UWQHD, 165Hz, HDR600 — the ultimate gaming display is here.</p>
                        <button className="btn btn-primary" onClick={() => setCategory('Monitors')}>Shop Monitors <span className="material-icons-round" aria-hidden="true">arrow_forward</span></button>
                    </div>
                    <div className="banner-visual banner-visual-monitor" aria-hidden="true">
                        <div className="visual-ring visual-ring-outer" />
                        <div className="visual-ring visual-ring-inner" />
                        <img className="visual-product" src="/images/monitor.png" alt="" />
                        <span className="visual-float visual-float-one">165 HZ</span>
                        <span className="visual-float visual-float-two">Ultra-wide</span>
                    </div>
                </div>
                <div className={`banner-slide banner-slide-3 ${bannerIdx === 2 ? 'active' : ''}`}>
                    <div className="banner-text">
                        <span className="banner-tag"><span className="material-icons-round" aria-hidden="true">rocket_launch</span> Best Seller</span>
                        <h2>NeuroLink Smart Watch</h2>
                        <p>AMOLED, ECG, 14-day battery — your health companion on your wrist.</p>
                        <button className="btn btn-primary" onClick={() => setCategory('Wearables')}>Shop Wearables <span className="material-icons-round" aria-hidden="true">arrow_forward</span></button>
                    </div>
                    <div className="banner-visual banner-visual-watch" aria-hidden="true">
                        <div className="visual-ring visual-ring-outer" />
                        <div className="visual-ring visual-ring-inner" />
                        <img className="visual-product" src="/images/smartwatch.png" alt="" />
                        <span className="visual-float visual-float-one">14 DAYS</span>
                        <span className="visual-float visual-float-two">Health insights</span>
                    </div>
                </div>
                <button className="banner-arrow left" aria-label="Previous promotion" onClick={() => setBannerIdx(i => (i - 1 + 3) % 3)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button className="banner-arrow right" aria-label="Next promotion" onClick={() => setBannerIdx(i => (i + 1) % 3)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <div className="banner-dots">
                    {[0, 1, 2].map(i => (
                        <button key={i} aria-label={`Show promotion ${i + 1}`} className={`banner-dot ${bannerIdx === i ? 'active' : ''}`} onClick={() => setBannerIdx(i)} />
                    ))}
                </div>
            </div>

            <div className="container">
                <div className="trust-strip" aria-label="Store benefits">
                    <div><span className="trust-icon material-icons-round" aria-hidden="true">verified</span><span><strong>Curated tech</strong><small>Only products we love</small></span></div>
                    <div><span className="trust-icon material-icons-round" aria-hidden="true">local_shipping</span><span><strong>Free shipping</strong><small>On every order</small></span></div>
                    <div><span className="trust-icon material-icons-round" aria-hidden="true">assignment_return</span><span><strong>Easy returns</strong><small>30-day guarantee</small></span></div>
                    <div><span className="trust-icon material-icons-round" aria-hidden="true">shield</span><span><strong>Secure checkout</strong><small>Your data stays safe</small></span></div>
                </div>

                {/* ══ DEALS OF THE DAY ══ */}
                <section className="store-section">
                    <div className="section-bar">
                        <h2>
                            <span className="section-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }}>
                                <span className="material-icons-round" aria-hidden="true">bolt</span>
                            </span>
                            Deals of the Day
                        </h2>
                    </div>
                    <div className="deal-scroll">
                        {deals.map(p => (
                            <div
                                key={p.id}
                                className="card deal-card"
                                role="link"
                                tabIndex="0"
                                aria-label={`View ${p.name}`}
                                onClick={() => openProduct(p)}
                                onKeyDown={event => handleProductKeyDown(event, p)}
                            >
                                <div className="deal-img">
                                    <img src={p.image_url} alt={p.name} onError={e => { e.target.style.display = 'none'; }} />
                                    <span className="deal-discount">{dealDiscount(p)}% OFF</span>
                                </div>
                                <div className="deal-body">
                                    <div className="deal-name">{p.name}</div>
                                    <div className="deal-prices">
                                        <span className="deal-price">${p.price.toFixed(2)}</span>
                                        <span className="deal-original">${(p.price * 1.3).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ══ CATEGORY STRIP ══ */}
                <div className="category-strip">
                    <div className="category-strip-inner">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.name}
                                className={`cat-chip ${category === cat.name ? 'active' : ''}`}
                                onClick={() => setCategory(cat.name)}
                            >
                                <span className="material-icons-round cat-chip-icon" aria-hidden="true">{cat.icon}</span>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══ ALL PRODUCTS ══ */}
                <section className="store-section">
                    <div className="section-bar">
                        <h2>
                            <span className="section-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                                                            <span className="material-icons-round" aria-hidden="true">inventory_2</span>
                                                        </span>
                            {category === 'All' ? 'All Products' : category}
                        </h2>
                        <span className="results-count">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="products-toolbar">
                        <div className="search-wrapper">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input className="input" aria-label="Search products" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <select className="sort-select" aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}>
                            <option value="default">Sort by: Relevance</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="name">Name: A-Z</option>
                        </select>
                    </div>

                    {loading ? (
                        <div className="grid grid-4">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="card" style={{ padding: 0 }}>
                                    <div className="skeleton" style={{ height: 190, borderRadius: '16px 16px 0 0' }} />
                                    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div className="skeleton" style={{ height: 12, width: '30%' }} />
                                        <div className="skeleton" style={{ height: 16, width: '80%' }} />
                                        <div className="skeleton" style={{ height: 12, width: '100%' }} />
                                        <div className="skeleton" style={{ height: 12, width: '60%' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="empty-state">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <h3>No products found</h3>
                            <p>Try a different search term or category</p>
                        </div>
                    ) : (
                        <div className="grid grid-4 stagger">
                            {filtered.map(product => (
                                <div
                                    key={product.id}
                                    className="card product-tile"
                                    role="link"
                                    tabIndex="0"
                                    aria-label={`View details for ${product.name}`}
                                    onClick={() => openProduct(product)}
                                    onKeyDown={event => handleProductKeyDown(event, product)}
                                >
                                    <div className="tile-img">
                                        <img src={product.image_url} alt={product.name} onError={e => { e.target.style.display = 'none'; }} />
                                        {product.stock <= 5 && product.stock > 0 && <span className="badge badge-warning tile-stock-badge">Low Stock</span>}
                                        {product.stock === 0 && <span className="badge badge-danger tile-stock-badge">Out of Stock</span>}
                                    </div>
                                    <div className="tile-body">
                                        <span className="tile-category">{product.category}</span>
                                        <h3 className="tile-name">{product.name}</h3>
                                        <p className="tile-desc">{product.description}</p>
                                        <div className="tile-footer">
                                            <span className="tile-price">${product.price.toFixed(2)}</span>
                                            <button
                                                className={`tile-add-btn ${addedIds.has(product.id) ? 'added' : ''}`}
                                                onClick={e => handleAdd(e, product)}
                                                disabled={product.stock === 0}
                                            >
                                                {addedIds.has(product.id) ? (
                                                    <><span className="material-icons-round" aria-hidden="true">check</span> Added</>
                                                ) : (
                                                    <>+ Add</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ══ FOOTER ══ */}
                <footer className="store-footer">
                    <div className="footer-grid">
                        <div>
                            <div className="footer-brand">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                                <span>TechStore</span>
                            </div>
                            <p className="footer-about">Your destination for premium tech gadgets. Quality products, free shipping, and support you can count on.</p>
                        </div>
                        <div className="footer-col">
                            <h4>Shop</h4>
                            {['Audio', 'Monitors', 'Wearables', 'Drones', 'Storage'].map(c => (
                                <a href="#!" key={c} onClick={e => { e.preventDefault(); setCategory(c); window.scrollTo(0, 0); }}>{c}</a>
                            ))}
                        </div>
                        <div className="footer-col">
                            <h4>Account</h4>
                            <Link to="/login">Sign In</Link>
                            <Link to="/signup">Create Account</Link>
                            <Link to="/orders">Order History</Link>
                            <Link to="/cart">Cart</Link>
                        </div>
                        <div className="footer-col">
                            <h4>Support</h4>
                            <a href="#!">FAQ</a>
                            <a href="#!">Shipping Info</a>
                            <a href="#!">Returns</a>
                            <a href="#!">Contact Us</a>
                        </div>
                    </div>
                    <div className="footer-bottom-bar">
                        <span>© 2026 TechStore. All rights reserved.</span>
                        <span>Privacy Policy · Terms of Service</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default Home;