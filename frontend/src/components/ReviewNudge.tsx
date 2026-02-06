import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, MessageSquarePlus } from 'lucide-react';
import { orderAPI } from '../api';
import { RatingModal } from './RatingModal';

interface Order {
    _id: string;
    canteenId: {
        name: string;
        image?: string;
    };
    totalAmount: number;
    createdAt: string;
}

export const ReviewNudge = () => {
    const [order, setOrder] = useState<Order | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const checkForUnreviewedOrders = async () => {
            try {
                // Get recent completed orders
                const res = await orderAPI.getAll({ status: 'completed', limit: 5 });
                if (!res.data.success) return;

                const orders = res.data.data;

                // Find first order that:
                // 1. Is not reviewed (API should ideally tell us, but here we assume 'completed' list might include unreviewed ones)
                // Note: The API 'getAll' returns orders. We need to check if they are reviewed.
                // The Order interface in frontend has 'isReviewed'.

                const now = Date.now();
                const twentyFourHours = 24 * 60 * 60 * 1000;

                const eligibleOrder = orders.find((o: any) => {
                    const orderTime = new Date(o.createdAt).getTime();
                    const isOldEnough = (now - orderTime) > twentyFourHours; // Older than 24h
                    const isDismissed = localStorage.getItem(`nudge_dismissed_${o._id}`);

                    return !o.isReviewed && isOldEnough && !isDismissed;
                });

                if (eligibleOrder) {
                    setOrder(eligibleOrder);
                    // Small delay before showing
                    setTimeout(() => setIsVisible(true), 2000);
                }

            } catch (error) {
                console.error("Failed to check for review nudges", error);
            }
        };

        checkForUnreviewedOrders();
    }, []);

    const handleDismiss = () => {
        if (order) {
            localStorage.setItem(`nudge_dismissed_${order._id}`, 'true');
            setIsVisible(false);
        }
    };

    const handleRateClick = () => {
        setShowModal(true);
        setIsVisible(false); // Hide nudge but keep it available for next time if not completed? 
        // Actually if they click rate, we assume they will rate.
        // If they close modal without rating, we might want to show it again later, but for now let's dismiss it to avoid annoyance.
        // Or better: don't dismiss until success.
    };

    if (!order) return null;

    return (
        <>
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ y: 100, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 100, opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="fixed bottom-24 right-4 z-40 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 max-w-[320px] w-full"
                    >
                        <button
                            onClick={handleDismiss}
                            className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 p-1"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 text-orange-500">
                                <MessageSquarePlus size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">How was your meal?</h4>
                                <p className="text-xs text-gray-500 mt-1 mb-3">
                                    You ordered from <span className="font-bold">{order.canteenId.name}</span> yesterday.
                                </p>
                                <button
                                    onClick={handleRateClick}
                                    className="text-xs font-bold bg-gray-900 text-white px-4 py-2 rounded-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <Star size={12} fill="currentColor" className="text-yellow-400" />
                                    Write a Review
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {showModal && (
                <RatingModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    orderId={order._id}
                    canteenName={order.canteenId.name}
                    canteenImage={order.canteenId.image}
                    onSuccess={() => {
                        localStorage.setItem(`nudge_dismissed_${order._id}`, 'true'); // Dismiss permanently on success
                        window.location.reload(); // Refresh to update UI
                    }}
                />
            )}
        </>
    );
};
