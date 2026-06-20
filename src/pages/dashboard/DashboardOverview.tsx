import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsAPI, agentsAPI } from '@/lib/api';
import StatsCard from '@/components/dashboard/StatsCard';
import { Package, DollarSign, TrendingUp, Users, Clock, CheckCircle, Star, Award, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import VerifiedBadge from '@/components/VerifiedBadge';

interface DashboardMetrics {
  totalOrders?: number;
  pendingOrders?: number;
  completedOrders?: number;
  totalRevenue?: string;
  activeAgents?: number;
  totalEarnings?: string;
  currentOrderCount?: number;
  totalSpent?: string;
}

const DashboardOverview = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({});
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'weekly' | 'monthly' | 'annual'>('weekly');
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response: any = await analyticsAPI.getDashboard();
        if (response && response.success) {
          setMetrics(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchMetrics();
    }
  }, [user]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoadingLeaderboard(true);
        const response: any = await agentsAPI.getLeaderboard({ period: leaderboardPeriod });
        if (response && response.success) {
          setLeaderboard(response.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoadingLeaderboard(false);
      }
    };
    if (user) {
      fetchLeaderboard();
    }
  }, [user, leaderboardPeriod]);

  const isAdmin = user?.role === 'ADMIN';
  const isAgent = user?.role === 'AGENT';
  const isCustomer = user?.role === 'CUSTOMER';

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          {t('dashboard.overview.welcome')} {user?.fullName?.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground">
          {isAdmin && t('dashboard.overview.adminDescription')}
          {isAgent && t('dashboard.overview.agentDescription')}
          {isCustomer && t('dashboard.overview.customerDescription')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {loading ? (
          // Loading skeleton
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </>
        ) : (
          <>
            {isAdmin && (
              <>
                <StatsCard
                  title={t('dashboard.overview.stats.totalOrders')}
                  value={metrics.totalOrders?.toString() || '0'}
                  icon={Package}
                />
                <StatsCard
                  title={t('dashboard.overview.stats.pendingOrders')}
                  value={metrics.pendingOrders?.toString() || '0'}
                  icon={Clock}
                />
                <StatsCard
                  title={t('dashboard.overview.stats.totalRevenue')}
                  value={`TSh ${parseFloat(metrics.totalRevenue || '0').toLocaleString()}`}
                  icon={DollarSign}
                />
                <StatsCard
                  title={t('dashboard.overview.stats.activeAgents')}
                  value={metrics.activeAgents?.toString() || '0'}
                  icon={Users}
                />
              </>
            )}

            {isAgent && (
              <>
                <StatsCard
                  title={t('dashboard.overview.stats.myOrders')}
                  value={metrics.totalOrders?.toString() || '0'}
                  icon={Package}
                />
                <StatsCard
                  title={t('dashboard.overview.stats.activeOrders')}
                  value={metrics.currentOrderCount?.toString() || '0'}
                  icon={Clock}
                />
                <StatsCard
                  title={t('dashboard.overview.stats.completed')}
                  value={metrics.completedOrders?.toString() || '0'}
                  icon={CheckCircle}
                />
                <StatsCard
                  title={t('dashboard.overview.stats.earnings')}
                  value={`TSh ${parseFloat(metrics.totalEarnings || '0').toLocaleString()}`}
                  icon={DollarSign}
                />
              </>
            )}

            {isCustomer && (
              <>
                <StatsCard
                  title={t('dashboard.overview.stats.myOrders')}
                  value={metrics.totalOrders?.toString() || '0'}
                  icon={Package}
                />
                <StatsCard
                  title={t('dashboard.overview.stats.completed')}
                  value={metrics.completedOrders?.toString() || '0'}
                  icon={CheckCircle}
                />
                <StatsCard
                  title={t('dashboard.overview.stats.totalSpent')}
                  value={`TSh ${parseFloat(metrics.totalSpent || '0').toLocaleString()}`}
                  icon={DollarSign}
                />
                <StatsCard
                  title={t('dashboard.overview.stats.inProgress')}
                  value={((metrics.totalOrders || 0) - (metrics.completedOrders || 0)).toString()}
                  icon={TrendingUp}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Sourcing Agent Leaderboard */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              🏆 Sourcing Agent Leaderboard
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Top performing verified sourcing experts in Kariakoo</p>
          </div>
          <div className="flex bg-muted/65 p-1 rounded-xl border border-border/55 self-start sm:self-center">
            {(['weekly', 'monthly', 'annual'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setLeaderboardPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  leaderboardPeriod === p
                    ? "bg-white text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {loadingLeaderboard ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
            <Clock className="w-4 h-4 animate-spin text-primary" />
            Loading rankings...
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No completed deliveries recorded in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border/50 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 pr-4">Rank</th>
                  <th className="pb-3 pr-4">Sourcing Agent</th>
                  <th className="pb-3 pr-4 text-center">Deliveries</th>
                  <th className="pb-3 pr-4 text-center">Rating</th>
                  <th className="pb-3 pr-4 text-center hidden md:table-cell">Response</th>
                  <th className="pb-3 text-center hidden md:table-cell">Satisfaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {leaderboard.slice(0, 5).map((agent, index) => {
                  const isTop3 = index < 3;
                  const rankMedal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
                  return (
                    <tr key={agent.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3.5 pr-4 font-bold text-sm">
                        {isTop3 ? (
                          <span className="text-lg" title={`Rank ${index + 1}`}>{rankMedal}</span>
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            {index + 1}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center font-bold text-xs text-secondary shrink-0 overflow-hidden border border-border/50">
                            {agent.avatarUrl ? (
                              <img src={agent.avatarUrl.startsWith('http') ? agent.avatarUrl : `/api${agent.avatarUrl}`} alt={agent.fullName} className="w-full h-full object-cover" />
                            ) : (
                              agent.fullName.split(' ').map((n: string) => n[0]).join('')
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm text-foreground">{agent.fullName}</span>
                              {agent.boutiqueLevel !== 'NONE' && (
                                <VerifiedBadge size={14} className="shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {agent.boutiqueLevel !== 'NONE' && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold tracking-wide uppercase ${
                                  agent.boutiqueLevel === 'GOLD' 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                                }`}>
                                  {agent.boutiqueLevel} Boutique
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-center font-bold text-sm text-foreground">
                        {agent.completedOrders}
                      </td>
                      <td className="py-3.5 pr-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-sm text-foreground">{agent.rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-center hidden md:table-cell text-sm text-muted-foreground">
                        <div className="flex items-center justify-center gap-1">
                          <Zap className="w-3 h-3 text-emerald-500" />
                          <span>{agent.responseTime} mins</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-center hidden md:table-cell text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {agent.customerSatisfaction}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">{t('dashboard.overview.quickActions.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isCustomer && (
            <Link
              to="/dashboard/orders"
              className="p-4 rounded-lg border border-border hover:border-secondary hover:bg-secondary/5 transition-colors cursor-pointer"
            >
              <Package className="w-6 h-6 mb-2 text-secondary" />
              <h3 className="font-medium">{t('dashboard.overview.actions.newOrder')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.overview.actions.newOrderDesc')}</p>
            </Link>
          )}
          {isAdmin && (
            <>
              <Link
                to="/dashboard/agents"
                className="p-4 rounded-lg border border-border hover:border-secondary hover:bg-secondary/5 transition-colors cursor-pointer"
              >
                <Users className="w-6 h-6 mb-2 text-secondary" />
                <h3 className="font-medium">{t('dashboard.overview.actions.manageAgents')}</h3>
                <p className="text-sm text-muted-foreground">{t('dashboard.overview.actions.manageAgentsDesc')}</p>
              </Link>
              <Link
                to="/dashboard/orders"
                className="p-4 rounded-lg border border-border hover:border-secondary hover:bg-secondary/5 transition-colors cursor-pointer"
              >
                <Package className="w-6 h-6 mb-2 text-secondary" />
                <h3 className="font-medium">{t('dashboard.overview.actions.viewOrders')}</h3>
                <p className="text-sm text-muted-foreground">{t('dashboard.overview.actions.viewOrdersDesc')}</p>
              </Link>
            </>
          )}
          {isAgent && (
            <Link
              to="/dashboard/orders"
              className="p-4 rounded-lg border border-border hover:border-secondary hover:bg-secondary/5 transition-colors cursor-pointer"
            >
              <Package className="w-6 h-6 mb-2 text-secondary" />
              <h3 className="font-medium">{t('dashboard.overview.actions.myOrders')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.overview.actions.myOrdersDesc')}</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;

