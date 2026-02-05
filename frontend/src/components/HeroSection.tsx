import React, { useState, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';

// --- Premium Vegetarian SVG Assets ---
// Designed for subtle background integration

const TomatoSlice = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 100 100" className={className} style={style}>
        {/* Core */}
        <circle cx="50" cy="50" r="45" fill="#EF4444" className="drop-shadow-sm" />
        <circle cx="50" cy="50" r="40" fill="#F87171" />
        {/* Segments */}
        <path d="M50,50 L50,10 M50,50 L85,30 M50,50 L85,70 M50,50 L50,90 M50,50 L15,70 M50,50 L15,30" stroke="#EF4444" strokeWidth="4" opacity="0.5" />
        {/* Seeds */}
        <circle cx="65" cy="40" r="3" fill="#FECACA" opacity="0.6" />
        <circle cx="35" cy="60" r="3" fill="#FECACA" opacity="0.6" />
        <circle cx="35" cy="40" r="3" fill="#FECACA" opacity="0.6" />
    </svg>
);

const PaneerBlock = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 100 100" className={className} style={style}>
        {/* Cube body */}
        <rect x="20" y="20" width="60" height="60" rx="12" fill="#FFFBEB" className="drop-shadow-sm" />
        {/* Texture/Highlight */}
        <rect x="25" y="25" width="50" height="50" rx="8" stroke="#FEF3C7" strokeWidth="2" fill="none" />
        <circle cx="35" cy="35" r="2" fill="#FDE68A" opacity="0.4" />
        <circle cx="65" cy="65" r="2" fill="#FDE68A" opacity="0.4" />
    </svg>
);

const MintLeaf = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 100 100" className={className} style={style}>
        <path d="M50,90 Q10,55 50,10 Q90,55 50,90 Z" fill="#22C55E" className="drop-shadow-sm" />
        <path d="M50,90 Q30,50 50,10" stroke="#166534" strokeWidth="2" fill="none" opacity="0.3" />
        <path d="M50,60 Q70,50 80,40" stroke="#166534" strokeWidth="2" fill="none" opacity="0.2" />
        <path d="M50,40 Q30,30 20,20" stroke="#166534" strokeWidth="2" fill="none" opacity="0.2" />
    </svg>
);

const DosaTriangle = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg viewBox="0 0 100 100" className={className} style={style}>
        {/* Cone shape */}
        <path d="M50,10 L85,85 Q50,95 15,85 Z" fill="#F59E0B" className="drop-shadow-sm" />
        {/* Golden texture */}
        <path d="M50,10 L85,85" stroke="#D97706" strokeWidth="2" opacity="0.3" />
        <circle cx="50" cy="50" r="15" fill="#FEF3C7" opacity="0.2" filter="blur(4px)" />
    </svg>
);

// --- Component ---

