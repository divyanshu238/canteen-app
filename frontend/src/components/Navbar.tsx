import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store';
import type { RootState } from '../store';
import { ShoppingBag, Search, MapPin, User, LogOut, ChevronDown, LayoutDashboard, Shield, X, Loader2 } from 'lucide-react';
import { searchAPI } from '../api';

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

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target as Node) &&
                !searchInputRef.current?.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/');
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
        <nav className="sticky top-0 bg-white shadow-sm z-50 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* LEFT: Logo & Location */}
                    <div className="flex items-center gap-8">
                        <div
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 cursor-pointer group"
                        >
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                                <span className="text-white font-black text-2xl">C</span>
                            </div>
                            <span className="font-black text-2xl bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent hidden sm:block">
                                Canteen
                            </span>
                        </div>

                        {/* Location Selector */}
                        <div className="hidden lg:flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors group">
                            <MapPin size={18} className="text-orange-500" />
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 font-medium">Deliver to</span>
                                <span className="text-sm font-bold text-gray-900 flex items-center gap-1">
                                    Campus Hub, Block A
                                    <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600" />
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* CENTER: Search Bar */}
                    <div className="hidden md:flex flex-1 max-w-xl mx-8 relative">
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search for canteens or dishes..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onKeyDown={handleKeyDown}
                                className="w-full pl-12 pr-12 py-3 bg-gray-50 border-2 border-transparent hover:border-gray-200 focus:border-orange-500 focus:bg-white rounded-xl outline-none transition-all text-gray-700 placeholder:text-gray-400"
                            />
                            {/* Clear button / Loading indicator */}
                            {searchQuery && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    {loadingSuggestions ? (
                                        <Loader2 size={18} className="text-gray-400 animate-spin" />
                                    ) : (
                                        <button
                                            onClick={clearSearch}
                                            className="text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Suggestions Dropdown */}
                        {showSuggestions && (suggestions.length > 0 || searchQuery.length >= 2) && (
                            <div
                                ref={suggestionsRef}
                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden"
                            >
                                {suggestions.length > 0 ? (
                                    <ul className="py-2">
                                        {suggestions.map((suggestion, index) => (
                                            <li key={index}>
                                                <button
                                                    onClick={() => handleSuggestionClick(suggestion)}
                                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                                                >
                                                    <span className="text-gray-400">
                                                        {suggestion.type === 'dish' ? '🍽️' : '🏪'}
                                                    </span>
                                                    <span className="font-medium text-gray-700">{suggestion.name}</span>
                                                    <span className="text-xs text-gray-400 ml-auto">
                                                        {suggestion.type === 'dish' ? 'Dish' : 'Canteen'}
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                        {/* Search button at bottom */}
                                        <li className="border-t border-gray-100 mt-1">
                                            <button
                                                onClick={() => handleSearch(searchQuery)}
                                                className="w-full px-4 py-3 flex items-center gap-3 text-orange-500 hover:bg-orange-50 transition-colors font-semibold"
                                            >
                                                <Search size={18} />
                                                Search for "{searchQuery}"
                                            </button>
                                        </li>
                                    </ul>
                                ) : searchQuery.length >= 2 && !loadingSuggestions ? (
                                    <div className="p-4">
                                        <button
                                            onClick={() => handleSearch(searchQuery)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors"
                                        >
                                            <Search size={18} />
                                            Search for "{searchQuery}"
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Actions */}
                    <div className="flex items-center gap-3">
                        {isAuthenticated && user ? (
                            <div className="flex items-center gap-3">
                                {/* Dashboard Links */}
                                {user.role === 'partner' && (
                                    <button
                                        onClick={() => navigate('/partner')}
                                        className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-semibold transition-colors"
                                    >
                                        <LayoutDashboard size={18} />
                                        Dashboard
                                    </button>
                                )}

                                {user.role === 'admin' && (
                                    <button
                                        onClick={() => navigate('/admin')}
                                        className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-xl font-semibold transition-colors"
                                    >
                                        <Shield size={18} />
                                        Admin
                                    </button>
                                )}

                                {/* User Info */}
                                <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl">
                                    <User size={18} className="text-orange-500" />
                                    <span className="font-semibold text-gray-900 text-sm">{user.name}</span>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors text-gray-500 hover:text-red-500"
                                    title="Logout"
                                >
                                    <LogOut size={20} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-700 transition-all"
                            >
                                <User size={18} />
                                Sign In
                            </button>
                        )}

                        {/* Cart Button - Show only for students or non-logged in users */}
                        {(!user || user.role === 'student') && (
                            <button
                                onClick={() => navigate('/cart')}
                                className="relative flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all"
                            >
                                <ShoppingBag size={20} />
                                <span className="hidden sm:inline">Cart</span>
                                {cartCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md animate-pulse">
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Search Bar */}
                <div className="md:hidden pb-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-11 pr-10 py-2.5 bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-xl outline-none transition-all text-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};
