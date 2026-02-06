
import { useState, useEffect } from 'react';
import { superadminAPI } from '../../api';
import { RefreshCw, Edit, DollarSign, XCircle } from 'lucide-react';

export const OrdersTab = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const res = await superadminAPI.listOrders({
                status: statusFilter || undefined,
                limit: 50
            });
            setOrders(res.data.data);
        } catch (error) {
            console.error('Failed to load orders', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusOverride = async (orderId: string, currentStatus: string) => {
        const newStatus = prompt(`Override status for Order #${orderId.slice(-6)}\nCurrent: ${currentStatus}\nEnter new status (placed, preparing, ready, delivered, cancelled):`);
        if (!newStatus) return;

        const reason = prompt('Reason for override:');
        if (!reason) return;

        try {
            await superadminAPI.overrideOrderStatus(orderId, newStatus, reason);
            loadOrders();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to update status');
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        const reason = prompt('Reason for cancellation:');
        if (!reason) return;

        try {
            await superadminAPI.cancelOrder(orderId, reason);
            loadOrders();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to cancel order');
        }
    };

    const handleRefund = async (orderId: string) => {
        const amountStr = prompt('Enter refund amount (leave empty for full refund):');
        const amount = amountStr ? parseFloat(amountStr) : undefined;
        const reason = prompt('Reason for refund:');
        if (!reason) return;

        try {
            await superadminAPI.refundOrder(orderId, amount, reason);
            loadOrders();
            alert('Refund processed successfully');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to process refund');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
                <button onClick={loadOrders} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="">All Statuses</option>
                    <option value="placed">Placed</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Order ID</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">User</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Canteen</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Payment</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {orders.map((order) => (
                            <tr key={order._id} className="text-gray-900 hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-mono text-sm text-gray-600">
                                    {order.orderId || order._id.slice(-6)}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium">{order.userId?.name || 'Unknown'}</div>
                                    <div className="text-xs text-gray-500">{order.userId?.email}</div>
                                </td>
                                <td className="px-6 py-4 text-sm">{order.canteenId?.name || 'Unknown'}</td>
                                <td className="px-6 py-4 font-medium">₹{order.totalAmount}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border 
                                        ${order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-100' :
                                            order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                                                'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border 
                                        ${order.paymentStatus === 'paid' ? 'bg-green-50 text-green-700 border-green-100' :
                                            order.paymentStatus === 'refunded' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                        {order.paymentStatus}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleStatusOverride(order._id, order.status)}
                                            title="Override Status"
                                            className="p-1.5 hover:bg-blue-50 rounded-md text-blue-600 hover:text-blue-700 transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleRefund(order._id)}
                                            title="Refund"
                                            className="p-1.5 hover:bg-purple-50 rounded-md text-purple-600 hover:text-purple-700 transition-colors">
                                            <DollarSign className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleCancelOrder(order._id)}
                                            title="Cancel"
                                            className="p-1.5 hover:bg-red-50 rounded-md text-red-600 hover:text-red-700 transition-colors">
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {orders.length === 0 && !loading && (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                    No orders found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
