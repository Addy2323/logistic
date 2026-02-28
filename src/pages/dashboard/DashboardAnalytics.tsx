import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsAPI } from '@/lib/api';
import SalesChart from '@/components/analytics/SalesChart';
import AgentPerformanceChart from '@/components/analytics/AgentPerformanceChart';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from 'lucide-react';

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
                </div>
            )}
        </div>
    );
};

export default DashboardAnalytics;
