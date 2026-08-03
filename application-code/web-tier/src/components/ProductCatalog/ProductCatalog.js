import React, { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { productsAPI } from '../../api';
import { useCart } from '../../CartContext';
import { useToast } from '../../ToastContext';
import './ProductCatalog.css';

function ProductCatalog() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [addedIds, setAddedIds] = useState(new Set());
    const { addItem } = useCart();
    const toast = useToast();
    const history = useHistory();
    const location = useLocation();

    const categories = ['All', 'Audio', 'Drones', 'Storage', 'Monitors', 'Peripherals', 'Accessories', 'Wearables'];

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        setSearchTerm(new URLSearchParams(location.search).get('search') || '');
    }, [location.search]);

    const fetchProducts = async () => {
        try {
            const data = await productsAPI.getAll();
            setProducts(data.products);
        } catch (err) {
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = (e, product) => {
        e.stopPropagation();
        if (product.stock <= 0) return;
        addItem(product);
        setAddedIds(prev => new Set([...prev, product.id]));
        toast.success(`${product.name} added to cart`);
        setTimeout(() => {
            setAddedIds(prev => {
                const next = new Set(prev);
                next.delete(product.id);
                return next;
            });
        }, 1500);
    };

    const openProduct = product => history.push(`/products/${product.id}`);

    const handleProductKeyDown = (event, product) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openProduct(product);
        }
    };

    const filtered = products.filter(p => {
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesSearch = !searchTerm ||
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (loading) {
        return (
            <div className="page products-page">
                <div className="container">
                    <div className="grid grid-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="card" style={{ padding: 0 }}>
                                <div className="skeleton" style={{ height: 200 }} />
                                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div className="skeleton" style={{ height: 14, width: '40%' }} />
                                    <div className="skeleton" style={{ height: 18, width: '80%' }} />
                                    <div className="skeleton" style={{ height: 14, width: '100%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page products-page">
            <div className="container">
                <div className="page-top">
                    <div className="page-header">
                        <h1>Tech Gadgets</h1>
                        <p>Discover cutting-edge technology for every need</p>
                    </div>
                    <div className="search-box">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input
                            className="input"
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="category-pills mb-24">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {filtered.length > 0 && (
                    <div className="results-info">
                        Showing {filtered.length} product{filtered.length !== 1 ? 's' : ''}
                    </div>
                )}

                {filtered.length === 0 ? (
                    <div className="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <h3>No products found</h3>
                        <p>Try adjusting your search or filter criteria</p>
                    </div>
                ) : (
                    <div className="grid grid-4 stagger">
                        {filtered.map(product => (
                            <div
                                key={product.id}
                                className="card product-card"
                                role="link"
                                tabIndex="0"
                                aria-label={`View details for ${product.name}`}
                                onClick={() => openProduct(product)}
                                onKeyDown={event => handleProductKeyDown(event, product)}
                            >
                                <div className="product-image">
                                    <img
                                        src={product.image_url}
                                        alt={product.name}
                                        onError={e => { e.target.style.display = 'none'; }}
                                    />
                                    {product.stock <= 5 && product.stock > 0 && (
                                        <span className="badge badge-warning stock-badge">Low Stock</span>
                                    )}
                                    {product.stock === 0 && (
                                        <span className="badge badge-danger stock-badge">Out of Stock</span>
                                    )}
                                </div>
                                <div className="product-info">
                                    <span className="product-category">{product.category}</span>
                                    <h3 className="product-name">{product.name}</h3>
                                    <p className="product-desc">{product.description}</p>
                                </div>
                                <div className="product-footer">
                                    <div className="product-price">
                                        ${product.price.toFixed(2)}
                                    </div>
                                    <button
                                        className={`add-to-cart-btn ${addedIds.has(product.id) ? 'added' : ''}`}
                                        onClick={e => handleAddToCart(e, product)}
                                        disabled={product.stock === 0}
                                    >
                                        {addedIds.has(product.id) ? (
                                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> Added</>
                                        ) : (
                                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add to Cart</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProductCatalog;
