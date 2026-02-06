import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../api';
import { addToCart, updateQuantity } from '../store';
import { Navbar } from '../components/Navbar';
import { OrderCard } from '../components/OrderCard';
import { staggerContainer, pageVariants } from '../utils/motion';
import { Loader2, Search, ShoppingBag } from 'lucide-react';
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
}

export const MyOrders = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ongoing' | 'history'>('ongoing');
    const [searchTerm, setSearchTerm] = useState('');

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
        // Simple reorder logic: Add all items to cart
        if (!order.items || order.items.length === 0) return;

        // Clear existing cart if needed? 
        // addToCart handles distinct canteens by clearing.
        // We'll iterate and add.

        let first = true;
        order.items.forEach((item) => {
            // Construct a partial MenuItem
            // Note: We lack description, image, isVeg from order history
            // We use safe defaults.
            const menuItem: MenuItem = {
                _id: item.itemId,
                name: item.name,
                price: item.price,
                isVeg: true, // Default to true as per schema default, though risky
                canteenId: order.canteenId._id,
                category: 'Reorder',
                inStock: true
            };

            // Dispatch add
            dispatch(addToCart({
                ...menuItem,
                canteenName: order.canteenId.name
            }));

            // Dispatch quantity update if > 1
            if (item.qty > 1) {
                dispatch(updateQuantity({ id: item.itemId, qty: item.qty }));
            }
        });

        // Show toast? (We need a toast system, for now just navigate)
        navigate('/cart');
    };

    const filteredOrders = orders.filter(order => {
        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchId = order.orderId.toLowerCase().includes(term);
            const matchCanteen = order.canteenId.name.toLowerCase().includes(term);
            if (!matchId && !matchCanteen) return false;
        }

        // Tab filter
        const isOngoing = ['pending', 'placed', 'preparing', 'ready', 'out_for_delivery'].includes(order.status);
        if (activeTab === 'ongoing') return isOngoing;
        return !isOngoing; // history includes delivered, cancelled
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
                            {/* Desktop Close Button */}
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
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <Loader2 size={32} className="animate-spin mb-3 text-orange-500" />
                                <span className="font-bold text-sm">Loading your orders...</span>
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
        </motion.div>
    );
};
