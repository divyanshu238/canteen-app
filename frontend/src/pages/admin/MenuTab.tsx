
import { useState, useEffect } from 'react';
import { superadminAPI } from '../../api';
import { RefreshCw, Search, CheckCircle, XCircle } from 'lucide-react';

export const MenuTab = () => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stockFilter, setStockFilter] = useState('');

    useEffect(() => {
        loadMenu();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stockFilter]);

    const loadMenu = async () => {
        setLoading(true);
        try {
            const res = await superadminAPI.listMenuItems({
                search: searchQuery || undefined,
                inStock: stockFilter || undefined,
                // canteenId can be added if we want to filter by canteen
            });
            setItems(res.data.data);
        } catch (error) {
            console.error('Failed to load menu items', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStock = async (itemId: string, currentStatus: boolean) => {
        try {
            await superadminAPI.toggleMenuItemStock(itemId);
            // Optimistic update
            setItems(items.map(i => i._id === itemId ? { ...i, inStock: !currentStatus } : i));
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to toggle stock');
            loadMenu(); // Revert on failure
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
                <button onClick={loadMenu} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search menu items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadMenu()}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                </div>
                <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="">All Stock Status</option>
                    <option value="true">In Stock</option>
                    <option value="false">Out of Stock</option>
                </select>
                <button
                    onClick={loadMenu}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium shadow-sm transition-colors"
                >
                    Apply
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                    <div key={item._id} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">No Img</div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
                                <div className="text-sm font-bold text-green-600">₹{item.price}</div>
                            </div>
                            <p className="text-xs text-gray-500 truncate mb-1">{item.canteenId?.name}</p>
                            <p className="text-xs text-gray-400 line-clamp-2 mb-3 h-8">{item.description}</p>
                            <button
                                onClick={() => handleToggleStock(item._id, item.inStock)}
                                className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${item.inStock
                                    ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                    }`}
                            >
                                {item.inStock ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {item.inStock ? 'In Stock' : 'Out of Stock'}
                            </button>
                        </div>
                    </div>
                ))}
                {items.length === 0 && !loading && (
                    <div className="col-span-full text-center py-10 text-gray-500">No items found.</div>
                )}
            </div>
        </div>
    );
};
