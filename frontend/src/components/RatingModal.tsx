import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import { StarRating } from './StarRating';
import { reviewAPI } from '../api';

interface RatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    canteenName?: string;
    canteenImage?: string;
    onSuccess?: () => void;
}

export const RatingModal = ({ isOpen, onClose, orderId, canteenName, canteenImage, onSuccess }: RatingModalProps) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (rating === 0) return;

        setIsSubmitting(true);
        setError('');

        try {
            await reviewAPI.create({ orderId, rating, comment });
            setIsSuccess(true);
            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 1500);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to submit review');
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl relative"
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 bg-gray-100/50 hover:bg-gray-100 rounded-full transition-colors z-10"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>

                            {isSuccess ? (
                                <div className="p-12 flex flex-col items-center text-center">
                                    <motion.div
                                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                                        className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6"
                                    >
                                        <CheckCircle size={40} />
                                    </motion.div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h3>
                                    <p className="text-gray-500">Your feedback helps us improve.</p>
                                </div>
                            ) : (
                                <div className="p-6 md:p-8 pb-10 md:pb-8">
                                    <div className="text-center mb-8 pt-4 md:pt-0">
                                        {canteenImage && (
                                            <img
                                                src={canteenImage}
                                                alt={canteenName}
                                                className="w-20 h-20 rounded-2xl mx-auto mb-4 object-cover shadow-lg border-4 border-white"
                                            />
                                        )}
                                        <h2 className="text-xl font-bold text-gray-900">
                                            Rate {canteenName || 'Your Order'}
                                        </h2>
                                        <p className="text-sm text-gray-400 mt-1">How was your food?</p>
                                    </div>

                                    {/* Star Rating */}
                                    <div className="flex justify-center mb-8">
                                        <StarRating rating={rating} setRating={setRating} size={42} />
                                    </div>

                                    {/* Comment */}
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Write a review (optional)..."
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-orange-100 placeholder:text-gray-400 resize-none h-32 mb-2"
                                        onClick={(e) => e.stopPropagation()}
                                    />

                                    {error && <p className="text-red-500 text-xs text-center mb-4 font-bold">{error}</p>}

                                    {/* Submit */}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={rating === 0 || isSubmitting}
                                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all mt-4 ${rating > 0
                                                ? 'bg-gray-900 text-white shadow-lg shadow-gray-200 hover:scale-[1.02]'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit Review'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
