import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { fadeInUp, bounce } from '../utils/motion';
import type { MenuItem } from '../store';

interface MenuItemData extends MenuItem {
    category: string;
}

interface MenuItemCardProps {
    item: MenuItemData;
    qty: number;
    wasPreviouslyOrdered: boolean;
    orderCount: number;
    onAdd: (item: MenuItemData) => void;
    onRemove: (itemId: string) => void;
}

export const MenuItemCard = ({
    item,
    qty,
    wasPreviouslyOrdered,
    orderCount,
    onAdd,
    onRemove
}: MenuItemCardProps) => {
    const isHovered = useRef(false);

    return (
        <motion.div
            layout
            variants={fadeInUp}
            className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg border border-gray-50 flex gap-4 sm:gap-6 transition-all duration-300 relative overflow-hidden"
            onMouseEnter={() => (isHovered.current = true)}
            onMouseLeave={() => (isHovered.current = false)}
        >
            {/* Background Gradient on Hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-50/0 to-orange-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Detailed Content */}
            <div className="flex-1 flex flex-col justify-between z-10 min-w-0">
                <div>
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 mb-1">
                            {/* Veg/Non-veg details */}
                            <div className={`w-4 h-4 border-2 flex items-center justify-center rounded-sm flex-shrink-0 ${item.isVeg ? 'border-green-600' : 'border-red-600'
                                }`}>
                                <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'
                                    }`} />
                            </div>

                            {/* Best Seller or Tags could go here */}
                            {wasPreviouslyOrdered && (
                                <motion.div
                                    variants={bounce}
                                    initial="initial"
                                    animate="animate"
                                    className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100"
                                >
                                    <RotateCcw size={10} className="text-amber-600" />
                                    <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wide">
                                        {orderCount > 1 ? `Ordered ${orderCount}x` : 'Order again'}
                                    </span>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1 group-hover:text-orange-600 transition-colors">
                        {item.name}
                    </h3>

                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-lg font-black text-gray-900">₹{item.price}</span>
                        {/* {item.originalPrice && (
                             <span className="text-sm text-gray-400 line-through">₹{item.originalPrice}</span>
                        )} */}
                    </div>

                    {item.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed font-medium">
                            {item.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Right Side: Image & Action */}
            <div className="flex flex-col items-center gap-3 relative z-10 w-28 sm:w-36">
                {/* Image Container */}
                <div className="w-28 h-28 sm:w-36 sm:h-32 rounded-xl overflow-hidden relative shadow-sm group-hover:shadow-md transition-shadow">
                    {item.image ? (
                        <motion.img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.4 }}
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                            <span className="text-xs">No Image</span>
                        </div>
                    )}
                </div>

                {/* Add Button - Positioned absolutely partially over image on mobile, or below on desktop */}
                <div className="relative -mt-6 sm:-mt-8 shadow-lg rounded-xl">
                    <AnimatePresence mode='wait' initial={false}>
                        {qty === 0 ? (
                            <motion.button
                                key="add-btn"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onAdd(item)}
                                className="bg-white text-green-600 border border-green-200 px-8 py-2 rounded-xl font-extrabold text-sm uppercase tracking-wide hover:bg-green-50 shadow-sm"
                            >
                                ADD
                            </motion.button>
                        ) : (
                            <motion.div
                                key="counter"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center bg-green-600 text-white rounded-xl overflow-hidden shadow-md h-9"
                            >
                                <motion.button
                                    whileTap={{ scale: 0.8 }}
                                    onClick={() => onRemove(item._id)}
                                    className="px-3 h-full flex items-center justify-center hover:bg-green-700 transition-colors"
                                >
                                    <Minus size={16} strokeWidth={3} />
                                </motion.button>
                                <motion.span
                                    key={qty}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="w-4 text-center font-bold text-sm"
                                >
                                    {qty}
                                </motion.span>
                                <motion.button
                                    whileTap={{ scale: 0.8 }}
                                    onClick={() => onAdd(item)}
                                    className="px-3 h-full flex items-center justify-center hover:bg-green-700 transition-colors"
                                >
                                    <Plus size={16} strokeWidth={3} />
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};
