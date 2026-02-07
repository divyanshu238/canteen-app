/**
 * AntigravityCategorySection.tsx
 *
 * Google Antigravity-inspired floating + cursor physics for category cards.
 *
 * FEATURES:
 * - Continuous idle floating (unique phase/speed per card)
 * - Cursor-driven magnetic repulsion with soft spring return
 * - Hover: elevated shadow, scale-up, floating lift
 * - Inertia and spring physics for natural, organic motion
 * - GPU-accelerated transforms via requestAnimationFrame
 * - Respects prefers-reduced-motion
 * - Low-power device detection for reduced intensity
 *
 * ANIMATION PHILOSOPHY:
 * - Premium, calm, playful — suited for professional food delivery
 * - No jitter, overlap, or broken layout
 * - Horizontal scroll structure preserved
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

interface PhysicsState {
    x: number;       // Offset from base position
    y: number;
    vx: number;      // Velocity
    vy: number;
    rot: number;     // Rotation offset
    vRot: number;    // Rotation velocity
    scale: number;   // Current scale
    shadowIntensity: number; // 0-1 for dynamic shadow
}

interface FloatConfig {
    xAmplitude: number;
    yAmplitude: number;
    rotationAmplitude: number;
    duration: number;
    phase: number;
    mass: number;
    drag: number;
    stiffness: number;
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
// PHYSICS & FLOAT CONFIGURATION
// ============================================

/**
 * Generate unique float/physics config for each card
 * Deterministic based on index for consistency across renders
 */
const generateFloatConfig = (index: number): FloatConfig => {
    const seed = (index * 137.5) % 1;
    const seed2 = ((index + 3) * 89.3) % 1;
    const seed3 = ((index + 7) * 43.7) % 1;

    return {
        // Idle float amplitudes
        xAmplitude: 4 + seed * 3,      // 4-7px
        yAmplitude: 5 + seed2 * 4,     // 5-9px
        rotationAmplitude: 0.3 + seed3 * 0.2, // 0.3-0.5 degrees
        duration: 8 + seed * 4,        // 8-12 seconds per cycle
        phase: (index * 0.17) % 1,     // Offset start position

        // Physics params for cursor interaction
        mass: 1.0 + seed * 0.5,        // 1.0-1.5 (higher = slower response)
        drag: 0.92 + seed2 * 0.04,     // 0.92-0.96 (higher = more inertia)
        stiffness: 0.025 + seed3 * 0.015, // 0.025-0.04 (spring strength)
    };
};

// ============================================
// LOW-POWER DEVICE DETECTION
// ============================================

const useIsLowPowerDevice = (): boolean => {
    const [isLowPower, setIsLowPower] = useState(false);

    useEffect(() => {
        // Check for various low-power indicators
        const checkLowPower = () => {
            // Mobile touch device heuristic
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            // Small screen (likely mobile)
            const isSmallScreen = window.innerWidth < 768;

            // Navigator hardware concurrency (CPU cores)
            const lowCoreCount = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;

            // Connection type (if available)
            const connection = (navigator as any).connection;
            const slowConnection = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';

            // Battery API (if available)
            if ('getBattery' in navigator) {
                (navigator as any).getBattery().then((battery: any) => {
                    if (battery.level < 0.2 || (battery.charging === false && battery.level < 0.5)) {
                        setIsLowPower(true);
                    }
                }).catch(() => { });
            }

            // Combine heuristics
            if ((isTouchDevice && isSmallScreen) || lowCoreCount || slowConnection) {
                setIsLowPower(true);
            }
        };

        checkLowPower();
    }, []);

    return isLowPower;
};

// ============================================
// ANTIGRAVITY PHYSICS ENGINE
// ============================================

interface UseAntigravityPhysicsOptions {
    configs: FloatConfig[];
    containerRef: React.RefObject<HTMLDivElement>;
    cardRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    reducedMotion: boolean;
    isLowPower: boolean;
    hoveredIndex: number | null;
}

