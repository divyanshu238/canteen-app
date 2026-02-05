import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Trash2 } from 'lucide-react';
import type { MenuItem } from '../store';

interface CartItemProps {
    item: MenuItem & { qty: number };
    onAdd: (item: MenuItem) => void;
    onRemove: (itemId: string) => void;
}

export const CartItemCard = ({ item, onAdd, onRemove }: CartItemProps) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 mb-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden"
        >
            {/* Image (Thumbnail) */}
            <div className="w-full sm:w-20 h-24 sm:h-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden relative">
                {item.image ? (
                    <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🍲</div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-4 h-4 border-2 flex items-center justify-center rounded-sm flex-shrink-0 ${item.isVeg ? 'border-green-600' : 'border-red-600'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'
                                }`} />
                        </div>
                        <h3 className="font-bold text-gray-900 line-clamp-1">{item.name}</h3>
                    </div>
                </div>
                <p className="text-gray-500 text-sm font-medium">₹{item.price} per item</p>
                <div className="mt-2 text-lg font-black text-gray-900">₹{item.price * item.qty}</div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0">
                <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-200">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onRemove(item._id)}
                        className="w-8 h-8 flex items-center justify-center bg-white text-gray-500 hover:text-red-500 rounded-lg shadow-sm border border-gray-100 disabled:opacity-50 transition-colors"
                    >
                        {item.qty === 1 ? <Trash2 size={16} /> : <Minus size={16} />}
                    </motion.button>
                    <span className="w-8 text-center font-bold text-gray-900">{item.qty}</span>
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onAdd(item)}
                        className="w-8 h-8 flex items-center justify-center bg-white text-green-600 hover:bg-green-50 rounded-lg shadow-sm border border-gray-100 transition-colors"
                    >
                        <Plus size={16} />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};
