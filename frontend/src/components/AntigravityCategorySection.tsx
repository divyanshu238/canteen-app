/**
 * AntigravityCategorySection.tsx
 * 
 * Google Antigravity-inspired IDLE floating animation for category cards.
 * 
 * ANIMATION PHILOSOPHY:
 * - Cards float continuously WITHOUT user interaction
 * - Each card has unique phase, speed, and direction (no synchronized movement)
 * - Motion feels weightless, calm, premium — like objects in low gravity
 * - Hover pauses idle drift and applies gentle lift + scale
 * 
 * MOTION PARAMETERS (Tuned for premium feel):
 * - Translation: ±6-10px on X/Y axes
 * - Rotation: ±0.5° maximum (barely perceptible)
 * - Cycle Duration: 6-12 seconds per full loop
 * - Easing: Sinusoidal (smooth, organic, no sharp turns)
 * 
 * PERFORMANCE:
 * - Uses only GPU-friendly transforms (translate3d, rotate, scale)
 * - No layout thrashing (will-change hints)
 * - Respects prefers-reduced-motion
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles, TrendingUp, Clock, Star } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface CategoryData {
    id: string;
    name: string;
    image: string;
    subtext: string;
    badge?: { text: string; icon: React.ReactNode; color: string };
    gradient: string;
}

// ============================================
// CATEGORY DATA
// ============================================

const CATEGORIES: CategoryData[] = [
    {
        id: 'burger',
        name: 'Burger',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80',
        subtext: 'Juicy & Grilled',
        badge: { text: 'Trending', icon: <TrendingUp size={12} />, color: 'bg-orange-500' },
        gradient: 'from-orange-100 to-amber-50'
    },
    {
        id: 'pizza',
        name: 'Pizza',
        image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=500&q=80',
        subtext: 'Wood Fired',
        badge: { text: 'Top Rated', icon: <Star size={12} />, color: 'bg-red-500' },
        gradient: 'from-red-100 to-orange-50'
    },
    {
        id: 'biryani',
        name: 'Biryani',
        image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=500&q=80',
        subtext: 'Hyderabadi',
        badge: { text: 'Bestseller', icon: <Sparkles size={12} />, color: 'bg-yellow-500' },
        gradient: 'from-yellow-100 to-orange-50'
    },
    {
        id: 'rolls',
        name: 'Rolls',
        image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=500&q=80',
        subtext: 'Quick Bites',
        badge: { text: '15 Mins', icon: <Clock size={12} />, color: 'bg-emerald-500' },
        gradient: 'from-emerald-100 to-green-50'
    },
    {
        id: 'coffee',
        name: 'Coffee',
        image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=500&q=80',
        subtext: 'Fresh Brew',
        gradient: 'from-stone-100 to-amber-50'
    },
    {
        id: 'dessert',
        name: 'Dessert',
        image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=500&q=80',
        subtext: 'Sweet Tooth',
        gradient: 'from-pink-100 to-rose-50'
    },
    {
        id: 'noodles',
        name: 'Noodles',
        image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=500&q=80',
        subtext: 'Spicy Asian',
        gradient: 'from-red-100 to-amber-50'
    },
    {
        id: 'sandwich',
        name: 'Sandwich',
        image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=80',
        subtext: 'Healthy',
        gradient: 'from-lime-100 to-green-50'
    },
];

// ============================================
// IDLE FLOAT CONFIGURATION
// Each card gets unique motion parameters for organic variety
// ============================================

interface FloatConfig {
    // X-axis translation amplitude (px)
    xAmplitude: number;
    // Y-axis translation amplitude (px)
    yAmplitude: number;
    // Rotation amplitude (degrees)
    rotationAmplitude: number;
    // Full cycle duration (seconds)
    duration: number;
    // Phase offset (0-1, determines starting point in cycle)
    phase: number;
}

/**
 * Generate unique float configuration for each card
 * Uses deterministic pseudo-random based on index for consistency across renders
 */
const generateFloatConfig = (index: number): FloatConfig => {
    // Deterministic "randomness" based on index
    const seed = (index * 137.5) % 1; // Golden ratio-ish distribution
    const seed2 = ((index + 3) * 89.3) % 1;
    const seed3 = ((index + 7) * 43.7) % 1;

    return {
        // X amplitude: 5-9px range
        xAmplitude: 5 + seed * 4,
        // Y amplitude: 6-10px range
        yAmplitude: 6 + seed2 * 4,
        // Rotation: ±0.3-0.5 degrees
        rotationAmplitude: 0.3 + seed3 * 0.2,
        // Duration: 7-11 seconds (slow, organic)
        duration: 7 + seed * 4,
        // Phase: Each card starts at different point in cycle
        phase: (index * 0.13) % 1,
    };
};

