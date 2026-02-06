import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../api';
import { addToCart, updateQuantity } from '../store';
import { Navbar } from '../components/Navbar';
import { OrderCard } from '../components/OrderCard';
import { RatingModal } from '../components/RatingModal';
import { StarRating } from '../components/StarRating';
import { staggerContainer, pageVariants } from '../utils/motion';
import { useOrderPolling } from '../hooks/useOrderPolling';
import { Search, ShoppingBag } from 'lucide-react';
import type { RootState, MenuItem } from '../store';

// Type matching the OrderCard props
interface Order {
    _id: string;
    orderId: string;
    canteenId: {
        _id: string;
        name: string;
        image?: string;
    };
    items: any[];
    totalAmount: number;
    status: 'pending' | 'placed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
    paymentStatus: string;
    createdAt: string;
    itemTotal: number;
    isReviewed?: boolean;
    rating?: number;
}

const OrderSkeleton = () => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
                <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-100 rounded w-1/3 animate-pulse" />
                    <div className="h-3 bg-gray-50 rounded w-1/4 animate-pulse" />
                </div>
            </div>
            <div className="w-20 h-6 bg-gray-100 rounded-full animate-pulse" />
        </div>
        <div className="space-y-2">
            <div className="h-3 bg-gray-50 rounded w-2/3 animate-pulse" />
            <div className="h-3 bg-gray-50 rounded w-1/2 animate-pulse" />
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-gray-50">
            <div className="h-8 bg-gray-50 rounded w-20 animate-pulse" />
            <div className="h-8 bg-gray-100 rounded w-24 animate-pulse" />
        </div>
    </div>
);

export const MyOrders = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ongoing' | 'history'>('ongoing');
    const [searchTerm, setSearchTerm] = useState('');
    const [ratingOrder, setRatingOrder] = useState<Order | null>(null);

    // Real-time status updates
    useOrderPolling(orders, (updated) => {
        setOrders(prev => prev.map(o => o._id === updated._id ? { ...o, ...updated, status: updated.status as Order['status'] } : o));
    });

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        fetchOrders();
    }, [isAuthenticated]);

    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            const response = await orderAPI.getAll({ limit: 50 });
            if (response.data.success) {
                setOrders(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReorder = (order: Order) => {
        if (!order.items || order.items.length === 0) return;

        order.items.forEach((item) => {
            const menuItem: MenuItem = {
                _id: item.itemId,
                name: item.name,
                price: item.price,
                isVeg: true,
                canteenId: order.canteenId._id,
                category: 'Reorder',
                inStock: true
            };

            dispatch(addToCart({
                ...menuItem,
                canteenName: order.canteenId.name
            }));

            if (item.qty > 1) {
                dispatch(updateQuantity({ id: item.itemId, qty: item.qty }));
            }
        });

        navigate('/cart');
    };

    const filteredOrders = orders.filter(order => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchId = order.orderId.toLowerCase().includes(term);
            const matchCanteen = order.canteenId.name.toLowerCase().includes(term);
            if (!matchId && !matchCanteen) return false;
        }

        const isOngoing = ['pending', 'placed', 'preparing', 'ready', 'out_for_delivery'].includes(order.status);
        if (activeTab === 'ongoing') return isOngoing;
        return !isOngoing;
    });

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="min-h-screen bg-gray-50 pb-24 md:pb-0"
        >
            <Navbar />

            {/* Desktop Modal Wrapper / Mobile Full Page */}
            <div className="md:fixed md:inset-0 md:z-50 md:flex md:items-center md:justify-center md:bg-black/50 md:backdrop-blur-sm md:p-4 pointer-events-none md:pointer-events-auto">
                <div className="w-full md:max-w-2xl md:bg-white md:rounded-3xl md:shadow-2xl md:h-[85vh] md:overflow-hidden flex flex-col pointer-events-auto relative">

                    {/* Header */}
                    <div className="bg-white sticky top-0 z-10 px-5 py-4 border-b border-gray-100 md:px-8 md:py-6">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-2xl font-black text-gray-900">My Orders</h1>
                            <button
                                onClick={() => navigate(-1)}
                                className="md:hidden text-sm font-bold text-orange-600"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="hidden md:flex w-8 h-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                <span className="font-bold text-gray-500">✕</span>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by restaurant or order ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-gray-100 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-orange-500/20 text-gray-900 placeholder:text-gray-400"
                            />
                        </div>

                        {/* Tabs */}
                        <div className="flex p-1 bg-gray-100 rounded-xl">
                            <button
                                onClick={() => setActiveTab('ongoing')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ongoing'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Ongoing
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                History
                            </button>
                        </div>
                    </div>

                    {/* Orders List */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-8 bg-gray-50">
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <OrderSkeleton key={i} />
                                ))}
                            </div>
                        ) : filteredOrders.length > 0 ? (
                            <motion.div
                                variants={staggerContainer}
                                initial="hidden"
                                animate="show"
                                className="space-y-4 pb-10"
                            >
                                <AnimatePresence mode='popLayout'>
                                    {filteredOrders.map(order => (
                                        <OrderCard
                                            key={order._id}
                                            order={order}
                                            onReorder={handleReorder}
                                            onRate={(order) => setRatingOrder(order)}
                                        />
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-4 text-orange-200">
                                    <ShoppingBag size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                    {activeTab === 'ongoing' ? 'No active orders' : 'No past orders'}
                                </h3>
                                <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
                                    {activeTab === 'ongoing'
                                        ? "Hungry? Place an order now and track it here."
                                        : "Your past orders will appear here once delivered."}
                                </p>
                                <button
                                    onClick={() => navigate('/')}
                                    className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform"
                                >
                                    Browse Canteens
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Rating Modal */}
            {ratingOrder && (
                <RatingModal
                    isOpen={!!ratingOrder}
                    onClose={() => setRatingOrder(null)}
                    orderId={ratingOrder._id}
                    canteenName={ratingOrder.canteenId.name}
                    canteenImage={ratingOrder.canteenId.image}
                    onSuccess={() => {
                        setOrders(prev => prev.map(o => o._id === ratingOrder._id ? { ...o, isReviewed: true } : o));
                    }}
                />
            )}
        </motion.div >
    );
};
