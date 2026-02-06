/**
 * AntigravityCategorySection.tsx
 * 
 * Google Antigravity-inspired interactive category cards for "What's on your mind?"
 * 
 * PHYSICS MODEL:
 * - Each card has a "home" position and current position
 * - Magnetic attraction: Cards are gently pulled toward the cursor
 * - Spring physics: Cards ease back to home position when cursor leaves
 * - Parallax depth: Cards closer to cursor move more (distance-based scaling)
 * - Ambient drift: Subtle idle floating animation when no interaction
 * 
 * ANIMATION APPROACH:
 * - Uses requestAnimationFrame for 60fps smooth updates
 * - Spring-damper system for organic motion (no bouncing)
 * - Respects prefers-reduced-motion accessibility preference
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, Clock, Star } from 'lucide-react';

// ============================================
// TYPES & INTERFACES
// ============================================

interface CategoryData {
    id: string;
    name: string;
    image: string;
    subtext: string;
    badge?: { text: string; icon: React.ReactNode; color: string };
    gradient: string;
}

interface CardState {
    // Current position offset from home (px)
    x: number;
    y: number;
    // Velocity for inertia
    vx: number;
    vy: number;
    // Scale for depth effect
    scale: number;
    // Shadow elevation
    elevation: number;
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
// PHYSICS CONSTANTS
// Tuned for "light, anti-gravity, premium" feel
// ============================================

const PHYSICS = {
    // Spring stiffness: Lower = slower return (0.02-0.08 is organic)
    STIFFNESS: 0.04,
    // Damping: Higher = less bounce (0.85-0.95 for no-bounce)
    DAMPING: 0.88,
    // Magnetic pull strength toward cursor
    MAGNETIC_STRENGTH: 0.15,
    // Maximum magnetic pull radius (px)
    MAGNETIC_RADIUS: 300,
    // Maximum displacement from home position (px)
    MAX_DISPLACEMENT: 25,
    // Ambient drift amplitude (px)
    AMBIENT_AMPLITUDE: 4,
    // Ambient drift speed
    AMBIENT_SPEED: 0.0008,
    // Parallax depth multiplier (cards closer to cursor move more)
    PARALLAX_FACTOR: 1.5,
    // Hover scale
    HOVER_SCALE: 1.03,
    // Hover shadow elevation (px)
    HOVER_ELEVATION: 20,
};

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Hook to detect reduced motion preference
 */
const useReducedMotion = (): boolean => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return prefersReducedMotion;
};

// ============================================
// ANTIGRAVITY CARD COMPONENT
// ============================================

interface AntigravityCardProps {
    category: CategoryData;
    index: number;
    mousePosition: { x: number; y: number } | null;
    containerRef: React.RefObject<HTMLDivElement>;
    isMouseInContainer: boolean;
    reducedMotion: boolean;
}