// ============================================
// ANTIGRAVITY FLOAT WRAPPER COMPONENT
// ============================================

interface AntigravityFloatProps {
    children: React.ReactNode;
    index: number;
    isHovered: boolean;
    reducedMotion: boolean;
}

/**
 * AntigravityFloat
 * 
 * A wrapper component that applies continuous idle floating animation.
 * Uses Framer Motion's `animate` with `transition.repeat: Infinity`.
 * 
 * MATH EXPLANATION:
 * The animation uses keyframes at 0%, 25%, 50%, 75%, 100% of the cycle.
 * X moves: [0, +A, 0, -A, 0] (cosine-like)
 * Y moves: [0, +B, 0, -B, 0] (sine-like, phase shifted)
 * This creates smooth, looping figure-8 or elliptical motion.
 */
const AntigravityFloat: React.FC<AntigravityFloatProps> = ({
    children,
    index,
    isHovered,
    reducedMotion,
}) => {
    // Generate unique config for this card
    const config = useMemo(() => generateFloatConfig(index), [index]);

    // If reduced motion is preferred, render children without animation
    if (reducedMotion) {
        return <div>{children}</div>;
    }

    /**
     * KEYFRAME ANIMATION:
     * 
     * Position 0% (start):    x=0, y=0, rotate=0
     * Position 25%:           x=+Ax, y=+Ay, rotate=+R
     * Position 50% (midway):  x=0, y=0, rotate=0  
     * Position 75%:           x=-Ax, y=-Ay, rotate=-R
     * Position 100% (loop):   x=0, y=0, rotate=0
     * 
     * This creates seamless looping without any visible snap.
     * The phase offset shifts when each card starts in the cycle.
     */
    const xKeyframes = [
        0,
        config.xAmplitude,
        0,
        -config.xAmplitude,
        0
    ];

    const yKeyframes = [
        0,
        config.yAmplitude * 0.6,  // Asymmetric for organic feel
        -config.yAmplitude * 0.3,
        config.yAmplitude * 0.8,
        0
    ];

    const rotateKeyframes = [
        0,
        config.rotationAmplitude,
        0,
        -config.rotationAmplitude,
        0
    ];

    return (
        <motion.div
            animate={isHovered ? {
                // HOVER STATE: Reduce idle motion, gentle lift
                x: 0,
                y: -4,
                rotate: 0,
                scale: 1.03,
            } : {
                // IDLE STATE: Continuous floating
                x: xKeyframes,
                y: yKeyframes,
                rotate: rotateKeyframes,
                scale: 1,
            }}
            transition={isHovered ? {
                // Quick, smooth transition to hover state
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1], // Custom bezier for premium feel
            } : {
                // Idle animation config
                duration: config.duration,
                ease: "easeInOut", // Sinusoidal easing for organic motion
                repeat: Infinity,
                repeatType: "loop",
                // Phase offset: Start partway through the animation
                delay: -config.phase * config.duration,
            }}
            style={{
                willChange: 'transform',
            }}
        >
            {children}
        </motion.div>
    );
};

// ============================================
// CATEGORY CARD COMPONENT
// ============================================

