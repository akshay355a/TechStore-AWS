import React, { useEffect, useMemo, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { productsAPI } from '../../api';
import { useCart } from '../../CartContext';
import { useToast } from '../../ToastContext';
import './ProductDetails.css';

const CATEGORY_SPECS = {
    Audio: [
        ['Connectivity', 'Bluetooth 5.3'],
        ['Battery life', 'Up to 40 hours'],
        ['Noise cancellation', 'Adaptive ANC'],
        ['Water resistance', 'IPX7'],
        ['Charging', 'USB-C fast charging'],
    ],
    Drones: [
        ['Camera', '4K HDR stabilized camera'],
        ['Flight time', 'Up to 45 minutes'],
        ['Range', '10 km transmission'],
        ['Navigation', 'GPS with return-to-home'],
        ['Safety', 'Omnidirectional obstacle sensing'],
    ],
    Storage: [
        ['Capacity', '2 TB'],
        ['Interface', 'PCIe Gen 5 NVMe'],
        ['Read speed', 'Up to 7,000 MB/s'],
        ['Form factor', 'M.2 2280'],
        ['Cooling', 'Integrated heatsink'],
    ],
    Monitors: [
        ['Display', '34-inch UWQHD curved panel'],
        ['Resolution', '3440 × 1440'],
        ['Refresh rate', '165 Hz'],
        ['Response time', '1 ms'],
        ['HDR', 'DisplayHDR 600'],
    ],
    Peripherals: [
        ['Connection', 'USB-C'],
        ['Compatibility', 'Windows, macOS, and Linux'],
        ['Construction', 'Premium aluminum body'],
        ['Software support', 'Plug-and-play setup'],
        ['In the box', 'Device, cable, and quick-start guide'],
    ],
    Accessories: [
        ['Capacity', '20,000 mAh'],
        ['Output', '100W USB-C PD'],
        ['Ports', '2 × USB-C, 1 × USB-A'],
        ['Display', 'Digital battery indicator'],
        ['Travel rating', 'Airline safe'],
    ],
    Wearables: [
        ['Display', 'Always-on AMOLED'],
        ['Battery life', 'Up to 14 days'],
        ['Health sensors', 'ECG, SpO₂, and heart rate'],
        ['Navigation', 'Built-in GPS'],
        ['Water resistance', '5 ATM'],
    ],
};

const REVIEWS = [
    {
        name: 'Maya R.',
        initials: 'MR',
        rating: 5,
        date: '2 weeks ago',
        title: 'Exceeded my expectations',
        body: 'The build quality feels premium and setup took only a few minutes. Performance has been consistent every day, and the packaging was excellent.',
        helpful: 18,
    },
    {
        name: 'Daniel K.',
        initials: 'DK',
        rating: 4,
        date: '1 month ago',
        title: 'A very solid purchase',
        body: 'It does exactly what the description promises. I would have liked a more detailed printed guide, but the product itself is easy to use and works beautifully.',
        helpful: 11,
    },
    {
        name: 'Priya S.',
        initials: 'PS',
        rating: 5,
        date: '2 months ago',
        title: 'Great value and fast delivery',
        body: 'Arrived earlier than expected and was well protected. I have used it extensively since then with no issues. Would happily recommend it.',
        helpful: 9,
    },
];

function Stars({ rating, label }) {
    return (
        <span className="rating-stars" aria-label={label || `${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map(star => (
                <span key={star} className={`material-icons-round ${star <= Math.round(rating) ? 'filled' : ''}`} aria-hidden="true">
                    {star <= Math.round(rating) ? 'star' : 'star_border'}
                </span>
            ))}
        </span>
    );
}

function ProductDetails() {
    const { id } = useParams();
    const history = useHistory();
    const { addItem } = useCart();
    const toast = useToast();
    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [added, setAdded] = useState(false);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        window.scrollTo(0, 0);

        productsAPI.getById(id)
            .then(data => {
                if (active) setProduct(data.product);
            })
            .catch(err => {
                if (active) setError(err.message || 'Unable to load this product');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [id]);

    const details = useMemo(() => {
        if (!product) return [];
        return [
            ['Brand', 'TechStore Select'],
            ['Category', product.category],
            ...(CATEGORY_SPECS[product.category] || CATEGORY_SPECS.Peripherals),
            ['Model number', `TS-${String(product.id).padStart(4, '0')}`],
            ['Warranty', '2-year limited warranty'],
        ];
    }, [product]);

    const handleAdd = () => {
        if (!product || product.stock <= 0) return;
        addItem(product, quantity);
        setAdded(true);
        toast.success(`${quantity} × ${product.name} added to cart`);
        setTimeout(() => setAdded(false), 1600);
    };

    const handleBuyNow = () => {
        if (!product || product.stock <= 0) return;
        addItem(product, quantity);
        history.push('/checkout');
    };

    if (loading) {
        return (
            <main className="page product-detail-page">
                <div className="container">
                    <div className="product-detail-skeleton">
                        <div className="skeleton detail-image-skeleton" />
                        <div className="detail-copy-skeleton">
                            <div className="skeleton" />
                            <div className="skeleton" />
                            <div className="skeleton" />
                            <div className="skeleton" />
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (error || !product) {
        return (
            <main className="page product-detail-page">
                <div className="container">
                    <div className="empty-state card">
                        <span className="detail-error-icon">!</span>
                        <h3>Product unavailable</h3>
                        <p>{error || 'We could not find the product you requested.'}</p>
                        <Link to="/products" className="btn btn-primary mt-24">Back to products</Link>
                    </div>
                </div>
            </main>
        );
    }

    const reviewCount = 124 + Number(product.id) * 17;
    const rating = 4.6;
    const inStock = product.stock > 0;

    return (
        <main className="page product-detail-page">
            <div className="container">
                <nav className="product-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/">Home</Link><span>/</span>
                    <Link to="/products">Products</Link><span>/</span>
                    <span aria-current="page">{product.name}</span>
                </nav>

                <section className="product-overview">
                    <div className="product-gallery card">
                        <div className="gallery-badge">{product.category}</div>
                        <img src={product.image_url} alt={product.name} />
                        <div className="gallery-note">Hover to take a closer look</div>
                    </div>

                    <div className="product-purchase-panel">
                        <span className="product-eyebrow">TechStore Select</span>
                        <h1>{product.name}</h1>
                        <div className="detail-rating-row">
                            <span className="rating-score">{rating}</span>
                            <Stars rating={rating} />
                            <a href="#reviews">{reviewCount} verified reviews</a>
                        </div>
                        <p className="detail-description">{product.description}</p>

                        <div className="detail-price-row">
                            <span className="detail-price">${product.price.toFixed(2)}</span>
                            <span className="detail-tax-note">Tax included · Free delivery</span>
                        </div>

                        <div className={`detail-stock ${inStock ? 'in-stock' : 'out-of-stock'}`}>
                            <span />
                            {inStock ? `${product.stock} units ready to ship` : 'Currently out of stock'}
                        </div>

                        <div className="purchase-controls">
                            <div className="detail-quantity" aria-label="Product quantity">
                                <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                                <span aria-live="polite">{quantity}</span>
                                <button type="button" aria-label="Increase quantity" onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} disabled={!inStock || quantity >= product.stock}>+</button>
                            </div>
                            <button type="button" className={`btn detail-cart-button ${added ? 'added' : ''}`} onClick={handleAdd} disabled={!inStock}>
                                {added ? <><span className="material-icons-round" aria-hidden="true">check</span> Added to cart</> : 'Add to cart'}
                            </button>
                            <button type="button" className="btn btn-primary detail-buy-button" onClick={handleBuyNow} disabled={!inStock}>Buy now</button>
                        </div>

                        <div className="purchase-benefits">
                            <div><span className="material-icons-round" aria-hidden="true">local_shipping</span><p><strong>Free delivery</strong><small>Ships within 1–2 business days</small></p></div>
                            <div><span className="material-icons-round" aria-hidden="true">assignment_return</span><p><strong>30-day returns</strong><small>Simple, hassle-free returns</small></p></div>
                            <div><span className="material-icons-round" aria-hidden="true">verified_user</span><p><strong>Secure purchase</strong><small>Protected checkout and warranty</small></p></div>
                        </div>
                    </div>
                </section>

                <section className="product-information-section">
                    <div className="section-heading">
                        <span>Product details</span>
                        <h2>Everything you need to know</h2>
                        <p>Technical information and key features for this product.</p>
                    </div>
                    <div className="product-information-grid">
                        <div className="specifications-card card">
                            <h3>Specifications</h3>
                            <dl>
                                {details.map(([label, value]) => (
                                    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                                ))}
                            </dl>
                        </div>
                        <div className="detail-highlights card">
                            <h3>Why you’ll love it</h3>
                            <ul>
                                <li><span className="material-icons-round" aria-hidden="true">check</span><div><strong>Premium quality</strong><p>Carefully selected materials built for everyday use.</p></div></li>
                                <li><span className="material-icons-round" aria-hidden="true">check</span><div><strong>Ready out of the box</strong><p>Simple setup with everything you need included.</p></div></li>
                                <li><span className="material-icons-round" aria-hidden="true">check</span><div><strong>Support you can trust</strong><p>Backed by a two-year warranty and friendly support.</p></div></li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="reviews-section" id="reviews">
                    <div className="section-heading">
                        <span>Customer reviews</span>
                        <h2>Loved by people who use it</h2>
                        <p>Feedback from verified TechStore customers.</p>
                    </div>

                    <div className="reviews-layout">
                        <aside className="review-summary card">
                            <div className="review-big-score">{rating}</div>
                            <Stars rating={rating} label={`${rating} average rating`} />
                            <p>Based on {reviewCount} reviews</p>
                            <div className="rating-bars">
                                {[
                                    [5, 78], [4, 15], [3, 5], [2, 1], [1, 1],
                                ].map(([stars, percent]) => (
                                    <div key={stars}>
                                        <span>{stars} <span className="material-icons-round" aria-hidden="true">star</span></span>
                                        <div><i style={{ width: `${percent}%` }} /></div>
                                        <small>{percent}%</small>
                                    </div>
                                ))}
                            </div>
                        </aside>

                        <div className="review-list">
                            {REVIEWS.map(review => (
                                <article className="review-card card" key={review.name}>
                                    <header>
                                        <div className="review-author-avatar">{review.initials}</div>
                                        <div>
                                            <strong>{review.name}</strong>
                                            <span><i className="material-icons-round" aria-hidden="true">verified</i> Verified buyer</span>
                                        </div>
                                        <time>{review.date}</time>
                                    </header>
                                    <Stars rating={review.rating} />
                                    <h3>{review.title}</h3>
                                    <p>{review.body}</p>
                                    <footer>Helpful? <button type="button">Yes · {review.helpful}</button></footer>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default ProductDetails;
