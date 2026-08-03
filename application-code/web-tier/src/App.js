import React from 'react';
import {
    BrowserRouter as Router,
    Switch,
    Route,
} from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { ToastProvider } from './ToastContext';
import Navbar from './components/Navbar/Navbar';
import Home from './components/Home/Home';
import ProductCatalog from './components/ProductCatalog/ProductCatalog';
import ProductDetails from './components/ProductDetails/ProductDetails';
import Cart from './components/Cart/Cart';
import Checkout from './components/Checkout/Checkout';
import Orders from './components/Orders/Orders';
import OrderDetails from './components/OrderDetails/OrderDetails';
import AdminDashboard from './components/Admin/AdminDashboard';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import './index.css';

function App() {
    return (
        <AuthProvider>
            <CartProvider>
                <ToastProvider>
                    <Router>
                        <Navbar />
                        <Switch>
                            <Route path="/products/:id">
                                <ProductDetails />
                            </Route>
                            <Route path="/products">
                                <ProductCatalog />
                            </Route>
                            <Route path="/cart">
                                <Cart />
                            </Route>
                            <Route path="/checkout">
                                <Checkout />
                            </Route>
                            <Route path="/orders/:id">
                                <OrderDetails />
                            </Route>
                            <Route path="/orders">
                                <Orders />
                            </Route>
                            <Route path="/admin">
                                <AdminDashboard />
                            </Route>
                            <Route path="/login">
                                <Login />
                            </Route>
                            <Route path="/signup">
                                <Signup />
                            </Route>
                            <Route path="/">
                                <Home />
                            </Route>
                        </Switch>
                    </Router>
                </ToastProvider>
            </CartProvider>
        </AuthProvider>
    );
}

export default App;
