import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get reviews
router.get('/', authenticateToken, async (req, res) => {
    try {
        const where = {};
        if (req.user.role === 'AGENT') {
            if (!req.user.agent) {
                return res.status(400).json({ error: { message: 'Agent profile not found' } });
            }
            where.agentId = req.user.agent.id;
        } else if (req.user.role === 'CUSTOMER') {
            where.customerId = req.user.id;
        }

        const reviews = await prisma.customerReview.findMany({
            where,
            include: {
                order: { select: { orderNumber: true } },
                customer: { select: { fullName: true, avatarUrl: true } },
                agent: {
                    include: {
                        user: { select: { fullName: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch reviews' } });
    }
});

// Submit a review for a completed order
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { orderId, communication, deliverySpeed, professionalism, productQuality, comment, images = [] } = req.body;

        if (!orderId || !communication || !deliverySpeed || !professionalism || !productQuality) {
            return res.status(400).json({ error: { message: 'Order ID and all rating categories are required' } });
        }

        // Fetch the order and verify ownership
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { agent: true }
        });

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        // Verification: Order must belong to this customer
        if (order.customerId !== req.user.id) {
            return res.status(403).json({ error: { message: 'You can only review your own orders' } });
        }

        // Verification: Order must be completed
        if (order.status !== 'DELIVERED_SUCCESSFULLY' && order.status !== 'COMPLETED') {
            return res.status(400).json({ error: { message: 'You can only review successfully completed orders' } });
        }

        // Verification: Can only review once
        const existingReview = await prisma.customerReview.findUnique({
            where: { orderId }
        });
        if (existingReview) {
            return res.status(400).json({ error: { message: 'You have already reviewed this order' } });
        }

        if (!order.agentId) {
            return res.status(400).json({ error: { message: 'No agent was assigned to this order' } });
        }

        // Calculate overall score
        const overallScore = (Number(communication) + Number(deliverySpeed) + Number(professionalism) + Number(productQuality)) / 4;

        // Create review
        const review = await prisma.customerReview.create({
            data: {
                orderId,
                agentId: order.agentId,
                customerId: req.user.id,
                communication: parseInt(communication),
                deliverySpeed: parseInt(deliverySpeed),
                professionalism: parseInt(professionalism),
                productQuality: parseInt(productQuality),
                overallScore,
                comment: comment || null,
                images: Array.isArray(images) ? images : []
            }
        });

        // Recalculate and update agent overall rating
        const agentReviews = await prisma.customerReview.findMany({
            where: { agentId: order.agentId },
            select: { overallScore: true }
        });

        const totalScore = agentReviews.reduce((sum, r) => sum + parseFloat(r.overallScore), 0);
        const avgRating = totalScore / agentReviews.length;

        await prisma.agent.update({
            where: { id: order.agentId },
            data: { rating: avgRating }
        });

        res.status(201).json({ success: true, data: review });
    } catch (error) {
        console.error('Submit review error:', error);
        res.status(500).json({ error: { message: 'Failed to submit review' } });
    }
});

export default router;
