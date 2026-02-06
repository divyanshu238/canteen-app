
import { useEffect, useState } from 'react';
import { adminAPI } from '../api';
import { Navbar } from '../components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import {
    Users, ShoppingBag, DollarSign, TrendingUp,
    AlertTriangle, Star, Activity, Shield, Store,
    Coffee, FileText, Settings
} from 'lucide-react';

// Super Admin Tabs
import { UsersTab } from './admin/UsersTab';
import { CanteensTab } from './admin/CanteensTab';
import { OrdersTab } from './admin/OrdersTab';
import { ReviewsTab } from './admin/ReviewsTab';
import { AuditLogsTab } from './admin/AuditLogsTab';
import { SystemSettingsTab } from './admin/SystemSettingsTab';
import { MenuTab } from './admin/MenuTab';

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

type SuperAdminTab = 'users' | 'canteens' | 'menu' | 'orders' | 'reviews' | 'audit' | 'settings';

export const AdminDashboard = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSuperTab, setActiveSuperTab] = useState<SuperAdminTab>('users');

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

    const isAdmin = user?.role === 'admin';

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

    const superAdminTabs: { id: SuperAdminTab, label: string, icon: any }[] = [
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'canteens', label: 'Canteens', icon: Store },
        { id: 'menu', label: 'Global Menu', icon: Coffee },
        { id: 'orders', label: 'All Orders', icon: ShoppingBag },
        { id: 'reviews', label: 'Reviews', icon: Star },
        { id: 'audit', label: 'Audit Logs', icon: FileText },
        { id: 'settings', label: 'System', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header with Badges */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            Admin Dashboard
                            {isAdmin && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider rounded-full border border-purple-200 flex items-center gap-1">
                                    <Shield size={12} fill="currentColor" /> Super Admin
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Platform overview & controls</p>
                    </div>
                    <span className="text-sm text-gray-400 font-mono">
                        v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
                    </span>
                </div>

                {/* 1. Key Metrics Cards (Visible to All Admins) */}
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

                {/* 2. Rating Trend & Analytics (Visible to All Admins) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
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
                            {(!ratingAnalytics?.topCanteens || ratingAnalytics.topCanteens.length === 0) && (
                                <div className="text-center text-gray-400 text-sm py-4">No data available</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ================================================================================== */}
                {/* 3. SUPER ADMIN CONTROLS SECTION */}
                {/* ================================================================================== */}

                {isAdmin && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="border-t-2 border-dashed border-gray-200 pt-12"
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-purple-600 rounded-xl text-white shadow-lg shadow-purple-600/20">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Super Admin Controls</h2>
                                <p className="text-gray-500">System-wide management and overrides</p>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Vertical Tab Navigation (Desktop) / Horizontal (Mobile) */}
                            <div className="lg:w-64 flex-shrink-0">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 space-y-1 sticky top-24">
                                    {superAdminTabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveSuperTab(tab.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeSuperTab === tab.id
                                                ? 'bg-purple-50 text-purple-700'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                }`}
                                        >
                                            <tab.icon className={`w-5 h-5 ${activeSuperTab === tab.id ? 'text-purple-600' : 'text-gray-400'}`} />
                                            {tab.label}
                                            {activeSuperTab === tab.id && (
                                                <motion.div layoutId="activeTabIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-600" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tab Content Area */}
                            <div className="flex-1 min-w-0">
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
                                    <div className="mb-6 pb-4 border-b border-gray-100 flex justify-between items-center">
                                        <h3 className="text-xl font-bold text-gray-900">
                                            {superAdminTabs.find(t => t.id === activeSuperTab)?.label}
                                        </h3>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeSuperTab}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {activeSuperTab === 'users' && <UsersTab />}
                                            {activeSuperTab === 'canteens' && <CanteensTab />}
                                            {activeSuperTab === 'menu' && <MenuTab />}
                                            {activeSuperTab === 'orders' && <OrdersTab />}
                                            {activeSuperTab === 'reviews' && <ReviewsTab />}
                                            {activeSuperTab === 'audit' && <AuditLogsTab />}
                                            {activeSuperTab === 'settings' && <SystemSettingsTab />}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </motion.div>
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
