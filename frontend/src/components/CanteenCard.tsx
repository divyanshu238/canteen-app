import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Clock, Heart } from 'lucide-react';
import { fadeInUp, cardVariants } from '../utils/motion';

interface Canteen {
    _id: string;
    name: string;
    image: string;
    rating: number;
    tags: string[];
    priceRange: string;
    preparationTime?: string;
    isOpen?: boolean;
}

interface CanteenCardProps {
    canteen: Canteen;
    onClick: () => void;
}

export const CanteenCard = ({ canteen, onClick }: CanteenCardProps) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            layout
            variants={fadeInUp}
            whileHover={cardVariants.hover}
            whileTap={cardVariants.tap}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 relative w-full h-full flex flex-col"
        >
            {/* Image Container */}
            <div className="relative h-48 overflow-hidden bg-gray-100 rounded-t-3xl">
                <motion.img
                    src={canteen.image}
                    alt={canteen.name}
                    className="w-full h-full object-cover"
                    animate={{ scale: isHovered ? 1.05 : 1 }}
                    transition={{ duration: 0.4 }}
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />

                {/* Offer / Badge */}
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-gray-900 px-3 py-1 rounded-lg text-xs font-bold shadow-sm"
                >
                    {canteen.priceRange} OFF
                </motion.div>

                {/* Top Right Buttons */}
                <div className="absolute top-3 right-3">
                    <button className="p-2 rounded-full bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-red-500 transition-all">
                        <Heart size={16} fill="currentColor" className="opacity-0 group-hover:opacity-100" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                        {canteen.name}
                    </h3>
                    <div className="flex items-center gap-1 bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md">
                        <span className="text-xs font-bold">{canteen.rating}</span>
                        <Star size={10} fill="currentColor" />
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                    <span className="line-clamp-1 flex-1">{canteen.tags?.join(", ") || "Fast Food"}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                    <span className="font-medium whitespace-nowrap">{canteen.priceRange} for two</span>
                </div>

                <div className="mt-auto pt-3 border-t border-dashed border-gray-200 flex items-center gap-2 text-xs font-medium text-gray-500">
                    <Clock size={12} className="text-orange-500" />
                    <span>{canteen.preparationTime || '25-30 min'}</span>
                    <span className="ml-auto text-orange-600 group-hover:underline">View Menu</span>
                </div>
            </div>
        </motion.div>
    );
};

export const CanteenCardSkeleton = () => (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-50 h-full flex flex-col">
        <div className="h-48 bg-gray-200 animate-pulse" />
        <div className="p-4 space-y-3 flex-grow">
            <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
            <div className="flex justify-between pt-3 mt-auto">
                <div className="h-3 bg-gray-200 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
        </div>
    </div>
);
