import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { Sparkles, TrendingUp, Clock, Star } from 'lucide-react';

// --- Assets & Data ---
// curated high-quality transparent/food images from Unsplash or specialized CDN would be ideal.
// For this 'Apple-quality' demo, we use specific high-res Unsplash crops that look like isolated plates or premium shots.

interface CategoryData {
    id: string;
    name: string;
    image: string;
    subtext: string;
    badge?: { text: string; icon: React.ReactNode; color: string };
    gradient: string;
}

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

// --- Components ---

const CategoryCard = ({ category, index }: { category: CategoryData; index: number }) => {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);

    // Mouse tilt effect logic
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth spring animation for tilt
    const mouseX = useSpring(x, { stiffness: 300, damping: 30 });
    const mouseY = useSpring(y, { stiffness: 300, damping: 30 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXVal = e.clientX - rect.left;
        const mouseYVal = e.clientY - rect.top;

        const xPct = mouseXVal / width - 0.5;
        const yPct = mouseYVal / height - 0.5;

        x.set(xPct * 10); // Rotate Y axis (looks right/left)
        y.set(yPct * -10); // Rotate X axis (looks up/down)
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
        setIsHovered(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                duration: 0.5,
                delay: index * 0.05,
                ease: [0.22, 1, 0.36, 1] // Custom refined bezier
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            onClick={() => navigate(`/category/${category.id}`)}
            className="relative group cursor-pointer flex-shrink-0 py-2 perspective-1000"
            style={{ perspective: 1000 }}
        >
            <motion.div
                style={{
                    rotateX: mouseY,
                    rotateY: mouseX,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className="relative w-40 h-52 sm:w-48 sm:h-60 rounded-[2rem] bg-white shadow-xl shadow-gray-200/50 overflow-visible transition-all duration-300"
            >
                {/* 1. Dynamic Glass Background */}
                <div className={`absolute inset-0 rounded-[2rem] bg-gradient-to-br ${category.gradient} opacity-50`} />

                {/* 2. Image Container (Masked) */}
                <div className="absolute inset-2 top-2 bottom-[35%] rounded-3xl overflow-hidden bg-white shadow-inner">
                    <motion.img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-cover"
                        animate={{
                            scale: isHovered ? 1.1 : 1,
                        }}
                        transition={{ duration: 0.6 }}
                        loading="lazy"
                    />

                    {/* Overlay Gradient for text legibility if needed, though mostly using bottom space */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* 3. Floating Badge (AI recommended feel) */}
                <AnimatePresence>
                    {category.badge && isHovered && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.8 }}
                            className={`
                                absolute -top-3 -right-3 px-3 py-1.5 rounded-full 
                                ${category.badge.color} text-white text-[10px] font-bold uppercase tracking-wider
                                shadow-lg flex items-center gap-1 z-20
                            `}
                        >
                            {category.badge.icon}
                            {category.badge.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 4. Content Area (Bottom) */}
                <div className="absolute bottom-0 left-0 right-0 p-5 pt-0 flex flex-col items-center justify-center h-[35%] text-center">
                    <motion.h3
                        className="text-lg font-bold text-gray-800 leading-tight"
                        animate={{ y: isHovered ? -2 : 0 }}
                    >
                        {category.name}
                    </motion.h3>

                    <motion.p
                        className="text-xs font-medium text-gray-500 mt-1"
                        animate={{
                            opacity: isHovered ? 1 : 0.7,
                            y: isHovered ? -2 : 0
                        }}
                    >
                        {category.subtext}
                    </motion.p>

                    {/* Animated "Go" Button indicator appearing on hover */}
                    <div className="absolute bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <div className="h-1 w-8 bg-gray-300 rounded-full" />
                    </div>
                </div>

                {/* 5. Highlight / Reflection (Glassmorphism) */}
                <div className="absolute inset-0 rounded-[2rem] ring-1 ring-white/60 pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-[2rem] pointer-events-none" />

            </motion.div>
        </motion.div>
    );
};

export const CategorySection = ({ className = '' }: { className?: string }) => {
    return (
        <section className={`py-8 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <AnimatePresence>
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

                        {/* Desktop Navigation Hints (Optional) */}
                        <div className="hidden sm:flex gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <div className="w-2 h-2 rounded-full bg-gray-200" />
                            <div className="w-2 h-2 rounded-full bg-gray-200" />
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Scroll Container */}
                <div
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
                    {CATEGORIES.map((cat, index) => (
                        <div key={cat.id} className="snap-center sm:snap-start">
                            <CategoryCard category={cat} index={index} />
                        </div>
                    ))}

                    {/* Padding element for end of scroll */}
                    <div className="w-4 flex-shrink-0 sm:hidden" />
                </div>
            </div>
        </section>
    );
};

export default CategoryCard;

