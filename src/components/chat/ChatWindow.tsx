import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, Paperclip, Loader2, Image as ImageIcon } from 'lucide-react';
import apiClient, { ApiResponse, getImageUrl } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { API_HOST } from '@/config/api';
import { toast } from 'sonner';

import { format } from 'date-fns';

interface ChatWindowProps {
    chatId: string;
    onClose: () => void;
}

const ChatWindow = ({ chatId, onClose }: ChatWindowProps) => {
    const { socket, isConnected } = useChat();
    const { user } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchMessages();

        if (socket) {
            socket.emit('join_room', chatId);

            const handleReceiveMessage = (message: any) => {
                if (message.chatId === chatId) {
                    setMessages(prev => [...prev, message]);
                    scrollToBottom();
                }
            };

            socket.on('receive_message', handleReceiveMessage);

            return () => {
                socket.off('receive_message', handleReceiveMessage);
            };
        }
    }, [chatId, socket]);

    const fetchMessages = async () => {
        try {
            const response = await apiClient.get<ApiResponse<any[]>>(`/chats/${chatId}/messages`);
            if (response.success) {
                setMessages(response.data);
                scrollToBottom();
            }
        } catch (error) {

            console.error('Failed to fetch messages:', error);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    };

    const handleSendMessage = (e: React.FormEvent, imageUrl?: string) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() && !imageUrl) return;
        if (!socket) return;

        socket.emit('send_message', {
            chatId,
            content: newMessage,
            imageUrl
        });

        setNewMessage('');
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 5MB Limit
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('image', file);

            const response = await apiClient.post<ApiResponse<{ imageUrl: string }>>('/chats/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.success) {
                handleSendMessage(null as any, response.data.imageUrl);
            } else {
                toast.error("Failed to upload image");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("An error occurred during upload");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const getInitials = (name: string) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <div className="flex flex-col h-[500px] w-[350px] bg-card border border-border rounded-t-xl shadow-xl fixed bottom-0 right-4 z-50">
            <div className="p-3 border-b border-border flex justify-between items-center bg-muted/50 rounded-t-xl">
                <h3 className="font-semibold text-sm">Chat</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((msg) => {
                        const isMe = msg.senderId === user?.id;
                        const avatarSrc = getImageUrl(msg.sender?.avatarUrl);

                        return (
                            <div
                                key={msg.id}
                                className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                <Avatar className="h-8 w-8 flex-shrink-0 border border-border">
                                    <AvatarImage src={avatarSrc} className="object-cover" />
                                    <AvatarFallback className="text-[10px] font-bold bg-secondary text-secondary-foreground">
                                        {getInitials(msg.sender?.fullName || '')}
                                    </AvatarFallback>
                                </Avatar>

                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                                    {!isMe && msg.sender && (
                                        <span className="text-[10px] font-medium text-muted-foreground mb-1 ml-1">
                                            {msg.sender.fullName}
                                        </span>
                                    )}
                                    <div
                                        className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${isMe
                                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                                            : 'bg-muted text-foreground rounded-tl-none'
                                            }`}
                                    >
                                        {msg.imageUrl && (
                                            <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                                                <img
                                                    src={getImageUrl(msg.imageUrl)}
                                                    alt="Chat attachment"
                                                    className="max-w-full h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => window.open(getImageUrl(msg.imageUrl), '_blank')}
                                                />
                                            </div>
                                        )}
                                        {msg.content}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                        {format(new Date(msg.createdAt), 'HH:mm')}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-border flex gap-2 items-center">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isConnected || isUploading}
                >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </Button>
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isConnected ? "Type a message..." : "Connecting..."}
                    className="flex-1 h-9"
                    disabled={!isConnected || isUploading}
                />
                <Button type="submit" size="icon" className="h-9 w-9" disabled={!isConnected || (!newMessage.trim() && !isUploading)}>
                    <Send className="w-4 h-4" />
                </Button>
            </form>
        </div>
    );
};

export default ChatWindow;

