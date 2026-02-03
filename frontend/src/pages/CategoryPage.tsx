import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, removeFromCart } from '../store';
import type { RootState, MenuItem } from '../store';
import { canteenAPI } from '../api';
import { Navbar } from '../components/Navbar';
import { Star, Clock, ArrowLeft, Plus, Minus, AlertCircle } from 'lucide-react';

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

interface CategoryResult {
    canteen: Canteen;
    items: MenuItemData[];
    itemCount: number;
}

// Category metadata for display
const categoryMeta: Record<string, { emoji: string; color: string; displayName: string }> = {
    burger: { emoji: '🍔', color: 'from-yellow-400 to-orange-500', displayName: 'Burger' },
    pizza: { emoji: '🍕', color: 'from-red-400 to-pink-500', displayName: 'Pizza' },
    biryani: { emoji: '🍛', color: 'from-orange-400 to-red-500', displayName: 'Biryani' },
    rolls: { emoji: '🌯', color: 'from-green-400 to-teal-500', displayName: 'Rolls' },
    coffee: { emoji: '☕', color: 'from-amber-600 to-orange-700', displayName: 'Coffee' },
    dessert: { emoji: '🍰', color: 'from-pink-400 to-purple-500', displayName: 'Dessert' },
    noodles: { emoji: '🍜', color: 'from-yellow-500 to-red-500', displayName: 'Noodles' },
    sandwich: { emoji: '🥪', color: 'from-yellow-300 to-green-400', displayName: 'Sandwich' },
    // Additional categories that might exist in DB
    breakfast: { emoji: '🍳', color: 'from-yellow-400 to-amber-500', displayName: 'Breakfast' },
    beverages: { emoji: '🥤', color: 'from-blue-400 to-cyan-500', displayName: 'Beverages' },
    snacks: { emoji: '🍿', color: 'from-orange-400 to-yellow-500', displayName: 'Snacks' },
    'main course': { emoji: '🍽️', color: 'from-red-500 to-orange-500', displayName: 'Main Course' },
    mains: { emoji: '🍽️', color: 'from-red-500 to-orange-500', displayName: 'Mains' },
    pasta: { emoji: '🍝', color: 'from-yellow-400 to-red-400', displayName: 'Pasta' },
    sides: { emoji: '🥗', color: 'from-green-400 to-emerald-500', displayName: 'Sides' },
};

const defaultMeta = { emoji: '🍴', color: 'from-gray-400 to-gray-600', displayName: 'Food' };

export const CategoryPage = () => {
    const { category } = useParams<{ category: string }>();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [results, setResults] = useState<CategoryResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cartItems = useSelector((state: RootState) => state.cart.items);

    // Get category display info
    const categoryKey = category?.toLowerCase() || '';
    const meta = categoryMeta[categoryKey] || defaultMeta;
    const displayName = meta.displayName || category || 'Category';

    useEffect(() => {
        if (!category) {
            setError('No category specified');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        canteenAPI.getByCategory(category)
            .then(res => {
                if (!res.data.success) {
                    throw new Error(res.data.error || 'Failed to fetch results');
                }
                setResults(res.data.data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error('[CategoryPage] Error fetching category:', err);
                const errorMessage = err.response?.data?.error || err.message || 'Failed to load category';
                setError(errorMessage);
                setLoading(false);
            });
    }, [category]);

    const getItemQty = (itemId: string) => {
        const item = cartItems.find(i => i._id === itemId);
        return item?.qty || 0;
    };

    const handleAddToCart = (item: MenuItemData, canteenName: string) => {
        dispatch(addToCart({ ...item, canteenName }));
    };

    const handleRemoveFromCart = (itemId: string) => {
        dispatch(removeFromCart(itemId));
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                {/* Category Header Skeleton */}
                <div className={`bg-gradient-to-br ${meta.color} py-12`}>
                    <div className="max-w-6xl mx-auto px-4">
                        <div className="h-8 w-32 bg-white/20 rounded animate-pulse mb-4"></div>
                        <div className="h-12 w-64 bg-white/30 rounded animate-pulse"></div>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto px-4 py-8">
                    <div className="space-y-8">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                                <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
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
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-6xl mx-auto px-4 py-20">
                    <div className="text-center">
                        <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
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

            {/* Category Header */}
            <div className={`bg-gradient-to-br ${meta.color} py-12 relative overflow-hidden`}>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/4"></div>

                <div className="max-w-6xl mx-auto px-4 relative">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-medium">Back to Home</span>
                    </button>

                    <div className="flex items-center gap-4">
                        <span className="text-6xl filter drop-shadow-lg">{meta.emoji}</span>
                        <div>
                            <h1 className="text-4xl font-black text-white drop-shadow-md">
                                {displayName}
                            </h1>
                            <p className="text-white/80 font-medium mt-1">
                                {results.length} {results.length === 1 ? 'canteen' : 'canteens'} serving {displayName.toLowerCase()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                {results.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">😔</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            No {displayName.toLowerCase()} available right now
                        </h3>
                        <p className="text-gray-500 mb-6">
                            Check back later or try a different category
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors"
                        >
                            Browse all canteens
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
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
                                            {result.canteen.name}
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
                                            {result.itemCount} {result.itemCount === 1 ? 'item' : 'items'}
                                        </span>
                                    </div>
                                </div>

                                {/* Filtered Items */}
                                <div className="p-4">
                                    <div className="grid gap-4">
                                        {result.items.map(item => {
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
                                                            <h3 className="font-bold text-gray-900">{item.name}</h3>
                                                        </div>

                                                        {item.description && (
                                                            <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                                                                {item.description}
                                                            </p>
                                                        )}

                                                        <p className="text-lg font-bold text-gray-900">₹{item.price}</p>
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
