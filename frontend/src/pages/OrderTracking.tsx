import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useSocket } from '../socket';
import { orderAPI } from '../api';
import { Navbar } from '../components/Navbar';
import { CheckCircle, Clock, ChefHat, Bike, Package, XCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    canteenId?: { name: string; image: string };
}

const steps = [
    { status: 'placed', label: 'Order Placed', icon: Clock, description: 'We received your order' },
    { status: 'confirmed', label: 'Confirmed', icon: CheckCircle, description: 'Restaurant accepted' },
    { status: 'preparing', label: 'Preparing', icon: ChefHat, description: 'Chef is cooking' },
    { status: 'ready', label: 'Ready', icon: Package, description: 'Ready for pickup' },
    { status: 'completed', label: 'Completed', icon: Bike, description: 'Order delivered' },
];

export const OrderTracking = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const socket = useSocket();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (id) {
            loadOrder();
        }
    }, [id, isAuthenticated]);

    useEffect(() => {
        if (socket && id) {
            socket.emit('join_order', id);

            socket.on('order_status', (data: { orderId: string; status: string }) => {
                if (data.orderId === id || data.orderId === order?._id) {
                    setOrder(prev => prev ? { ...prev, status: data.status } : null);
                }
            });

            return () => {
                socket.off('order_status');
            };
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
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="flex flex-col items-center justify-center py-20">
                    <XCircle size={48} className="text-red-500 mb-4" />
                    <p className="text-gray-600 mb-4">{error || 'Order not found'}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="text-orange-600 font-bold hover:underline"
                    >
                        Go back home
                    </button>
                </div>
            </div>
        );
    }

    const currentStepIndex = order.status === 'cancelled'
        ? -1
        : steps.findIndex(s => s.status === order.status);

    const isCancelled = order.status === 'cancelled';
    const canCancel = ['placed', 'confirmed'].includes(order.status);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft size={18} />
                    Back to Home
                </button>

                {/* Order Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
                        <div className="flex items-center justify-between mb-2">
                            <h1 className="text-xl font-black text-gray-900">
                                Order #{order.orderId}
                            </h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isCancelled
                                    ? 'bg-red-100 text-red-600'
                                    : order.status === 'completed'
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-orange-100 text-orange-600'
                                }`}>
                                {order.status}
                            </span>
                        </div>
                        {order.canteenId && (
                            <p className="text-gray-600 text-sm">
                                From {order.canteenId.name}
                            </p>
                        )}
                    </div>

                    {/* Status Tracker */}
                    {!isCancelled && (
                        <div className="p-6">
                            <div className="relative">
                                {steps.map((step, idx) => {
                                    const isCompleted = idx <= currentStepIndex;
                                    const isCurrent = idx === currentStepIndex;
                                    const Icon = step.icon;

                                    return (
                                        <div key={step.status} className="flex items-start gap-4 mb-6 last:mb-0">
                                            {/* Icon */}
                                            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isCompleted
                                                    ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                                                    : 'bg-gray-100 text-gray-400'
                                                }`}>
                                                <Icon size={20} />

                                                {/* Connecting line */}
                                                {idx < steps.length - 1 && (
                                                    <div className={`absolute top-12 left-1/2 w-0.5 h-6 -translate-x-1/2 ${idx < currentStepIndex ? 'bg-green-600' : 'bg-gray-200'
                                                        }`}></div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className={`pt-2 ${isCompleted ? 'opacity-100' : 'opacity-50'}`}>
                                                <h3 className="font-bold text-gray-900">{step.label}</h3>
                                                <p className="text-sm text-gray-500">{step.description}</p>

                                                <AnimatePresence>
                                                    {isCurrent && (
                                                        <motion.span
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="inline-block mt-2 text-xs font-bold text-white bg-orange-500 px-3 py-1 rounded-full"
                                                        >
                                                            In Progress
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Cancelled Message */}
                    {isCancelled && (
                        <div className="p-6 text-center">
                            <XCircle size={48} className="text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Order Cancelled</h3>
                            <p className="text-gray-500">This order has been cancelled.</p>
                        </div>
                    )}

                    {/* Order Items */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-900 mb-4">Order Details</h3>
                        <div className="space-y-3 mb-4">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-gray-600">{item.qty} x {item.name}</span>
                                    <span className="font-semibold">₹{item.price * item.qty}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-gray-200 pt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Item Total</span>
                                <span>₹{order.itemTotal}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Delivery Fee</span>
                                <span>₹{order.deliveryFee}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">GST</span>
                                <span>₹{order.tax?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                                <span>Total</span>
                                <span className="text-green-600">₹{order.totalAmount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Cancel Button */}
                    {canCancel && (
                        <div className="p-6 border-t border-gray-100">
                            <button
                                onClick={handleCancel}
                                className="w-full py-3 border-2 border-red-500 text-red-500 font-bold rounded-xl hover:bg-red-50 transition-colors"
                            >
                                Cancel Order
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