const AntigravityCard: React.FC<AntigravityCardProps> = ({
    category,
    index,
    mousePosition,
    containerRef,
    isMouseInContainer,
    reducedMotion,
}) => {
    const navigate = useNavigate();
    const cardRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Card physics state
    const stateRef = useRef<CardState>({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        scale: 1,
        elevation: 0,
    });

    // Animation frame ID for cleanup
    const animationRef = useRef<number>(0);
    // Time reference for ambient drift
    const timeRef = useRef<number>(0);

    // ----------------------------------------
    // PHYSICS ANIMATION LOOP
    // ----------------------------------------
    const animate = useCallback(() => {
        if (reducedMotion) {
            // Skip physics, just reset position
            if (cardRef.current) {
                cardRef.current.style.transform = 'translate3d(0, 0, 0) scale(1)';
            }
            return;
        }

        const card = cardRef.current;
        const container = containerRef.current;
        if (!card || !container) {
            animationRef.current = requestAnimationFrame(animate);
            return;
        }

        const state = stateRef.current;
        const cardRect = card.getBoundingClientRect();
        const cardCenterX = cardRect.left + cardRect.width / 2;
        const cardCenterY = cardRect.top + cardRect.height / 2;

        // ----------------------------------------
        // 1. MAGNETIC ATTRACTION FORCE
        // ----------------------------------------
        let magneticFx = 0;
        let magneticFy = 0;
        let distanceToMouse = Infinity;

        if (mousePosition && isMouseInContainer) {
            const dx = mousePosition.x - cardCenterX;
            const dy = mousePosition.y - cardCenterY;
            distanceToMouse = Math.sqrt(dx * dx + dy * dy);

            if (distanceToMouse < PHYSICS.MAGNETIC_RADIUS) {
                /**
                 * MAGNETIC MATH:
                 * Force decreases with distance (inverse square law, softened)
                 * Direction: Card is pulled TOWARD cursor
                 * 
                 * force = strength * (1 - distance/radius)^2
                 * This creates a smooth falloff at the edge of the magnetic field
                 */
                const normalizedDistance = distanceToMouse / PHYSICS.MAGNETIC_RADIUS;
                const falloff = Math.pow(1 - normalizedDistance, 2);
                const force = PHYSICS.MAGNETIC_STRENGTH * falloff;

                // Normalize direction vector and apply force
                magneticFx = (dx / distanceToMouse) * force * PHYSICS.PARALLAX_FACTOR;
                magneticFy = (dy / distanceToMouse) * force * PHYSICS.PARALLAX_FACTOR;
            }
        }

        // ----------------------------------------
        // 2. SPRING FORCE (Return to home)
        // ----------------------------------------
        /**
         * SPRING MATH:
         * F = -k * x (Hooke's Law)
         * Where k is stiffness and x is displacement from home (0,0)
         * Negative sign pulls back toward origin
         */
        const springFx = -PHYSICS.STIFFNESS * state.x;
        const springFy = -PHYSICS.STIFFNESS * state.y;

        // ----------------------------------------
        // 3. AMBIENT DRIFT (Subtle idle floating)
        // ----------------------------------------
        timeRef.current += 1;
        const time = timeRef.current * PHYSICS.AMBIENT_SPEED;

        /**
         * AMBIENT MATH:
         * Use sin/cos with phase offsets for organic circular motion
         * Each card gets a unique phase based on index for variety
         */
        const phase = index * 0.7; // Offset each card's drift cycle
        const ambientFx = Math.sin(time + phase) * PHYSICS.AMBIENT_AMPLITUDE * 0.01;
        const ambientFy = Math.cos(time + phase * 1.3) * PHYSICS.AMBIENT_AMPLITUDE * 0.01;

        // ----------------------------------------
        // 4. UPDATE VELOCITY & POSITION
        // ----------------------------------------
        /**
         * PHYSICS UPDATE:
         * v' = v * damping + forces
         * x' = x + v'
         * 
         * Damping < 1 causes velocity to decay (no perpetual motion)
         * This creates the "easing back" feel without bounce
         */
        state.vx = state.vx * PHYSICS.DAMPING + magneticFx + springFx + ambientFx;
        state.vy = state.vy * PHYSICS.DAMPING + magneticFy + springFy + ambientFy;

        state.x += state.vx;
        state.y += state.vy;

        // Clamp displacement to prevent cards from flying away
        state.x = Math.max(-PHYSICS.MAX_DISPLACEMENT, Math.min(PHYSICS.MAX_DISPLACEMENT, state.x));
        state.y = Math.max(-PHYSICS.MAX_DISPLACEMENT, Math.min(PHYSICS.MAX_DISPLACEMENT, state.y));

        // ----------------------------------------
        // 5. HOVER SCALE & ELEVATION
        // ----------------------------------------
        const targetScale = isHovered ? PHYSICS.HOVER_SCALE : 1;
        const targetElevation = isHovered ? PHYSICS.HOVER_ELEVATION : 0;

        // Smooth interpolation for scale and elevation
        state.scale += (targetScale - state.scale) * 0.15;
        state.elevation += (targetElevation - state.elevation) * 0.15;

        // ----------------------------------------
        // 6. APPLY TRANSFORM (GPU-accelerated)
        // ----------------------------------------
        card.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`;
        card.style.boxShadow = `0 ${4 + state.elevation}px ${20 + state.elevation * 2}px rgba(0, 0, 0, ${0.08 + state.elevation * 0.005})`;

        // Continue animation loop
        animationRef.current = requestAnimationFrame(animate);
    }, [mousePosition, isMouseInContainer, index, reducedMotion, isHovered, containerRef]);

    // Start/stop animation loop
    useEffect(() => {
        animationRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationRef.current);
    }, [animate]);

    // ----------------------------------------
    // RENDER
    // ----------------------------------------
    return (
        <div
            ref={cardRef}
            onClick={() => navigate(`/category/${category.id}`)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative cursor-pointer flex-shrink-0 snap-center sm:snap-start will-change-transform"
            style={{
                // Enable GPU acceleration
                willChange: 'transform, box-shadow',
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                    duration: 0.6,
                    delay: index * 0.06,
                    ease: [0.22, 1, 0.36, 1],
                }}
                className="relative w-40 h-52 sm:w-48 sm:h-60 rounded-[2rem] bg-white overflow-visible"
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
                            scale: isHovered ? 1.12 : 1,
                        }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        loading="lazy"
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                        animate={{ y: isHovered ? -3 : 0, color: isHovered ? '#ea580c' : '#1f2937' }}
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
            </motion.div>
        </div>
    );
};

// ============================================
// MAIN SECTION COMPONENT
// ============================================

export const AntigravityCategorySection: React.FC<{ className?: string }> = ({ className = '' }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
    const [isMouseInContainer, setIsMouseInContainer] = useState(false);
    const reducedMotion = useReducedMotion();

    // ----------------------------------------
    // MOUSE TRACKING
    // ----------------------------------------
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        setMousePosition({ x: e.clientX, y: e.clientY });
    }, []);

    const handleMouseEnter = useCallback(() => {
        setIsMouseInContainer(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsMouseInContainer(false);
        setMousePosition(null);
    }, []);

    // ----------------------------------------
    // RENDER
    // ----------------------------------------
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

                {/* Antigravity Cards Container */}
                <div
                    ref={containerRef}
                    onMouseMove={handleMouseMove}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
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
                        <AntigravityCard
                            key={category.id}
                            category={category}
                            index={index}
                            mousePosition={mousePosition}
                            containerRef={containerRef}
                            isMouseInContainer={isMouseInContainer}
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

export default AntigravityCategorySection;
