import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useSocket } from '../socket';
import { useOrderPolling } from '../hooks/useOrderPolling';
import { orderAPI } from '../api';
import { Navbar } from '../components/Navbar';
import {
    CheckCircle, Clock, ChefHat, Bike, Package, XCircle,
    ArrowLeft, MapPin, Phone, MessageSquare, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    pageVariants, staggerContainer, fadeInUp, cardHover,
    pulse, buttonClick
} from '../utils/motion';
import { RatingModal } from '../components/RatingModal';
import { Star } from 'lucide-react';

interface OrderItem {
    itemId: string;
    name: string;
    price: number;
    qty: number;
}

interface Order {
    _id: string;
    orderId: string;
    items: OrderItem[];
    itemTotal: number;
    tax: number;
    deliveryFee: number;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    canteenId?: { name: string; image: string; location?: string };
    isReviewed?: boolean;
    rating?: number;
}

const steps = [
    { status: 'placed', label: 'Order Received', icon: Clock, description: 'We received your order', color: 'bg-blue-500' },
    { status: 'confirmed', label: 'Confirmed', icon: CheckCircle, description: 'Restaurant accepted your order', color: 'bg-purple-500' },
    { status: 'preparing', label: 'Preparing', icon: ChefHat, description: 'Chef is working magic', color: 'bg-orange-500' },
    { status: 'ready', label: 'Ready for Pickup', icon: Package, description: 'Your food is packed & ready', color: 'bg-indigo-500' },
    { status: 'completed', label: 'Enjoy your Meal', icon: Bike, description: 'Order picked up/delivered', color: 'bg-green-500' },
];

