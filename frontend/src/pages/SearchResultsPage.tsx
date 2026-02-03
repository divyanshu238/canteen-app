import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, removeFromCart } from '../store';
import type { RootState, MenuItem } from '../store';
import { searchAPI } from '../api';
import { Navbar } from '../components/Navbar';
import { Star, Clock, Search, Plus, Minus, AlertCircle, ArrowLeft } from 'lucide-react';

interface Canteen {
    _id: string;
    name: string;
    image: string;
    rating: number;
    tags: string[];
    priceRange: string;
    preparationTime?: string;
}

interface MenuItemData extends MenuItem {
    category: string;
}

interface SearchResult {
    canteen: Canteen;
    matchingItems: MenuItemData[];
    matchCount: number;
    matchType: 'items' | 'canteen_name';
}

export const SearchResultsPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const query = searchParams.get('q') || '';

    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalCanteens, setTotalCanteens] = useState(0);
    const [totalItems, setTotalItems] = useState(0);

    const cartItems = useSelector((state: RootState) => state.cart.items);

    // Fetch search results
    useEffect(() => {
        if (!query || query.trim().length < 2) {
            setResults([]);
            setLoading(false);
            setError(query ? 'Please enter at least 2 characters to search' : null);
            return;
        }

        setLoading(true);
        setError(null);

        searchAPI.search(query.trim())
            .then(res => {
                if (!res.data.success) {
                    throw new Error(res.data.error || 'Search failed');
                }
                setResults(res.data.data || []);
                setTotalCanteens(res.data.totalCanteens || 0);
                setTotalItems(res.data.totalItems || 0);
                setLoading(false);
            })
            .catch(err => {
                console.error('[SearchResultsPage] Error:', err);
                const errorMessage = err.response?.data?.error || err.message || 'Failed to search';
                setError(errorMessage);
                setResults([]);
                setLoading(false);
            });
    }, [query]);

    const getItemQty = useCallback((itemId: string) => {
        const item = cartItems.find(i => i._id === itemId);
        return item?.qty || 0;
    }, [cartItems]);

    const handleAddToCart = (item: MenuItemData, canteenName: string) => {
        dispatch(addToCart({ ...item, canteenName }));
    };

    const handleRemoveFromCart = (itemId: string) => {
        dispatch(removeFromCart(itemId));
    };

    // Highlight matching text
    const highlightMatch = (text: string, query: string) => {
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part)
                ? <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">{part}</mark>
                : part
        );
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-6xl mx-auto px-4 py-8">
                    <div className="mb-6">
                        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-5 w-48 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
                                    <div className="flex-1">
                                        <div className="h-5 w-48 bg-gray-200 rounded mb-2"></div>
                                        <div className="h-4 w-32 bg-gray-200 rounded"></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="h-24 bg-gray-200 rounded-xl"></div>
                                    <div className="h-24 bg-gray-200 rounded-xl"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error && query.length >= 2) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-6xl mx-auto px-4 py-20">
                    <div className="text-center">
                        <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Search failed</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors"
                        >
                            Go back home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            {/* Header */}
            <div className="bg-white border-b border-gray-100 py-6">
                <div className="max-w-6xl mx-auto px-4">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        <span className="font-medium">Back to Home</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <Search size={24} className="text-orange-500" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {query ? (
                                    <>Search results for "<span className="text-orange-500">{query}</span>"</>
                                ) : 'Search'}
                            </h1>
                            {results.length > 0 && (
                                <p className="text-gray-500 mt-1">
                                    Found {totalItems} {totalItems === 1 ? 'item' : 'items'} in {totalCanteens} {totalCanteens === 1 ? 'canteen' : 'canteens'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                {!query ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            Start searching
                        </h3>
                        <p className="text-gray-500">
                            Use the search bar to find your favorite dishes or canteens
                        </p>
                    </div>
                ) : query.length < 2 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">✏️</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            Keep typing...
                        </h3>
                        <p className="text-gray-500">
                            Enter at least 2 characters to search
                        </p>
                    </div>
                ) : results.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">😔</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            No results found for "{query}"
                        </h3>
                        <p className="text-gray-500 mb-6">
                            Try a different search term or browse our categories
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors"
                        >
                            Browse categories
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {results.map(result => (
                            <div
                                key={result.canteen._id}
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                            >
                                {/* Canteen Header */}
                                <div
                                    onClick={() => navigate(`/canteen/${result.canteen._id}`)}
                                    className="flex items-center gap-4 p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <img
                                        src={result.canteen.image}
                                        alt={result.canteen.name}
                                        className="w-16 h-16 rounded-xl object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h2 className="font-bold text-lg text-gray-900 truncate">
                                            {highlightMatch(result.canteen.name, query)}
                                        </h2>
                                        <div className="flex items-center gap-3 text-sm text-gray-500">
                                            <div className="flex items-center gap-1 text-green-600">
                                                <Star size={14} fill="currentColor" />
                                                <span className="font-semibold">{result.canteen.rating}</span>
                                            </div>
                                            <span>•</span>
                                            <div className="flex items-center gap-1">
                                                <Clock size={14} />
                                                <span>{result.canteen.preparationTime || '20-30 min'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm text-gray-400">
                                            {result.matchCount} {result.matchCount === 1 ? 'match' : 'matches'}
                                        </span>
                                        {result.matchType === 'canteen_name' && (
                                            <p className="text-xs text-orange-500 font-medium">Canteen match</p>
                                        )}
                                    </div>
                                </div>

                                {/* Matching Items */}
                                <div className="p-4">
                                    <div className="grid gap-4">
                                        {result.matchingItems.map(item => {
                                            const qty = getItemQty(item._id);

                                            return (
                                                <div
                                                    key={item._id}
                                                    className="flex gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                                                >
                                                    {/* Item Image */}
                                                    {item.image && (
                                                        <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden">
                                                            <img
                                                                src={item.image}
                                                                alt={item.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Item Details */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start gap-2 mb-1">
                                                            {/* Veg/Non-veg indicator */}
                                                            <div className={`w-4 h-4 border-2 flex items-center justify-center mt-1 flex-shrink-0 ${item.isVeg ? 'border-green-600' : 'border-red-600'
                                                                }`}>
                                                                <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'
                                                                    }`}></div>
                                                            </div>
                                                            <h3 className="font-bold text-gray-900">
                                                                {highlightMatch(item.name, query)}
                                                            </h3>
                                                        </div>

                                                        {item.description && (
                                                            <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                                                                {item.description}
                                                            </p>
                                                        )}

                                                        <div className="flex items-center gap-2">
                                                            <p className="text-lg font-bold text-gray-900">₹{item.price}</p>
                                                            {item.category && (
                                                                <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                                                                    {item.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Add to Cart Button */}
                                                    <div className="flex items-center">
                                                        {qty === 0 ? (
                                                            <button
                                                                onClick={() => handleAddToCart(item, result.canteen.name)}
                                                                className="px-5 py-2 bg-white border-2 border-green-600 text-green-600 font-bold rounded-xl hover:bg-green-50 transition-colors"
                                                            >
                                                                ADD
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center bg-green-600 text-white rounded-xl overflow-hidden">
                                                                <button
                                                                    onClick={() => handleRemoveFromCart(item._id)}
                                                                    className="px-3 py-2 hover:bg-green-700 transition-colors"
                                                                >
                                                                    <Minus size={16} strokeWidth={3} />
                                                                </button>
                                                                <span className="px-3 font-bold">{qty}</span>
                                                                <button
                                                                    onClick={() => handleAddToCart(item, result.canteen.name)}
                                                                    className="px-3 py-2 hover:bg-green-700 transition-colors"
                                                                >
                                                                    <Plus size={16} strokeWidth={3} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
