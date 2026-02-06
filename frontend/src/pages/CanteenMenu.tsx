import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, removeFromCart } from '../store';
import type { RootState, MenuItem } from '../store';
import { canteenAPI } from '../api';
import { Navbar } from '../components/Navbar';
import { MenuItemCard } from '../components/MenuItemCard';
import { MenuSkeleton } from '../components/MenuSkeleton';
import { Star, Clock, Search, ChevronLeft, MapPin } from 'lucide-react';
import { useOrderHistory } from '../hooks/useOrderHistory';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { pageVariants, staggerContainer } from '../utils/motion';
import { RatingBadge } from '../components/RatingBadge';
import { RatingBreakdown } from '../components/RatingBreakdown';
import { TopRatedBadge } from '../components/TopRatedBadge';

interface Canteen {
    _id: string;
    name: string;
    image: string;
    rating: number;
    totalRatings?: number;
    tags: string[];
    isTopRated?: boolean;
    ratingBreakdown?: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
    };
    reviewSummary?: string;

    priceRange: string;
    preparationTime?: string;
    description?: string;
    location?: string;
}

interface MenuItemData extends MenuItem {
    category: string;
}

export const CanteenMenu = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [canteen, setCanteen] = useState<Canteen | null>(null);
    const [menu, setMenu] = useState<MenuItemData[]>([]);
    const [menuByCategory, setMenuByCategory] = useState<Record<string, MenuItemData[]>>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('');

    // Scroll handling for parallax
    const { scrollY } = useScroll();
    const yRange = useTransform(scrollY, [0, 300], [0, 150]);
    const opacityRange = useTransform(scrollY, [0, 300], [1, 0]);

    const dispatch = useDispatch();
    const cartItems = useSelector((state: RootState) => state.cart.items);

    // Order history for "Previously ordered" badges
    const { orderedItems } = useOrderHistory();

    useEffect(() => {
        if (id) {
            setLoading(true);
            window.scrollTo(0, 0);
            canteenAPI.getMenu(id)
                .then(res => {
                    setCanteen(res.data.data.canteen);
                    setMenu(res.data.data.menu);
                    const grouped = res.data.data.menuByCategory || {};
                    setMenuByCategory(grouped);

                    if (grouped) {
                        const categories = Object.keys(grouped);
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

    // Filter logic
    const displayedItems = searchQuery
        ? menu.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : menuByCategory[activeCategory] || [];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Hero Skeleton */}
                    <div className="h-64 bg-gray-200 rounded-3xl animate-pulse mb-8" />
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Sidebar Skeleton */}
                        <div className="hidden lg:block space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-10 bg-gray-200 rounded-xl animate-pulse" />
                            ))}
                        </div>
                        {/* Menu Skeleton */}
                        <div className="lg:col-span-3">
                            <MenuSkeleton />
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
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                    <div className="text-6xl mb-4">🏪</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Canteen not found</h2>
                    <p className="text-gray-500 mb-6">The canteen you are looking for does not exist or has been removed.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            className="min-h-screen bg-gray-50/50"
        >
            <Navbar />

            {/* Parallax Hero Section */}
            <div className="relative h-[300px] lg:h-[350px] overflow-hidden">
                <motion.div
                    style={{ y: yRange }}
                    className="absolute inset-0"
                >
                    <img
                        src={canteen.image}
                        alt={canteen.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                </motion.div>

                {/* Back Button */}
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-4 left-4 z-10 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>

                {/* Canteen Info Content */}
                <motion.div
                    style={{ opacity: opacityRange }}
                    className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4"
                >
                    <div className="text-white">
                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl sm:text-4xl md:text-5xl font-black mb-2 tracking-tight"
                        >
                            {canteen.name}
                        </motion.h1>
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-wrap items-center gap-4 text-sm sm:text-base font-medium text-white/90"
                        >
                            <RatingBadge
                                rating={canteen.rating}
                                count={canteen.totalRatings}
                                variant="menu"
                            />
                            {canteen.isTopRated && <TopRatedBadge />}
                            <span className="flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 h-fit">
                                <Clock size={16} />
                                {canteen.preparationTime || '20-30 min'}
                            </span>
                            <span className="flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 h-fit">
                                <MapPin size={16} />
                                {canteen.location || 'Campus Center'}
                            </span>
                        </motion.div>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="mt-2 text-white/70 max-w-xl text-sm sm:text-base line-clamp-1"
                        >
                            {canteen.description || "Best food in campus, made fresh everyday."}
                        </motion.p>
                    </div>
                </motion.div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar: Search & Ratings & Categories */}
                    <div className="lg:w-64 flex-shrink-0 space-y-6">
                        {/* Search Box */}
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => {
                                    setSearchQuery(e.target.value);
                                    if (e.target.value) setActiveCategory(''); // Clear category when searching
                                }}
                                placeholder="Search menu..."
                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm font-medium"
                            />
                        </div>

                        {/* Ratings Breakdown (Desktop) */}
                        {canteen.ratingBreakdown && (
                            <div className="hidden lg:block bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Ratings
                                </h3>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-3xl font-black text-gray-900">{canteen.rating.toFixed(1)}</span>
                                    <div className="flex flex-col">
                                        <div className="flex text-yellow-500 text-xs">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={12} fill={i < Math.round(canteen.rating) ? "currentColor" : "none"} className={i < Math.round(canteen.rating) ? "" : "text-gray-300"} />
                                            ))}
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium">{canteen.totalRatings} ratings</span>
                                    </div>
                                </div>
                                <RatingBreakdown breakdown={canteen.ratingBreakdown} totalRatings={canteen.totalRatings || 0} />
                            </div>
                        )}

                        {/* AI Review Summary (Desktop) */}
                        {canteen.reviewSummary && (
                            <div className="hidden lg:block bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <Star size={48} fill="currentColor" className="text-indigo-900" />
                                </div>
                                <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                    AI Summary
                                </h3>
                                <p className="text-xs text-indigo-900/80 italic leading-relaxed font-medium">
                                    "{canteen.reviewSummary}"
                                </p>
                            </div>
                        )}

                        {/* Categories Desktop */}
                        {!searchQuery && categories.length > 0 && (
                            <div className="hidden lg:block sticky top-24">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
                                    Categories
                                </h3>
                                <div className="space-y-1">
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setActiveCategory(cat)}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all relative overflow-hidden group ${activeCategory === cat
                                                ? 'text-orange-600 bg-orange-50'
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                                }`}
                                        >
                                            <span className="relative z-10 flex justify-between items-center">
                                                {cat}
                                                <span className={`text-xs px-2 py-0.5 rounded-md transition-colors ${activeCategory === cat ? 'bg-orange-100' : 'bg-gray-200'
                                                    }`}>
                                                    {menuByCategory[cat]?.length || 0}
                                                </span>
                                            </span>
                                            {activeCategory === cat && (
                                                <motion.div
                                                    layoutId="activeCategory"
                                                    className="absolute inset-0 bg-orange-50 border-l-4 border-orange-500"
                                                    initial={false}
                                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mobile Category Scroller */}
                    {!searchQuery && categories.length > 0 && (
                        <div className="lg:hidden -mx-4 px-4 overflow-x-auto scrollbar-hide sticky top-[80px] z-30 bg-gray-50/95 backdrop-blur-sm py-2 border-b border-gray-200/50">
                            <div className="flex gap-2 min-w-max">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${activeCategory === cat
                                            ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-200'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Menu Items Grid */}
                    <div className="flex-1 min-h-[50vh]">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">
                                    {searchQuery ? `Search Results` : activeCategory}
                                </h2>
                                <p className="text-gray-500 text-sm mt-1 font-medium">
                                    {displayedItems.length} items available
                                </p>
                            </div>
                        </div>

                        <AnimatePresence mode='wait'>
                            {displayedItems.length > 0 ? (
                                <motion.div
                                    key={activeCategory + searchQuery}
                                    variants={staggerContainer}
                                    initial="hidden"
                                    animate="show"
                                    exit="exit"
                                    className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6"
                                >
                                    {displayedItems.map(item => {
                                        const qty = getItemQty(item._id);
                                        const itemHistory = orderedItems[item._id];
                                        return (
                                            <MenuItemCard
                                                key={item._id}
                                                item={item}
                                                qty={qty}
                                                wasPreviouslyOrdered={!!itemHistory}
                                                orderCount={itemHistory?.orderCount || 0}
                                                onAdd={handleAddToCart}
                                                onRemove={handleRemoveFromCart}
                                            />
                                        );
                                    })}
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center py-20 text-center"
                                >
                                    <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                                        <Search size={48} className="text-gray-200" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">No items found</h3>
                                    <p className="text-gray-500 max-w-xs mx-auto">
                                        Try searching for something else or switch categories.
                                    </p>
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="mt-4 text-orange-600 font-bold hover:underline"
                                        >
                                            Clear Search
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </motion.div >
    );
};
