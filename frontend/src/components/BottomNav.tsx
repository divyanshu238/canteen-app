import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { scaleBounce } from '../utils/motion';

export const BottomNav = () => {
    const { items } = useSelector((state: RootState) => state.cart);
    const cartCount = items.reduce((sum, item) => sum + item.qty, 0);
    const location = useLocation();

    // Hide on login/register pages
    if (['/login', '/register', '/otp', '/admin', '/partner'].some(path => location.pathname.startsWith(path))) {
        return null;
    }

    const navItems = [
        { path: '/', icon: Home, label: 'Home' },
        { path: '/canteens', icon: Search, label: 'Search' },
        { path: '/cart', icon: ShoppingBag, label: 'Cart', badge: cartCount },
        { path: '/orders', icon: ClipboardList, label: 'Orders' },
        { path: '/profile', icon: User, label: 'Profile' }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 pb-safe-area shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:hidden z-50">
            <nav className="flex justify-between items-center max-w-sm mx-auto">
                {navItems.map(({ path, icon: Icon, label, badge }) => (
                    <NavLink to={path} key={path} className="relative">
                        {({ isActive }) => (
                            <motion.div
                                className="flex flex-col items-center gap-1 min-w-[3.5rem]"
                                whileTap={{ scale: 0.9 }}
                            >
                                <div className={`relative p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-gradient-to-tr from-orange-100 to-orange-50 text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                    }`}>
                                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />

                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-pill"
                                            className="absolute inset-0 bg-orange-500/10 rounded-2xl -z-10"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}

                                    {/* Cart Badge */}
                                    {badge ? (
                                        <motion.span
                                            variants={scaleBounce}
                                            initial="initial"
                                            animate="animate"
                                            key={badge} // Trigger animation on count change
                                            className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm"
                                        >
                                            {badge > 9 ? '9+' : badge}
                                        </motion.span>
                                    ) : null}
                                </div>
                                <span className={`text-[10px] font-bold transition-colors ${isActive ? 'text-orange-600' : 'text-gray-400'
                                    }`}>
                                    {label}
                                </span>
                            </motion.div>
                        )}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};