export const HeroSection = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Environment Checks
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // CSS Variable Parallax (High Performance)
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (prefersReducedMotion || isTouchDevice || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        // Normalized -1 to 1 based on center
        const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

        containerRef.current.style.setProperty('--mouse-x', x.toFixed(3));
        containerRef.current.style.setProperty('--mouse-y', y.toFixed(3));
    }, [prefersReducedMotion, isTouchDevice]);

    const handleMouseLeave = () => {
        setIsHovered(false);
        if (containerRef.current) {
            // Reset parallax genttly
            containerRef.current.style.setProperty('--mouse-x', '0');
            containerRef.current.style.setProperty('--mouse-y', '0');
        }
    };

    /**
     * Calculates transform styles based on CSS variables.
     * @param depth Multiplier for movement range (higher = closer/faster)
     * @param initialRotation Base rotation
     */
    const getParallaxStyle = (depth: number, initialRotation: number) => {
        if (prefersReducedMotion || isTouchDevice) return {};

        return {
            // Use CSS calc to bind to the variable set by JS
            transform: `translate(calc(var(--mouse-x, 0) * ${depth * 15}px), calc(var(--mouse-y, 0) * ${depth * 15}px)) rotate(calc(${initialRotation}deg + (var(--mouse-x, 0) * 5deg)))`,
            transition: 'transform 0.1s linear', // Ultra-smooth linear tracking
        };
    };

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            className={`
                relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50 
                border-b border-orange-100 group perspective-1000 min-h-[500px] flex items-center justify-center
                transition-all duration-700 ease-out
            `}
        >
            {/* Ambient Glow (Intensifies on Hover) */}
            <div
                className={`
                    absolute inset-0 bg-gradient-to-r from-orange-100/30 to-amber-100/30
                    transition-opacity duration-1000 ease-in-out
                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                `}
            />

            {/* 
                --- VEG PARALLAX LAYERS --- 
                Revealed on Hover (Desktop) | Static Background (Mobile)
            */}

            {/* Top Left: Tomato Slice */}
            <div
                className={`absolute top-[10%] left-[5%] md:left-[15%] transition-all duration-700 ease-out z-0
                    ${isTouchDevice ? 'opacity-20 scale-90' : isHovered ? 'opacity-70 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-75'}
                `}
                style={getParallaxStyle(-1.2, -15)}
            >
                <TomatoSlice className="w-16 h-16 md:w-24 md:h-24 drop-shadow-md" />
            </div>

            {/* Top Right: Dosa Triangle */}
            <div
                className={`absolute top-[15%] right-[5%] md:right-[15%] transition-all duration-700 ease-out delay-75 z-0
                    ${isTouchDevice ? 'opacity-20 scale-90' : isHovered ? 'opacity-60 translate-y-0 scale-100' : 'opacity-0 -translate-y-10 scale-75'}
                `}
                style={getParallaxStyle(1.0, 15)}
            >
                <DosaTriangle className="w-20 h-20 md:w-28 md:h-28 drop-shadow-md" />
            </div>

            {/* Bottom Left: Paneer Block */}
            <div
                className={`absolute bottom-[15%] left-[8%] md:left-[20%] transition-all duration-700 ease-out delay-100 z-0
                    ${isTouchDevice ? 'opacity-20 scale-90' : isHovered ? 'opacity-60 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-75'}
                `}
                style={getParallaxStyle(0.8, 10)}
            >
                <PaneerBlock className="w-14 h-14 md:w-20 md:h-20 drop-shadow-md" />
            </div>

            {/* Bottom Right: Mint Leaf */}
            <div
                className={`absolute bottom-[20%] right-[10%] md:right-[20%] transition-all duration-700 ease-out delay-150 z-0
                    ${isTouchDevice ? 'opacity-20 scale-90' : isHovered ? 'opacity-70 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-75'}
                `}
                style={getParallaxStyle(-1.5, -30)}
            >
                <MintLeaf className="w-12 h-12 md:w-16 md:h-16 drop-shadow-sm" />
            </div>


            {/* --- Main Content (Text & CTA) --- */}
            <div className={`
                relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10
                transition-transform duration-700 ease-out
                ${isHovered ? 'scale-[1.02]' : 'scale-100'}
            `}>

                {/* Badge */}
                <div className={`
                    inline-flex items-center gap-2 px-5 py-2.5 bg-white/90 backdrop-blur-md rounded-full text-sm font-bold text-orange-600 mb-8 shadow-sm border border-white/50
                    transition-all duration-500
                    ${isHovered ? 'shadow-orange-200/50 -translate-y-1' : ''}
                `}>
                    <Sparkles size={16} className="animate-pulse text-amber-500" />
                    <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent tracking-wide">
                        Order from campus canteens
                    </span>
                </div>

                {/* Main Heading */}
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-gray-900 mb-8 tracking-tight drop-shadow-sm leading-tight">
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
                <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium leading-relaxed mb-10">
                    Fast delivery from your favorite campus canteens directly to your classroom or dorm.
                </p>

                {/* Optional CTA or visual anchor if needed, currently pure text focus per requirement */}
            </div>
        </div>
    );
};
