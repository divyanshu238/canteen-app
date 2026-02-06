import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface RatingBreakdownProps {
    breakdown: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
    };
    totalRatings: number;
}

export const RatingBreakdown = ({ breakdown, totalRatings }: RatingBreakdownProps) => {
    // Hide if not enough ratings
    if (totalRatings < 3) return null;

    const stars = [5, 4, 3, 2, 1] as const;

    return (
        <div className="w-full max-w-xs mt-4 space-y-1">
            {stars.map((star) => {
                const count = breakdown[star] || 0;
                const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;

                return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                        {/* Label */}
                        <div className="flex items-center gap-1 w-8 text-gray-900 font-bold shrink-0">
                            <span>{star}</span>
                            <Star size={10} className="text-gray-900" fill="currentColor" />
                        </div>

                        {/* Bar Track */}
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            {/* Animated Bar */}
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`h-full rounded-full ${star >= 4 ? 'bg-green-600' :
                                        star === 3 ? 'bg-yellow-500' :
                                            'bg-orange-500'
                                    }`}
                            />
                        </div>

                        {/* Count */}
                        <div className="w-8 text-right text-gray-400 tabular-nums shrink-0">
                            {percentage > 0 ? `${Math.round(percentage)}%` : '0%'}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
