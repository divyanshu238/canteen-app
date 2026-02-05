import React, { useState, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';

// --- Ingredients Components ---
// Custom SVGs for a premium, lightweight, vector-based look

const Pepperoni = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 100 100" className={className} style={style}>
        <circle cx="50" cy="50" r="45" fill="#EF4444" />
        <circle cx="30" cy="30" r="5" fill="#B91C1C" opacity="0.6" />
        <circle cx="70" cy="60" r="6" fill="#B91C1C" opacity="0.6" />
        <circle cx="45" cy="75" r="5" fill="#B91C1C" opacity="0.6" />
    </svg>
);

const Basil = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 100 100" className={className} style={style}>
        <path d="M50,90 Q10,50 50,10 Q90,50 50,90 Z" fill="#22C55E" />
        <path d="M50,90 Q30,50 50,10" stroke="#15803D" strokeWidth="3" fill="none" opacity="0.5" />
    </svg>
);

const Mushroom = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 100 100" className={className} style={style}>
        <path d="M20,60 Q50,10 80,60" fill="#E5E7EB" />
        <path d="M50,60 L50,90" stroke="#D1D5DB" strokeWidth="15" strokeLinecap="round" />
        <path d="M20,60 Q50,70 80,60" fill="#D1D5DB" opacity="0.5" />
    </svg>
);

const Olive = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 100 100" className={className} style={style}>
        <circle cx="50" cy="50" r="40" stroke="#1F2937" strokeWidth="15" fill="none" />
    </svg>
);

const Cheese = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 100 100" className={className} style={style}>
        <path d="M10,50 Q30,20 50,50 T90,50" stroke="#FCD34D" strokeWidth="8" fill="none" strokeLinecap="round" />
    </svg>
);

// --- Main Hero Component ---

export const HeroSection = () => {
    // We use CSS variables for parallax to ensure 60fps performance without React re-renders
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Feature detection
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // Update CSS variables directly on mouse move
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (prefersReducedMotion || isTouchDevice || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        // Normalized coordinates (-1 to 1)
        const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

        containerRef.current.style.setProperty('--mouse-x', x.toFixed(3));
        containerRef.current.style.setProperty('--mouse-y', y.toFixed(3));
    }, [prefersReducedMotion, isTouchDevice]);

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => {
        setIsHovered(false);
        // Reset CSS vars to 0 gently
        if (containerRef.current) {
            containerRef.current.style.setProperty('--mouse-x', '0');
            containerRef.current.style.setProperty('--mouse-y', '0');
        }
    };

    /**
     * Helper to return style object using CSS calc() based on CSS variables
     * This moves the math to the compositor thread (mostly)
     */
    const getParallaxStyle = (depth: number, initialRotation: number) => {
        if (prefersReducedMotion || isTouchDevice) return {};

        return {
            transform: `translate(calc(var(--mouse-x, 0) * ${depth * 25}px), calc(var(--mouse-y, 0) * ${depth * 25}px)) rotate(calc(${initialRotation}deg + (var(--mouse-x, 0) * 8deg)))`,
            transition: 'transform 0.1s linear', // smooth catch-up
        };
    };

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 border-b border-orange-100 group perspective-1000"
        >
            {/* Background Glow Effect */}
            <div
                className={`
                    absolute inset-0 bg-gradient-to-r from-orange-200/20 to-amber-200/20 
                    transition-opacity duration-700 ease-in-out
                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                `}
            />

            {/* Decorative Blobs */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob pointer-events-none"></div>
            <div className="absolute -bottom-8 left-0 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 pointer-events-none"></div>

            {/* --- FLOATING INGREDIENTS --- */}

            {/* Top Left: Pepperoni */}
            <div
                className={`absolute top-10 left-10 md:left-20 transition-all duration-700 ease-out delay-75 ${isHovered || isTouchDevice ? 'opacity-80 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-90'}`}
                style={getParallaxStyle(-1.5, -15)}
            >
                <div className={isTouchDevice ? 'animate-float' : ''}>
                    <Pepperoni className="w-16 h-16 md:w-20 md:h-20 drop-shadow-lg" />
                </div>
            </div>

            {/* Middle Left: Basil */}
            <div
                className={`absolute top-32 left-32 md:left-48 transition-all duration-700 ease-out delay-100 ${isHovered || isTouchDevice ? 'opacity-60 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-75'}`}
                style={getParallaxStyle(-0.8, 45)}
            >
                <div className={isTouchDevice ? 'animate-float animation-delay-2000' : ''}>
                    <Basil className="w-10 h-10 md:w-12 md:h-12 drop-shadow-md" />
                </div>
            </div>

            {/* Top Right: Mushroom */}
            <div
                className={`absolute top-12 right-12 md:right-32 transition-all duration-700 ease-out delay-150 ${isHovered || isTouchDevice ? 'opacity-80 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-90'}`}
                style={getParallaxStyle(1.2, 10)}
            >
                <div className={isTouchDevice ? 'animate-float animation-delay-4000' : ''}>
                    <Mushroom className="w-14 h-14 md:w-18 md:h-18 drop-shadow-lg" />
                </div>
            </div>

            {/* Bottom Left: Cheese */}
            <div
                className={`absolute bottom-20 left-12 md:left-1/4 transition-all duration-700 ease-out delay-200 ${isHovered || isTouchDevice ? 'opacity-70 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-90'}`}
                style={getParallaxStyle(-1.2, -30)}
            >
                <div className={isTouchDevice ? 'animate-float' : ''}>
                    <Cheese className="w-12 h-12 md:w-16 md:h-16 drop-shadow-sm" />
                </div>
            </div>

            {/* Bottom Right: Olive */}
            <div
                className={`absolute bottom-10 right-10 md:right-1/4 transition-all duration-700 ease-out delay-300 ${isHovered || isTouchDevice ? 'opacity-80 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-75'}`}
                style={getParallaxStyle(1.5, 20)}
            >
                <div className={isTouchDevice ? 'animate-float animation-delay-2000' : ''}>
                    <Olive className="w-12 h-12 md:w-14 md:h-14 drop-shadow-lg" />
                </div>
            </div>


            {/* Main Content Area */}
            <div className={`
                relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center z-10
                transition-transform duration-700 ease-out
                ${isHovered ? 'scale-[1.02]' : 'scale-100'}
            `}>

                {/* Badge */}
                <div className={`
                    inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full text-sm font-semibold text-orange-600 mb-6 shadow-md
                    transition-all duration-500
                    ${isHovered ? 'shadow-orange-200/50 translate-y-[-2px]' : 'shadow-sm'}
                `}>
                    <Sparkles size={16} className="animate-pulse text-amber-500" />
                    <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                        Order from campus canteens
                    </span>
                </div>

                {/* Main Heading */}
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-gray-900 mb-6 tracking-tight drop-shadow-sm">
                    Hungry?
                    <span className={`
                        block mt-2 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 
                        bg-clip-text text-transparent bg-[length:200%_auto]
                        transition-all duration-1000
                        ${isHovered ? 'bg-[position:100%_center]' : 'bg-[position:0%_center]'}
                    `}>
                        We've got you covered
                    </span>
                </h1>

                {/* Subtext */}
                <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto font-medium leading-relaxed">
                    Fast delivery from your favorite campus canteens directly to your classroom or dorm.
                </p>
            </div>
        </div>
    );
};
