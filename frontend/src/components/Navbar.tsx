import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store';
import type { RootState } from '../store';
import { ShoppingBag, Search, MapPin, User, LogOut, ChevronDown, LayoutDashboard, Shield, X, Loader2, Lock, Menu } from 'lucide-react';
import { searchAPI } from '../api';
import { motion, AnimatePresence } from 'framer-motion';

// Debounce hook
const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
};

interface Suggestion {
    type: 'dish' | 'canteen';
    name: string;
}

export const Navbar = () => {
    const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
    const cartCount = useSelector((state: RootState) => state.cart.items.reduce((sum, item) => sum + item.qty, 0));
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // User menu state
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Get initial search value from URL if on search page
    useEffect(() => {
        if (location.pathname === '/search') {
            const params = new URLSearchParams(location.search);
            const q = params.get('q');
            if (q) {
                setSearchQuery(q);
            }
        }
    }, [location]);

    // Debounced search query for suggestions
    const debouncedQuery = useDebounce(searchQuery, 300);

    // Fetch suggestions when debounced query changes
    useEffect(() => {
        if (debouncedQuery.length < 2) {
            setSuggestions([]);
            return;
        }

        setLoadingSuggestions(true);
        searchAPI.suggestions(debouncedQuery)
            .then(res => {
                if (res.data.success) {
                    setSuggestions(res.data.suggestions || []);
                }
            })
            .catch(err => {
                console.error('[Navbar] Suggestions error:', err);
            })
            .finally(() => {
                setLoadingSuggestions(false);
            });
    }, [debouncedQuery]);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Suggestions
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target as Node) &&
                !searchInputRef.current?.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
            // User Menu
            if (
                userMenuRef.current &&
                !userMenuRef.current.contains(event.target as Node)
            ) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/');
        setShowUserMenu(false);
    };

    const handleSearch = useCallback((query: string) => {
        if (query.trim().length >= 2) {
            navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            setShowSuggestions(false);
        }
    }, [navigate]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch(searchQuery);
        }
        if (e.key === 'Escape') {
            setShowSuggestions(false);
            searchInputRef.current?.blur();
        }
    };

    const handleSuggestionClick = (suggestion: Suggestion) => {
        setSearchQuery(suggestion.name);
        handleSearch(suggestion.name);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSuggestions([]);
        searchInputRef.current?.focus();
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm z-50 border-b border-gray-100"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* LEFT: Logo & Location */}
                    <div className="flex items-center gap-6 sm:gap-8">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 cursor-pointer group"
                        >
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200 group-hover:shadow-orange-300 transition-all">
                                <span className="text-white font-black text-xl sm:text-2xl">C</span>
                            </div>
                            <span className="font-black text-2xl bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent hidden sm:block tracking-tight">
                                Canteen
                            </span>
                        </motion.div>

                        {/* Location Selector */}
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gray-50/50 hover:bg-gray-100/80 rounded-full cursor-pointer transition-colors border border-transparent hover:border-gray-200"
                        >
                            <div className="p-1.5 bg-white rounded-full shadow-sm text-orange-500">
                                <MapPin size={14} fill="currentColor" />
                            </div>
                            <div className="flex flex-col leading-none pr-1">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Delivering to</span>
                                <span className="text-sm font-bold text-gray-900 flex items-center gap-1">
                                    Campus Hub
                                    <ChevronDown size={14} className="text-gray-400" />
                                </span>
                            </div>
                        </motion.div>
                    </div>

                    {/* CENTER: Search Bar */}
                    <div className="hidden md:flex flex-1 max-w-xl mx-8 relative group">
                        <div className={`relative w-full transition-all duration-300 ${showSuggestions ? 'scale-[1.02]' : 'scale-100'}`}>
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={20} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search for food or canteens..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onKeyDown={handleKeyDown}
                                className="w-full pl-12 pr-12 py-3.5 bg-gray-100/50 border-2 border-transparent focus:border-orange-500/20 focus:bg-white focus:ring-4 focus:ring-orange-500/10 rounded-2xl outline-none transition-all text-gray-700 placeholder:text-gray-400 font-medium"
                            />
                            {/* Clear button / Loading indicator */}
                            <AnimatePresence>
                                {searchQuery && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2"
                                    >
                                        {loadingSuggestions ? (
                                            <Loader2 size={18} className="text-gray-400 animate-spin" />
                                        ) : (
                                            <button
                                                onClick={clearSearch}
                                                className="p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Suggestions Dropdown */}
                        <AnimatePresence>
                            {showSuggestions && (suggestions.length > 0 || searchQuery.length >= 2) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    ref={suggestionsRef}
                                    className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 z-50 overflow-hidden"
                                >
                                    {suggestions.length > 0 ? (
                                        <ul className="py-2">
                                            {suggestions.map((suggestion, index) => (
                                                <motion.li
                                                    key={index}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                >
                                                    <button
                                                        onClick={() => handleSuggestionClick(suggestion)}
                                                        className="w-full px-5 py-3 flex items-center gap-4 hover:bg-orange-50 transition-colors text-left group"
                                                    >
                                                        <span className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                                                            {suggestion.type === 'dish' ? '🍲' : '🏪'}
                                                        </span>
                                                        <div className="flex-1">
                                                            <div className="font-semibold text-gray-700 group-hover:text-orange-700">{suggestion.name}</div>
                                                            <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                                                                {suggestion.type === 'dish' ? 'Dish' : 'Restaurant'}
                                                            </div>
                                                        </div>
                                                    </button>
                                                </motion.li>
                                            ))}
                                            <li className="border-t border-gray-100 mt-2 pt-2 pb-1 px-2">
                                                <button
                                                    onClick={() => handleSearch(searchQuery)}
                                                    className="w-full px-4 py-3 flex items-center justify-center gap-2 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700 font-bold rounded-xl transition-all"
                                                >
                                                    <Search size={16} strokeWidth={2.5} />
                                                    View all results
                                                </button>
                                            </li>
                                        </ul>
                                    ) : searchQuery.length >= 2 && !loadingSuggestions ? (
                                        <div className="p-4">
                                            <button
                                                onClick={() => handleSearch(searchQuery)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200"
                                            >
                                                <Search size={18} strokeWidth={2.5} />
                                                Search for "{searchQuery}"
                                            </button>
                                        </div>
                                    ) : null}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* RIGHT: Actions */}
                    <div className="flex items-center gap-4">
                        {isAuthenticated && user ? (
                            <div className="flex items-center gap-4">
                                {/* Role Badges */}
                                {user.role === 'partner' && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate('/partner')}
                                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full font-bold text-sm hover:bg-blue-100 transition-colors"
                                    >
                                        <LayoutDashboard size={16} />
                                        Dashboard
                                    </motion.button>
                                )}

                                {user.role === 'admin' && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate('/admin')}
                                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-full font-bold text-sm hover:bg-purple-100 transition-colors"
                                    >
                                        <Shield size={16} />
                                        Admin
                                    </motion.button>
                                )}

                                {/* User Profile & Menu */}
                                <div className="relative" ref={userMenuRef}>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-3 pl-1 pr-2 py-1 bg-white hover:bg-gray-50 border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-all group"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold shadow-sm">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="hidden sm:flex items-center gap-2">
                                            <span className="font-bold text-gray-700 text-sm">{user.name.split(' ')[0]}</span>
                                            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
                                        </div>
                                    </motion.button>

                                    {/* Dropdown Menu */}
                                    <AnimatePresence>
                                        {showUserMenu && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                className="absolute right-0 mt-4 w-64 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 py-2 z-50 overflow-hidden"
                                            >
                                                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                                                    <p className="text-sm font-bold text-gray-900">{user.name}</p>
                                                    <p className="text-xs text-gray-500 truncate font-medium mt-0.5">{user.email}</p>
                                                </div>

                                                <div className="p-2 space-y-1">
                                                    <button
                                                        onClick={() => {
                                                            navigate('/profile');
                                                            setShowUserMenu(false);
                                                        }}
                                                        className="w-full text-left px-4 py-3 text-sm font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-700 rounded-xl flex items-center gap-3 transition-colors"
                                                    >
                                                        <div className="p-1.5 bg-gray-100 rounded-lg text-gray-500">
                                                            <User size={16} />
                                                        </div>
                                                        Account Settings
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            navigate('/profile?tab=security');
                                                            setShowUserMenu(false);
                                                        }}
                                                        className="w-full text-left px-4 py-3 text-sm font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-700 rounded-xl flex items-center gap-3 transition-colors"
                                                    >
                                                        <div className="p-1.5 bg-gray-100 rounded-lg text-gray-500">
                                                            <Lock size={16} />
                                                        </div>
                                                        Security
                                                    </button>
                                                </div>

                                                <div className="border-t border-gray-100 mt-1 p-2">
                                                    <button
                                                        onClick={handleLogout}
                                                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-3 transition-colors font-bold"
                                                    >
                                                        <div className="p-1.5 bg-red-100 rounded-lg text-red-500">
                                                            <LogOut size={16} />
                                                        </div>
                                                        Sign Out
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/login')}
                                className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:bg-black transition-all"
                            >
                                <User size={18} />
                                Sign In
                            </motion.button>
                        )}

                        {/* Cart Button */}
                        {(!user || user.role === 'student') && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/cart')}
                                className="relative flex items-center justify-center w-12 h-12 sm:w-auto sm:h-auto sm:px-6 sm:py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-full shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all"
                            >
                                <ShoppingBag size={20} />
                                <span className="hidden sm:inline ml-2">Cart</span>
                                <AnimatePresence>
                                    {cartCount > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full shadow-md border-2 border-white"
                                        >
                                            {cartCount}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        )}
                    </div>
                </div>

                {/* Mobile Search Bar - Collapsed View */}
                <div className="md:hidden pb-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-11 pr-10 py-3 bg-gray-100 border border-transparent focus:bg-white focus:border-orange-500 rounded-xl outline-none transition-all text-sm font-medium"
                        />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.nav>
    );
};

