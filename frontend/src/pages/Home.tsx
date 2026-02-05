import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { canteenAPI } from '../api';
import { Navbar } from '../components/Navbar';
import { CategorySection } from '../components/CategoryCard';
import { HeroSection } from '../components/HeroSection';
import { Star, Clock } from 'lucide-react';
import { useOrderHistory } from '../hooks/useOrderHistory';

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

    // Initialize order history for "Previously ordered" badges
    useOrderHistory();

    useEffect(() => {
        setLoading(true);
        canteenAPI.getAll()
            .then(res => {
                setCanteens(res.data.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
            <Navbar />

            {/* HERO SECTION */}
            <HeroSection />

            {/* PREMIUM CATEGORY SCROLLER */}
            <CategorySection />

            {/* TOP CANTEENS SECTION */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Top canteens near you</h2>
                    {!loading && canteens.length > 0 && (
                        <span className="text-sm text-gray-500 font-medium">{canteens.length} restaurants</span>
                    )}
                </div>

                {/* Loading Skeletons */}
                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm">
                                <div className="h-48 bg-gradient-to-r from-gray-200 to-gray-300 animate-shimmer"></div>
                                <div className="p-4 space-y-3">
                                    <div className="h-5 bg-gray-200 rounded animate-shimmer w-3/4"></div>
                                    <div className="h-4 bg-gray-200 rounded animate-shimmer w-1/2"></div>
                                    <div className="h-4 bg-gray-200 rounded animate-shimmer w-2/3"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Canteen Cards */}
                {!loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {canteens.map(c => (
                            <div
                                key={c._id}
                                onClick={() => navigate(`/canteen/${c._id}`)}
                                className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100"
                            >
                                {/* Image Container */}
                                <div className="relative h-48 overflow-hidden bg-gray-100">
                                    <img
                                        src={c.image}
                                        alt={c.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    {/* Offer Badge */}
                                    <div className="absolute bottom-3 left-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1.5 rounded-xl text-xs font-black shadow-lg">
                                        {c.priceRange} OFF
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1 group-hover:text-orange-600 transition-colors">
                                        {c.name}
                                    </h3>

                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex items-center gap-1.5 bg-green-600 text-white px-2.5 py-1 rounded-lg">
                                            <Star size={12} fill="white" />
                                            <span className="text-sm font-bold">{c.rating}</span>
                                        </div>
                                        <span className="text-gray-300 text-sm">•</span>
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <Clock size={14} />
                                            <span className="text-sm font-semibold">{c.preparationTime || '20-25 min'}</span>
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-500 line-clamp-1 mb-2">
                                        {c.tags?.join(" • ") || "Quick bites"}
                                    </p>

                                    <p className="text-sm font-semibold text-gray-700">
                                        {c.priceRange} for two
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && canteens.length === 0 && (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🍽️</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No canteens available</h3>
                        <p className="text-gray-500">Check back later for delicious options!</p>
                    </div>
                )}
            </div>
        </div>
    );
};
