import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, removeFromCart } from '../store';
import type { RootState, MenuItem } from '../store';
import { canteenAPI } from '../api';
import { Navbar } from '../components/Navbar';
import { Star, Clock, Search, Plus, Minus, RotateCcw } from 'lucide-react';
import { useOrderHistory } from '../hooks/useOrderHistory';

interface Canteen {
    _id: string;
    name: string;
    image: string;
    rating: number;
    tags: string[];
    priceRange: string;
    preparationTime?: string;
    description?: string;
}

interface MenuItemData extends MenuItem {
    category: string;
}

export const CanteenMenu = () => {
    const { id } = useParams<{ id: string }>();
    const [canteen, setCanteen] = useState<Canteen | null>(null);
    const [menu, setMenu] = useState<MenuItemData[]>([]);
    const [menuByCategory, setMenuByCategory] = useState<Record<string, MenuItemData[]>>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('');

    const dispatch = useDispatch();
    const cartItems = useSelector((state: RootState) => state.cart.items);

    // Order history for "Previously ordered" badges
    const { orderedItems } = useOrderHistory();

    useEffect(() => {
        if (id) {
            setLoading(true);
            canteenAPI.getMenu(id)
                .then(res => {
                    setCanteen(res.data.data.canteen);
                    setMenu(res.data.data.menu);
                    setMenuByCategory(res.data.data.menuByCategory || {});
                    if (res.data.data.menuByCategory) {
                        const categories = Object.keys(res.data.data.menuByCategory);
                        if (categories.length > 0) {
                            setActiveCategory(categories[0]);
                        }
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [id]);

    const getItemQty = (itemId: string) => {
        const item = cartItems.find(i => i._id === itemId);
        return item?.qty || 0;
    };

    const handleAddToCart = (item: MenuItemData) => {
        dispatch(addToCart({ ...item, canteenName: canteen?.name }));
    };

    const handleRemoveFromCart = (itemId: string) => {
        dispatch(removeFromCart(itemId));
    };

    const categories = Object.keys(menuByCategory);
    const filteredMenu = searchQuery
        ? menu.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : menuByCategory[activeCategory] || [];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-6xl mx-auto px-4 py-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-48 bg-gray-200 rounded-3xl"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!canteen) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="flex items-center justify-center py-20">
                    <p className="text-gray-500">Canteen not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            {/* Canteen Header */}
            <div className="relative h-64 overflow-hidden">
                <img
                    src={canteen.image}
                    alt={canteen.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6 max-w-6xl mx-auto">
                    <h1 className="text-3xl font-black text-white mb-2">{canteen.name}</h1>
                    <div className="flex items-center gap-4 text-white/90">
                        <div className="flex items-center gap-1.5 bg-green-600 px-2.5 py-1 rounded-lg">
                            <Star size={14} fill="white" />
                            <span className="font-bold">{canteen.rating}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock size={14} />
                            <span>{canteen.preparationTime || '20-30 min'}</span>
                        </div>
                        <span>{canteen.tags?.join(" • ") || "Fast Food"}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Search Bar */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search for dishes..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                </div>

                <div className="flex gap-6">
                    {/* Category Sidebar */}
                    {!searchQuery && categories.length > 0 && (
                        <div className="hidden md:block w-48 flex-shrink-0">
                            <div className="sticky top-24 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-3">Categories</h3>
                                <div className="space-y-1">
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setActiveCategory(cat)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat
                                                ? 'bg-orange-100 text-orange-600'
                                                : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {cat} ({menuByCategory[cat]?.length || 0})
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Menu Items */}
                    <div className="flex-1">
                        {searchQuery && (
                            <p className="text-sm text-gray-500 mb-4">
                                {filteredMenu.length} results for "{searchQuery}"
                            </p>
                        )}

                        <div className="grid gap-4">
                            {filteredMenu.map(item => {
                                const qty = getItemQty(item._id);
                                const itemHistory = orderedItems[item._id];
                                const wasPreviouslyOrdered = !!itemHistory;
                                const orderCount = itemHistory?.orderCount || 0;

                                return (
                                    <div
                                        key={item._id}
                                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4"
                                    >
                                        {/* Item Image */}
                                        {item.image && (
                                            <div className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden">
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
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-900">{item.name}</h3>
                                                    {/* Previously Ordered Badge */}
                                                    {wasPreviouslyOrdered && (
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <RotateCcw size={11} className="text-amber-600" />
                                                            <span className="text-xs font-semibold text-amber-700">
                                                                {orderCount > 1 ? `Ordered ${orderCount}x` : 'Previously ordered'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
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
                                                    onClick={() => handleAddToCart(item)}
                                                    className="px-6 py-2 bg-white border-2 border-green-600 text-green-600 font-bold rounded-xl hover:bg-green-50 transition-colors"
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
                                                        onClick={() => handleAddToCart(item)}
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

                        {filteredMenu.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No items found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
