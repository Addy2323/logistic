import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard metrics (role-based)
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching dashboard metrics for user:', req.user.id, req.user.role);
        let metrics = {};

        if (req.user.role === 'ADMIN') {
            console.log('Fetching ADMIN metrics');
            // Admin gets full system metrics
            const totalOrders = await prisma.order.count();
            const pendingOrders = await prisma.order.count({ where: { status: 'REQUEST_SUBMITTED' } });

            const completedOrders = await prisma.order.count({ where: { status: 'DELIVERED_SUCCESSFULLY' } });
            const activeAgents = await prisma.agent.count({ where: { availabilityStatus: 'ONLINE' } });

            let totalRevenue = '0';
            try {
                const salesSum = await prisma.salesRecord.aggregate({
                    _sum: { amount: true }
                });
                totalRevenue = salesSum._sum.amount?.toString() || '0';
            } catch (e) {
                console.error('Error calculating revenue:', e);
                // No sales records yet
            }

            metrics = {
                totalOrders,
                pendingOrders,
                completedOrders,
                totalRevenue,
                activeAgents
            };

        } else if (req.user.role === 'AGENT' && req.user.agent) {
            console.log('Fetching AGENT metrics for agent:', req.user.agent.id);
            // Agent gets personal metrics
            const myOrders = await prisma.order.count({ where: { agentId: req.user.agent.id } });
            const completedOrders = await prisma.order.count({
                where: {
                    agentId: req.user.agent.id,
                    status: 'DELIVERED_SUCCESSFULLY'
                }
            });
            const agentData = await prisma.agent.findUnique({
                where: { id: req.user.agent.id },
                select: { totalEarnings: true, currentOrderCount: true }
            });

            metrics = {
                totalOrders: myOrders,
                completedOrders,
                totalEarnings: agentData?.totalEarnings?.toString() || '0',
                currentOrderCount: agentData?.currentOrderCount || 0
            };

        } else if (req.user.role === 'CUSTOMER') {
            console.log('Fetching CUSTOMER metrics for user:', req.user.id);
            // Customer gets their order metrics
            const myOrders = await prisma.order.count({ where: { customerId: req.user.id } });
            const completedOrders = await prisma.order.count({
                where: {
                    customerId: req.user.id,
                    status: 'DELIVERED_SUCCESSFULLY'
                }
            });

            let totalSpent = '0';
            try {
                const spent = await prisma.order.aggregate({
                    where: {
                        customerId: req.user.id,
                        paymentStatus: 'CONFIRMED'
                    },
                    _sum: { actualCost: true }
                });
                totalSpent = spent._sum.actualCost?.toString() || '0';
            } catch (e) {
                console.error('Error calculating spend:', e);
                // No orders yet
            }

            metrics = {
                totalOrders: myOrders,
                completedOrders,
                totalSpent
            };
        } else {
            console.log('Unknown role or missing agent profile');
            // Default empty metrics
            metrics = {
                totalOrders: 0,
                completedOrders: 0,
                totalRevenue: '0'
            };
        }

        console.log('Metrics calculated successfully:', metrics);
        res.json({ success: true, data: metrics });
    } catch (error) {
        console.error('Get dashboard metrics error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch dashboard metrics' } });
    }
});

// Get sales data for charts (Admin only)
router.get('/sales', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'day' } = req.query;

        const where = {};
        if (startDate && endDate) {
            where.recordedAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const salesRecords = await prisma.salesRecord.findMany({
            where,
            include: {
                order: {
                    select: {
                        placedAt: true
                    }
                }
            },
            orderBy: { recordedAt: 'asc' }
        });

        // Group data based on groupBy parameter
        const groupedData = {};

        salesRecords.forEach(record => {
            const date = new Date(record.recordedAt);
            let key;

            if (groupBy === 'month') {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            } else if (groupBy === 'week') {
                const weekNumber = Math.ceil(date.getDate() / 7);
                key = `${date.getFullYear()}-W${weekNumber}`;
            } else {
                // day
                key = date.toISOString().split('T')[0];
            }

            if (!groupedData[key]) {
                groupedData[key] = {
                    date: key,
                    revenue: 0,
                    profit: 0,
                    orders: 0
                };
            }

            groupedData[key].revenue += parseFloat(record.amount);
            groupedData[key].profit += parseFloat(record.profit);
            groupedData[key].orders += 1;
        });

        const data = Object.values(groupedData);

        res.json({ success: true, data });
    } catch (error) {
        console.error('Get sales data error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch sales data' } });
    }
});

// Get agent performance comparison (Admin only)
router.get('/agents', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const agents = await prisma.agent.findMany({
            include: {
                user: {
                    select: { fullName: true }
                },
                _count: {
                    select: { orders: true }
                },
                salesRecords: {
                    select: {
                        amount: true
                    }
                }
            }
        });

        const agentPerformance = agents.map(agent => ({
            agentId: agent.id,
            agentName: agent.user.fullName,
            totalOrders: agent._count.orders,
            totalRevenue: agent.salesRecords.reduce((sum, record) =>
                sum + parseFloat(record.amount), 0
            ),
            totalEarnings: parseFloat(agent.totalEarnings),
            averageRating: parseFloat(agent.rating),
            completionRate: agent.totalDeliveries > 0
                ? (agent.totalDeliveries / agent._count.orders) * 100
                : 0
        }));

        res.json({ success: true, data: agentPerformance });
    } catch (error) {
        console.error('Get agent performance error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch agent performance' } });
    }
});

// Get extended admin metrics (Admin only)
router.get('/admin-extended', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        // 1. Subscription metrics
        const totalSubscriptions = await prisma.agentSubscription.count();
        const activeSubscriptions = await prisma.agentSubscription.count({
            where: { status: 'ACTIVE', endDate: { gte: new Date() } }
        });
        const pendingSubscriptions = await prisma.agentSubscription.count({
            where: { status: 'PENDING' }
        });

        // 2. Regional distributions (from saved addresses)
        const regionalAddresses = await prisma.savedAddress.groupBy({
            by: ['region'],
            _count: { id: true }
        });

        // 3. Complaints statistics
        const totalComplaints = await prisma.complaint.count();
        const pendingComplaints = await prisma.complaint.count({ where: { status: 'PENDING' } });
        const resolvedComplaints = await prisma.complaint.count({ where: { status: 'RESOLVED' } });
        const dismissedComplaints = await prisma.complaint.count({ where: { status: 'DISMISSED' } });

        const complaintsByCategory = await prisma.complaint.groupBy({
            by: ['category'],
            _count: { id: true }
        });

        // 4. Boutique verified agent counts
        const boutiqueCounts = await prisma.agentVerification.groupBy({
            by: ['level'],
            where: { status: 'APPROVED' },
            _count: { id: true }
        });

        res.json({
            success: true,
            data: {
                subscriptions: {
                    total: totalSubscriptions,
                    active: activeSubscriptions,
                    pending: pendingSubscriptions,
                    revenue: activeSubscriptions * 50000
                },
                regionalDistribution: regionalAddresses.map(r => ({
                    region: r.region || 'Unknown',
                    count: r._count.id
                })),
                complaints: {
                    total: totalComplaints,
                    pending: pendingComplaints,
                    resolved: resolvedComplaints,
                    dismissed: dismissedComplaints,
                    categories: complaintsByCategory.map(c => ({
                        category: c.category,
                        count: c._count.id
                    }))
                },
                boutique: boutiqueCounts.map(b => ({
                    level: b.level,
                    count: b._count.id
                }))
            }
        });
    } catch (error) {
        console.error('Get extended analytics error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch extended analytics' } });
    }
});

export default router;
