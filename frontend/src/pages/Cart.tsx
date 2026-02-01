import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { removeFromCart, clearCart, addToCart } from '../store';
import type { RootState, MenuItem } from '../store';
import { Navbar } from '../components/Navbar';
import { orderAPI } from '../api';
import config from '../config';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, CreditCard, Shield, Loader2 } from 'lucide-react';

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

        // CRITICAL: Store the MongoDB _id before opening Razorpay
        // This is the backend orderId (NOT the Razorpay order ID)
        const backendOrderId = orderData.order._id;

        // Safety check: Ensure we have the MongoDB order ID
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
                        // Verify payment on server
                        // IMPORTANT: orderId here is the MongoDB _id, NOT razorpay_order_id
                        await orderAPI.verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            orderId: backendOrderId  // Use the captured MongoDB _id
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

    // Handle dev mode payment (no Razorpay)
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

    // Place order
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
            // Create order on server
            const response = await orderAPI.create({
                canteenId,
                items: items.map(i => ({ itemId: i._id, qty: i.qty })),
                specialInstructions: specialInstructions.trim() || undefined
            });

            const { order, payment, isDevMode } = response.data.data;

            // Validate that we received the order with its MongoDB _id
            if (!order || !order._id) {
                throw new Error('Order creation failed. Please try again.');
            }

            let orderId: string;

            if (isDevMode || !payment) {
                // Development mode - no Razorpay
                orderId = await handleDevPayment({ order }) as string;
            } else {
                // Production mode - use Razorpay
                orderId = await handleRazorpayPayment({ order, payment }) as string;
            }

            // Clear cart and navigate to order tracking
            dispatch(clearCart());
            navigate(`/order/${orderId}`);

        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to place order';
            setError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    // Empty cart view
    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100 max-w-md">
                        <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShoppingBag size={40} className="text-orange-500" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-3">Your cart is empty</h2>
                        <p className="text-gray-500 mb-6">Add items from your favorite canteens to get started</p>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2"
                        >
                            Explore Canteens
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-gray-900 mb-2">Your Cart</h1>
                    {canteenName && (
                        <p className="text-gray-600">
                            {items.length} {items.length === 1 ? 'item' : 'items'} from <span className="font-semibold">{canteenName}</span>
                        </p>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                        {error}
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* CART ITEMS */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
                                <h2 className="font-bold text-lg text-gray-900">Order Items</h2>
                                <button
                                    onClick={() => dispatch(clearCart())}
                                    className="text-sm text-red-600 hover:text-red-700 font-semibold flex items-center gap-1.5"
                                >
                                    <Trash2 size={14} />
                                    Clear Cart
                                </button>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {items.map(item => (
                                    <div key={item._id} className="p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start gap-4">
                                            {/* Veg/Non-veg Indicator */}
                                            <div className={`w-5 h-5 border-2 flex items-center justify-center p-0.5 mt-1 flex-shrink-0 ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                                                <div className={`w-full h-full rounded-sm ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                                            </div>

                                            {/* Item Details */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-900 mb-1">{item.name}</h3>
                                                <p className="text-sm text-gray-600 font-semibold">₹{item.price} each</p>
                                            </div>

                                            {/* Quantity Controls */}
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center bg-green-600 text-white rounded-xl shadow-sm overflow-hidden">
                                                    <button
                                                        onClick={() => dispatch(removeFromCart(item._id))}
                                                        className="px-3 py-2 hover:bg-green-700 transition-colors active:scale-95"
                                                    >
                                                        <Minus size={14} strokeWidth={3} />
                                                    </button>
                                                    <div className="px-4 font-bold text-sm min-w-[2rem] text-center">
                                                        {item.qty}
                                                    </div>
                                                    <button
                                                        onClick={() => dispatch(addToCart(item as MenuItem))}
                                                        className="px-3 py-2 hover:bg-green-700 transition-colors active:scale-95"
                                                    >
                                                        <Plus size={14} strokeWidth={3} />
                                                    </button>
                                                </div>

                                                <div className="text-right min-w-[4rem]">
                                                    <p className="font-bold text-gray-900">₹{item.price * item.qty}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Special Instructions */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <label className="block text-sm font-bold text-gray-700 mb-3">
                                Cooking instructions (optional)
                            </label>
                            <textarea
                                value={specialInstructions}
                                onChange={(e) => setSpecialInstructions(e.target.value)}
                                placeholder="E.g., Less spicy, no onions, extra sauce..."
                                className="w-full bg-gray-50 border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl p-4 text-sm outline-none transition-all resize-none"
                                rows={3}
                                maxLength={500}
                            />
                        </div>
                    </div>

                    {/* BILL SUMMARY */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                                <h3 className="font-black text-lg text-gray-900">Bill Summary</h3>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Item Total</span>
                                    <span className="font-semibold text-gray-900">₹{itemTotal}</span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Delivery Fee</span>
                                    <span className="font-semibold text-gray-900">₹{deliveryFee}</span>
                                </div>

                                <div className="flex justify-between text-sm pb-4 border-b border-dashed border-gray-200">
                                    <span className="text-gray-600">GST (5%)</span>
                                    <span className="font-semibold text-gray-900">₹{tax.toFixed(2)}</span>
                                </div>

                                <div className="flex justify-between items-center pt-2">
                                    <span className="font-bold text-gray-900 text-lg">To Pay</span>
                                    <span className="font-black text-2xl text-green-600">₹{toPay.toFixed(0)}</span>
                                </div>
                            </div>

                            <div className="px-6 pb-6">
                                {!isAuthenticated ? (
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-lg"
                                    >
                                        Login to Order
                                        <ArrowRight size={20} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={placeOrder}
                                        disabled={isProcessing}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 text-lg disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard size={20} />
                                                Pay ₹{toPay.toFixed(0)}
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Security Badge */}
                                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
                                    <Shield size={14} />
                                    <span>Secure payment powered by Razorpay</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