export const OrderTracking = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showRating, setShowRating] = useState(false);
    const socket = useSocket();

    // Real-time Polling
    useOrderPolling(order, (updated) => {
        setOrder(prev => prev ? { ...prev, ...updated } : null);
        // If status changes to delivered, show rating modal automatically? 
        // No, show CTA. But if it changes LIVE, maybe show toast?
    });

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        if (id) loadOrder();
    }, [id, isAuthenticated]);

    useEffect(() => {
        if (socket && id) {
            socket.emit('join_order', id);
            socket.on('order_status', (data: { orderId: string; status: string }) => {
                if (data.orderId === id || data.orderId === order?._id) {
                    setOrder(prev => prev ? { ...prev, status: data.status } : null);
                }
            });
            return () => { socket.off('order_status'); };
        }
    }, [socket, id, order?._id]);

    const loadOrder = async () => {
        try {
            const res = await orderAPI.getOne(id!);
            setOrder(res.data.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load order');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!order || !confirm('Are you sure you want to cancel this order?')) return;
        try {
            await orderAPI.cancel(order._id, 'Customer requested cancellation');
            setOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to cancel order');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 font-medium animate-pulse">Locating your order...</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-6 bg-red-50 p-6 rounded-full">
                        <XCircle size={48} className="text-red-500" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
                    <p className="text-gray-500 mb-8 max-w-xs">{error || "We couldn't seem to find the order you're looking for."}</p>
                    <motion.button
                        variants={buttonClick}
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => navigate('/')}
                        className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg"
                    >
                        Back to Home
                    </motion.button>
                </div>
            </div>
        );
    }

    const currentStepIndex = order.status === 'cancelled' ? -1 : steps.findIndex(s => s.status === order.status);
    const isCancelled = order.status === 'cancelled';
    const canCancel = ['placed', 'confirmed'].includes(order.status);

    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            className="min-h-screen bg-gray-50/50 pb-20"
        >
            <Navbar />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
                {/* Header Actions */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8"
                >
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors">
                        <ArrowLeft size={20} />
                        <span>Home</span>
                    </button>
                    <div className="text-sm font-bold text-gray-400">Order ID: #{order.orderId}</div>
                </motion.div>

                {/* Hero Status Card */}
                <motion.div
                    variants={fadeInUp}
                    className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden mb-8 border border-gray-100"
                >
                    <div className="p-8 pb-12 bg-gradient-to-br from-gray-900 to-gray-800 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 mb-2"
                                >
                                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-xs font-bold uppercase tracking-wider border border-white/10">
                                        {isCancelled ? 'Cancelled' : 'Live Status'}
                                    </span>
                                    {!isCancelled && (
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                    )}
                                </motion.div>
                                <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">
                                    {isCancelled ? 'Order Cancelled' : steps[currentStepIndex]?.label || 'Updates Soon'}
                                </h1>
                                <p className="text-white/60 font-medium max-w-sm">
                                    {isCancelled
                                        ? 'This order was cancelled.'
                                        : steps[currentStepIndex]?.description || 'Hold tight, we are updating your status.'}
                                </p>
                            </div>

                            {/* Canteen Info Pill */}
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4 max-w-xs cursor-pointer hover:bg-white/20 transition-colors">
                                <img
                                    src={order.canteenId?.image || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=100&q=80"}
                                    alt={order.canteenId?.name || "Canteen"}
                                    className="w-12 h-12 rounded-xl object-cover"
                                />
                                <div>
                                    <h3 className="font-bold text-white text-sm">{order.canteenId?.name || "Campus Canteen"}</h3>
                                    <div className="flex items-center gap-1 text-xs text-white/50 mt-0.5">
                                        <MapPin size={12} />
                                        <span>{order.canteenId?.location || "Main Campus"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    {!isCancelled && (
                        <div className="px-8 -mt-6 pb-8 relative z-10">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <div className="relative pl-4 space-y-8 before:absolute before:left-[27px] before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-100">
                                    {steps.map((step, idx) => {
                                        const isCompleted = idx <= currentStepIndex;
                                        const isCurrent = idx === currentStepIndex;
                                        const Icon = step.icon;

                                        return (
                                            <motion.div
                                                key={step.status}
                                                initial={false}
                                                animate={isCompleted ? "show" : "hidden"}
                                                className={`relative flex gap-4 ${isCompleted ? 'opacity-100' : 'opacity-40 grayscale'} transition-all duration-500`}
                                            >
                                                {/* Timeline Node */}
                                                <div
                                                    className={`
                                                        w-12 h-12 rounded-full flex items-center justify-center shrink-0 z-10 transition-all duration-500
                                                        ${isCompleted ? `${step.color} text-white shadow-lg shadow-gray-200` : 'bg-gray-100 text-gray-400'}
                                                        ${isCurrent ? 'ring-4 ring-offset-2 ring-orange-100 scale-110' : ''}
                                                    `}
                                                >
                                                    <Icon size={20} />
                                                </div>

                                                {/* Content */}
                                                <div className={`pt-1.5 transition-all duration-500 ${isCurrent ? 'translate-x-2' : ''}`}>
                                                    <h3 className={`font-bold text-gray-900 ${isCurrent ? 'text-lg' : 'text-base'}`}>{step.label}</h3>
                                                    <p className="text-sm text-gray-500">{step.description}</p>
                                                    {isCurrent && (
                                                        <motion.div
                                                            layoutId="pulse-dot"
                                                            className="inline-flex mt-2 items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100"
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                                            <span className="text-xs font-bold uppercase tracking-wide">Current Status</span>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Order Details Grid */}
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="grid md:grid-cols-2 gap-6"
                >
                    {/* Item List */}
                    <motion.div variants={fadeInUp} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-6 text-gray-900">
                            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                                <CheckCircle size={20} />
                            </div>
                            <h3 className="font-bold text-lg">Your Items</h3>
                        </div>
                        <div className="space-y-4 divide-y divide-gray-100">
                            {order.items.map((item, i) => (
                                <div key={i} className="flex justify-between items-center pt-4 first:pt-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                            {item.qty}x
                                        </div>
                                        <span className="font-semibold text-gray-700">{item.name}</span>
                                    </div>
                                    <span className="font-bold text-gray-900">₹{item.price * item.qty}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">Total Paid</span>
                                <span className="text-xl font-black text-gray-900">₹{order.totalAmount}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Actions & Help */}
                    <motion.div variants={fadeInUp} className="space-y-6">
                        {/* Help Card */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-lg text-gray-900 mb-4">Need Help?</h3>
                            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group mb-3">
                                <div className="flex items-center gap-3">
                                    <Phone size={20} className="text-gray-400 group-hover:text-gray-900" />
                                    <span className="font-semibold text-gray-700 group-hover:text-gray-900">Call Restaurant</span>
                                </div>
                                <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-900" />
                            </button>
                            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <MessageSquare size={20} className="text-gray-400 group-hover:text-gray-900" />
                                    <span className="font-semibold text-gray-700 group-hover:text-gray-900">Chat Support</span>
                                </div>
                                <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-900" />
                            </button>
                        </div>

                        {/* Cancel Button */}
                        {canCancel && (
                            <motion.button
                                variants={buttonClick}
                                whileHover="hover"
                                whileTap="tap"
                                onClick={handleCancel}
                                className="w-full py-4 rounded-xl border-2 border-red-100 text-red-500 font-bold bg-white hover:bg-red-50 transition-all shadow-sm hover:shadow-md"
                            >
                                Cancel Order
                            </motion.button>
                        )}
                    </motion.div>
                </motion.div>
            </div>

            {/* Rating CTA */}
            <AnimatePresence>
                {order.status === 'delivered' && !order.isReviewed && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-0 left-0 right-0 p-4 z-40 flex justify-center pb-8"
                    >
                        <motion.button
                            onClick={() => setShowRating(true)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-gray-900 text-white px-8 py-4 rounded-full shadow-2xl shadow-gray-900/40 flex items-center gap-3 font-bold text-lg border border-gray-800"
                        >
                            <Star className="fill-yellow-400 text-yellow-400" />
                            Rate Your Order
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Rating Modal */}
            {order && (
                <RatingModal
                    isOpen={showRating}
                    onClose={() => setShowRating(false)}
                    orderId={order._id}
                    canteenName={order.canteenId?.name}
                    canteenImage={order.canteenId?.image}
                    onSuccess={() => {
                        setOrder(prev => prev ? { ...prev, isReviewed: true } : null);
                    }}
                />
            )}
        </motion.div>
    );
};
