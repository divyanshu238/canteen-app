import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';

// --- Vegetarian SVG Assets ---

const Leaf = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 100 100" className={className} style={style}>
        <path d="M50,90 Q10,50 50,10 Q90,50 50,90 Z" fill="#4ADE80" />
        <path d="M50,90 Q30,50 50,10" stroke="#22C55E" strokeWidth="2" fill="none" opacity="0.6" />
        <path d="M50,90 Q70,50 50,30" stroke="#22C55E" strokeWidth="2" fill="none" opacity="0.4" />
    </svg>
);

const Carrot = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 100 100" className={className} style={style}>
        <path d="M80,10 Q90,0 95,5 Q100,10 90,20 L20,90 Q10,100 5,95 Q0,90 10,80 Z" fill="#FB923C" />
        <path d="M85,15 L95,5 M90,20 L100,10 M80,10 L90,0" stroke="#16A34A" strokeWidth="4" strokeLinecap="round" />
        <path d="M30,70 Q50,75 70,30" stroke="#F97316" strokeWidth="3" fill="none" opacity="0.5" />
    </svg>
);

const Broccoli = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 100 100" className={className} style={style}>
        <path d="M50,60 L50,90 Q50,100 30,100 L70,100 Q50,100 50,90 Z" fill="#86EFAC" />
        <circle cx="50" cy="40" r="35" fill="#22C55E" />
        <circle cx="30" cy="30" r="15" fill="#16A34A" opacity="0.3" />
        <circle cx="70" cy="35" r="15" fill="#16A34A" opacity="0.3" />
        <circle cx="50" cy="20" r="15" fill="#16A34A" opacity="0.3" />
    </svg>
);

const Tomato = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 100 100" className={className} style={style}>
        <circle cx="50" cy="55" r="40" fill="#EF4444" />
        <path d="M50,15 L40,25 M50,15 L60,25 M50,15 L50,35" stroke="#16A34A" strokeWidth="6" strokeLinecap="round" />
        <circle cx="65" cy="45" r="5" fill="white" opacity="0.2" />
    </svg>
);

const Avocado = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 100 100" className={className} style={style}>
        <path d="M50,10 Q90,10 90,50 Q90,90 50,90 Q10,90 10,50 Q10,10 50,10 Z" fill="#365314" />
        <path d="M50,15 Q85,15 85,50 Q85,85 50,85 Q15,85 15,50 Q15,15 50,15 Z" fill="#D9F99D" />
        <circle cx="50" cy="60" r="18" fill="#713F12" />
        <circle cx="55" cy="55" r="5" fill="white" opacity="0.2" />
    </svg>
);

// --- Component ---

