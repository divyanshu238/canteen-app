import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './store';
import { SocketProvider } from './socket';
import { BottomNav } from './components/BottomNav';

import { Home } from './pages/Home';
import { CanteenMenu } from './pages/CanteenMenu';
import { CategoryPage } from './pages/CategoryPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { Cart } from './pages/Cart';
import { OrderTracking } from './pages/OrderTracking';
import { Login } from './pages/Login';
import { PartnerDashboard } from './pages/PartnerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Profile } from './pages/Profile';
import { MyOrders } from './pages/MyOrders';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
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
                    <BottomNav />
                    <div className="pb-24 md:pb-0 min-h-screen">
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/" element={<Home />} />
                            <Route path="/canteen/:id" element={<CanteenMenu />} />
                            <Route path="/category/:category" element={<CategoryPage />} />
                            <Route path="/search" element={<SearchResultsPage />} />
                            <Route path="/cart" element={<Cart />} />
                            <Route path="/login" element={<Login />} />

                            {/* Legacy routes - redirect to login (OTP no longer used) */}
                            <Route path="/verify-phone" element={<Navigate to="/login" replace />} />
                            <Route path="/verify-email" element={<Navigate to="/login" replace />} />

                            {/* Protected Routes */}
                            <Route path="/order/:id" element={
                                <ProtectedRoute>
                                    <OrderTracking />
                                </ProtectedRoute>
                            } />

                            <Route path="/profile" element={
                                <ProtectedRoute>
                                    <Profile />
                                </ProtectedRoute>
                            } />

                            <Route path="/orders" element={
                                <ProtectedRoute>
                                    <MyOrders />
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

                            {/* Super Admin Control Plane */}
                            <Route path="/superadmin" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <SuperAdminDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/superadmin/*" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <SuperAdminDashboard />
                                </ProtectedRoute>
                            } />

                            {/* Catch-all redirect */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </div>
                </BrowserRouter>
            </SocketProvider>
        </Provider>
    </React.StrictMode>
);
