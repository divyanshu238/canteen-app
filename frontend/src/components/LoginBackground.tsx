import React from 'react';
import { motion } from 'framer-motion';

// --- Premium Vector Illustrations (SVG) ---
// Minimalist, flat, and modern food icons in orange/yellow themes.

const VectorBurger = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2">
        {/* Bun Top */}
        <path d="M10 50 Q50 10 90 50" fill="#fbbf24" stroke="none" opacity="0.9" />
        <path d="M20 35 L25 30 M40 25 L45 20 M60 25 L65 20 M80 35 L85 30" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round" />
        {/* Lettuce */}
        <path d="M10 50 Q20 60 30 50 Q40 60 50 50 Q60 60 70 50 Q80 60 90 50" stroke="#4ade80" strokeWidth="4" fill="none" />
        {/* Cheese */}
        <path d="M10 55 L90 55 L85 65 L15 65 Z" fill="#facc15" stroke="none" />
        {/* Patty */}
        <rect x="10" y="65" width="80" height="10" rx="4" fill="#78350f" stroke="none" />
        {/* Bun Bottom */}
        <path d="M12 78 Q50 95 88 78 L88 75 L12 75 Z" fill="#fbbf24" stroke="none" />
    </svg>
);

const VectorPizza = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none">
        <g transform="rotate(45, 50, 50)">
            {/* Crust */}
            <path d="M50 10 L90 85 Q50 95 10 85 Z" fill="#fcd34d" />
            {/* Cheese Layer */}
            <path d="M50 20 L80 80 Q50 88 20 80 Z" fill="#fbbf24" />
            {/* Pepperoni */}
            <circle cx="50" cy="40" r="5" fill="#ef4444" opacity="0.8" />
            <circle cx="40" cy="60" r="4" fill="#ef4444" opacity="0.8" />
            <circle cx="60" cy="65" r="5" fill="#ef4444" opacity="0.8" />
        </g>
    </svg>
);

const VectorFries = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none">
        {/* Box */}
        <path d="M25 40 L35 90 L65 90 L75 40 Z" fill="#ef4444" />
        <path d="M25 40 Q50 45 75 40" stroke="#991b1b" strokeWidth="1" opacity="0.3" />
        {/* Fries Sticks */}
        <rect x="30" y="10" width="8" height="40" fill="#fcd34d" transform="rotate(-15, 34, 40)" />
        <rect x="42" y="5" width="8" height="45" fill="#fbbf24" />
        <rect x="54" y="12" width="8" height="38" fill="#fcd34d" transform="rotate(10, 58, 40)" />
        <rect x="64" y="20" width="8" height="30" fill="#fbbf24" transform="rotate(25, 68, 40)" />
    </svg>
);

const VectorCoffee = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none">
        {/* Cup */}
        <path d="M25 30 L30 85 Q50 95 70 85 L75 30 Z" fill="#fff7ed" />
        {/* Lid */}
        <path d="M20 30 L80 30 L78 20 Q50 15 22 20 Z" fill="#d1d5db" />
        {/* Sleeve */}
        <path d="M27 45 L33 70 Q50 75 67 70 L73 45 Z" fill="#a8a29e" opacity="0.5" />
        {/* Steam */}
        <path d="M40 10 Q45 0 50 10 T60 10" stroke="#fff" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
    </svg>
);


// --- Floating Item Wrapper ---

interface FloatingItemProps {
    children: React.ReactNode;
    className?: string; // Positioning classes (absolute top-xx left-xx)
    delay?: number;
    rotate?: number;
    scale?: number;
}

const FloatingItem = ({ children, className, delay = 0, rotate = 0, scale = 1 }: FloatingItemProps) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay, ease: "easeOut" }}
        className={`absolute ${className} pointer-events-none`}
    >
        <motion.div
            animate={{ y: [0, -15, 0], rotate: [rotate - 5, rotate + 5, rotate - 5] }}
            transition={{
                duration: 6,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
                delay: Math.random() * 2
            }}
        >
            <div className="relative drop-shadow-xl" style={{ transform: `scale(${scale})` }}>
                {children}
            </div>
        </motion.div>
    </motion.div>
);

// --- Background Component ---

export const LoginBackground = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="relative w-full h-full bg-gradient-to-br from-orange-500 via-orange-400 to-amber-500 overflow-hidden">

            {/* --- Geometric Accents (Lines & Circles) --- */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="none">
                    {/* Big Curves */}
                    <path d="M0,500 Q200,300 400,500 T800,200" stroke="white" strokeWidth="2" fill="none" opacity="0.3" />
                    <path d="M-100,200 Q300,600 800,400" stroke="white" strokeWidth="2" fill="none" opacity="0.2" strokeDasharray="10,10" />

                    {/* Circles */}
                    <circle cx="10%" cy="20%" r="50" stroke="white" strokeWidth="1" fill="none" opacity="0.3" />
                    <circle cx="90%" cy="80%" r="80" stroke="white" strokeWidth="1" fill="none" opacity="0.2" />
                    <circle cx="80%" cy="10%" r="20" fill="white" opacity="0.2" />
                </svg>
            </div>

            {/* --- Floating Illustrations --- */}

            {/* Top Right: Pizza */}
            <FloatingItem className="-right-12 -top-12" delay={0.1} rotate={15} scale={2}>
                <VectorPizza className="w-64 h-64" />
            </FloatingItem>

            {/* Middle Left: Burger */}
            <FloatingItem className="-left-16 top-1/3" delay={0.2} rotate={-10} scale={2.2}>
                <VectorBurger className="w-72 h-72" />
            </FloatingItem>

            {/* Bottom Right: Fries */}
            <FloatingItem className="-right-8 -bottom-8" delay={0.3} rotate={-15} scale={1.8}>
                <VectorFries className="w-56 h-56" />
            </FloatingItem>

            {/* Bottom Left: Coffee */}
            <FloatingItem className="left-12 -bottom-16" delay={0.4} rotate={10} scale={1.6}>
                <VectorCoffee className="w-48 h-48" />
            </FloatingItem>

            {/* Subtle Abstract Shapes */}
            <FloatingItem className="left-1/3 top-12" delay={0.5} scale={0.8}>
                <div className="w-12 h-12 rounded-full border-2 border-white/30" />
            </FloatingItem>
            <FloatingItem className="right-1/3 bottom-24" delay={0.6} scale={0.6}>
                <div className="w-8 h-8 rounded-lg bg-white/20 rotate-45" />
            </FloatingItem>


            {/* Content Wrapper (Glassmorphism) */}
            <div className="relative z-10 w-full h-full flex flex-col justify-between p-12 bg-white/5 backdrop-blur-[1px]">
                {children}
            </div>
        </div>
    );
};
