import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface RatingBadgeProps {
    rating: number;
    count?: number;
    variant?: 'card' | 'menu' | 'minimal';
    className?: string;
}

export const RatingBadge = ({ rating, count = 0, variant = 'card', className = '' }: RatingBadgeProps) => {
    // Premium Color Logic matching Swiggy/Zomato standards
    const getColor = () => {
        if (count === 0) return 'bg-gray-100 text-gray-500 border border-gray-200';
        if (rating >= 4.0) return 'bg-green-700 text-white border border-green-700';
        if (rating >= 3.0) return 'bg-yellow-500 text-white border border-yellow-500';
        return 'bg-red-500 text-white border border-red-500';
    };

    const isNew = count === 0;

    if (variant === 'menu') {
        return (
            <div className={`flex flex-col ${className}`}>
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`flex items-center mobile:gap-1 gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-xl w-fit ${getColor()} shadow-lg shadow-gray-200/50 select-none`}
                >
                    {isNew ? (
                        <span className="text-sm font-bold px-1">New</span>
                    ) : (
                        <>
                            <span className="text-base md:text-lg font-black">{rating.toFixed(1)}</span>
                            <Star size={14} fill="currentColor" className="mb-0.5" />
                        </>
                    )}
                </motion.div>
                {!isNew && (
                    <div className="text-[10px] md:text-xs font-medium text-gray-400 mt-1.5 ml-0.5 border-b border-dashed border-gray-300 w-fit cursor-help" title={`${count} verified ratings`}>
                        {count > 1000 ? `${(count / 1000).toFixed(1)}K+` : count} ratings
                    </div>
                )}
            </div>
        );
    }

    // Default / Card Variant
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${getColor()} ${className} shadow-sm`}
        >
            {isNew ? (
                <span className="text-[10px] uppercase font-bold tracking-wide px-0.5">New</span>
            ) : (
                <>
                    <span className="text-xs font-bold leading-none mt-0.5">{rating.toFixed(1)}</span>
                    <Star size={10} fill="currentColor" strokeWidth={0} />
                </>
            )}
        </motion.div>
    );
};
