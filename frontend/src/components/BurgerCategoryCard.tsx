import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useSpring, useMotionValue, AnimatePresence } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface BurgerCategoryCardProps {
    onClick?: () => void;
    className?: string;
}

/**
 * Premium Burger Category Card (Realistic Image Version)
 * 
 * Features:
 * - High-quality food imagery to match Pizza/Biryani styling
 * - Subtle parallax tilt on hover
 * - "Trending" badge for visual interest
 * - Smooth scaling and shadow interactions
 */
export const BurgerCategoryCard = ({ onClick, className = '' }: BurgerCategoryCardProps) => {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);

    // Mouse tilt effect logic
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth spring animation for tilt (Premium feel)
    const mouseX = useSpring(x, { stiffness: 300, damping: 30 });
    const mouseY = useSpring(y, { stiffness: 300, damping: 30 });

    const handleClick = () => {
        if (onClick) onClick();
        else navigate('/category/burger');
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (window.matchMedia('(pointer: coarse)').matches) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXVal = e.clientX - rect.left;
        const mouseYVal = e.clientY - rect.top;

        const xPct = mouseXVal / width - 0.5;
        const yPct = mouseYVal / height - 0.5;

        x.set(xPct * 12); // Slightly stronger tilt for hero burger
        y.set(yPct * -12);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
        setIsHovered(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative group cursor-pointer flex-shrink-0 py-2 perspective-1000 ${className}`}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: 1000 }}
            role="button"
            tabIndex={0}
        >
            <motion.div
                style={{
                    rotateX: mouseY,
                    rotateY: mouseX,
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="relative w-40 h-52 sm:w-48 sm:h-60 rounded-[2rem] bg-white shadow-xl shadow-orange-100/50 overflow-visible transition-shadow duration-300"
            >
                {/* 1. Dynamic Gradient Background */}
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-orange-100 to-amber-50 opacity-100" />

                {/* 2. Realistic Image Container */}
                <div className="absolute inset-2 top-2 bottom-[35%] rounded-3xl overflow-hidden bg-white shadow-sm ring-1 ring-orange-50">
                    <motion.img
                        src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80" // High-res juicy burger
                        alt="Delicious Burger"
                        className="w-full h-full object-cover"
                        animate={{
                            scale: isHovered ? 1.15 : 1.05, // Subtle zoom in on hover
                        }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        loading="lazy"
                    />

                    {/* Inner highlight overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                {/* 3. Trending Badge */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.8 }}
                            className="absolute -top-3 -right-3 px-3 py-1.5 rounded-full bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1 z-20"
                        >
                            <TrendingUp size={12} />
                            Trending
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 4. Text Content */}
                <div className="absolute bottom-0 left-0 right-0 p-5 pt-0 flex flex-col items-center justify-center h-[35%] text-center">
                    <motion.h3
                        className="text-lg font-black text-gray-800 leading-tight group-hover:text-orange-600 transition-colors duration-300"
                        animate={{ y: isHovered ? -2 : 0 }}
                    >
                        Burger
                    </motion.h3>

                    <motion.p
                        className="text-xs font-semibold text-gray-500 mt-1"
                        animate={{ opacity: isHovered ? 1 : 0.7 }}
                    >
                        Juicy & Grilled
                    </motion.p>
                </div>

                {/* 5. Glassmorphism Highlight */}
                <div className="absolute inset-0 rounded-[2rem] ring-1 ring-white/60 pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-[2rem] pointer-events-none" />

            </motion.div>
        </motion.div>
    );
};
