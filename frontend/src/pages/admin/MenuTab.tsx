import { useState, useEffect } from 'react';
import { superadminAPI } from '../../api';
import { RefreshCw, Search, Coffee, CheckCircle, XCircle } from 'lucide-react';

export const MenuTab = () => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stockFilter, setStockFilter] = useState('');

    useEffect(() => {
        loadMenu();
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
                <button onClick={loadMenu} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20">
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                        <input
                            type="text"
                            placeholder="Search menu items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadMenu()}
                            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50"
                        />
                    </div>
                </div>
                <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                    <option value="">All Stock Status</option>
                    <option value="true">In Stock</option>
                    <option value="false">Out of Stock</option>
                </select>
                <button
                    onClick={loadMenu}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white"
                >
                    Apply
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                    <div key={item._id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4">
                        <div className="w-24 h-24 bg-black/20 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-white truncate">{item.name}</h3>
                                <div className="text-sm font-medium text-green-400">₹{item.price}</div>
                            </div>
                            <p className="text-xs text-white/50 truncate mb-2">{item.canteenId?.name}</p>
                            <p className="text-xs text-white/70 line-clamp-2 mb-3">{item.description}</p>
                            <button
                                onClick={() => handleToggleStock(item._id, item.inStock)}
                                className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${item.inStock
                                        ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                                        : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                    }`}
                            >
                                {item.inStock ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {item.inStock ? 'In Stock' : 'Out of Stock'}
                            </button>
                        </div>
                    </div>
                ))}
                {items.length === 0 && !loading && (
                    <div className="col-span-full text-center py-10 text-white/50">No items found.</div>
                )}
            </div>
        </div>
    );
};
