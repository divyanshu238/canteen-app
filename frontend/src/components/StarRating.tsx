import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface StarRatingProps {
    rating: number;
    setRating?: (rating: number) => void;
    readOnly?: boolean;
    size?: number;
}

export const StarRating = ({ rating, setRating, readOnly = false, size = 24 }: StarRatingProps) => {
    return (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                    key={star}
                    type="button"
                    disabled={readOnly}
                    whileHover={!readOnly ? { scale: 1.2 } : {}}
                    whileTap={!readOnly ? { scale: 0.9 } : {}}
                    onClick={(e) => {
                        e.stopPropagation(); // prevent modal close
                        if (!readOnly && setRating) setRating(star);
                    }}
                    className={`transition-colors focus:outline-none p-1 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                >
                    <Star
                        size={size}
                        className={`${star <= rating
                                ? 'fill-orange-400 text-orange-400'
                                : 'text-gray-200 fill-gray-100'
                            }`}
                        strokeWidth={star <= rating ? 0 : 2}
                    />
                </motion.button>
            ))}
        </div>
    );
};
