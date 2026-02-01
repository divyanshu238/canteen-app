import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './store';
import { SocketProvider } from './socket';

import { Home } from './pages/Home';
import { CanteenMenu } from './pages/CanteenMenu';
import { Cart } from './pages/Cart';
import { OrderTracking } from './pages/OrderTracking';
import { Login } from './pages/Login';
import { EmailVerification } from './pages/OTPVerification';
import { PartnerDashboard } from './pages/PartnerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import './index.css';

// Protected Route Components
const ProtectedRoute: React.FC<{
    children: React.ReactNode;
    allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
    const user = store.getState().auth.user;
    const isAuthenticated = store.getState().auth.isAuthenticated;

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <Provider store={store}>
            <SocketProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<Home />} />
                        <Route path="/canteen/:id" element={<CanteenMenu />} />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/verify-email" element={<EmailVerification />} />
                        <Route path="/verify-phone" element={<EmailVerification />} /> {/* Backward compat */}

                        {/* Protected Routes */}
                        <Route path="/order/:id" element={
                            <ProtectedRoute>
                                <OrderTracking />
                            </ProtectedRoute>
                        } />

                        {/* Partner Routes */}
                        <Route path="/partner" element={
                            <ProtectedRoute allowedRoles={['partner']}>
                                <PartnerDashboard />
                            </ProtectedRoute>
                        } />

                        {/* Admin Routes */}
                        <Route path="/admin" element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        } />

                        {/* Catch-all redirect */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </SocketProvider>
        </Provider>
    </React.StrictMode>
);
