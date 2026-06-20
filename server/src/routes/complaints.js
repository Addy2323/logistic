import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get complaints list (Authenticated)
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

        const complaints = await prisma.complaint.findMany({
            where,
            include: {
                order: { select: { orderNumber: true } },
                customer: { select: { fullName: true, email: true, phone: true } },
                agent: {
                    include: {
                        user: { select: { fullName: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: complaints });
    } catch (error) {
        console.error('Get complaints error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch complaints' } });
    }
});

// File a complaint
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { orderId, category, description, evidenceImages = [] } = req.body;

        if (!orderId || !category || !description) {
            return res.status(400).json({ error: { message: 'Order ID, category, and description are required' } });
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        // Verification: Must be the customer who placed the order
        if (order.customerId !== req.user.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        const complaint = await prisma.complaint.create({
            data: {
                orderId,
                customerId: req.user.id,
                agentId: order.agentId,
                category,
                description,
                evidenceImages: Array.isArray(evidenceImages) ? evidenceImages : [],
                status: 'PENDING'
            }
        });

        // If complaint is filed, also mark order status to DISPUTED payment status if relevant
        if (category === 'FRAUDULENT_ACTIVITY') {
            await prisma.order.update({
                where: { id: orderId },
                data: { paymentStatus: 'DISPUTED' }
            });
        }

        res.status(201).json({ success: true, data: complaint });
    } catch (error) {
        console.error('File complaint error:', error);
        res.status(500).json({ error: { message: 'Failed to file complaint' } });
    }
});

// Resolve complaint (Admin only)
router.patch('/:id/resolve', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { status, adminNotes } = req.body;

        if (!status || (status !== 'RESOLVED' && status !== 'DISMISSED')) {
            return res.status(400).json({ error: { message: 'Status must be RESOLVED or DISMISSED' } });
        }

        const complaint = await prisma.complaint.findUnique({
            where: { id: req.params.id }
        });

        if (!complaint) {
            return res.status(404).json({ error: { message: 'Complaint not found' } });
        }

        const updatedComplaint = await prisma.complaint.update({
            where: { id: req.params.id },
            data: {
                status,
                adminNotes: adminNotes || null,
                resolvedAt: new Date()
            }
        });

        res.json({ success: true, data: updatedComplaint });
    } catch (error) {
        console.error('Resolve complaint error:', error);
        res.status(500).json({ error: { message: 'Failed to resolve complaint' } });
    }
});

export default router;
