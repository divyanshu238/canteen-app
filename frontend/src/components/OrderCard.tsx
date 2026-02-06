import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Box, Check, Clock, RotateCcw, Truck, Utensils, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cardVariants } from '../utils/motion';

import { RatingBadge } from './RatingBadge';
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
    canteenId: {
        _id: string;
        name: string;
        image?: string;
        rating?: number;
        totalRatings?: number;
    };
    items: OrderItem[];
    totalAmount: number;
    status: 'pending' | 'placed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled';
    paymentStatus: string;
    createdAt: string;
    itemTotal: number;
    isReviewed?: boolean;
    rating?: number;
    review?: string;
    reviewCreatedAt?: string;
}

interface OrderCardProps {
    order: Order;
    onReorder: (order: Order) => void;
    onRate?: (order: Order) => void;
}

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'delivered':
        case 'completed': // Support both
            return { color: 'bg-green-100 text-green-700', icon: Check, label: 'Delivered' };
        case 'cancelled':
            return { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Cancelled' };
        case 'out_for_delivery':
            return { color: 'bg-blue-100 text-blue-700', icon: Truck, label: 'On the Way' };
        case 'ready':
            return { color: 'bg-teal-100 text-teal-700', icon: Box, label: 'Ready for Pickup' };
        case 'preparing':
            return { color: 'bg-orange-100 text-orange-700', icon: Utensils, label: 'Preparing', animate: true };
        case 'placed':
            return { color: 'bg-purple-100 text-purple-700', icon: Clock, label: 'Order Placed' };
        default:
            return { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Processing' };
    }
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, onReorder, onRate }) => {
    const navigate = useNavigate();
    const config = getStatusConfig(order.status);
    const StatusIcon = config.icon;
    const date = new Date(order.createdAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // Edit Window Logic
    const getEditStatus = () => {
        if (!order.isReviewed || !order.reviewCreatedAt) return { editable: false };
        const diff = Date.now() - new Date(order.reviewCreatedAt).getTime();
        const minutesLeft = 15 - Math.floor(diff / 60000);
        return { editable: minutesLeft > 0, minutesLeft };
    };

    const { editable, minutesLeft } = getEditStatus();

    const handleCardClick = () => {
        navigate(`/order/${order._id}`);
    };

    return (
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer group"
            onClick={handleCardClick}
        >
            {/* Header: Canteen Info & Status */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                        {order.canteenId.image ? (
                            <img src={order.canteenId.image} alt={order.canteenId.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Utensils size={20} />
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 leading-tight flex items-center gap-2">
                            {order.canteenId.name}
                            {order.canteenId.rating && (
                                <RatingBadge rating={order.canteenId.rating} count={order.canteenId.totalRatings} variant="minimal" className="scale-90 origin-left opacity-70" />
                            )}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">{order.orderId} • {date}</p>
                    </div>
                </div>

                <div className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                    <StatusIcon size={12} className={config.animate ? 'animate-pulse' : ''} />
                    {config.label}
                </div>
            </div>

            {/* Items Summary */}
            <div className="space-y-1 mb-4">
                {order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm text-gray-600">
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                            <span>{item.qty} x {item.name}</span>
                        </span>
                    </div>
                ))}
                {order.items.length > 2 && (
                    <p className="text-xs text-gray-400 pl-3.5 font-medium">+ {order.items.length - 2} more items</p>
                )}
            </div>

            {/* Footer: User Rating or Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Total Bill</span>
                    <span className="text-base font-black text-gray-900">₹{order.totalAmount}</span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Rating Logic */}
                    {(order.status === 'delivered' || order.status === 'completed') && (
                        <>
                            {order.isReviewed ? (
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1 text-yellow-500 font-bold text-sm">
                                        <span>{order.rating}</span>
                                        <Star size={12} fill="currentColor" />
                                    </div>
                                    {editable ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRate && onRate(order);
                                            }}
                                            className="text-[10px] font-bold text-orange-600 hover:underline mt-0.5"
                                        >
                                            Edit ({minutesLeft}m left)
                                        </button>
                                    ) : (
                                        <span className="text-[10px] text-gray-400 font-medium">Rated</span>
                                    )}
                                </div>
                            ) : (
                                onRate && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRate(order);
                                        }}
                                        className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors"
                                    >
                                        Rate Order
                                    </motion.button>
                                )
                            )}
                        </>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onReorder(order);
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-xl transition-colors"
                    >
                        <RotateCcw size={14} />
                        Reorder
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};
