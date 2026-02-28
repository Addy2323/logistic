import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';
import smsService from '../services/smsService.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Send test SMS (Admin only)
 * POST /api/sms/test
 */
router.post('/test', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { phone, message } = req.body;

        if (!phone) {
            return res.status(400).json({ error: { message: 'Phone number is required' } });
        }

        const testMessage = message || 'This is a test SMS from MHEMA Express Logistics.';
        const result = await smsService.sendSms(phone, testMessage);

        res.json({
            success: result.success,
            data: {
                phone: smsService.formatPhoneNumber(phone),
                message: testMessage,
                ...result
            }
        });
    } catch (error) {
        console.error('Test SMS error:', error);
        res.status(500).json({ error: { message: 'Failed to send test SMS' } });
    }
});

/**
 * Send bulk SMS (Admin only)
 * POST /api/sms/bulk
 */
router.post('/bulk', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { recipients, message, targetGroup } = req.body;

        if (!message) {
            return res.status(400).json({ error: { message: 'Message is required' } });
        }

        let phoneNumbers = [];

        if (recipients && Array.isArray(recipients)) {
            // Use provided recipients
            phoneNumbers = recipients;
        } else if (targetGroup) {
            // Fetch phone numbers by target group
            if (targetGroup === 'agents') {
                const agents = await prisma.user.findMany({
                    where: { role: 'AGENT', phone: { not: null } },
                    select: { phone: true }
                });
                phoneNumbers = agents.map(a => a.phone).filter(Boolean);
            } else if (targetGroup === 'customers') {
                const customers = await prisma.user.findMany({
                    where: { role: 'CUSTOMER', phone: { not: null } },
                    select: { phone: true }
                });
                phoneNumbers = customers.map(c => c.phone).filter(Boolean);
            } else if (targetGroup === 'all') {
                const users = await prisma.user.findMany({
                    where: { phone: { not: null } },
                    select: { phone: true }
                });
                phoneNumbers = users.map(u => u.phone).filter(Boolean);
            }
        }

        if (phoneNumbers.length === 0) {
            return res.status(400).json({ error: { message: 'No recipients found' } });
        }

        const result = await smsService.sendBulkSms(phoneNumbers, message);

        res.json({
            success: true,
            data: {
                totalRecipients: phoneNumbers.length,
                sent: result.sent,
                failed: result.failed,
                message
            }
        });
    } catch (error) {
        console.error('Bulk SMS error:', error);
        res.status(500).json({ error: { message: 'Failed to send bulk SMS' } });
    }
});

/**
 * Get SMS logs (Admin only)
 * GET /api/sms/logs
 */
router.get('/logs', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { limit = 50, offset = 0, status } = req.query;

        const result = await smsService.getSmsLogs({
            limit: parseInt(limit),
            offset: parseInt(offset),
            status
        });

        res.json({
            success: true,
            data: result.logs,
            pagination: {
                total: result.total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Get SMS logs error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch SMS logs' } });
    }
});

/**
 * Get SMS service status (Admin only)
 * GET /api/sms/status
 */
router.get('/status', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                configured: smsService.isConfigured(),
                enabled: smsService.isEnabled(),
                provider: 'beem',
                senderId: process.env.SMS_SENDER_ID || 'Rodway Shop'
            }
        });
    } catch (error) {
        console.error('SMS status error:', error);
        res.status(500).json({ error: { message: 'Failed to get SMS status' } });
    }
});

export default router;
