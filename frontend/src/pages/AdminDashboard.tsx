import { useEffect, useState } from 'react';
import { adminAPI } from '../api';
import { Navbar } from '../components/Navbar';
import { motion } from 'framer-motion';
import {
    Users, ShoppingBag, DollarSign, TrendingUp,
    AlertTriangle, Star, Activity
} from 'lucide-react';

interface RatingTrend {
    _id: string; // Date
    avgRating: number;
    count: number;
}

interface AnalyticsData {
    users: { total: number; students: number; partners: number };
    orders: { today: number; monthly: number; byStatus: Record<string, number> };
    revenue: { today: number; monthly: number };
    ratingAnalytics?: {
        trend: RatingTrend[];
        flaggedCount: number;
        topCanteens: any[];
        flaggedReviews: any[];
    };
}

export const AdminDashboard = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [basicRes, ratingRes] = await Promise.all([
                    adminAPI.getAnalytics(),
                    adminAPI.getRatingAnalytics()
                ]);

                setData({
                    ...basicRes.data.data,
                    ratingAnalytics: ratingRes.data.data
                });
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
                    <div className="h-8 bg-gray-200 w-1/4 rounded mb-8" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl" />)}
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { users, orders, revenue, ratingAnalytics } = data;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <span className="text-sm text-gray-500">Live Overview</span>
                </div>

                {/* 1. Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatsCard
                        title="Total Revenue (Monthly)"
                        value={`₹${revenue.monthly.toLocaleString()}`}
                        icon={<DollarSign className="text-green-600" />}
                        bg="bg-green-50"
                        trend="+12% vs last month"
                    />
                    <StatsCard
                        title="Active Orders (Today)"
                        value={orders.today.toString()}
                        icon={<ShoppingBag className="text-orange-600" />}
                        bg="bg-orange-50"
                    />
                    <StatsCard
                        title="Total Users"
                        value={users.total.toString()}
                        icon={<Users className="text-blue-600" />}
                        bg="bg-blue-50"
                    />
                    <StatsCard
                        title="Flagged Reviews"
                        value={ratingAnalytics?.flaggedCount.toString() || "0"}
                        icon={<AlertTriangle className="text-red-600" />}
                        bg="bg-red-50"
                        isAlert={ratingAnalytics?.flaggedCount! > 0}
                    />
                </div>

                {/* 2. Rating Trend & Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Main Chart Area */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Activity size={20} className="text-indigo-500" />
                                Review Sentiment Trend (30 Days)
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Rating</span>
                            </div>
                        </div>

                        {/* Custom Simple Line Chart using Flexbox & Framer Motion */}
                        <div className="h-64 flex items-end justify-between gap-2 pt-8 relative">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-300 pointer-events-none pb-6">
                                <span>5.0</span>
                                <span>2.5</span>
                                <span>0.0</span>
                            </div>

                            {ratingAnalytics?.trend.map((point, i) => {
                                const height = (point.avgRating / 5) * 100; // % height of bar/point
                                return (
                                    <div key={i} className="relative flex-1 flex flex-col items-center group h-full justify-end">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${height}%` }}
                                            transition={{ duration: 0.5, delay: i * 0.03 }}
                                            className="w-full max-w-[12px] bg-indigo-100 rounded-t-sm group-hover:bg-indigo-300 transition-colors relative"
                                        >
                                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${point.avgRating > 4 ? 'bg-green-500' : point.avgRating > 2.5 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                        </motion.div>

                                        {/* Tooltip */}
                                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs p-2 rounded pointer-events-none whitespace-nowrap z-10">
                                            {point._id} | ★ {point.avgRating.toFixed(1)}
                                        </div>
                                    </div>
                                );
                            })}

                            {(!ratingAnalytics?.trend || ratingAnalytics.trend.length === 0) && (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                    No enough data for trends yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Canteens Ranking */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <TrendingUp size={20} className="text-green-500" />
                            Top Performers
                        </h3>
                        <div className="space-y-4">
                            {ratingAnalytics?.topCanteens.map((canteen, i) => (
                                <div key={canteen._id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                                            i === 1 ? 'bg-gray-100 text-gray-600' :
                                                'bg-orange-50 text-orange-600'
                                        }`}>
                                        #{i + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 text-sm">{canteen.name}</h4>
                                        <p className="text-xs text-gray-500">{canteen.totalRatings} Reviews</p>
                                    </div>
                                    <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg text-xs font-bold">
                                        {canteen.rating.toFixed(1)} <Star size={10} fill="currentColor" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. Flagged Reviews Section */}
                {ratingAnalytics?.flaggedReviews && ratingAnalytics.flaggedReviews.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-sm border border-red-100 overflow-hidden mb-8">
                        <div className="p-6 border-b border-gray-100 bg-red-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-red-900 flex items-center gap-2">
                                <AlertTriangle size={20} className="text-red-600" />
                                Potentially Fraudulent Reviews
                            </h3>
                            <span className="text-xs font-bold bg-white text-red-600 px-3 py-1 rounded-full border border-red-200">
                                Action Required
                            </span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {ratingAnalytics.flaggedReviews.map((review: any) => (
                                <div key={review._id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm mb-1">{review.canteenId?.name || 'Unknown Canteen'}</h4>
                                            <p className="text-xs text-gray-500">By {review.userId?.name || 'Unknown User'} • {new Date(review.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-yellow-600 text-sm font-bold bg-yellow-50 px-2 py-1 rounded-lg">
                                            {review.rating} <Star size={12} fill="currentColor" />
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3 italic">"{review.comment}"</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                                            Flagged: {review.flagReason}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatsCard = ({ title, value, icon, bg, isAlert, trend }: any) => (
    <div className={`p-6 rounded-3xl border ${isAlert ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'} shadow-sm`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${bg}`}>{icon}</div>
            {isAlert && <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">Action Needed</span>}
        </div>
        <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{value}</h3>
            {trend && <p className="text-green-600 text-xs font-bold mt-2 flex items-center gap-1">
                <TrendingUp size={12} /> {trend}
            </p>}
        </div>
    </div>
);
