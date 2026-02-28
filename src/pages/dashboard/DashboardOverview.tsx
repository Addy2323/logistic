import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsAPI } from '@/lib/api';
import StatsCard from '@/components/dashboard/StatsCard';
import { Package, DollarSign, TrendingUp, Users, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

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

