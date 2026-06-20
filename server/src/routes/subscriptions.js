import express from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, authorize } from '../middleware/auth.js';
import snippeService from '../services/snippeService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all subscription packages (Authenticated users)
router.get('/packages', authenticateToken, async (req, res) => {
    try {
        const packages = await prisma.subscriptionPackage.findMany({
            orderBy: { price: 'asc' }
        });
        res.json({ success: true, data: packages });
    } catch (error) {
        console.error('Get subscription packages error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch subscription packages' } });
    }
});

// Update a subscription package (Admin only)
router.patch('/packages/:key', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { key } = req.params;
        const { name, price, benefits } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (price !== undefined) updateData.price = parseFloat(price);
        if (benefits) updateData.benefits = benefits;

        const updatedPackage = await prisma.subscriptionPackage.update({
            where: { key },
            data: updateData
        });

        res.json({ success: true, data: updatedPackage });
    } catch (error) {
        console.error('Update subscription package error:', error);
        res.status(500).json({ error: { message: 'Failed to update subscription package' } });
    }
});

// Initiate STK push payment for subscription (Agent only)
router.post('/stk-push', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'AGENT') {
            return res.status(403).json({ error: { message: 'Only agents can purchase subscriptions' } });
        }

        const { plan, phone } = req.body;
        if (!plan || !phone) {
            return res.status(400).json({ error: { message: 'Plan key and phone number are required' } });
        }

        // Fetch dynamic package from DB to get the correct price
        const pkg = await prisma.subscriptionPackage.findUnique({
            where: { key: plan }
        });

        if (!pkg) {
            return res.status(404).json({ error: { message: 'Subscription package not found' } });
        }

        // Find agent model
        const agent = await prisma.agent.findUnique({
            where: { userId: req.user.id },
            include: { user: true }
        });

        if (!agent) {
            return res.status(404).json({ error: { message: 'Agent profile not found' } });
        }

        const agentUser = agent.user;
        const nameParts = (agentUser.fullName || 'Agent').trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || nameParts[0];

        const amount = parseFloat(pkg.price);
        const subscriptionId = uuidv4();
        const idempotencyKey = `sub-${agent.id}-${plan}-${Date.now()}`;

        // Calculate end date based on plan
        const start = new Date();
        const end = new Date(start);
        if (plan === 'WEEKLY') end.setDate(start.getDate() + 7);
        else if (plan === 'MONTHLY') end.setDate(start.getDate() + 30);
        else if (plan === 'SEMI_ANNUAL') end.setDate(start.getDate() + 180);
        else if (plan === 'ANNUAL') end.setDate(start.getDate() + 365);

        // Initiate STK push using Snippe service
        const snippePayment = await snippeService.initiateSTKPush({
            amount,
            phone,
            firstName,
            lastName,
            email: agentUser.email || 'noreply@mhemaexpress.co.tz',
            orderId: subscriptionId,
            orderNumber: `SUB-${plan}`,
            idempotencyKey
        });

        // Create the PENDING AgentSubscription record
        const subscription = await prisma.agentSubscription.create({
            data: {
                id: subscriptionId,
                agentId: agent.id,
                plan,
                amount,
                status: 'PENDING',
                startDate: start,
                endDate: end,
                snippeReference: snippePayment.reference
            }
        });

        res.json({
            success: true,
            data: {
                reference: snippePayment.reference,
                status: snippePayment.status,
                message: 'STK push sent to your phone. Please check your phone and enter your PIN to complete payment.'
            }
        });
    } catch (error) {
        console.error('STK push subscription error:', error);
        res.status(500).json({ error: { message: error.message || 'Failed to initiate payment' } });
    }
});

// Check STK status for subscription payment (Agent only)
router.get('/stk-status', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'AGENT') {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        const reference = req.query.reference;
        if (!reference) {
            return res.status(400).json({ error: { message: 'Payment reference is required' } });
        }

        const subscription = await prisma.agentSubscription.findFirst({
            where: { snippeReference: reference },
            include: { agent: true }
        });

        if (!subscription) {
            return res.status(404).json({ error: { message: 'Subscription record not found' } });
        }

        if (subscription.agent.userId !== req.user.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        if (subscription.status === 'ACTIVE') {
            return res.json({ success: true, data: { status: 'completed', subscriptionStatus: 'ACTIVE' } });
        }

        const snippeStatus = await snippeService.getPaymentStatus(reference);

        if (snippeStatus.status === 'completed' && subscription.status !== 'ACTIVE') {
            // Update subscription to active
            await prisma.agentSubscription.update({
                where: { id: subscription.id },
                data: { status: 'ACTIVE' }
            });

            // Create notification
            await prisma.notification.create({
                data: {
                    userId: req.user.id,
                    type: 'PAYMENT_CONFIRMED',
                    title: 'Subscription Activated',
                    message: `Your package ${subscription.plan} has been successfully activated. Auto-assigned orders are now enabled.`
                }
            });
        }

        return res.json({
            success: true,
            data: {
                status: snippeStatus.status,
                subscriptionStatus: snippeStatus.status === 'completed' ? 'ACTIVE' : subscription.status
            }
        });
    } catch (error) {
        console.error('Check subscription status error:', error);
        res.status(500).json({ error: { message: error.message || 'Failed to check status' } });
    }
});

// Get subscriptions (Authenticated)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const where = {};
        if (req.user.role === 'AGENT') {
            if (!req.user.agent) {
                return res.status(400).json({ error: { message: 'Agent profile not found' } });
            }
            where.agentId = req.user.agent.id;
        }

        const subscriptions = await prisma.agentSubscription.findMany({
            where,
            include: {
                agent: {
                    include: {
                        user: { select: { fullName: true, email: true, phone: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: subscriptions });
    } catch (error) {
        console.error('Get subscriptions error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch subscriptions' } });
    }
});

// Create subscription (Admin only)
router.post('/', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { agentId, plan, amount, startDate, endDate, status = 'ACTIVE' } = req.body;

        if (!agentId || !plan || amount === undefined || !endDate) {
            return res.status(400).json({ error: { message: 'Agent ID, plan, amount, and end date are required' } });
        }

        const subscription = await prisma.agentSubscription.create({
            data: {
                agentId,
                plan,
                amount: parseFloat(amount),
                status,
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: new Date(endDate)
            }
        });

        res.status(201).json({ success: true, data: subscription });
    } catch (error) {
        console.error('Create subscription error:', error);
        res.status(500).json({ error: { message: 'Failed to create subscription' } });
    }
});

// Update subscription status or dates (Admin only)
router.patch('/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { status, endDate, plan, amount } = req.body;

        const updateData = {};
        if (status) updateData.status = status;
        if (endDate) updateData.endDate = new Date(endDate);
        if (plan) updateData.plan = plan;
        if (amount !== undefined) updateData.amount = parseFloat(amount);

        const updatedSubscription = await prisma.agentSubscription.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json({ success: true, data: updatedSubscription });
    } catch (error) {
        console.error('Update subscription error:', error);
        res.status(500).json({ error: { message: 'Failed to update subscription' } });
    }
});

// Delete subscription (Admin only)
router.delete('/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        await prisma.agentSubscription.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true, message: 'Subscription deleted successfully' });
    } catch (error) {
        console.error('Delete subscription error:', error);
        res.status(500).json({ error: { message: 'Failed to delete subscription' } });
    }
});

export default router;
