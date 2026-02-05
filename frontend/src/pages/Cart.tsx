import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { removeFromCart, clearCart, addToCart } from '../store';
import type { RootState, MenuItem } from '../store';
import { Navbar } from '../components/Navbar';
import { CartItemCard } from '../components/CartItemCard';
import { EmptyCartState } from '../components/EmptyCartState';
import { orderAPI } from '../api';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CreditCard, Shield, Loader2, Sparkles, Receipt, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, staggerContainer } from '../utils/motion';

// Declare Razorpay on window
declare global {
    interface Window {
        Razorpay: any;
    }
}

export const Cart = () => {
    const { items, canteenId, canteenName } = useSelector((state: RootState) => state.cart);
    const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');

    // Calculate totals
    const itemTotal = items.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const tax = Math.round(itemTotal * 0.05 * 100) / 100;
    const deliveryFee = itemTotal > 0 ? 20 : 0;
    const toPay = Math.round((itemTotal + tax + deliveryFee) * 100) / 100;

    // Load Razorpay script
    const loadRazorpayScript = (): Promise<boolean> => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    // Handle payment with Razorpay
    const handleRazorpayPayment = async (orderData: any) => {
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
            throw new Error('Failed to load payment gateway. Please try again.');
        }

        const backendOrderId = orderData.order._id;
        if (!backendOrderId) {
            throw new Error('Order creation failed. Missing order ID. Please try again.');
        }

        return new Promise((resolve, reject) => {
            const options = {
                key: orderData.payment.keyId,
                amount: orderData.payment.amount,
                currency: orderData.payment.currency,
                name: 'Canteen Connect',
                description: `Order #${orderData.order.orderId}`,
                order_id: orderData.payment.orderId,
                handler: async (response: any) => {
                    try {
                        await orderAPI.verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            orderId: backendOrderId
                        });
                        resolve(backendOrderId);
                    } catch (err) {
                        reject(new Error('Payment verification failed'));
                    }
                },
                prefill: {
                    name: user?.name || '',
                    email: user?.email || '',
                },
                theme: {
                    color: '#f97316'
                },
                modal: {
                    ondismiss: () => {
                        reject(new Error('Payment cancelled'));
                    }
                }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.on('payment.failed', (response: any) => {
                reject(new Error(response.error.description || 'Payment failed'));
            });
            razorpay.open();
        });
    };

    const handleDevPayment = async (orderData: any) => {
        const confirmed = window.confirm(
            'DEV MODE: No payment gateway configured.\n\n' +
            'Click OK to simulate a successful payment.'
        );

        if (confirmed) {
            await orderAPI.devConfirm(orderData.order._id);
            return orderData.order._id;
        } else {
            throw new Error('Payment cancelled');
        }
    };

    const placeOrder = async () => {
        if (!isAuthenticated || !user) {
            navigate('/login');
            return;
        }

        if (items.length === 0 || !canteenId) {
            setError('Your cart is empty');
            return;
        }

        setIsProcessing(true);
        setError('');

        try {
            const response = await orderAPI.create({
                canteenId,
                items: items.map(i => ({ itemId: i._id, qty: i.qty })),
                specialInstructions: specialInstructions.trim() || undefined
            });

            const { order, payment, isDevMode } = response.data.data;

            if (!order || !order._id) {
                throw new Error('Order creation failed. Please try again.');
            }

            let orderId: string;

            if (isDevMode || !payment) {
                orderId = await handleDevPayment({ order }) as string;
            } else {
                orderId = await handleRazorpayPayment({ order, payment }) as string;
            }

            dispatch(clearCart());
            navigate(`/order/${orderId}`);

        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to place order';
            setError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <EmptyCartState />
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

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-1">Your Bag</h1>
                        {canteenName && (
                            <p className="text-gray-500 font-medium">
                                Ordering from <span className="text-orange-600 font-bold">{canteenName}</span>
                            </p>
                        )}
                    </div>
                    <div className="hidden sm:block text-right">
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Total Items</p>
                        <p className="text-2xl font-black text-gray-900">{items.reduce((acc, i) => acc + i.qty, 0)}</p>
                    </div>
                </div>

                <AnimatePresence mode='wait'>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 shadow-sm"
                        >
                            <AlertCircle size={20} />
                            <span className="font-semibold">{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
                    {/* LEFT COLUMN: Cart Items */}
                    <div className="lg:col-span-7 space-y-6">
                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            animate="show"
                            className="space-y-4"
                        >
                            <AnimatePresence mode='popLayout'>
                                {items.map(item => (
                                    <CartItemCard
                                        key={item._id}
                                        item={item as MenuItem & { qty: number }}
                                        onAdd={(i) => dispatch(addToCart(i))}
                                        onRemove={(id) => dispatch(removeFromCart(id))}
                                    />
                                ))}
                            </AnimatePresence>
                        </motion.div>

                        {/* Special Instructions */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles size={18} className="text-amber-500" />
                                <h3 className="font-bold text-gray-900">Cooking Requests?</h3>
                            </div>
                            <textarea
                                value={specialInstructions}
                                onChange={(e) => setSpecialInstructions(e.target.value)}
                                placeholder="E.g., Less spicy, no onions, extra sauce..."
                                className="w-full bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 rounded-xl p-4 text-sm font-medium outline-none transition-all resize-none placeholder:text-gray-400"
                                rows={3}
                                maxLength={200}
                            />
                            <p className="text-xs text-gray-400 mt-2 text-right">{specialInstructions.length}/200</p>
                        </motion.div>
                    </div>

                    {/* RIGHT COLUMN: Bill & Checkout */}
                    <div className="lg:col-span-5 relative">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="sticky top-24 space-y-6"
                        >
                            {/* Bill Summary Card */}
                            <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden relative">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500" />

                                <div className="p-8">
                                    <h3 className="flex items-center gap-2 font-black text-xl text-gray-900 mb-6">
                                        <Receipt size={24} className="text-gray-400" />
                                        Payment Summary
                                    </h3>

                                    <div className="space-y-4">
                                        <div className="flex justify-between text-gray-600 font-medium">
                                            <span>Item Total</span>
                                            <span className="text-gray-900">₹{itemTotal}</span>
                                        </div>

                                        <div className="flex justify-between text-gray-600 font-medium">
                                            <span className="flex items-center gap-2">
                                                Delivery Fee
                                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">Flat</span>
                                            </span>
                                            <span className="text-gray-900">₹{deliveryFee}</span>
                                        </div>

                                        <div className="flex justify-between text-gray-600 font-medium pb-6 border-b border-dashed border-gray-200">
                                            <span>Taxes & Charges (5%)</span>
                                            <span className="text-gray-900">₹{tax.toFixed(2)}</span>
                                        </div>

                                        <div className="flex justify-between items-end pt-2">
                                            <div>
                                                <p className="text-sm text-gray-500 font-bold uppercase tracking-wide mb-1">Grand Total</p>
                                                <p className="text-4xl font-black text-gray-900 tracking-tight">₹{toPay.toFixed(0)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <div className="p-4 bg-gray-50 border-t border-gray-100">
                                    {!isAuthenticated ? (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => navigate('/login')}
                                            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 text-lg"
                                        >
                                            Login to Checkout
                                            <ArrowRight size={20} />
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={placeOrder}
                                            disabled={isProcessing}
                                            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-200 transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-70 disabled:grayscale"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={20} />
                                                    Processing Payment...
                                                </>
                                            ) : (
                                                <>
                                                    <CreditCard size={20} />
                                                    Pay Securely
                                                </>
                                            )}
                                        </motion.button>
                                    )}

                                    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400 font-medium">
                                        <Shield size={12} />
                                        <span>100% Secure Payment via Razorpay</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
