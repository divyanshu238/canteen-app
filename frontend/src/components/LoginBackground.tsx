import React from 'react';
import { motion } from 'framer-motion';

// Food Images (High-quality, distinct items)
const IMAGES = {
    burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80",
    pizza: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=500&q=80",
    coffee: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=500&q=80",
    fries: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=500&q=80",
    coke: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80"
};

interface FoodItemProps {
    src: string;
    className?: string;
    delay?: number;
}

const FoodItem = ({ src, className, delay = 0 }: FoodItemProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
            duration: 0.8,
            delay,
            ease: [0.22, 1, 0.36, 1]
        }}
        className={`absolute rounded-full shadow-2xl border-4 border-white/20 overflow-hidden ${className}`}
    >
        <motion.img
            src={src}
            alt="Food item"
            className="w-full h-full object-cover"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{
                duration: 5,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
                delay: Math.random() * 2
            }}
        />
        {/* Gloss Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute inset-0 bg-white/10" />
    </motion.div>
);

export const LoginBackground = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="relative w-full h-full bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 overflow-hidden">
            {/* --- Floating Food Grid --- */}

            {/* Top Right: Pizza */}
            <FoodItem
                src={IMAGES.pizza}
                className="w-48 h-48 -right-8 top-12 md:w-56 md:h-56 lg:w-64 lg:h-64"
                delay={0.1}
            />

            {/* Middle Left: Burger */}
            <FoodItem
                src={IMAGES.burger}
                className="w-40 h-40 -left-12 top-1/4 md:w-48 md:h-48 lg:w-52 lg:h-52"
                delay={0.2}
            />

            {/* Bottom Right: Coke - made oblong or larger to fit bottle shape better if needed, but keeping circle for consistency */}
            <FoodItem
                src={IMAGES.coke}
                className="w-36 h-36 right-4 bottom-32 md:w-44 md:h-44 lg:w-48 lg:h-48"
                delay={0.3}
            />

            {/* Bottom Left: Coffee */}
            <FoodItem
                src={IMAGES.coffee}
                className="w-32 h-32 left-8 bottom-8 md:w-40 md:h-40 lg:w-44 lg:h-44"
                delay={0.4}
            />

            {/* Top Center-ish: Fries */}
            <FoodItem
                src={IMAGES.fries}
                className="w-24 h-24 left-1/2 -top-4 md:w-32 md:h-32"
                delay={0.5}
            />

            {/* --- Decorative Elements --- */}
            {/* Circle Outline */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full border border-white/5 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full border border-white/5 pointer-events-none" />

            {/* Noise/Texture Overlay (Optional) */}
            <div className="absolute inset-0 bg-white/5 mix-blend-overlay pointer-events-none" />

            {/* Content Wrapper (Glassmorphism backdrop for readability if items overlap) */}
            <div className="relative z-10 w-full h-full flex flex-col justify-between p-12 bg-black/5 backdrop-blur-[2px]">
                {children}
            </div>
        </div>
    );
};
