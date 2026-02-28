import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const navigate = useNavigate();

    const handleNotificationClick = async (notification: any) => {
        // Mark as read
        if (!notification.isRead) {
            await markAsRead(notification.id);
        }

        // Navigate to order if related
        if (notification.relatedOrderId) {
            navigate('/dashboard/orders');
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-secondary text-white text-xs flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-2 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            className="text-xs"
                        >
                            Mark all read
                        </Button>
                    )}
                </div>

                {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                        No notifications
                    </div>
                ) : (
                    notifications.slice(0, 10).map((notification) => (
                        <DropdownMenuItem
                            key={notification.id}
                            className={`px-4 py-3 cursor-pointer ${!notification.isRead ? 'bg-muted/50' : ''
                                }`}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            <div className="flex flex-col gap-1 w-full">
                                <div className="flex items-start justify-between">
                                    <p className="font-medium text-sm">{notification.title}</p>
                                    {!notification.isRead && (
                                        <span className="h-2 w-2 rounded-full bg-secondary flex-shrink-0 mt-1" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">{notification.message}</p>
                                {notification.relatedOrder && (
                                    <p className="text-xs text-primary">
                                        Order: {notification.relatedOrder.orderNumber}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                        </DropdownMenuItem>
                    ))
                )}

                {notifications.length > 10 && (
                    <div className="px-4 py-2 border-t text-center">
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => navigate('/dashboard')}
                            className="text-xs"
                        >
                            View all notifications
                        </Button>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
