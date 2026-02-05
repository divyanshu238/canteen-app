import { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface CategoryCardProps {
    name: string;
    emoji: string;
    color: string;
    index: number;
}

/**
 * Premium Category Card with micro-interactions and subtle parallax
 * 
 * Design Philosophy:
 * - Calm, refined animations that feel native to iOS/premium apps
 * - Layered design creates depth without overwhelming
 * - Interactions reward users with subtle, satisfying feedback
 * - Respects accessibility (reduced motion, keyboard nav)
 */
export const CategoryCard = ({ name, emoji, color, index }: CategoryCardProps) => {
    const navigate = useNavigate();
    const cardRef = useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [isTouched, setIsTouched] = useState(false);

    // Subtle parallax on mouse move (respects reduced motion)
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        setMousePosition({ x, y });
    }, []);

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        // Reset to center on leave for smooth exit
        setMousePosition({ x: 0.5, y: 0.5 });
    };

    const handleMouseDown = () => {
        setIsPressed(true);
    };

    const handleMouseUp = () => {
        setIsPressed(false);
    };

    // Touch handling for mobile
    const handleTouchStart = () => {
        setIsTouched(true);
        setIsPressed(true);
    };

    const handleTouchEnd = () => {
        setTimeout(() => {
            setIsTouched(false);
            setIsPressed(false);
        }, 150);
    };

    const handleClick = () => {
        navigate(`/category/${name.toLowerCase()}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsPressed(true);
            setTimeout(() => {
                setIsPressed(false);
                handleClick();
            }, 100);
        }
    };

    // Calculate transforms for parallax effect
    // Values are kept subtle (max 3-4px movement) to avoid motion sickness
    const parallaxX = (mousePosition.x - 0.5) * 4;
    const parallaxY = (mousePosition.y - 0.5) * 4;
    const rotateX = (mousePosition.y - 0.5) * -6; // Subtle 3D tilt
    const rotateY = (mousePosition.x - 0.5) * 6;

    // Staggered animation delay based on index
    const animationDelay = `${index * 50}ms`;

    return (
        <div
            ref={cardRef}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label={`Browse ${name} category`}
            className="flex-shrink-0 cursor-pointer group outline-none"
            style={{
                animationDelay,
                perspective: '800px'
            }}
        >
            {/* Card Container with 3D Perspective */}
            <div
                className={`
                    relative w-32 h-32 rounded-3xl overflow-hidden
                    transform-gpu will-change-transform
                    transition-all duration-300 ease-out
                    motion-reduce:transition-none motion-reduce:transform-none
                    ${isHovered ? 'scale-[1.04]' : 'scale-100'}
                    ${isPressed ? 'scale-[0.96]' : ''}
                    focus-visible:ring-4 focus-visible:ring-orange-400/50 focus-visible:ring-offset-2
                `}
                style={{
                    transform: isHovered
                        ? `translateY(-6px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
                        : 'translateY(0) rotateX(0) rotateY(0)',
                    transformStyle: 'preserve-3d',
                }}
            >
                {/* Layer 1: Background Gradient with subtle shift on hover */}
                <div
                    className={`
                        absolute inset-0 bg-gradient-to-br ${color}
                        transition-all duration-500 ease-out
                        motion-reduce:transition-none
                    `}
                    style={{
                        backgroundPosition: isHovered
                            ? `${50 + parallaxX * 3}% ${50 + parallaxY * 3}%`
                            : '50% 50%',
                        backgroundSize: '200% 200%',
                    }}
                />

                {/* Layer 2: Ambient glow overlay */}
                <div
                    className={`
                        absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/20
                        transition-opacity duration-300
                        ${isHovered ? 'opacity-100' : 'opacity-60'}
                    `}
                />

                {/* Layer 3: Glass highlight (subtle neumorphism) */}
                <div
                    className={`
                        absolute top-0 left-0 right-0 h-1/2
                        bg-gradient-to-b from-white/25 to-transparent
                        rounded-t-3xl
                        transition-opacity duration-300
                        ${isHovered ? 'opacity-100' : 'opacity-60'}
                    `}
                />

                {/* Layer 4: Icon with parallax and micro-animation */}
                <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                        transform: isHovered
                            ? `translate(${parallaxX * -0.5}px, ${parallaxY * -0.5}px)`
                            : 'translate(0, 0)',
                        transition: 'transform 0.2s ease-out',
                    }}
                >
                    <span
                        className={`
                            text-5xl filter drop-shadow-lg
                            transition-all duration-300 ease-out
                            motion-reduce:transition-none motion-reduce:transform-none
                            ${isHovered ? 'scale-110' : 'scale-100'}
                        `}
                        style={{
                            transform: isHovered
                                ? 'translateY(-2px) rotate(3deg)'
                                : 'translateY(0) rotate(0deg)',
                            textShadow: isHovered
                                ? '0 8px 20px rgba(0,0,0,0.2)'
                                : '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                    >
                        {emoji}
                    </span>
                </div>

                {/* Layer 5: Soft shadow (expands on hover) */}
                <div
                    className={`
                        absolute -inset-1 -z-10 rounded-3xl
                        bg-gradient-to-br ${color} blur-xl
                        transition-all duration-300 ease-out
                        ${isHovered ? 'opacity-40 scale-105' : 'opacity-0 scale-100'}
                    `}
                />

                {/* Mobile tap ripple effect */}
                {isTouched && (
                    <div
                        className="absolute inset-0 bg-white/30 rounded-3xl animate-ping"
                        style={{ animationDuration: '300ms', animationIterationCount: 1 }}
                    />
                )}
            </div>

            {/* Label with subtle lift animation */}
            <p
                className={`
                    text-center font-bold text-gray-700 mt-3
                    transition-all duration-300 ease-out
                    motion-reduce:transition-none
                    ${isHovered
                        ? 'text-orange-600 transform -translate-y-0.5'
                        : 'text-gray-700 transform translate-y-0'
                    }
                `}
            >
                {name}
            </p>
        </div>
    );
};

