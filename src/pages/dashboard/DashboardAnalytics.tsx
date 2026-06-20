import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsAPI } from '@/lib/api';
import SalesChart from '@/components/analytics/SalesChart';
import AgentPerformanceChart from '@/components/analytics/AgentPerformanceChart';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, ShieldAlert, Award, Compass, CreditCard } from 'lucide-react';

interface SalesData {
    date: string;
    revenue: number;
    profit: number;
    orders: number;
}

interface AgentPerformance {
    agentName: string;
    totalOrders: number;
    totalRevenue: number;
    totalEarnings: number;
    averageRating: number;
    completionRate: number;
}

const DashboardAnalytics = () => {
    const { user } = useAuth();
    const [salesData, setSalesData] = useState<SalesData[]>([]);
    const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
    const [extendedMetrics, setExtendedMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);

                // Fetch sales data
                const salesResponse: any = await analyticsAPI.getSales({
                    groupBy: timeRange === 'day' ? 'day' : timeRange === 'week' ? 'week' : 'month',
                });

                if (salesResponse && salesResponse.success) {
                    setSalesData(salesResponse.data);
                }

                // Fetch agent performance (admin only)
                if (user?.role === 'ADMIN') {
                    const agentResponse: any = await analyticsAPI.getAgentPerformance();
                    if (agentResponse && agentResponse.success) {
                        setAgentPerformance(agentResponse.data);
                    }
                    const extResponse: any = await analyticsAPI.getExtendedAdmin();
                    if (extResponse && extResponse.success) {
                        setExtendedMetrics(extResponse.data);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.role === 'ADMIN') {
            fetchAnalytics();
        }
    }, [user, timeRange]);

    if (user?.role !== 'ADMIN') {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Analytics are only available for administrators.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
                <p className="text-muted-foreground">View sales performance and agent statistics</p>
            </div>

            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)} className="w-full">
                <TabsList>
                    <TabsTrigger value="day">Daily</TabsTrigger>
                    <TabsTrigger value="week">Weekly</TabsTrigger>
                    <TabsTrigger value="month">Monthly</TabsTrigger>
                </TabsList>
            </Tabs>

            {loading ? (
                <div className="grid gap-6">
                    <div className="h-96 bg-muted animate-pulse rounded-lg" />
                    <div className="h-96 bg-muted animate-pulse rounded-lg" />
                </div>
            ) : (
                <div className="grid gap-6">
                    {/* Sales Chart */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Sales Performance</h2>
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                        </div>
                        {salesData.length > 0 ? (
                            <SalesChart data={salesData} type="line" />
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                No sales data available
                            </div>
                        )}
                    </Card>

                    {/* Agent Performance */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Agent Performance Distribution</h2>
                        {agentPerformance.length > 0 ? (
                            <div className="grid md:grid-cols-2 gap-6">
                                <AgentPerformanceChart data={agentPerformance} />
                                <div className="space-y-4">
                                    <h3 className="font-medium">Top Performing Agents</h3>
                                    {agentPerformance
                                        .sort((a, b) => b.totalRevenue - a.totalRevenue)
                                        .slice(0, 5)
                                        .map((agent, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 rounded-lg border border-border"
                                            >
                                                <div>
                                                    <p className="font-medium">{agent.agentName}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {agent.totalOrders} orders • {agent.completionRate.toFixed(1)}% completion
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold">TSh {agent.totalRevenue.toLocaleString()}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        ⭐ {agent.averageRating.toFixed(1)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                No agent performance data available
                            </div>
                        )}
                    </Card>

                    {/* Extended V2.0 Analytics Cards */}
                    {extendedMetrics && (
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Subscriptions & Boutique */}
                            <Card className="p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold flex items-center gap-2">
                                            <CreditCard className="w-5 h-5 text-primary" />
                                            Subscriptions & Tiers
                                        </h2>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                                            <span className="text-sm text-muted-foreground">Active Subscriptions</span>
                                            <span className="font-bold text-foreground text-sm">{extendedMetrics.subscriptions.active}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                                            <span className="text-sm text-muted-foreground">Pending Billing Checks</span>
                                            <span className="font-bold text-foreground text-sm">{extendedMetrics.subscriptions.pending}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                                            <span className="text-sm text-muted-foreground">Monthly Sub. Revenue</span>
                                            <span className="font-bold text-emerald-600 text-sm">TSh {extendedMetrics.subscriptions.revenue.toLocaleString()}</span>
                                        </div>
                                        <div className="pt-2">
                                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Boutique Verifications</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {extendedMetrics.boutique.length === 0 ? (
                                                    <span className="text-xs text-muted-foreground col-span-2">No verified boutiques yet</span>
                                                ) : (
                                                    extendedMetrics.boutique.map((b: any) => (
                                                        <div key={b.level} className="bg-muted/40 p-2 rounded-lg border border-border/50 flex flex-col items-center">
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{b.level}</span>
                                                            <span className="text-lg font-bold text-foreground mt-0.5">{b.count}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Regional demand distribution */}
                            <Card className="p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold flex items-center gap-2">
                                            <Compass className="w-5 h-5 text-primary" />
                                            Regional Customers
                                        </h2>
                                    </div>
                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                        {extendedMetrics.regionalDistribution.length === 0 ? (
                                            <div className="text-center py-6 text-xs text-muted-foreground">
                                                No saved customer address data
                                            </div>
                                        ) : (
                                            extendedMetrics.regionalDistribution.map((region: any) => (
                                                <div key={region.region} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                                                    <span className="text-sm font-semibold text-foreground truncate max-w-[160px]">{region.region}</span>
                                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary font-bold">
                                                        {region.count} addresses
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </Card>

                            {/* Customer disputes & complaints */}
                            <Card className="p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold flex items-center gap-2">
                                            <ShieldAlert className="w-5 h-5 text-destructive" />
                                            Complaints & Disputes
                                        </h2>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-center">
                                                <p className="text-[9px] font-bold text-amber-700 uppercase">Pending</p>
                                                <p className="text-lg font-bold text-amber-800 mt-0.5">{extendedMetrics.complaints.pending}</p>
                                            </div>
                                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-center">
                                                <p className="text-[9px] font-bold text-emerald-700 uppercase">Resolved</p>
                                                <p className="text-lg font-bold text-emerald-800 mt-0.5">{extendedMetrics.complaints.resolved}</p>
                                            </div>
                                            <div className="bg-slate-500/10 border border-slate-500/20 p-2 rounded-lg text-center">
                                                <p className="text-[9px] font-bold text-slate-700 uppercase">Dismissed</p>
                                                <p className="text-lg font-bold text-slate-800 mt-0.5">{extendedMetrics.complaints.dismissed}</p>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Category Breakdown</p>
                                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                                {extendedMetrics.complaints.categories.length === 0 ? (
                                                    <span className="text-xs text-muted-foreground">No complaints filed</span>
                                                ) : (
                                                    extendedMetrics.complaints.categories.map((c: any) => (
                                                        <div key={c.category} className="flex justify-between items-center text-xs">
                                                            <span className="text-muted-foreground truncate max-w-[160px]">{c.category.replace('_', ' ')}</span>
                                                            <span className="font-bold text-foreground">{c.count}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DashboardAnalytics;
