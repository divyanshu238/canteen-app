import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { logout } from '../store';
import { useSocket } from '../socket';
import { useNavigate } from 'react-router-dom';
import { partnerAPI } from '../api';
import {
    Bell, Edit, Power, Plus, Trash2, Save, X,
    Clock, ChefHat, CheckCircle, Package, LogOut,
    TrendingUp, DollarSign, ShoppingBag, Menu
} from 'lucide-react';

interface PartnerStats {
    todayOrders: number;
    totalOrders: number;
    menuItemCount: number;
    todayRevenue: number;
    canteen: {
        isOpen: boolean;
        isApproved: boolean;
    };
}

interface Order {
    _id: string;
    orderId: string;
    items: Array<{ name: string; qty: number; price: number }>;
    totalAmount: number;
    status: string;
    createdAt: string;
    userId?: { name: string; phone?: string };
}

interface MenuItem {
    _id: string;
    name: string;
    price: number;
    category: string;
    isVeg: boolean;
    inStock: boolean;
    description?: string;
    image?: string;
}

interface Canteen {
    _id: string;
    name: string;
    description?: string;
    image: string;
    isOpen: boolean;
    isApproved: boolean;
    tags: string[];
    priceRange: string;
    preparationTime: string;
}

export const PartnerDashboard = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();
    const socket = useSocket();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'settings'>('orders');
    const [stats, setStats] = useState<PartnerStats | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [canteen, setCanteen] = useState<Canteen | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddItem, setShowAddItem] = useState(false);
    const [newItem, setNewItem] = useState({
        name: '',
        price: 0,
        category: 'Mains',
        description: '',
        isVeg: true
    });

    // Check authentication
    useEffect(() => {
        if (!user || user.role !== 'partner') {
            navigate('/login');
        }
    }, [user, navigate]);

    // Load initial data
    useEffect(() => {
        if (user?.role === 'partner') {
            loadData();
        }
    }, [user]);

    // Socket listeners for live orders
    useEffect(() => {
        if (socket) {
            socket.on('new_order', (order: Order) => {
                console.log('New order received:', order);
                // Play notification sound
                try {
                    new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3').play();
                } catch (e) { }
                setOrders(prev => [order, ...prev]);
            });

            return () => {
                socket.off('new_order');
            };
        }
    }, [socket]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [statsRes, ordersRes, menuRes, canteenRes] = await Promise.all([
                partnerAPI.getStats(),
                partnerAPI.getLiveOrders(),
                partnerAPI.getMenu(),
                partnerAPI.getCanteen()
            ]);

            setStats(statsRes.data.data);
            setOrders(ordersRes.data.data);
            setMenu(menuRes.data.data);
            setCanteen(canteenRes.data.data);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateOrderStatus = async (orderId: string, status: string) => {
        try {
            await partnerAPI.updateOrderStatus(orderId, status);
            setOrders(prev => prev.map(o =>
                o._id === orderId ? { ...o, status } : o
            ));
        } catch (error) {
            console.error('Failed to update order:', error);
        }
    };

    const toggleCanteenStatus = async () => {
        try {
            const res = await partnerAPI.toggleCanteenStatus();
            setCanteen(prev => prev ? { ...prev, isOpen: res.data.data.isOpen } : null);
        } catch (error) {
            console.error('Failed to toggle status:', error);
        }
    };

    const toggleItemStock = async (itemId: string) => {
        try {
            const res = await partnerAPI.toggleItemStock(itemId);
            setMenu(prev => prev.map(item =>
                item._id === itemId ? { ...item, inStock: res.data.data.inStock } : item
            ));
        } catch (error) {
            console.error('Failed to toggle stock:', error);
        }
    };

    const addMenuItem = async () => {
        if (!newItem.name || newItem.price <= 0) return;

        try {
            const res = await partnerAPI.addMenuItem(newItem);
            setMenu(prev => [...prev, res.data.data]);
            setShowAddItem(false);
            setNewItem({ name: '', price: 0, category: 'Mains', description: '', isVeg: true });
        } catch (error) {
            console.error('Failed to add item:', error);
        }
    };

    const deleteMenuItem = async (itemId: string) => {
        if (!confirm('Delete this item?')) return;

        try {
            await partnerAPI.deleteMenuItem(itemId);
            setMenu(prev => prev.filter(item => item._id !== itemId));
        } catch (error) {
            console.error('Failed to delete item:', error);
        }
    };

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    if (!user || user.role !== 'partner') {
        return null;
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'placed': return 'bg-yellow-500/20 text-yellow-500';
            case 'confirmed': return 'bg-blue-500/20 text-blue-500';
            case 'preparing': return 'bg-orange-500/20 text-orange-500';
            case 'ready': return 'bg-green-500/20 text-green-500';
            case 'completed': return 'bg-gray-500/20 text-gray-500';
            default: return 'bg-gray-500/20 text-gray-500';
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex">
            {/* Sidebar */}
            <div className="w-64 bg-gray-900 border-r border-gray-800 p-6 flex flex-col">
                <div className="mb-8">
                    <h1 className="text-xl font-bold text-orange-500">Partner Panel</h1>
                    <p className="text-sm text-gray-500">{canteen?.name || 'Loading...'}</p>
                </div>

                <nav className="space-y-2 flex-1">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'orders'
                                ? 'bg-orange-500/20 text-orange-500'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                    >
                        <ShoppingBag className="inline-block mr-3" size={18} />
                        Live Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('menu')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'menu'
                                ? 'bg-orange-500/20 text-orange-500'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                    >
                        <Menu className="inline-block mr-3" size={18} />
                        Menu Items
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'settings'
                                ? 'bg-orange-500/20 text-orange-500'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                    >
                        <Edit className="inline-block mr-3" size={18} />
                        Settings
                    </button>
                </nav>

                <div className="pt-6 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 rounded-lg font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut className="inline-block mr-3" size={18} />
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold">
                            {activeTab === 'orders' && 'Live Orders'}
                            {activeTab === 'menu' && 'Menu Management'}
                            {activeTab === 'settings' && 'Canteen Settings'}
                        </h2>
                        {!canteen?.isApproved && (
                            <p className="text-yellow-500 text-sm mt-1">
                                ⚠️ Your canteen is pending admin approval
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Open/Close Toggle */}
                        {canteen?.isApproved && (
                            <button
                                onClick={toggleCanteenStatus}
                                className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${canteen?.isOpen
                                        ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                                        : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                                    }`}
                            >
                                <Power size={18} />
                                {canteen?.isOpen ? 'OPEN' : 'CLOSED'}
                            </button>
                        )}

                        <div className="bg-gray-800 p-2 rounded-full relative">
                            <Bell size={20} />
                            {orders.filter(o => o.status === 'placed').length > 0 && (
                                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <div className="bg-gray-800 rounded-xl p-4">
                            <DollarSign className="text-green-500 mb-2" size={24} />
                            <p className="text-2xl font-bold">₹{stats.todayRevenue}</p>
                            <p className="text-sm text-gray-400">Today's Revenue</p>
                        </div>
                        <div className="bg-gray-800 rounded-xl p-4">
                            <Clock className="text-blue-500 mb-2" size={24} />
                            <p className="text-2xl font-bold">{stats.todayOrders}</p>
                            <p className="text-sm text-gray-400">Orders Today</p>
                        </div>
                        <div className="bg-gray-800 rounded-xl p-4">
                            <TrendingUp className="text-orange-500 mb-2" size={24} />
                            <p className="text-2xl font-bold">{stats.totalOrders}</p>
                            <p className="text-sm text-gray-400">Total Orders</p>
                        </div>
                        <div className="bg-gray-800 rounded-xl p-4">
                            <Package className="text-purple-500 mb-2" size={24} />
                            <p className="text-2xl font-bold">{stats.menuItemCount}</p>
                            <p className="text-sm text-gray-400">Menu Items</p>
                        </div>
                    </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <div className="space-y-4">
                        {orders.length === 0 ? (
                            <div className="bg-gray-800 rounded-xl p-12 text-center">
                                <ShoppingBag size={48} className="text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400">No active orders</p>
                            </div>
                        ) : (
                            orders.map(order => (
                                <div key={order._id} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                    <div className="flex justify-between mb-4">
                                        <div>
                                            <span className="font-bold text-lg">#{order.orderId?.slice(-6) || order._id.slice(-6)}</span>
                                            {order.userId?.name && (
                                                <span className="text-gray-400 ml-2">• {order.userId.name}</span>
                                            )}
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </div>

                                    <div className="space-y-2 mb-4 border-b border-gray-700 pb-4">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-gray-300">
                                                <span>{item.qty} x {item.name}</span>
                                                <span>₹{item.price * item.qty}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between font-bold pt-2">
                                            <span>Total</span>
                                            <span>₹{order.totalAmount}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {order.status === 'placed' && (
                                            <button
                                                onClick={() => updateOrderStatus(order._id, 'confirmed')}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-bold transition-colors"
                                            >
                                                Accept
                                            </button>
                                        )}
                                        {order.status === 'confirmed' && (
                                            <button
                                                onClick={() => updateOrderStatus(order._id, 'preparing')}
                                                className="flex-1 bg-orange-600 hover:bg-orange-700 py-2 rounded-lg font-bold transition-colors"
                                            >
                                                Start Preparing
                                            </button>
                                        )}
                                        {order.status === 'preparing' && (
                                            <button
                                                onClick={() => updateOrderStatus(order._id, 'ready')}
                                                className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg font-bold transition-colors"
                                            >
                                                Mark Ready
                                            </button>
                                        )}
                                        {order.status === 'ready' && (
                                            <button
                                                onClick={() => updateOrderStatus(order._id, 'completed')}
                                                className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg font-bold transition-colors"
                                            >
                                                Complete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Menu Tab */}
                {activeTab === 'menu' && (
                    <div>
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => setShowAddItem(true)}
                                className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                            >
                                <Plus size={18} />
                                Add Item
                            </button>
                        </div>

                        {/* Add Item Modal */}
                        {showAddItem && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-bold">Add Menu Item</h3>
                                        <button onClick={() => setShowAddItem(false)}>
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={newItem.name}
                                                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                                className="w-full bg-gray-700 rounded-lg px-4 py-2 outline-none focus:ring-2 ring-orange-500"
                                                placeholder="Item name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Price (₹)</label>
                                            <input
                                                type="number"
                                                value={newItem.price}
                                                onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })}
                                                className="w-full bg-gray-700 rounded-lg px-4 py-2 outline-none focus:ring-2 ring-orange-500"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Category</label>
                                            <select
                                                value={newItem.category}
                                                onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                                className="w-full bg-gray-700 rounded-lg px-4 py-2 outline-none focus:ring-2 ring-orange-500"
                                            >
                                                <option>Mains</option>
                                                <option>Snacks</option>
                                                <option>Beverages</option>
                                                <option>Breakfast</option>
                                                <option>Desserts</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={newItem.isVeg}
                                                onChange={e => setNewItem({ ...newItem, isVeg: e.target.checked })}
                                                className="accent-green-500"
                                            />
                                            <label className="text-sm">Vegetarian</label>
                                        </div>

                                        <button
                                            onClick={addMenuItem}
                                            className="w-full bg-orange-600 hover:bg-orange-700 py-3 rounded-lg font-bold flex items-center justify-center gap-2"
                                        >
                                            <Save size={18} />
                                            Add Item
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Menu Items Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {menu.map(item => (
                                <div key={item._id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 border-2 flex items-center justify-center ${item.isVeg ? 'border-green-500' : 'border-red-500'}`}>
                                                    <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                </div>
                                                <span className={`font-bold ${!item.inStock ? 'line-through text-gray-500' : ''}`}>
                                                    {item.name}
                                                </span>
                                            </div>
                                            <p className="text-gray-400 text-sm">{item.category}</p>
                                            <p className="text-lg font-bold mt-1">₹{item.price}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleItemStock(item._id)}
                                                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${item.inStock
                                                        ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                                                        : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                                                    }`}
                                            >
                                                {item.inStock ? 'IN STOCK' : 'OUT'}
                                            </button>
                                            <button
                                                onClick={() => deleteMenuItem(item._id)}
                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && canteen && (
                    <div className="bg-gray-800 rounded-xl p-6">
                        <h3 className="text-xl font-bold mb-6">Canteen Information</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Canteen Name</label>
                                <input
                                    type="text"
                                    value={canteen.name}
                                    className="w-full bg-gray-700 rounded-lg px-4 py-2 outline-none focus:ring-2 ring-orange-500"
                                    readOnly
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Status</label>
                                <p className={`font-bold ${canteen.isApproved ? 'text-green-500' : 'text-yellow-500'}`}>
                                    {canteen.isApproved ? '✓ Approved' : '⏳ Pending Approval'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Currently</label>
                                <p className={`font-bold ${canteen.isOpen ? 'text-green-500' : 'text-red-500'}`}>
                                    {canteen.isOpen ? '🟢 Open for orders' : '🔴 Closed'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