const useAntigravityPhysics = ({
    configs,
    containerRef,
    cardRefs,
    reducedMotion,
    isLowPower,
    hoveredIndex,
}: UseAntigravityPhysicsOptions) => {
    const reqRef = useRef<number>();
    const timeRef = useRef(0);
    const mouseRef = useRef({ x: -9999, y: -9999, isActive: false });

    // Physics state for each card
    const statesRef = useRef<PhysicsState[]>(
        configs.map(() => ({
            x: 0, y: 0, vx: 0, vy: 0, rot: 0, vRot: 0, scale: 1, shadowIntensity: 0
        }))
    );

    // Intensity multiplier based on device capability
    const intensity = isLowPower ? 0.4 : 1.0;

    // Mouse tracking
    useEffect(() => {
        if (reducedMotion) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();

            const buffer = 150;
            if (
                e.clientX > rect.left - buffer &&
                e.clientX < rect.right + buffer &&
                e.clientY > rect.top - buffer &&
                e.clientY < rect.bottom + buffer
            ) {
                mouseRef.current = {
                    x: e.clientX,
                    y: e.clientY,
                    isActive: true
                };
            } else {
                mouseRef.current.isActive = false;
            }
        };

        const handleMouseLeave = () => {
            mouseRef.current.isActive = false;
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [reducedMotion, containerRef]);

    // Main physics animation loop
    useEffect(() => {
        if (reducedMotion) return;

        const animate = () => {
            if (!containerRef.current) {
                reqRef.current = requestAnimationFrame(animate);
                return;
            }

            timeRef.current += 0.016; // ~60fps time delta
            const time = timeRef.current;

            statesRef.current.forEach((state, i) => {
                const config = configs[i];
                const el = cardRefs.current[i];
                if (!el) return;

                const rect = el.getBoundingClientRect();
                const cardCenterX = rect.left + rect.width / 2;
                const cardCenterY = rect.top + rect.height / 2;

                const isHovered = hoveredIndex === i;

                // ==========================================
                // 1. AMBIENT IDLE DRIFT (Multi-frequency sine waves)
                // ==========================================
                const phaseOffset = config.phase * Math.PI * 2;
                const driftX = Math.sin(time / config.duration * Math.PI * 2 + phaseOffset) * config.xAmplitude;
                const driftY = Math.cos(time / config.duration * Math.PI * 2 + phaseOffset + 0.7) * config.yAmplitude;
                const driftRot = Math.sin(time / config.duration * Math.PI * 2 + phaseOffset + 1.3) * config.rotationAmplitude;

                // Target position (idle drift)
                let targetX = driftX * intensity;
                let targetY = driftY * intensity;
                let targetRot = driftRot * intensity;
                let targetScale = 1;
                let targetShadow = 0;

                // ==========================================
                // 2. CURSOR MAGNETIC REPULSION
                // ==========================================
                if (mouseRef.current.isActive && !isHovered) {
                    const dx = mouseRef.current.x - cardCenterX;
                    const dy = mouseRef.current.y - cardCenterY;
                    const distSq = dx * dx + dy * dy;
                    const interactionRadius = 250;
                    const radiusSq = interactionRadius * interactionRadius;

                    if (distSq < radiusSq && distSq > 1) {
                        const dist = Math.sqrt(distSq);
                        // Inverse-square-ish falloff with soft edge
                        const proximity = 1 - (dist / interactionRadius);
                        const force = proximity * proximity * 30 * intensity;

                        // Repulsion: move away from cursor
                        const normX = dx / dist;
                        const normY = dy / dist;

                        targetX -= normX * force;
                        targetY -= normY * force;

                        // Subtle rotation based on repulsion direction
                        targetRot += normX * proximity * 2;
                    }
                }

                // ==========================================
                // 3. HOVER STATE: Lift + Scale + Shadow
                // ==========================================
                if (isHovered) {
                    targetY = -8 * intensity; // Floating lift
                    targetScale = 1.03;
                    targetShadow = 1;
                    targetRot = 0; // Stabilize rotation on hover
                }

                // ==========================================
                // 4. SPRING PHYSICS INTEGRATION
                // ==========================================
                // Spring forces (Hooke's law)
                const springX = (targetX - state.x) * config.stiffness * 2;
                const springY = (targetY - state.y) * config.stiffness * 2;
                const springRot = (targetRot - state.rot) * config.stiffness * 2;
                const springScale = (targetScale - state.scale) * 0.08;
                const springShadow = (targetShadow - state.shadowIntensity) * 0.1;

                // Apply acceleration (F = ma, a = F/m)
                state.vx += springX / config.mass;
                state.vy += springY / config.mass;
                state.vRot += springRot / config.mass;

                // Apply drag (friction)
                state.vx *= config.drag;
                state.vy *= config.drag;
                state.vRot *= config.drag;

                // Update positions
                state.x += state.vx;
                state.y += state.vy;
                state.rot += state.vRot;
                state.scale += springScale;
                state.shadowIntensity += springShadow;

                // ==========================================
                // 5. CLAMP VALUES (Prevent runaway)
                // ==========================================
                const maxOffset = 30;
                state.x = Math.max(-maxOffset, Math.min(maxOffset, state.x));
                state.y = Math.max(-maxOffset, Math.min(maxOffset, state.y));
                state.rot = Math.max(-3, Math.min(3, state.rot));
                state.scale = Math.max(0.95, Math.min(1.08, state.scale));
                state.shadowIntensity = Math.max(0, Math.min(1, state.shadowIntensity));

                // ==========================================
                // 6. APPLY TRANSFORM (GPU-accelerated)
                // ==========================================
                el.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.rot}deg) scale(${state.scale})`;

                // Dynamic shadow based on intensity
                const baseShadow = '0 10px 25px -5px rgba(0,0,0,0.08)';
                const liftShadow = `0 25px 50px -12px rgba(0,0,0,${0.1 + state.shadowIntensity * 0.15})`;
                el.style.boxShadow = state.shadowIntensity > 0.1 ? liftShadow : baseShadow;
            });

            reqRef.current = requestAnimationFrame(animate);
        };

        reqRef.current = requestAnimationFrame(animate);

        return () => {
            if (reqRef.current) {
                cancelAnimationFrame(reqRef.current);
            }
        };
    }, [configs, containerRef, cardRefs, reducedMotion, isLowPower, intensity, hoveredIndex]);

    return statesRef;
};

// ============================================
// CATEGORY CARD COMPONENT
// ============================================

interface CategoryCardProps {
    category: CategoryData;
    index: number;
    isHovered: boolean;
    onHoverStart: () => void;
    onHoverEnd: () => void;
    cardRef: (el: HTMLDivElement | null) => void;
    reducedMotion: boolean;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
    category,
    index,
    isHovered,
    onHoverStart,
    onHoverEnd,
    cardRef,
    reducedMotion,
}) => {
    const navigate = useNavigate();

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                duration: 0.6,
                delay: index * 0.07,
                ease: [0.22, 1, 0.36, 1],
            }}
            onClick={() => navigate(`/category/${category.id}`)}
            onMouseEnter={onHoverStart}
            onMouseLeave={onHoverEnd}
            className="relative cursor-pointer flex-shrink-0 snap-center sm:snap-start"
            style={{
                willChange: reducedMotion ? 'auto' : 'transform',
            }}
        >
            <div
                className={`
                    relative w-40 h-52 sm:w-48 sm:h-60 rounded-[2rem] bg-white overflow-visible
                    transition-shadow duration-500 ease-out
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
    );
};

// ============================================
// MAIN SECTION COMPONENT
// ============================================

export const AntigravityCategorySection: React.FC<{ className?: string }> = ({ className = '' }) => {
    const reducedMotion = useReducedMotion() ?? false;
    const isLowPower = useIsLowPowerDevice();
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Generate physics configs for all cards
    const configs = useMemo(() => CATEGORIES.map((_, i) => generateFloatConfig(i)), []);

    // Initialize physics engine
    useAntigravityPhysics({
        configs,
        containerRef,
        cardRefs,
        reducedMotion,
        isLowPower,
        hoveredIndex,
    });

    // Callback refs for cards
    const setCardRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
        cardRefs.current[index] = el;
    }, []);

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
                    ref={containerRef}
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
                            isHovered={hoveredIndex === index}
                            onHoverStart={() => setHoveredIndex(index)}
                            onHoverEnd={() => setHoveredIndex(null)}
                            cardRef={setCardRef(index)}
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
            ? { x: 0, y: -8, rotate: 0, scale: 1.03 }
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
