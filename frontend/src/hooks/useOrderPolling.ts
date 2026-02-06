import { useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { orderAPI } from '../api';
import { showNotification } from '../store';

interface PollingOrder {
    _id: string;
    status: string;
    [key: string]: any;
}

/**
 * Hook to poll order status for active orders
 * @param orders - Array of orders or single order object
 * @param onUpdate - Callback when status changes
 * @param enabled - Whether polling is enabled (default true)
 */
export const useOrderPolling = (
    orders: PollingOrder[] | PollingOrder | null,
    onUpdate: (updatedOrder: PollingOrder) => void,
    enabled: boolean = true
) => {
    const dispatch = useDispatch();
    const normalizedOrders = Array.isArray(orders) ? orders : (orders ? [orders] : []);

    // Filter terminal states
    const activeOrders = normalizedOrders.filter(o =>
        !['delivered', 'cancelled', 'completed', 'failed'].includes(o.status)
    );

    const pollOrder = useCallback(async (order: PollingOrder) => {
        try {
            const res = await orderAPI.getStatus(order._id);
            if (res.data.success) {
                const { status, updatedAt } = res.data.data;

                if (status !== order.status) {
                    onUpdate({ ...order, status, updatedAt });

                    // Show premium toast
                    dispatch(showNotification({
                        message: `Order Status Updated: ${status.replace(/_/g, ' ').toUpperCase()}`,
                        type: 'info'
                    }));
                }
            }
        } catch (error) {
            // Silent error for polling
            console.debug('Polling skipped for', order._id);
        }
    }, [dispatch, onUpdate]);

    useEffect(() => {
        if (!enabled || activeOrders.length === 0) return;

        const intervalId = setInterval(() => {
            if (document.hidden) return; // Automatic background pause
            activeOrders.forEach(pollOrder);
        }, 6000); // 6s interval

        const handleVisibility = () => {
            if (!document.hidden) {
                activeOrders.forEach(pollOrder); // Immediate check on focus
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [activeOrders, enabled, pollOrder]);
};
