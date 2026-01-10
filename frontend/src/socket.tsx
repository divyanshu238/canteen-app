import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import type { RootState } from './store';
import config from './config';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const user = useSelector((state: RootState) => state.auth.user);

    useEffect(() => {
        // Create socket connection
        const newSocket = io(config.apiUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        newSocket.on('connect', () => {
            console.log('🔌 Socket connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.log('🔌 Socket connection error:', error.message);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Join canteen room when user is a partner
    useEffect(() => {
        if (socket && user?.role === 'partner' && user.canteenId) {
            socket.emit('join_canteen', user.canteenId);
            console.log(`📺 Joined canteen room: ${user.canteenId}`);
        }
    }, [socket, user]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    return context.socket;
};

export const useSocketConnection = () => {
    return useContext(SocketContext);
};
