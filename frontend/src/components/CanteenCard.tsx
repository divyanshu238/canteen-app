import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Clock, Heart } from 'lucide-react';
import { fadeInUp, cardHover } from '../utils/motion';
import { RatingBadge } from './RatingBadge';
import { TopRatedBadge } from './TopRatedBadge';

interface Canteen {
    _id: string;
    name: string;
    image: string;
    rating: number;
    totalRatings?: number;
    tags: string[];
    priceRange: string;
    preparationTime?: string;
    isOpen?: boolean;
    isTopRated?: boolean;
    reviewSummary?: string;
    category?: string;
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
            whileHover={{ y: -6, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.12)" }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 relative w-full h-full flex flex-col transition-all duration-300"
        >
            {/* Image Container with Dynamic Gradient */}
            <div className="relative h-56 overflow-hidden bg-gray-100 rounded-t-3xl">
                <motion.img
                    src={canteen.image}
                    alt={canteen.name}
                    className="w-full h-full object-cover"
                    animate={{ scale: isHovered ? 1.08 : 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />

                {/* Scrim Gradient */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

                {/* Top Floating Elements */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                    {/* Category Chip */}
                    <span className="px-3 py-1 bg-white/95 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-800 shadow-sm border border-white/20">
                        {canteen.category || "Dining"}
                    </span>

                    {/* Bookmark Button (Visual Only for now) */}
                    <button className="p-2 rounded-full bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-red-500 transition-all shadow-sm border border-white/10 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300">
                        <Heart size={16} fill="currentColor" />
                    </button>
                </div>

                {/* Bottom Left Badges */}
                <div className="absolute bottom-4 left-4 flex flex-col gap-2 items-start z-10">
                    {canteen.isTopRated && <TopRatedBadge />}

                    {/* Discount Badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-600/20">
                        <span className="text-[10px] uppercase tracking-wide">Deal</span>
                        <span className="w-0.5 h-3 bg-white/20 rounded-full" />
                        <span>{canteen.priceRange} OFF</span>
                    </div>
                </div>

                {/* Rating Badge (Bottom Right) */}
                <div className="absolute bottom-4 right-4 z-10">
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-xl shadow-lg">
                        <div className="bg-green-600 text-white p-1 rounded-full">
                            <Star size={10} fill="currentColor" />
                        </div>
                        <div className="flex flex-col items-start leading-none pr-1">
                            <span className="text-sm font-black text-gray-900">{canteen.rating?.toFixed(1) || "New"}</span>
                            {canteen.totalRatings ? (
                                <span className="text-[9px] font-medium text-gray-500 mt-0.5">{canteen.totalRatings}+ ratings</span>
                            ) : (
                                <span className="text-[9px] font-medium text-gray-400 mt-0.5">No ratings</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-5 flex flex-col flex-grow relative bg-white">

                {/* Title & Delivery Time */}
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-extrabold text-xl text-gray-900 leading-tight group-hover:text-orange-600 transition-colors line-clamp-1">
                        {canteen.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                        <Clock size={12} className="text-orange-500" />
                        <span>{canteen.preparationTime || '25-30m'}</span>
                    </div>
                </div>

                {/* Tags & Price */}
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-500 font-medium">
                    <span className="line-clamp-1 text-gray-600">{canteen.tags?.join(", ") || "Fast Food, Snacks"}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                    <span>{canteen.priceRange} for two</span>
                </div>

                {/* AI Summary Section */}
                {canteen.reviewSummary && (
                    <div className="mt-auto mb-3 relative">
                        {/* Quote Icon Background */}
                        <div className="absolute -top-1 -left-1 text-gray-100 z-0">
                            <span className="text-4xl leading-none font-serif">“</span>
                        </div>

                        <p className="relative z-10 text-xs text-gray-600 italic leading-relaxed pl-3 border-l-2 border-orange-200 line-clamp-2">
                            {canteen.reviewSummary}
                        </p>
                    </div>
                )}

                {/* Divider */}
                {!canteen.reviewSummary && <div className="mt-auto" />}

                {/* Action Footer */}
                <div className="pt-3 border-t border-dashed border-gray-100 flex items-center justify-between group/btn">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Open Now
                    </span>
                    <span className="text-sm font-bold text-orange-600 flex items-center gap-1 group-hover/btn:gap-2 transition-all">
                        View Menu <span className="text-lg leading-none">→</span>
                    </span>
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
