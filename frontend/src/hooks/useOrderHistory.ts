import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { orderAPI } from '../api';
import {
    setOrderHistoryLoading,
    setOrderHistory,
    setOrderHistoryError
} from '../store';
import type { RootState } from '../store';

/**
 * Custom hook to fetch and cache order history for "Previously ordered" badges.
 * 
 * Features:
 * - Auto-fetches when user is authenticated
 * - Caches data for 5 minutes to avoid unnecessary API calls
 * - Stores data in localStorage for persistence across page refreshes
 * 
 * Usage:
 *   const { isLoading, orderedItems, favoriteItems } = useOrderHistory();
 */
export const useOrderHistory = () => {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
    const { orderedItems, favoriteItems, totalOrders, isLoading, lastFetched, error } =
        useSelector((state: RootState) => state.orderHistory);

    useEffect(() => {
        // Only fetch if:
        // 1. User is authenticated
        // 2. Data hasn't been fetched recently (5 min cache)
        // 3. Not currently loading
        const shouldFetch =
            isAuthenticated &&
            !isLoading &&
            (!lastFetched || Date.now() - lastFetched > 5 * 60 * 1000);

        if (!shouldFetch) return;

        const fetchOrderHistory = async () => {
            dispatch(setOrderHistoryLoading(true));

            try {
                const response = await orderAPI.getHistorySummary();
                const data = response.data.data;

                dispatch(setOrderHistory({
                    orderedItems: data.orderedItems || {},
                    favoriteItems: data.favoriteItems || [],
                    totalOrders: data.totalOrders || 0
                }));
            } catch (err: any) {
                console.error('[useOrderHistory] Error fetching order history:', err);
                dispatch(setOrderHistoryError(err.message || 'Failed to fetch order history'));
            }
        };

        fetchOrderHistory();
    }, [isAuthenticated, isLoading, lastFetched, dispatch]);

    return {
        orderedItems,
        favoriteItems,
        totalOrders,
        isLoading,
        error,
        // Helper function to check if a specific item was previously ordered
        wasOrdered: (itemId: string) => !!orderedItems[itemId],
        // Get order count for a specific item
        getOrderCount: (itemId: string) => orderedItems[itemId]?.orderCount || 0
    };
};

export default useOrderHistory;
