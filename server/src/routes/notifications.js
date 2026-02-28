import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { isRead, limit = 50 } = req.query;

        const where = { userId: req.user.id };
        if (isRead !== undefined) {
            where.isRead = isRead === 'true';
        }

        const notifications = await prisma.notification.findMany({
            where,
            include: {
                relatedOrder: {
                    select: {
                        orderNumber: true,
                        status: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit)
        });

        const unreadCount = await prisma.notification.count({
            where: { userId: req.user.id, isRead: false }
        });

        res.json({
            success: true,
            data: notifications,
            unreadCount
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch notifications' } });
    }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
    try {
        const notification = await prisma.notification.findUnique({
            where: { id: req.params.id }
        });

        if (!notification) {
            return res.status(404).json({ error: { message: 'Notification not found' } });
        }

        if (notification.userId !== req.user.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        const updated = await prisma.notification.update({
            where: { id: req.params.id },
            data: { isRead: true }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: { message: 'Failed to mark notification as read' } });
    }
});

// Mark all notifications as read
router.patch('/read-all', authenticateToken, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: {
                userId: req.user.id,
                isRead: false
            },
            data: { isRead: true }
        });

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({ error: { message: 'Failed to mark all notifications as read' } });
    }
});

export default router;
