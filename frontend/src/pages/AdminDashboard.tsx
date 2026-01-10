import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { logout } from '../store';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../api';
import {
    Users, Store, ShoppingBag, TrendingUp,
    CheckCircle, XCircle, LogOut, BarChart3,
    Search, Filter, ChevronRight
} from 'lucide-react';

interface Analytics {
    users: { students: number; partners: number; total: number };
    canteens: { total: number; approved: number; pending: number };
    orders: { today: number; monthly: number; byStatus: Record<string, number> };
    revenue: { today: number; monthly: number; daily: Array<{ _id: string; revenue: number; orders: number }> };
}

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    isApproved: boolean;
    createdAt: string;
}

interface Canteen {
    _id: string;
    name: string;
    image: string;
    isOpen: boolean;
    isApproved: boolean;
    ownerId: { name: string; email: string };
    createdAt: string;
}

interface Order {
    _id: string;
    orderId: string;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    userId: { name: string; email: string };
    canteenId: { name: string };
    createdAt: string;
}

export const AdminDashboard = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'canteens' | 'orders'>('overview');
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [canteens, setCanteens] = useState<Canteen[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/login');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (user?.role === 'admin') {
            loadData();
        }
    }, [user, activeTab]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'overview') {
                const res = await adminAPI.getAnalytics();
                setAnalytics(res.data.data);
            } else if (activeTab === 'users') {
                const res = await adminAPI.getUsers({ search: searchQuery || undefined });
                setUsers(res.data.data);
            } else if (activeTab === 'canteens') {
                const res = await adminAPI.getCanteens({
                    status: filterStatus !== 'all' ? filterStatus : undefined
                });
                setCanteens(res.data.data);
            } else if (activeTab === 'orders') {
                const res = await adminAPI.getOrders();
                setOrders(res.data.data);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleUserStatus = async (userId: string, isActive: boolean) => {
        try {
            await adminAPI.updateUser(userId, { isActive: !isActive });
            setUsers(prev => prev.map(u =>
                u._id === userId ? { ...u, isActive: !isActive } : u
            ));
        } catch (error) {
            console.error('Failed to update user:', error);
        }
    };

    const approveCanteen = async (canteenId: string, approve: boolean) => {
        try {
            await adminAPI.updateCanteen(canteenId, { isApproved: approve });
            setCanteens(prev => prev.map(c =>
                c._id === canteenId ? { ...c, isApproved: approve } : c
            ));
        } catch (error) {
            console.error('Failed to update canteen:', error);
        }
    };

    const updateOrderStatus = async (orderId: string, status: string) => {
        try {
            await adminAPI.updateOrder(orderId, { status });
            setOrders(prev => prev.map(o =>
                o._id === orderId ? { ...o, status } : o
            ));
        } catch (error) {
            console.error('Failed to update order:', error);
        }
    };

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    if (!user || user.role !== 'admin') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                        <p className="text-sm text-gray-500">Welcome back, {user.name}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-gray-600 hover:text-red-600 font-medium"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-gray-200">
                    {[
                        { id: 'overview', label: 'Overview', icon: BarChart3 },
                        { id: 'users', label: 'Users', icon: Users },
                        { id: 'canteens', label: 'Canteens', icon: Store },
                        { id: 'orders', label: 'Orders', icon: ShoppingBag },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'text-orange-600 border-orange-600'
                                    : 'text-gray-600 border-transparent hover:text-gray-900'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && analytics && (
                    <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Users className="text-blue-600" size={24} />
                                    </div>
                                    <span className="text-gray-600 font-medium">Total Users</span>
                                </div>
                                <p className="text-3xl font-bold">{analytics.users.total}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {analytics.users.students} students, {analytics.users.partners} partners
                                </p>
                            </div>
                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <Store className="text-green-600" size={24} />
                                    </div>
                                    <span className="text-gray-600 font-medium">Canteens</span>
                                </div>
                                <p className="text-3xl font-bold">{analytics.canteens.approved}</p>
                                <p className="text-sm text-yellow-600 mt-1">
                                    {analytics.canteens.pending} pending approval
                                </p>
                            </div>
                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <ShoppingBag className="text-orange-600" size={24} />
                                    </div>
                                    <span className="text-gray-600 font-medium">Orders Today</span>
                                </div>
                                <p className="text-3xl font-bold">{analytics.orders.today}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {analytics.orders.monthly} this month
                                </p>
                            </div>
                            <div className="bg-white rounded-xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <TrendingUp className="text-purple-600" size={24} />
                                    </div>
                                    <span className="text-gray-600 font-medium">Revenue Today</span>
                                </div>
                                <p className="text-3xl font-bold">₹{analytics.revenue.today}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    ₹{analytics.revenue.monthly} this month
                                </p>
                            </div>
                        </div>

                        {/* Revenue Chart Placeholder */}
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold mb-4">Daily Revenue (Last 7 Days)</h3>
                            <div className="flex items-end gap-4 h-48">
                                {analytics.revenue.daily.map((day, idx) => (
                                    <div key={idx} className="flex-1 flex flex-col items-center">
                                        <div
                                            className="w-full bg-orange-500 rounded-t-lg transition-all hover:bg-orange-600"
                                            style={{
                                                height: `${Math.max((day.revenue / Math.max(...analytics.revenue.daily.map(d => d.revenue))) * 100, 10)}%`
                                            }}
                                        ></div>
                                        <p className="text-xs text-gray-500 mt-2">{day._id.slice(-5)}</p>
                                        <p className="text-xs font-bold">₹{day.revenue}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && loadData()}
                                    placeholder="Search users..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 ring-orange-500"
                                />
                            </div>
                        </div>

                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">User</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Role</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Status</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Joined</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map(u => (
                                    <tr key={u._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <p className="font-medium">{u.name}</p>
                                            <p className="text-sm text-gray-500">{u.email}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                                                    u.role === 'partner' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-gray-100 text-gray-600'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`flex items-center gap-1 text-sm ${u.isActive ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {u.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                {u.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(u.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.role !== 'admin' && (
                                                <button
                                                    onClick={() => toggleUserStatus(u._id, u.isActive)}
                                                    className={`text-sm font-medium ${u.isActive
                                                            ? 'text-red-600 hover:text-red-700'
                                                            : 'text-green-600 hover:text-green-700'
                                                        }`}
                                                >
                                                    {u.isActive ? 'Deactivate' : 'Activate'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Canteens Tab */}
                {activeTab === 'canteens' && (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Filter size={18} className="text-gray-400" />
                                <select
                                    value={filterStatus}
                                    onChange={e => {
                                        setFilterStatus(e.target.value as any);
                                        setTimeout(loadData, 0);
                                    }}
                                    className="border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 ring-orange-500"
                                >
                                    <option value="all">All Canteens</option>
                                    <option value="pending">Pending Approval</option>
                                    <option value="approved">Approved</option>
                                </select>
                            </div>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {canteens.map(canteen => (
                                <div key={canteen._id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                                    <img
                                        src={canteen.image}
                                        alt={canteen.name}
                                        className="w-16 h-16 rounded-xl object-cover"
                                    />
                                    <div className="flex-1">
                                        <h3 className="font-bold">{canteen.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            Owner: {canteen.ownerId?.name || 'Unknown'} ({canteen.ownerId?.email || 'N/A'})
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${canteen.isApproved
                                                ? 'bg-green-100 text-green-600'
                                                : 'bg-yellow-100 text-yellow-600'
                                            }`}>
                                            {canteen.isApproved ? 'Approved' : 'Pending'}
                                        </span>
                                        {!canteen.isApproved && (
                                            <button
                                                onClick={() => approveCanteen(canteen._id, true)}
                                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold"
                                            >
                                                Approve
                                            </button>
                                        )}
                                        {canteen.isApproved && (
                                            <button
                                                onClick={() => approveCanteen(canteen._id, false)}
                                                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm font-bold"
                                            >
                                                Revoke
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Order ID</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Customer</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Canteen</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Amount</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Status</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Payment</th>
                                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.map(order => (
                                    <tr key={order._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm">#{order.orderId}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium">{order.userId?.name || 'Unknown'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm">{order.canteenId?.name || 'Unknown'}</p>
                                        </td>
                                        <td className="px-6 py-4 font-bold">
                                            ₹{order.totalAmount}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={order.status}
                                                onChange={e => updateOrderStatus(order._id, e.target.value)}
                                                className="border border-gray-200 rounded px-2 py-1 text-sm"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="placed">Placed</option>
                                                <option value="confirmed">Confirmed</option>
                                                <option value="preparing">Preparing</option>
                                                <option value="ready">Ready</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.paymentStatus === 'paid'
                                                    ? 'bg-green-100 text-green-600'
                                                    : 'bg-yellow-100 text-yellow-600'
                                                }`}>
                                                {order.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                                                View <ChevronRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
