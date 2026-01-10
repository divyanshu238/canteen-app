import { useDispatch, useSelector } from 'react-redux';
import { addToCart, removeFromCart } from '../store';
import type { RootState, MenuItem } from '../store';
import { Plus, Minus } from 'lucide-react';

export const FoodItemCard = ({ item }: { item: MenuItem }) => {
    const dispatch = useDispatch();
    const cartItem = useSelector((state: RootState) => state.cart.items.find((i) => i._id === item._id));
    const qty = cartItem ? cartItem.qty : 0;

    return (
        <div className="flex justify-between items-start gap-6 py-6 border-b border-gray-100 last:border-0 hover:bg-orange-50/30 transition-colors px-4 rounded-2xl group">
            <div className="flex-1 min-w-0">
                {/* Veg/Non-Veg Indicator */}
                <div className={`w-5 h-5 border-2 flex items-center justify-center p-0.5 mb-3 rounded ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                    <div className={`w-full h-full rounded-sm ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                </div>

                <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-orange-600 transition-colors">
                    {item.name}
                </h3>

                <p className="text-lg font-bold text-gray-900 mb-2">
                    ₹{item.price}
                </p>

                {item.description && (
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                        {item.description}
                    </p>
                )}
            </div>

            {/* Image & Add Button */}
            <div className="relative flex-shrink-0">
                <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-2xl overflow-hidden bg-gray-100 shadow-md group-hover:shadow-xl transition-shadow">
                    {item.image ? (
                        <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                            <span className="text-4xl opacity-50">🍽️</span>
                        </div>
                    )}
                </div>

                {/* Add to Cart Button */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-28 shadow-lg">
                    {(item.inStock ?? true) ? (
                        qty === 0 ? (
                            <button
                                onClick={() => dispatch(addToCart(item))}
                                className="w-full bg-white hover:bg-green-50 border-2 border-green-600 text-green-600 font-black text-sm py-2.5 rounded-xl transition-all hover:shadow-md active:scale-95 uppercase tracking-wide"
                            >
                                Add
                            </button>
                        ) : (
                            <div className="w-full bg-green-600 text-white rounded-xl flex items-center justify-between shadow-md overflow-hidden">
                                <button
                                    onClick={() => dispatch(removeFromCart(item._id))}
                                    className="flex-1 py-2.5 hover:bg-green-700 transition-colors active:scale-95 flex items-center justify-center"
                                >
                                    <Minus size={16} strokeWidth={3} />
                                </button>
                                <div className="px-4 font-black text-base">
                                    {qty}
                                </div>
                                <button
                                    onClick={() => dispatch(addToCart(item))}
                                    className="flex-1 py-2.5 hover:bg-green-700 transition-colors active:scale-95 flex items-center justify-center"
                                >
                                    <Plus size={16} strokeWidth={3} />
                                </button>
                            </div>
                        )
                    ) : (
                        <div className="w-full bg-gray-100 border-2 border-gray-300 text-gray-400 font-bold text-xs py-2.5 rounded-xl text-center cursor-not-allowed uppercase">
                            Sold Out
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
