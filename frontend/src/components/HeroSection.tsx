import React, { useState, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { VegetableBackground } from './VegetableBackground';

// --- Component ---

export const HeroSection = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Environment Checks
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    return (
        <div
            ref={containerRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
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

            {/* --- VEG PARTICLE BACKGROUND --- */}
            <VegetableBackground />

            {/* --- Main Content (Text & CTA) --- */}
            <div className={`
                relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-30
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
