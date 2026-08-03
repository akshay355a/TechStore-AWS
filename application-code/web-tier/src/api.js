const API_BASE = '/api';

async function request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
}

// Auth
export const authAPI = {
    register: (name, email, password) => request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
    login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    me: () => request('/auth/me'),
};

// Products
export const productsAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/products${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/products/${id}`),
    create: (product) => request('/products', { method: 'POST', body: JSON.stringify(product) }),
    update: (id, updates) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id) => request(`/products/${id}`, { method: 'DELETE' }),
};

// Orders
export const ordersAPI = {
    create: (orderData) => request('/orders', { method: 'POST', body: JSON.stringify(orderData) }),
    getAll: () => request('/orders'),
    getById: (id) => request(`/orders/${id}`),
    updateStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
};
