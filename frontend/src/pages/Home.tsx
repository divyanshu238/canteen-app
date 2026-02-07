import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { canteenAPI } from '../api';
import { Navbar } from '../components/Navbar';
import { AntigravityCategorySection } from '../components/AntigravityCategorySection';
import { HeroSection } from '../components/HeroSection';
import { CanteenCard, CanteenCardSkeleton } from '../components/CanteenCard';
import { useOrderHistory } from '../hooks/useOrderHistory';
import { pageVariants, staggerContainer } from '../utils/motion';
import { ReviewNudge } from '../components/ReviewNudge';

interface Canteen {
    _id: string;
    name: string;
    image: string;
    rating: number;
    tags: string[];
    priceRange: string;
    preparationTime?: string;
    isOpen: boolean;
}

export const Home = () => {
    const [canteens, setCanteens] = useState<Canteen[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Initialize order history
    useOrderHistory();

    useEffect(() => {
        setLoading(true);
        canteenAPI.getAll()
            .then(res => {
                setCanteens(res.data.data);
                // Artificial delay to show off the skeleton animation if response is too fast
                // In production remove specific delays but keep skeleton logic
                setTimeout(() => setLoading(false), 800);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            className="min-h-screen bg-gray-50/50"
        >
            <Navbar />

            {/* HERO SECTION */}
            <HeroSection />

            {/* PREMIUM CATEGORY SCROLLER */}
            <AntigravityCategorySection className="-mt-0 z-10 relative" />

            {/* TOP RATED SECTIONS - Loaded Lazily */}
            {/* Top Rated Snacks */}
            <TopRatedSection title="Top Rated Snacks" category="Snacks" loading={loading} />

            {/* Top Rated Meals */}
            <TopRatedSection title="Top Rated Meals" category="Mains" loading={loading} />

            {/* ALL CANTEENS SECTION */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex items-center justify-between mb-8"
                >
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">All Canteens</h2>
                        <p className="text-gray-500 mt-1">Authentic flavors from the best kitchens</p>
                    </div>
                </motion.div>

                {/* Loading Skeletons */}
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-full">
                                <CanteenCardSkeleton />
                            </div>
                        ))}
                    </div>
                )}

                {/* Canteen Cards */}
                {!loading && (
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: "-50px" }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8"
                    >
                        {canteens.map(c => (
                            <CanteenCard
                                key={c._id}
                                canteen={c}
                                onClick={() => navigate(`/canteen/${c._id}`)}
                            />
                        ))}
                    </motion.div>
                )}

                {/* Empty State */}
                {!loading && canteens.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-24"
                    >
                        <div className="text-6xl mb-4 animate-bounce">🍽️</div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">No canteens open right now</h3>
                        <p className="text-gray-500 max-w-md mx-auto">It seems all kitchens are closed. Check back later for delicious options!</p>
                    </motion.div>
                )}
            </div>

            {/* Review Nudge for recent orders */}
            <ReviewNudge />
        </motion.div>
    );
};

// Sub-component for Top Rated Generic Section
const TopRatedSection = ({ title, category, loading }: { title: string, category: string, loading: boolean }) => {
    const [items, setItems] = useState<Canteen[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading) {
            canteenAPI.getTopRatedByCategory(category)
                .then(res => setItems(res.data.data))
                .catch(err => console.error(err));
        }
    }, [category, loading]);

    if (items.length === 0) return null;

    return (
        <div className="bg-white py-12 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3 mb-8">
                    <span className="text-3xl">🏆</span>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{title}</h2>
                        <p className="text-gray-500 text-sm font-medium">Highest rated by students</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {items.map(c => (
                        <div key={c._id} className="transform scale-90 sm:scale-100 origin-center transition-transform">
                            <CanteenCard
                                canteen={{ ...c, category }} // Inject category
                                onClick={() => navigate(`/canteen/${c._id}`)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