interface CategoryCardProps {
    category: CategoryData;
    index: number;
    reducedMotion: boolean;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
    category,
    index,
    reducedMotion,
}) => {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);

    return (
        <AntigravityFloat
            index={index}
            isHovered={isHovered}
            reducedMotion={reducedMotion}
        >
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                    duration: 0.6,
                    delay: index * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                }}
                onClick={() => navigate(`/category/${category.id}`)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="relative cursor-pointer flex-shrink-0 snap-center sm:snap-start"
                style={{ willChange: 'transform, opacity' }}
            >
                <div
                    className={`
                        relative w-40 h-52 sm:w-48 sm:h-60 rounded-[2rem] bg-white overflow-visible
                        transition-shadow duration-500 ease-out
                        ${isHovered
                            ? 'shadow-2xl shadow-gray-300/60'
                            : 'shadow-xl shadow-gray-200/50'
                        }
                    `}
                >
                    {/* 1. Gradient Background */}
                    <div className={`absolute inset-0 rounded-[2rem] bg-gradient-to-br ${category.gradient} opacity-60`} />

                    {/* 2. Image Container */}
                    <div className="absolute inset-2 top-2 bottom-[35%] rounded-3xl overflow-hidden bg-white shadow-inner ring-1 ring-black/5">
                        <motion.img
                            src={category.image}
                            alt={category.name}
                            className="w-full h-full object-cover"
                            animate={{
                                scale: isHovered ? 1.1 : 1,
                            }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            loading="lazy"
                        />
                        {/* Dark overlay on hover */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: isHovered ? 1 : 0 }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>

                    {/* 3. Badge (Appears on hover) */}
                    <AnimatePresence>
                        {category.badge && isHovered && (
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.85 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.9 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className={`absolute -top-3 -right-3 px-3 py-1.5 rounded-full ${category.badge.color} text-white text-[10px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1 z-20`}
                            >
                                {category.badge.icon}
                                {category.badge.text}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 4. Text Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 pt-0 flex flex-col items-center justify-center h-[35%] text-center">
                        <motion.h3
                            className="text-lg font-black text-gray-800 leading-tight"
                            animate={{
                                y: isHovered ? -3 : 0,
                                color: isHovered ? '#ea580c' : '#1f2937',
                            }}
                            transition={{ duration: 0.3 }}
                        >
                            {category.name}
                        </motion.h3>
                        <motion.p
                            className="text-xs font-semibold text-gray-500 mt-1"
                            animate={{ opacity: isHovered ? 1 : 0.7 }}
                        >
                            {category.subtext}
                        </motion.p>
                    </div>

                    {/* 5. Glassmorphism Highlights */}
                    <div className="absolute inset-0 rounded-[2rem] ring-1 ring-white/70 pointer-events-none" />
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent rounded-t-[2rem] pointer-events-none" />
                </div>
            </motion.div>
        </AntigravityFloat>
    );
};

// ============================================
// MAIN SECTION COMPONENT
// ============================================

export const AntigravityCategorySection: React.FC<{ className?: string }> = ({ className = '' }) => {
    const reducedMotion = useReducedMotion() ?? false;

    return (
        <section className={`py-8 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex items-center justify-between mb-8"
                >
                    <div>
                        <span className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1 block">
                            Explore Menu
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                            What's on your mind?
                        </h2>
                    </div>

                    {/* Navigation Dots */}
                    <div className="hidden sm:flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <div className="w-2 h-2 rounded-full bg-gray-200" />
                        <div className="w-2 h-2 rounded-full bg-gray-200" />
                    </div>
                </motion.div>

                {/* Floating Cards Container */}
                <div
                    className="
                        flex gap-6 overflow-x-auto pb-8 -mx-4 px-4 sm:mx-0 sm:px-0
                        snap-x snap-mandatory scroll-smooth
                        no-scrollbar
                    "
                    style={{
                        maskImage: 'linear-gradient(to right, transparent, black 20px, black 95%, transparent)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 20px, black 95%, transparent)',
                    }}
                >
                    {CATEGORIES.map((category, index) => (
                        <CategoryCard
                            key={category.id}
                            category={category}
                            index={index}
                            reducedMotion={reducedMotion}
                        />
                    ))}

                    {/* End padding for mobile scroll */}
                    <div className="w-4 flex-shrink-0 sm:hidden" />
                </div>
            </div>
        </section>
    );
};

// ============================================
// REUSABLE HOOK EXPORT (For use elsewhere)
// ============================================

/**
 * useAntigravityFloat
 * 
 * A hook that returns Framer Motion animation props for idle floating.
 * Can be used on any element to apply the antigravity effect.
 * 
 * @param index - Unique index for varied motion
 * @param isHovered - Whether the element is currently hovered
 * @param reducedMotion - Whether user prefers reduced motion
 */
export const useAntigravityFloat = (
    index: number,
    isHovered: boolean,
    reducedMotion: boolean
) => {
    const config = useMemo(() => generateFloatConfig(index), [index]);

    if (reducedMotion) {
        return {
            animate: {},
            transition: {},
        };
    }

    const xKeyframes = [0, config.xAmplitude, 0, -config.xAmplitude, 0];
    const yKeyframes = [0, config.yAmplitude * 0.6, -config.yAmplitude * 0.3, config.yAmplitude * 0.8, 0];
    const rotateKeyframes = [0, config.rotationAmplitude, 0, -config.rotationAmplitude, 0];

    return {
        animate: isHovered
            ? { x: 0, y: -4, rotate: 0, scale: 1.03 }
            : { x: xKeyframes, y: yKeyframes, rotate: rotateKeyframes, scale: 1 },
        transition: isHovered
            ? { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
            : {
                duration: config.duration,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop" as const,
                delay: -config.phase * config.duration,
            },
    };
};

export default AntigravityCategorySection;