/**
 * Category Cards Container - "What's on your mind?" section
 * Horizontal scroll with premium feel
 */
interface CategorySectionProps {
    className?: string;
}

export const CategorySection = ({ className = '' }: CategorySectionProps) => {
    const navigate = useNavigate();

    const categories = [
        { name: 'Burger', emoji: '🍔', color: 'from-amber-400 via-orange-400 to-orange-500' },
        { name: 'Pizza', emoji: '🍕', color: 'from-red-400 via-rose-400 to-pink-500' },
        { name: 'Biryani', emoji: '🍛', color: 'from-orange-400 via-amber-500 to-red-500' },
        { name: 'Rolls', emoji: '🌯', color: 'from-emerald-400 via-green-400 to-teal-500' },
        { name: 'Coffee', emoji: '☕', color: 'from-amber-600 via-orange-600 to-amber-700' },
        { name: 'Dessert', emoji: '🍰', color: 'from-pink-400 via-rose-400 to-purple-500' },
        { name: 'Noodles', emoji: '🍜', color: 'from-yellow-400 via-orange-400 to-red-500' },
        { name: 'Sandwich', emoji: '🥪', color: 'from-lime-400 via-yellow-300 to-green-400' },
    ];

    return (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                    What's on your mind?
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
            </div>

            {/* Scrollable Cards Container */}
            <div
                className="
                    flex gap-5 overflow-x-auto pb-4 
                    scroll-smooth snap-x snap-mandatory
                    no-scrollbar
                    -mx-4 px-4
                "
                style={{
                    // Fade edges for premium feel
                    maskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
                }}
            >
                {categories.map((cat, index) => (
                    <div key={cat.name} className="snap-start">
                        <CategoryCard
                            name={cat.name}
                            emoji={cat.emoji}
                            color={cat.color}
                            index={index}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoryCard;
