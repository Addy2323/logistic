import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { API_HOST } from '@/config/api';

interface ChatContextType {
    socket: Socket | null;
    activeChatId: string | null;
    setActiveChatId: (id: string | null) => void;
    unreadCount: number;
    isConnected: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, token } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isConnected, setIsConnected] = useState(false);

    const activeChatIdRef = React.useRef<string | null>(null);

    useEffect(() => {
        activeChatIdRef.current = activeChatId;
    }, [activeChatId]);

    useEffect(() => {
        if (user && token) {
            const socketUrl = API_HOST;
            console.log('Attempting to connect to socket at:', socketUrl);
            console.log('With token:', token.substring(0, 10) + '...');

            const newSocket = io(socketUrl, {
                auth: { token },
                withCredentials: true,
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });


            newSocket.on('connect', () => {
                console.log('Socket connected with ID:', newSocket.id);
                setIsConnected(true);
            });

            newSocket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                toast.error('Failed to connect to chat server');
            });

            newSocket.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason);
                setIsConnected(false);
            });

            newSocket.on('error', (error: any) => {
                console.error('Socket error:', error);
                if (error.message) {
                    toast.error(`Chat error: ${error.message}`);
                }
            });


            newSocket.on('receive_message', (message: any) => {
                console.log('Received message:', message);
                if (message.chatId !== activeChatIdRef.current) {
                    setUnreadCount(prev => prev + 1);
                    toast.info(`New message from ${message.sender.fullName}`);
                }
            });

            setSocket(newSocket);

            return () => {
                console.log('Disconnecting socket');
                newSocket.disconnect();
            };
        }
    }, [user, token]);

    return (
        <ChatContext.Provider value={{ socket, activeChatId, setActiveChatId, unreadCount, isConnected }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
