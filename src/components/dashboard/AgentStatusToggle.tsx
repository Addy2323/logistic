import { useState } from 'react';
import { Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { agentsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface AgentStatusToggleProps {
    agentId: string;
    currentStatus: 'ONLINE' | 'OFFLINE';
    onStatusChange?: (newStatus: 'ONLINE' | 'OFFLINE') => void;
}

export default function AgentStatusToggle({
    agentId,
    currentStatus,
    onStatusChange,
}: AgentStatusToggleProps) {
    const [status, setStatus] = useState(currentStatus);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const handleToggle = async () => {
        const newStatus = status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';

        setLoading(true);
        try {
            await agentsAPI.updateStatus(agentId, newStatus);
            setStatus(newStatus);

            toast.success(
                newStatus === 'ONLINE'
                    ? 'You are now online and can receive orders'
                    : 'You are now offline'
            );

            if (onStatusChange) {
                onStatusChange(newStatus);
            }

            // Reload page if agent goes online to process queue
            if (newStatus === 'ONLINE') {
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to update status');
        } finally {
            setLoading(false);
        }
    };

    // Only show for agents
    if (user?.role !== 'AGENT') {
        return null;
    }

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
                Status: {status === 'ONLINE' ? 'Online' : 'Offline'}
            </span>
            <Button
                variant={status === 'ONLINE' ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggle}
                disabled={loading}
                className="gap-2"
            >
                {status === 'ONLINE' ? (
                    <>
                        <Power className="h-4 w-4" />
                        Go Offline
                    </>
                ) : (
                    <>
                        <PowerOff className="h-4 w-4" />
                        Go Online
                    </>
                )}
            </Button>
        </div>
    );
}
