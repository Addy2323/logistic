import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all notification templates (Admin only)
router.get('/', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const templates = await prisma.notificationTemplate.findMany({
            orderBy: { key: 'asc' }
        });
        res.json({ success: true, data: templates });
    } catch (error) {
        console.error('Fetch templates error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch templates' } });
    }
});

// Update a notification template (Admin only)
router.put('/:key', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { key } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ error: { message: 'Template content is required' } });
        }

        const template = await prisma.notificationTemplate.upsert({
            where: { key },
            update: { content },
            create: { key, type: key.includes('whatsapp') ? 'WHATSAPP' : 'SMS', content }
        });

        res.json({ success: true, data: template });
    } catch (error) {
        console.error('Update template error:', error);
        res.status(500).json({ error: { message: 'Failed to update template' } });
    }
});

export default router;
