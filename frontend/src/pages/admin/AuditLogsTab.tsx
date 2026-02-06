import { useState, useEffect } from 'react';
import { superadminAPI } from '../../api';
import { RefreshCw, Search, ChevronDown, ChevronUp } from 'lucide-react';

export const AuditLogsTab = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        entityType: '',
        action: '',
        adminId: ''
    });

    useEffect(() => {
        loadLogs();
    }, [filters]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const res = await superadminAPI.listAuditLogs({
                entityType: filters.entityType || undefined,
                action: filters.action || undefined,
                adminId: filters.adminId || undefined,
                limit: 50
            });
            setLogs(res.data.data);
        } catch (error) {
            console.error('Failed to load logs', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
                <button onClick={loadLogs} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <select
                    value={filters.entityType}
                    onChange={(e) => setFilters(prev => ({ ...prev, entityType: e.target.value }))}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                    <option value="">All Entities</option>
                    <option value="User">User</option>
                    <option value="Canteen">Canteen</option>
                    <option value="Order">Order</option>
                    <option value="MenuItem">Menu Item</option>
                    <option value="Review">Review</option>
                    <option value="System">System</option>
                </select>
                <input
                    type="text"
                    placeholder="Search Admin ID..."
                    value={filters.adminId}
                    onChange={(e) => setFilters(prev => ({ ...prev, adminId: e.target.value }))}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50"
                />
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-white/70">
                        <tr>
                            <th className="px-6 py-3">Timestamp</th>
                            <th className="px-6 py-3">Admin</th>
                            <th className="px-6 py-3">Action</th>
                            <th className="px-6 py-3">Entity</th>
                            <th className="px-6 py-3">Reason</th>
                            <th className="px-6 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {logs.map((log) => (
                            <>
                                <tr key={log._id} className="text-white hover:bg-white/5 cursor-pointer" onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}>
                                    <td className="px-6 py-3 text-sm whitespace-nowrap">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3 text-sm">
                                        <div className="font-medium">{log.adminName}</div>
                                        <div className="text-xs text-white/50">{log.adminEmail}</div>
                                    </td>
                                    <td className="px-6 py-3 text-sm font-mono text-purple-300">
                                        {log.action}
                                    </td>
                                    <td className="px-6 py-3 text-sm">
                                        {log.entityType} <span className="text-white/30 text-xs">#{log.entityId?.slice(-6)}</span>
                                    </td>
                                    <td className="px-6 py-3 text-sm text-white/70 truncate max-w-[200px]">
                                        {log.reason || '-'}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        {expandedLog === log._id ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                                    </td>
                                </tr>
                                {expandedLog === log._id && (
                                    <tr className="bg-black/20">
                                        <td colSpan={6} className="px-6 py-4">
                                            <div className="grid grid-cols-2 gap-4 text-xs font-mono text-white/80">
                                                <div>
                                                    <div className="font-bold text-red-300 mb-1">Before State</div>
                                                    <pre className="bg-black/30 p-2 rounded overflow-auto max-h-[200px]">
                                                        {log.beforeState ? JSON.stringify(log.beforeState, null, 2) : 'N/A'}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-green-300 mb-1">After State</div>
                                                    <pre className="bg-black/30 p-2 rounded overflow-auto max-h-[200px]">
                                                        {log.afterState ? JSON.stringify(log.afterState, null, 2) : 'N/A'}
                                                    </pre>
                                                </div>
                                                <div className="col-span-2 mt-2">
                                                    <span className="font-bold text-gray-400">Metadata:</span> IP: {log.ipAddress} | UA: {log.userAgent}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                        {logs.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-white/50">
                                    No audit logs found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