export const EmptyCartState = () => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Feature checks
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // CSS Variable Parallax Logic (Same as HeroSection for consistency)
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (prefersReducedMotion || isTouchDevice || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

        containerRef.current.style.setProperty('--mouse-x', x.toFixed(3));
        containerRef.current.style.setProperty('--mouse-y', y.toFixed(3));
    }, [prefersReducedMotion, isTouchDevice]);

    const handleMouseLeave = () => {
        setIsHovered(false);
        if (containerRef.current) {
            containerRef.current.style.setProperty('--mouse-x', '0');
            containerRef.current.style.setProperty('--mouse-y', '0');
        }
    };

    const getParallaxStyle = (depth: number, initialRotation: number = 0) => {
        if (prefersReducedMotion || isTouchDevice) return {};
        // Slightly reduced movement range for a calmer feel than Hero
        return {
            transform: `translate(calc(var(--mouse-x, 0) * ${depth * 15}px), calc(var(--mouse-y, 0) * ${depth * 15}px)) rotate(calc(${initialRotation}deg + (var(--mouse-x, 0) * 5deg)))`,
            transition: 'transform 0.1s linear',
        };
    };

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            className="flex-1 flex items-center justify-center p-4 relative overflow-hidden min-h-[600px]"
        >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-gray-50 to-orange-50/50" />

            {/* --- Veg Visuals Layer (Reveals on Hover) --- */}
            {/* 
                Strategy: 
                - Opacity 0 by default on Desktop.
                - Opacity <low> on Mobile by default.
                - Reveal to Opacity 1 (or partial) on Hover.
                - Elements positioned radially around the center card.
            */}

            {/* Top Left - Leaf */}
            <div
                className={`absolute top-[15%] left-[10%] md:left-[20%] transition-all duration-700 ease-out z-0
                    ${isTouchDevice ? 'opacity-30' : isHovered ? 'opacity-40 translate-y-0' : 'opacity-0 translate-y-8'}
                `}
                style={getParallaxStyle(-1.2, -15)}
            >
                <Leaf className="w-24 h-24 md:w-32 md:h-32" />
            </div>

            {/* Top Right - Carrot */}
            <div
                className={`absolute top-[20%] right-[10%] md:right-[20%] transition-all duration-700 ease-out delay-75 z-0
                    ${isTouchDevice ? 'opacity-30' : isHovered ? 'opacity-40 translate-y-0' : 'opacity-0 -translate-y-8'}
                `}
                style={getParallaxStyle(1.0, 45)}
            >
                <Carrot className="w-20 h-20 md:w-28 md:h-28" />
            </div>

            {/* Bottom Left - Tomato */}
            <div
                className={`absolute bottom-[20%] left-[15%] md:left-[25%] transition-all duration-700 ease-out delay-100 z-0
                    ${isTouchDevice ? 'opacity-30' : isHovered ? 'opacity-40 translate-y-0' : 'opacity-0 translate-y-8'}
                `}
                style={getParallaxStyle(0.8, -10)}
            >
                <Tomato className="w-16 h-16 md:w-24 md:h-24" />
            </div>

            {/* Bottom Right - Avocado */}
            <div
                className={`absolute bottom-[15%] right-[15%] md:right-[25%] transition-all duration-700 ease-out delay-150 z-0
                    ${isTouchDevice ? 'opacity-30' : isHovered ? 'opacity-40 translate-y-0' : 'opacity-0 translate-y-8'}
                `}
                style={getParallaxStyle(-1.5, 20)}
            >
                <Avocado className="w-18 h-18 md:w-26 md:h-26" />
            </div>

            {/* Center Background - Broccoli (Subtle anchor) */}
            <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 transition-all duration-1000 ease-out
                     ${isTouchDevice ? 'opacity-5 scale-110' : isHovered ? 'opacity-10 scale-125' : 'opacity-0 scale-90'}
                `}
            >
                <Broccoli className="w-96 h-96 blur-3xl" />
            </div>


            {/* --- Main Card --- */}
            <div className={`
                relative bg-white/80 backdrop-blur-md rounded-[2.5rem] p-10 md:p-14 text-center shadow-lg border border-white/50 max-w-md w-full mx-4 z-10
                transform transition-all duration-500 ease-spring
                ${isHovered ? 'scale-[1.02] shadow-2xl shadow-green-100' : 'scale-100 shadow-sm'}
            `}>

                {/* Floating Icon */}
                <div className={`
                    w-28 h-28 bg-gradient-to-tr from-green-50 to-orange-50 rounded-full flex items-center justify-center mx-auto mb-8
                    shadow-inner border border-white
                    transition-transform duration-500 ease-out
                    ${isHovered ? 'scale-110 rotate-3' : 'scale-100 rotate-0'}
                `}>
                    <ShoppingBag size={48} className={`text-orange-500 transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`} />
                </div>

                <h2 className="text-3xl font-black text-gray-800 mb-3 tracking-tight">
                    Good food is waiting
                </h2>

                <p className="text-gray-500 mb-8 font-medium leading-relaxed">
                    Your cart feels a bit light. Explore our fresh, vegetarian menu from the best campus canteens.
                </p>

                <button
                    onClick={() => navigate('/')}
                    className={`
                        group relative bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-4 px-10 rounded-2xl shadow-lg shadow-orange-200
                        transition-all duration-300 transform
                        hover:translate-y-[-2px] hover:shadow-orange-300/50 active:scale-95 overflow-hidden
                    `}
                >
                    <span className="relative z-10 flex items-center gap-2">
                        Browse Menu
                        <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                    </span>
                    {/* Button Shine Effect */}
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
            </div>
        </div>
    );
};
