import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { agentsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, TrendingUp, Package, DollarSign, Star, RefreshCw, MoreVertical, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { API_HOST } from "@/config/api";


interface Agent {
    id: string;
    availabilityStatus: string;
    currentOrderCount: number;
    totalDeliveries: number;
    totalEarnings: number;
    rating: number;
    commissionRate: number;
    maxOrderCapacity: number;
    user: {
        id: string;
        fullName: string;
        email: string;
        phone?: string;
        avatarUrl?: string;
    };
}


interface AgentStats {
    totalOrders: number;
    completedOrders: number;
    activeOrders: number;
    totalEarnings: number;
    totalRevenue: number;
    averageRating: number;
    completionRate: number;
}

const DashboardAgents = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
    const [isNewAgentOpen, setIsNewAgentOpen] = useState(false);
    const [newAgent, setNewAgent] = useState({
        email: "",
        password: "",
        fullName: "",
        phone: "",
        commissionRate: 10,
        maxOrderCapacity: 5,
    });

    const isAdmin = user?.role === "ADMIN";

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
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            setLoading(true);
            const response: any = await agentsAPI.list({});
            if (response && response.success) {
                setAgents(response.data || []);
            }
        } catch (error: any) {
            console.error("Failed to fetch agents:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAgentStats = async (agentId: string) => {
        try {
            const response: any = await agentsAPI.getStats(agentId);
            if (response && response.success) {
                setAgentStats(response.data);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to fetch agent statistics");
        }
    };

    const handleCreateAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Phone validation: must start with 255 or 7, no leading 0
            const phoneRegex = /^(255|7)\d{8,9}$/;
            if (!phoneRegex.test(newAgent.phone)) {
                toast.error("Phone number must start with 255 or 7 (e.g., 255712345678 or 712345678)");
                return;
            }

            const response: any = await agentsAPI.create(newAgent);
            if (response && response.success) {
                toast.success("Agent created successfully!");
                setIsNewAgentOpen(false);
                setNewAgent({
                    email: "",
                    password: "",
                    fullName: "",
                    phone: "",
                    commissionRate: 10,
                    maxOrderCapacity: 5,
                });
                fetchAgents();
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to create agent");
        }
    };

    const handleDeleteAgent = async (agentId: string) => {
        if (!window.confirm("Are you sure you want to delete this agent? This action cannot be undone.")) {
            return;
        }
        try {
            await agentsAPI.delete(agentId);
            toast.success("Agent deleted successfully");
            fetchAgents();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete agent");
        }
    };

    const handleViewStats = async (agent: Agent) => {
        setSelectedAgent(agent);
        await fetchAgentStats(agent.id);
    };

    const filteredAgents = agents.filter(agent =>
        agent.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("dashboard.agents.title")}</h1>
                    <p className="text-muted-foreground">
                        {isAdmin ? t("dashboard.agents.desc") : "View agent information"}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchAgents}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    {isAdmin && (
                        <Button variant="hero" onClick={() => setIsNewAgentOpen(true)}>
                            <Plus className="w-4 h-4" />
                            {t("dashboard.agents.addAgent")}
                        </Button>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder={t("dashboard.agents.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Agents Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        Loading agents...
                    </div>
                ) : filteredAgents.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        {t("dashboard.agents.noAgents")}
                    </div>
                ) : (
                    filteredAgents.map((agent) => (
                        <div
                            key={agent.id}
                            className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-12 h-12 border border-border">
                                        <AvatarImage src={agent.user.avatarUrl ? agent.user.avatarUrl.replace('/uploads/', '/api/uploads/') : undefined} className="object-cover" />
                                        <AvatarFallback className="text-lg font-bold bg-secondary text-secondary-foreground">
                                            {getInitials(agent.user.fullName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>

                                        <h3 className="font-semibold text-foreground">{agent.user.fullName}</h3>
                                        <p className="text-sm text-muted-foreground">{agent.user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-bold ${agent.availabilityStatus === "ONLINE"
                                            ? "bg-success/10 text-success"
                                            : "bg-muted text-muted-foreground"
                                            }`}
                                    >
                                        {agent.availabilityStatus}
                                    </span>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleViewStats(agent)}>
                                                {t("dashboard.agents.actions.viewPerformance")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => handleDeleteAgent(agent.id)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                {t("dashboard.agents.actions.delete")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Package className="w-4 h-4 text-secondary" />
                                        <span className="text-xs text-muted-foreground">{t("dashboard.agents.active")}</span>
                                    </div>
                                    <p className="text-lg font-bold">{agent.currentOrderCount}</p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp className="w-4 h-4 text-success" />
                                        <span className="text-xs text-muted-foreground">{t("dashboard.agents.completed")}</span>
                                    </div>
                                    <p className="text-lg font-bold">{agent.totalDeliveries}</p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <DollarSign className="w-4 h-4 text-amber" />
                                        <span className="text-xs text-muted-foreground">Earnings</span>
                                    </div>
                                    <p className="text-lg font-bold">
                                        TSh {parseFloat(String(agent.totalEarnings || 0)).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Star className="w-4 h-4 text-amber fill-amber" />
                                        <span className="text-xs text-muted-foreground">{t("dashboard.agents.rating")}</span>
                                    </div>
                                    <p className="text-lg font-bold">{parseFloat(String(agent.rating || 0)).toFixed(1)}</p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border">
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                    <span>Capacity</span>
                                    <span>{agent.currentOrderCount} / {agent.maxOrderCapacity}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                        className="bg-secondary h-2 rounded-full transition-all"
                                        style={{ width: `${(agent.currentOrderCount / agent.maxOrderCapacity) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full mt-4"
                                onClick={() => handleViewStats(agent)}
                            >
                                {t("dashboard.agents.actions.viewPerformance")}
                            </Button>
                        </div>
                    ))
                )}
            </div>

            {/* Create Agent Modal */}
            <Dialog open={isNewAgentOpen} onOpenChange={setIsNewAgentOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New Agent</DialogTitle>
                        <DialogDescription>
                            Enter the details below to register a new delivery agent.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateAgent} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Full Name</label>
                            <Input
                                placeholder="Agent full name"
                                value={newAgent.fullName}
                                onChange={(e) => setNewAgent({ ...newAgent, fullName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                placeholder="agent@example.com"
                                value={newAgent.email}
                                onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password</label>
                            <Input
                                type="password"
                                placeholder="Password"
                                value={newAgent.password}
                                onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Phone Number</label>
                            <Input
                                placeholder="255712345678 or 712345678"
                                value={newAgent.phone}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (val.startsWith('0')) return; // Prevent leading 0
                                    setNewAgent({ ...newAgent, phone: val });
                                }}
                                required
                            />
                            <p className="text-[10px] text-muted-foreground">Format: 2557XXXXXXXX or 7XXXXXXXX (No leading 0)</p>
                        </div>
                        <Button type="submit" variant="hero" className="w-full">
                            Create Agent
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Agent Stats Modal */}
            <Dialog
                open={!!selectedAgent}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedAgent(null);
                        setAgentStats(null);
                    }
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Agent Performance</DialogTitle>
                        <DialogDescription>
                            Detailed performance metrics and statistics for this agent.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedAgent && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Avatar className="w-16 h-16 border border-border">
                                    <AvatarImage src={selectedAgent.user.avatarUrl ? selectedAgent.user.avatarUrl.replace('/uploads/', '/api/uploads/') : undefined} className="object-cover" />
                                    <AvatarFallback className="text-2xl font-bold bg-secondary text-secondary-foreground">
                                        {getInitials(selectedAgent.user.fullName)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>

                                    <h3 className="text-lg font-semibold">{selectedAgent.user.fullName}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedAgent.user.email}</p>
                                </div>
                            </div>

                            {agentStats ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-muted/50 rounded-xl">
                                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Orders</h4>
                                            <p className="text-2xl font-bold">{agentStats.totalOrders}</p>
                                        </div>
                                        <div className="p-4 bg-muted/50 rounded-xl">
                                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Completed</h4>
                                            <p className="text-2xl font-bold text-success">{agentStats.completedOrders}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-muted/50 rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-muted-foreground">Completion Rate</h4>
                                            <span className="text-lg font-bold">{parseFloat(String(agentStats.completionRate || 0)).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Loading statistics...
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DashboardAgents;
