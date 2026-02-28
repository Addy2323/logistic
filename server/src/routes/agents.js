import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticateToken, authorize } from '../middleware/auth.js';
import orderDistribution from '../services/orderDistribution.js';
import smsService from '../services/smsService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all agents (Admin only) or current agent info
router.get('/', authenticateToken, async (req, res) => {
    try {
        if (req.user.role === 'ADMIN') {
            // Admin can see all agents
            const { search, status } = req.query;

            const where = {};
            if (status) {
                where.availabilityStatus = status;
            }

            const agents = await prisma.agent.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            phone: true,
                            avatarUrl: true,
                            status: true

                        }
                    },
                    _count: {
                        select: { orders: true, salesRecords: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Filter by search if provided
            let filteredAgents = agents;
            if (search) {
                const searchLower = search.toLowerCase();
                filteredAgents = agents.filter(agent =>
                    agent.user.fullName.toLowerCase().includes(searchLower) ||
                    agent.user.email.toLowerCase().includes(searchLower) ||
                    agent.user.phone?.includes(search)
                );
            }

            res.json({ success: true, data: filteredAgents });
        } else if (req.user.role === 'AGENT' && req.user.agent) {
            // Agent can only see their own info
            const agent = await prisma.agent.findUnique({
                where: { id: req.user.agent.id },
                include: {
                    user: {
                        select: {
                            fullName: true,
                            email: true,
                            phone: true,
                            avatarUrl: true

                        }
                    },
                    _count: {
                        select: { orders: true, salesRecords: true }
                    }
                }
            });

            res.json({ success: true, data: agent });
        } else {
            res.status(403).json({ error: { message: 'Access denied' } });
        }
    } catch (error) {
        console.error('Get agents error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch agents' } });
    }
});

// Create new agent (Admin only)
router.post('/', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const {
            email,
            password,
            fullName,
            phone,
            commissionRate = 10,
            maxOrderCapacity = 10
        } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({
                error: { message: 'Email, password, and full name are required' }
            });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                error: { message: 'Email already registered' }
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user and agent
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
                phone,
                role: 'AGENT',
                agent: {
                    create: {
                        commissionRate: parseFloat(commissionRate),
                        maxOrderCapacity: parseInt(maxOrderCapacity)
                    }
                }
            },
            include: {
                agent: true
            }
        });

        // Send welcome SMS with credentials
        if (phone) {
            const welcomeMessage = `Congratulations! You have been added successfully to MHEMA Express Logistics as an Agent.

Your login credentials:
Username: ${email}
Password: ${password}

Login here: https://mhemalogistics.co.tz/auth?mode=login

Welcome to the team!`;

            try {
                await smsService.sendSms(phone, welcomeMessage);
                console.log(`Welcome SMS sent to new agent: ${phone}`);
            } catch (smsError) {
                console.error('Failed to send welcome SMS to agent:', smsError);
                // Don't fail the request if SMS fails
            }
        }

        res.status(201).json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                phone: user.phone,
                agent: user.agent
            }
        });
    } catch (error) {
        console.error('Create agent error:', error);
        res.status(500).json({ error: { message: 'Failed to create agent' } });
    }
});

// Get agent statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
    try {
        const agent = await prisma.agent.findUnique({
            where: { id: req.params.id },
            include: {
                orders: {
                    where: {
                        status: 'COMPLETED'
                    }
                },
                salesRecords: true
            }
        });

        if (!agent) {
            return res.status(404).json({ error: { message: 'Agent not found' } });
        }

        // Check permissions
        if (req.user.role === 'AGENT' && req.user.agent?.id !== agent.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        const completionRate = agent.orders.length > 0
            ? (agent.orders.filter(o => o.status === 'COMPLETED').length / agent.orders.length) * 100
            : 0;

        const stats = {
            totalDeliveries: agent.totalDeliveries,
            totalEarnings: agent.totalEarnings.toString(),
            averageRating: agent.rating.toString(),
            currentOrderCount: agent.currentOrderCount,
            completionRate: completionRate.toFixed(2),
            maxOrderCapacity: agent.maxOrderCapacity,
            commissionRate: agent.commissionRate.toString()
        };

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Get agent stats error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch statistics' } });
    }
});

// Update agent availability status
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { availabilityStatus } = req.body;

        if (!['ONLINE', 'OFFLINE'].includes(availabilityStatus)) {
            return res.status(400).json({
                error: { message: 'Invalid availability status' }
            });
        }

        const agent = await prisma.agent.findUnique({
            where: { id: req.params.id }
        });

        if (!agent) {
            return res.status(404).json({ error: { message: 'Agent not found' } });
        }

        // Check permissions - agent can only update their own status
        if (req.user.role === 'AGENT' && req.user.agent?.id !== agent.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        const updateData = { availabilityStatus };
        if (availabilityStatus === 'ONLINE') {
            updateData.lastOnlineAt = new Date();
        }

        const updatedAgent = await prisma.agent.update({
            where: { id: req.params.id },
            data: updateData
        });

        // If agent went online, process queued orders
        if (availabilityStatus === 'ONLINE') {
            await orderDistribution.processQueue();
        }

        // If agent went offline, reassign their active orders
        if (availabilityStatus === 'OFFLINE') {
            const reassignedCount = await orderDistribution.reassignAgentOrders(agent.id);
            console.log(`Agent ${agent.id} went offline. Reassigned ${reassignedCount} orders.`);
        }

        res.json({ success: true, data: updatedAgent });
    } catch (error) {
        console.error('Update agent status error:', error);
        res.status(500).json({ error: { message: 'Failed to update status' } });
    }
});

// Update agent details (Admin only)
router.patch('/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { commissionRate, maxOrderCapacity, status } = req.body;

        const agent = await prisma.agent.findUnique({
            where: { id: req.params.id },
            include: { user: true }
        });

        if (!agent) {
            return res.status(404).json({ error: { message: 'Agent not found' } });
        }

        const updateData = {};
        if (commissionRate !== undefined) {
            updateData.commissionRate = parseFloat(commissionRate);
        }
        if (maxOrderCapacity !== undefined) {
            updateData.maxOrderCapacity = parseInt(maxOrderCapacity);
        }

        const updatedAgent = await prisma.agent.update({
            where: { id: req.params.id },
            data: updateData
        });

        // Update user status if provided
        if (status) {
            await prisma.user.update({
                where: { id: agent.userId },
                data: { status }
            });
        }

        res.json({ success: true, data: updatedAgent });
    } catch (error) {
        console.error('Update agent error:', error);
        res.status(500).json({ error: { message: 'Failed to update agent' } });
    }
});

// Delete agent (Admin only)
router.delete('/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if agent exists
        const agent = await prisma.agent.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { orders: true }
                }
            }
        });

        if (!agent) {
            return res.status(404).json({ error: { message: 'Agent not found' } });
        }

        // Check for associated orders
        if (agent._count.orders > 0) {
            return res.status(400).json({
                error: { message: 'Cannot delete agent with assigned orders. Reassign orders or deactivate agent instead.' }
            });
        }

        // Delete the USER (which cascades to Agent)
        await prisma.user.delete({
            where: { id: agent.userId }
        });

        res.json({ success: true, message: 'Agent deleted successfully' });
    } catch (error) {
        console.error('Delete agent error:', error);
        res.status(500).json({ error: { message: 'Failed to delete agent' } });
    }
});

export default router;
