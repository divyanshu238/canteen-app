import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

export const TopRatedBadge = ({ className = '' }: { className?: string }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-full shadow-lg shadow-amber-200/50 ${className}`}
        >
            <Trophy size={12} fill="currentColor" className="mt-[-1px]" />
            <span className="text-[10px] md:text-xs font-bold tracking-wide uppercase">Top Rated</span>
        </motion.div>
    );
};
