import { useState, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import apiClient, { ApiResponse } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { API_HOST } from '@/config/api';



const ChatList = () => {
    const { setActiveChatId, unreadCount } = useChat();
    const { user } = useAuth();
    const [chats, setChats] = useState<any[]>([]);

    const getInitials = (name: string) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };


    useEffect(() => {
        fetchChats();
    }, []);

    const fetchChats = async () => {
        try {
            const response = await apiClient.get<ApiResponse<any[]>>('/chats');
            if (response.success) {
                setChats(response.data);
            }

        } catch (error) {
            console.error('Failed to fetch chats:', error);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <MessageSquare className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                {chats.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No active chats
                    </div>
                ) : (
                    chats.map((chat) => (
                        <DropdownMenuItem
                            key={chat.id}
                            onClick={() => setActiveChatId(chat.id)}
                            className="flex items-center gap-3 p-3 cursor-pointer"
                        >
                            {(() => {
                                const otherParticipant = chat.participants?.find((p: any) => p.user.id !== user?.id)?.user;
                                const avatarSrc = otherParticipant?.avatarUrl ? otherParticipant.avatarUrl.replace('/uploads/', '/api/uploads/') : undefined;

                                return (
                                    <>
                                        <Avatar className="h-10 w-10 border border-border">
                                            <AvatarImage src={avatarSrc} className="object-cover" />
                                            <AvatarFallback className="text-xs font-bold bg-secondary text-secondary-foreground">
                                                {getInitials(otherParticipant?.fullName || '')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between w-full mb-0.5">
                                                <span className="font-semibold text-sm truncate">
                                                    {chat.order ? `Order #${chat.order.orderNumber}` : otherParticipant?.fullName || 'Direct Chat'}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {chat.messages[0] && new Date(chat.messages[0].createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {chat.messages[0] && (
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {chat.messages[0].content}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </DropdownMenuItem>

                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ChatList;
