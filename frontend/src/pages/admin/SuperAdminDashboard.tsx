/**
 * Super Admin Dashboard - God Mode Control Plane
 * 
 * Central hub for platform-wide management with full CRUD capabilities.
 */

import { useEffect, useState } from 'react';
import { superadminAPI } from '../../api';
import { Navbar } from '../../components/Navbar';
import { OrdersTab } from './OrdersTab';
import { ReviewsTab } from './ReviewsTab';
import { AuditLogsTab } from './AuditLogsTab';
import { SystemSettingsTab } from './SystemSettingsTab';
import { MenuTab } from './MenuTab';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Store, ShoppingBag, DollarSign, Star, Shield,
    AlertTriangle, Activity, Settings, FileText, ChevronRight,
    TrendingUp, Clock, Eye, Edit, Trash2, Power, Lock,
    RefreshCw, Search, Filter, Download, Plus, MoreVertical,
    CheckCircle, XCircle, UserX, UserCheck, Ban, Coffee
} from 'lucide-react';

interface OverviewStats {
    users: { student?: number; partner?: number; admin?: number };
    canteens: { approved?: number; pending?: number };
    todayOrders: number;
    monthlyRevenue: number;
}

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    isApproved: boolean;
    createdAt: string;
    suspendedAt?: string;
}

interface Canteen {
    _id: string;
    name: string;
    isApproved: boolean;
    isOpen: boolean;
    ownerId?: { name: string; email: string };
    createdAt: string;
}

type Tab = 'overview' | 'users' | 'canteens' | 'menu' | 'orders' | 'reviews' | 'audit' | 'settings';

