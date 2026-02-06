import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';

interface BurgerCategoryCardProps {
    onClick?: () => void;
    className?: string;
}

/**
 * Premium Burger Category Card
 * 
 * Features:
 * - Custom CSS-built burger for granular layer animation
 * - Physics-based bounce interactions using Framer Motion
 * - "Freshness" shine effect
 * - Accessible (respects reduced motion)
 * - Desktop-only hover interaction
 */
export const BurgerCategoryCard = ({ onClick, className = '' }: BurgerCategoryCardProps) => {
    const navigate = useNavigate();
    const controls = useAnimation();
    const [isHovered, setIsHovered] = useState(false);
    const shouldReduceMotion = useReducedMotion();

    const handleClick = () => {
        if (onClick) onClick();
        else navigate('/category/burger');
    };

    const handleMouseEnter = () => {
        // Prevent animation on touch devices (sticky hover) and if user prefers reduced motion
        // We use matchMedia to detect pointer accuracy (coarse usually means touch)
        const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

        if (!isTouchDevice && !shouldReduceMotion) {
            setIsHovered(true);
            controls.start('hover');
        } else {
            // For touch/reduced motion, just set state for simple CSS transitions if any
            setIsHovered(true);
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        controls.start('idle');
    };

    // Animation Variants for the Card Container (Scale & Lift)
    const cardVariants: Variants = {
        idle: {
            scale: 1,
            y: 0,
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
        },
        hover: {
            scale: 1.05,
            y: -5,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            transition: { type: "spring", stiffness: 300, damping: 20 }
        }
    };

    // Staggered bounce for burger layers
    // Each layer has a slightly different delay/stiffness to create a "jiggle" feel
    const layerVariants = (delay: number): Variants => ({
        idle: { y: 0, scale: 1 },
        hover: {
            y: [0, -8, 0], // Jump up and land
            scale: [1, 1.05, 1], // Subtle squash/stretch
            transition: {
                duration: 0.4,
                delay: delay,
                times: [0, 0.5, 1],
                ease: "easeOut"
            }
        }
    });

    // Steam/Shine effect
    const steamVariants: Variants = {
        idle: { opacity: 0, y: 10 },
        hover: {
            opacity: [0, 0.6, 0],
            y: -15,
            transition: { duration: 1, ease: "easeOut" }
        }
    };

    return (
        <div
            className={`flex-shrink-0 cursor-pointer group outline-none ${className}`}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role="button"
            aria-label="Burger Category"
            tabIndex={0}
        >
            <motion.div
                className="
                    relative w-32 h-32 rounded-3xl overflow-hidden
                    bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500
                    origin-bottom
                "
                initial="idle"
                animate={isHovered ? "hover" : "idle"}
                variants={cardVariants}
                whileTap={{ scale: 0.95 }}
            >
                {/* Background Glow/Highlight */}
                <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />

                {/* Top Shine */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-3xl" />

                {/* Burger Composition */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transform translate-y-2">

                    {/* Steam Particles */}
                    <div className="absolute top-4 flex gap-2">
                        <motion.div
                            variants={steamVariants}
                            className="w-1.5 h-4 bg-white/40 rounded-full blur-[1px]"
                        />
                        <motion.div
                            variants={steamVariants}
                            transition={{ delay: 0.1 }}
                            className="w-1.5 h-3 bg-white/40 rounded-full blur-[1px] mt-1"
                        />
                    </div>

                    {/* Top Bun */}
                    <motion.div
                        variants={layerVariants(0)}
                        className="w-16 h-8 bg-amber-200 rounded-t-full relative shadow-sm z-40"
                        style={{ backgroundColor: '#F0BA65' }}
                    >
                        <div className="absolute top-2 left-3 w-1 h-1 bg-amber-100/70 rounded-full" />
                        <div className="absolute top-3 left-6 w-1 h-1 bg-amber-100/70 rounded-full" />
                        <div className="absolute top-2 right-4 w-1 h-1 bg-amber-100/70 rounded-full" />
                        <div className="absolute top-4 right-7 w-1 h-1 bg-amber-100/70 rounded-full" />
                    </motion.div>

                    {/* Lettuce */}
                    <motion.div
                        variants={layerVariants(0.05)}
                        className="w-17 h-3 -mt-1 bg-green-500 rounded-lg relative z-30 flex justify-between px-1"
                    >
                        <div className="w-full h-full bg-green-500 rounded-full transform scale-x-110" />
                    </motion.div>

                    {/* Cheese */}
                    <motion.div
                        variants={layerVariants(0.1)}
                        className="w-16 h-2 -mt-1 bg-yellow-400 rounded-sm relative z-20"
                    >
                        <div className="absolute right-3 top-1 w-2 h-2 bg-yellow-400 rounded-b-full" />
                    </motion.div>

                    {/* Patty */}
                    <motion.div
                        variants={layerVariants(0.15)}
                        className="w-16 h-4 -mt-1 bg-amber-900 rounded-md relative z-10"
                    />

                    {/* Bottom Bun */}
                    <motion.div
                        variants={layerVariants(0.2)}
                        className="w-16 h-4 -mt-1 bg-amber-200 rounded-b-xl shadow-md relative z-0"
                        style={{ backgroundColor: '#F0BA65' }}
                    />
                </div>
            </motion.div>

            {/* Label */}
            <p className={`
                text-center font-bold text-gray-700 mt-3
                transition-all duration-300 ease-out
                ${isHovered ? 'text-orange-600 transform -translate-y-0.5' : ''}
            `}>
                Burger
            </p>
        </div>
    );
};