export default function SuperAdminDashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [stats, setStats] = useState<OverviewStats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [canteens, setCanteens] = useState<Canteen[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (activeTab === 'overview') {
                const res = await superadminAPI.getOverviewAnalytics();
                setStats(res.data.data);
            } else if (activeTab === 'users') {
                const res = await superadminAPI.listUsers({
                    search: searchQuery || undefined,
                    role: selectedRole || undefined,
                    status: selectedStatus || undefined,
                    limit: 50
                });
                setUsers(res.data.data);
            } else if (activeTab === 'canteens') {
                const res = await superadminAPI.listCanteens({ limit: 50 });
                setCanteens(res.data.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSuspendUser = async (userId: string) => {
        const reason = prompt('Enter suspension reason:');
        if (!reason) return;
        try {
            await superadminAPI.suspendUser(userId, reason);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to suspend user');
        }
    };

    const handleReactivateUser = async (userId: string) => {
        try {
            await superadminAPI.reactivateUser(userId);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to reactivate user');
        }
    };

    const handleForceLogout = async (userId: string) => {
        if (!confirm('Force logout this user from all devices?')) return;
        try {
            await superadminAPI.forceLogout(userId, 'Admin-initiated force logout');
            alert('User has been logged out from all devices');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to force logout');
        }
    };

    const handleApproveCanteen = async (canteenId: string) => {
        try {
            await superadminAPI.approveCanteen(canteenId);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to approve canteen');
        }
    };

    const handleSuspendCanteen = async (canteenId: string) => {
        const reason = prompt('Enter suspension reason:');
        if (!reason) return;
        try {
            await superadminAPI.suspendCanteen(canteenId, reason);
            loadData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to suspend canteen');
        }
    };

    const tabs: { id: Tab; label: string; icon: any }[] = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'canteens', label: 'Canteens', icon: Store },
        { id: 'menu', label: 'Menu', icon: Coffee },
        { id: 'orders', label: 'Orders', icon: ShoppingBag },
        { id: 'reviews', label: 'Reviews', icon: Star },
        { id: 'audit', label: 'Audit Logs', icon: FileText },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Super Admin</h1>
                        <p className="text-purple-300">God Mode Control Plane</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                                : 'bg-white/10 text-white/70 hover:bg-white/20'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-red-300">
                        <AlertTriangle className="w-6 h-6 mb-2" />
                        {error}
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && stats && (
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                            >
                                <StatCard
                                    icon={Users}
                                    label="Total Users"
                                    value={(stats.users.student || 0) + (stats.users.partner || 0) + (stats.users.admin || 0)}
                                    subtitle={`${stats.users.student || 0} students, ${stats.users.partner || 0} partners`}
                                    color="blue"
                                />
                                <StatCard
                                    icon={Store}
                                    label="Canteens"
                                    value={(stats.canteens.approved || 0) + (stats.canteens.pending || 0)}
                                    subtitle={`${stats.canteens.approved || 0} active, ${stats.canteens.pending || 0} pending`}
                                    color="green"
                                />
                                <StatCard
                                    icon={ShoppingBag}
                                    label="Today's Orders"
                                    value={stats.todayOrders}
                                    subtitle="Paid orders"
                                    color="orange"
                                />
                                <StatCard
                                    icon={DollarSign}
                                    label="Monthly Revenue"
                                    value={`₹${(stats.monthlyRevenue / 100).toFixed(0)}`}
                                    subtitle="Last 30 days"
                                    color="purple"
                                />
                            </motion.div>
                        )}

                        {activeTab === 'users' && (
                            <motion.div
                                key="users"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                {/* Controls */}
                                <div className="flex flex-wrap gap-4 mb-6">
                                    <div className="flex-1 min-w-[200px]">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                                            <input
                                                type="text"
                                                placeholder="Search users..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                                                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50"
                                            />
                                        </div>
                                    </div>
                                    <select
                                        value={selectedRole}
                                        onChange={(e) => { setSelectedRole(e.target.value); }}
                                        className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                    >
                                        <option value="">All Roles</option>
                                        <option value="student">Students</option>
                                        <option value="partner">Partners</option>
                                        <option value="admin">Admins</option>
                                    </select>
                                    <select
                                        value={selectedStatus}
                                        onChange={(e) => { setSelectedStatus(e.target.value); }}
                                        className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                                    >
                                        <option value="">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
                                    <button
                                        onClick={loadData}
                                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white flex items-center gap-2"
                                    >
                                        <Filter className="w-4 h-4" />
                                        Apply
                                    </button>
                                </div>

                                {/* Users Table */}
                                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-white/5">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-white/70">User</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Role</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Status</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Joined</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-white/70">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/10">
                                            {users.map((user) => (
                                                <tr key={user._id} className="hover:bg-white/5">
                                                    <td className="px-4 py-3">
                                                        <div>
                                                            <div className="font-medium text-white">{user.name}</div>
                                                            <div className="text-sm text-white/50">{user.email}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-300' :
                                                            user.role === 'partner' ? 'bg-blue-500/20 text-blue-300' :
                                                                'bg-green-500/20 text-green-300'
                                                            }`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {user.suspendedAt ? (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300">
                                                                Suspended
                                                            </span>
                                                        ) : user.isActive ? (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300">
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-white/70 text-sm">
                                                        {new Date(user.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleForceLogout(user._id)}
                                                                className="p-2 hover:bg-white/10 rounded-lg text-yellow-400"
                                                                title="Force Logout"
                                                            >
                                                                <Power className="w-4 h-4" />
                                                            </button>
                                                            {user.suspendedAt ? (
                                                                <button
                                                                    onClick={() => handleReactivateUser(user._id)}
                                                                    className="p-2 hover:bg-white/10 rounded-lg text-green-400"
                                                                    title="Reactivate"
                                                                >
                                                                    <UserCheck className="w-4 h-4" />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleSuspendUser(user._id)}
                                                                    className="p-2 hover:bg-white/10 rounded-lg text-red-400"
                                                                    title="Suspend"
                                                                >
                                                                    <Ban className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'canteens' && (
                            <motion.div
                                key="canteens"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-white/5">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Canteen</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Owner</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Status</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-white/70">Open</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-white/70">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/10">
                                            {canteens.map((canteen) => (
                                                <tr key={canteen._id} className="hover:bg-white/5">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-white">{canteen.name}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm text-white/70">
                                                            {canteen.ownerId?.name || 'Unknown'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {canteen.isApproved ? (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                                                                Approved
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
                                                                Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {canteen.isOpen ? (
                                                            <span className="text-green-400">Open</span>
                                                        ) : (
                                                            <span className="text-red-400">Closed</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-2">
                                                            {!canteen.isApproved && (
                                                                <button
                                                                    onClick={() => handleApproveCanteen(canteen._id)}
                                                                    className="p-2 hover:bg-white/10 rounded-lg text-green-400"
                                                                    title="Approve"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleSuspendCanteen(canteen._id)}
                                                                className="p-2 hover:bg-white/10 rounded-lg text-red-400"
                                                                title="Suspend"
                                                            >
                                                                <Ban className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'menu' && (
                            <motion.div
                                key="menu"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <MenuTab />
                            </motion.div>
                        )}

                        {activeTab === 'orders' && (
                            <motion.div
                                key="orders"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <OrdersTab />
                            </motion.div>
                        )}

                        {activeTab === 'reviews' && (
                            <motion.div
                                key="reviews"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <ReviewsTab />
                            </motion.div>
                        )}

                        {activeTab === 'audit' && (
                            <motion.div
                                key="audit"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <AuditLogsTab />
                            </motion.div>
                        )}

                        {activeTab === 'settings' && (
                            <motion.div
                                key="settings"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >
                                <SystemSettingsTab />
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, subtitle, color }: {
    icon: any;
    label: string;
    value: string | number;
    subtitle: string;
    color: 'blue' | 'green' | 'orange' | 'purple';
}) {
    const colors = {
        blue: 'from-blue-500 to-cyan-500',
        green: 'from-green-500 to-emerald-500',
        orange: 'from-orange-500 to-amber-500',
        purple: 'from-purple-500 to-pink-500',
    };

    return (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${colors[color]} mb-4`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{value}</div>
            <div className="text-white/70 font-medium">{label}</div>
            <div className="text-sm text-white/50 mt-1">{subtitle}</div>
        </div>
    );
}
