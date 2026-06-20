import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticateToken, authorize, optionalAuthenticateToken } from '../middleware/auth.js';
import orderDistribution from '../services/orderDistribution.js';
import smsService from '../services/smsService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Public endpoint: Get active/public agents (unauthenticated)
router.get('/public', async (req, res) => {
    try {
        const { search, region, level, limit } = req.query;
        
        const agents = await prisma.agent.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phone: true,
                        avatarUrl: true
                    }
                },
                verifications: {
                    where: { status: 'APPROVED' },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                _count: {
                    select: { orders: true, followers: true, products: true }
                }
            }
        });
        
        let formattedAgents = agents.map(agent => {
            const activeVerification = agent.verifications[0];
            return {
                id: agent.id,
                fullName: agent.user.fullName || 'LotusRise Agent',
                avatarUrl: agent.user.avatarUrl,
                phone: agent.user.phone,
                bio: agent.bio || 'Professional Kariakoo sourcing and logistics agent.',
                region: agent.region || 'Dar es Salaam',
                district: agent.district || 'Ilala',
                businessName: agent.businessName || 'LotusRise Agent',
                rating: parseFloat(agent.rating || 0),
                commissionRate: parseFloat(agent.commissionRate || 10),
                totalDeliveries: agent.totalDeliveries || 0,
                successRate: parseFloat(agent.successRate || 100),
                responseRate: parseFloat(agent.responseRate || 100),
                completionRate: parseFloat(agent.completionRate || 100),
                followersCount: agent.followersCount || agent._count.followers || 0,
                boutiqueLevel: activeVerification ? activeVerification.level : 'NONE',
                availabilityStatus: agent.availabilityStatus,
                productsCount: agent._count.products || 0
            };
        });

        // Priority sorting: Boutique level first, then rating, then deliveries
        formattedAgents.sort((a, b) => {
            const levelOrder = { 'PLATINUM': 3, 'GOLD': 2, 'SILVER': 1, 'NONE': 0 };
            const aLevel = levelOrder[a.boutiqueLevel] || 0;
            const bLevel = levelOrder[b.boutiqueLevel] || 0;
            
            if (aLevel !== bLevel) {
                return bLevel - aLevel;
            }
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            return b.totalDeliveries - a.totalDeliveries;
        });

        if (search) {
            const searchLower = search.toLowerCase();
            formattedAgents = formattedAgents.filter(a => 
                a.fullName.toLowerCase().includes(searchLower) ||
                (a.businessName && a.businessName.toLowerCase().includes(searchLower)) ||
                (a.bio && a.bio.toLowerCase().includes(searchLower))
            );
        }

        if (region) {
            formattedAgents = formattedAgents.filter(a => a.region && a.region.toLowerCase() === region.toLowerCase());
        }

        if (level && level !== 'ALL') {
            formattedAgents = formattedAgents.filter(a => a.boutiqueLevel === level);
        }

        if (limit) {
            formattedAgents = formattedAgents.slice(0, parseInt(limit));
        }

        res.json({ success: true, data: formattedAgents });
    } catch (error) {
        console.error('Get public agents error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch public agents' } });
    }
});

// Public endpoint: Get single agent details and products (with optional auth for follow status)
router.get('/public/:id', optionalAuthenticateToken, async (req, res) => {
    try {
        const agent = await prisma.agent.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phone: true,
                        avatarUrl: true
                    }
                },
                verifications: {
                    where: { status: 'APPROVED' },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                products: {
                    orderBy: { createdAt: 'desc' }
                },
                reviews: {
                    include: {
                        customer: {
                            select: {
                                fullName: true,
                                avatarUrl: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                _count: {
                    select: { followers: true, products: true }
                }
            }
        });

        if (!agent) {
            return res.status(404).json({ error: { message: 'Agent not found' } });
        }

        const activeVerification = agent.verifications[0];
        
        let isFollowing = false;
        if (req.user) {
            const follow = await prisma.agentFollower.findUnique({
                where: {
                    agentId_userId: {
                        agentId: agent.id,
                        userId: req.user.id
                    }
                }
            });
            isFollowing = !!follow;
        }

        const responseData = {
            id: agent.id,
            fullName: agent.user.fullName || 'LotusRise Agent',
            avatarUrl: agent.user.avatarUrl,
            phone: agent.user.phone,
            bio: agent.bio || 'Professional Kariakoo sourcing and logistics agent.',
            region: agent.region || 'Dar es Salaam',
            district: agent.district || 'Ilala',
            businessName: agent.businessName || 'LotusRise Agent',
            rating: parseFloat(agent.rating || 0),
            commissionRate: parseFloat(agent.commissionRate || 10),
            totalDeliveries: agent.totalDeliveries || 0,
            successRate: parseFloat(agent.successRate || 100),
            responseRate: parseFloat(agent.responseRate || 100),
            completionRate: parseFloat(agent.completionRate || 100),
            followersCount: agent.followersCount || agent._count.followers || 0,
            boutiqueLevel: activeVerification ? activeVerification.level : 'NONE',
            availabilityStatus: agent.availabilityStatus,
            isFollowing,
            products: agent.products.map(p => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                description: p.description,
                price: parseFloat(p.price || 0),
                imageUrl: p.imageUrl,
                views: p.views || 0,
                clicks: p.clicks || 0
            })),
            reviews: agent.reviews.map(r => ({
                id: r.id,
                customerName: r.customer.fullName || 'Anonymous Customer',
                customerAvatar: r.customer.avatarUrl,
                overallScore: parseFloat(r.overallScore || 5),
                comment: r.comment,
                createdAt: r.createdAt
            }))
        };

        res.json({ success: true, data: responseData });
    } catch (error) {
        console.error('Get public agent details error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch agent details' } });
    }
});

// Follow/Unfollow agent (requires auth)
router.post('/:id/follow', authenticateToken, async (req, res) => {
    try {
        const agentId = req.params.id;
        const userId = req.user.id;

        const agent = await prisma.agent.findUnique({
            where: { id: agentId }
        });

        if (!agent) {
            return res.status(404).json({ error: { message: 'Agent not found' } });
        }

        const existingFollow = await prisma.agentFollower.findUnique({
            where: {
                agentId_userId: {
                    agentId,
                    userId
                }
            }
        });

        let isFollowing = false;
        if (existingFollow) {
            await prisma.agentFollower.delete({
                where: {
                    agentId_userId: {
                        agentId,
                        userId
                    }
                }
            });
            
            await prisma.agent.update({
                where: { id: agentId },
                data: { followersCount: { decrement: 1 } }
            });
        } else {
            await prisma.agentFollower.create({
                data: {
                    agentId,
                    userId
                }
            });

            await prisma.agent.update({
                where: { id: agentId },
                data: { followersCount: { increment: 1 } }
            });
            isFollowing = true;
        }

        res.json({ success: true, data: { isFollowing } });
    } catch (error) {
        console.error('Follow agent error:', error);
        res.status(500).json({ error: { message: 'Failed to toggle follow' } });
    }
});

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
                    verifications: {
                        where: { status: 'APPROVED' },
                        orderBy: { createdAt: 'desc' },
                        take: 1
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

        // Check if user exists by email or phone
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { phone }
                ]
            }
        });
        if (existingUser) {
            return res.status(400).json({
                error: { message: 'Email or phone number already registered' }
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
            const welcomeMessage = `Congratulations! You have been added successfully to LotusRise Logistics as an Agent.

Your login credentials:
Username: ${email}
Password: ${password}

Login here: https://lotusriselogistics.com/auth?mode=login

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
        const { commissionRate, maxOrderCapacity, status, boutiqueLevel } = req.body;

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

        // Handle boutiqueLevel updates if provided
        if (boutiqueLevel !== undefined) {
            await prisma.boutiqueVerification.deleteMany({
                where: { agentId: agent.id }
            });

            if (boutiqueLevel !== 'NONE') {
                await prisma.boutiqueVerification.create({
                    data: {
                        agentId: agent.id,
                        type: 'BOUTIQUE',
                        status: 'APPROVED',
                        level: boutiqueLevel,
                        documentUrls: []
                    }
                });
            }
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

// Get agent leaderboard (Authenticated)
router.get('/leaderboard', authenticateToken, async (req, res) => {
    try {
        const { period = 'weekly' } = req.query;
        let dateLimit = new Date();
        if (period === 'weekly') {
            dateLimit.setDate(dateLimit.getDate() - 7);
        } else if (period === 'monthly') {
            dateLimit.setDate(dateLimit.getDate() - 30);
        } else if (period === 'annual') {
            dateLimit.setDate(dateLimit.getDate() - 365);
        } else {
            return res.status(400).json({ error: { message: 'Invalid period parameter. Must be weekly, monthly, or annual.' } });
        }

        // Get completed orders count for each agent in this period
        const orders = await prisma.order.findMany({
            where: {
                status: { in: ['DELIVERED_SUCCESSFULLY', 'COMPLETED'] },
                OR: [
                    { completedAt: { gte: dateLimit } },
                    { deliveredAt: { gte: dateLimit } }
                ]
            },
            select: {
                agentId: true,
                totalAmount: true
            }
        });

        // Group by agentId
        const agentCompletedCounts = {};
        orders.forEach(order => {
            if (order.agentId) {
                if (!agentCompletedCounts[order.agentId]) {
                    agentCompletedCounts[order.agentId] = { count: 0, revenue: 0 };
                }
                agentCompletedCounts[order.agentId].count += 1;
                agentCompletedCounts[order.agentId].revenue += parseFloat(order.totalAmount || 0);
            }
        });

        // Get all agents
        const agents = await prisma.agent.findMany({
            include: {
                user: {
                    select: {
                        fullName: true,
                        avatarUrl: true
                    }
                },
                verifications: {
                    where: { status: 'APPROVED' },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        // Map and rank
        const rankedAgents = agents.map(agent => {
            const periodStats = agentCompletedCounts[agent.id] || { count: 0, revenue: 0 };
            return {
                id: agent.id,
                fullName: agent.user.fullName,
                avatarUrl: agent.user.avatarUrl,
                rating: parseFloat(agent.rating || 0),
                boutiqueLevel: agent.verifications?.[0]?.level || 'NONE',
                completedOrders: periodStats.count,
                revenue: periodStats.revenue,
                responseTime: Math.round(5 + Math.random() * 25), // mock
                customerSatisfaction: Math.round(85 + Math.random() * 15), // mock
                totalDeliveries: agent.totalDeliveries
            };
        });

        // Sort: completed orders desc, rating desc, totalDeliveries desc
        rankedAgents.sort((a, b) => {
            if (b.completedOrders !== a.completedOrders) {
                return b.completedOrders - a.completedOrders;
            }
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            return b.totalDeliveries - a.totalDeliveries;
        });

        res.json({ success: true, data: rankedAgents });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch leaderboard' } });
    }
});

// Get agent payment profile for logged-in agent
router.get('/payment-profile', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'AGENT') {
            return res.status(403).json({ error: { message: 'Only agents can access their payment profile' } });
        }
        if (!req.user.agent) {
            return res.status(400).json({ error: { message: 'Agent profile not found' } });
        }

        let profile = await prisma.agentPaymentProfile.findUnique({
            where: { agentId: req.user.agent.id }
        });

        if (!profile) {
            // Initialize empty profile
            profile = await prisma.agentPaymentProfile.create({
                data: {
                    agentId: req.user.agent.id,
                    mobileMoneyNumbers: [],
                    bankAccounts: [],
                    lipaNumbers: [],
                    qrCodeUrls: [],
                    cashCollectionAvailable: true,
                    isVerified: true
                }
            });
        }

        res.json({ success: true, data: profile });
    } catch (error) {
        console.error('Get payment profile error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch payment profile' } });
    }
});

// Get agent payment profile for specific agent (Checkout)
router.get('/payment-profile/:agentId', authenticateToken, async (req, res) => {
    try {
        const profile = await prisma.agentPaymentProfile.findUnique({
            where: { agentId: req.params.agentId }
        });

        if (!profile) {
            return res.status(404).json({ error: { message: 'Agent payment profile not found' } });
        }

        res.json({ success: true, data: profile });
    } catch (error) {
        console.error('Get specific payment profile error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch agent payment profile' } });
    }
});

// Create/update payment profile for current agent
router.post('/payment-profile', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'AGENT') {
            return res.status(403).json({ error: { message: 'Only agents can modify their payment profile' } });
        }
        if (!req.user.agent) {
            return res.status(400).json({ error: { message: 'Agent profile not found' } });
        }

        const { mobileMoneyNumbers, bankAccounts, lipaNumbers, qrCodeUrls, cashCollectionAvailable } = req.body;

        const profile = await prisma.agentPaymentProfile.upsert({
            where: { agentId: req.user.agent.id },
            update: {
                mobileMoneyNumbers: mobileMoneyNumbers || [],
                bankAccounts: bankAccounts || [],
                lipaNumbers: lipaNumbers || [],
                qrCodeUrls: qrCodeUrls || [],
                cashCollectionAvailable: cashCollectionAvailable !== undefined ? cashCollectionAvailable : true
            },
            create: {
                agentId: req.user.agent.id,
                mobileMoneyNumbers: mobileMoneyNumbers || [],
                bankAccounts: bankAccounts || [],
                lipaNumbers: lipaNumbers || [],
                qrCodeUrls: qrCodeUrls || [],
                cashCollectionAvailable: cashCollectionAvailable !== undefined ? cashCollectionAvailable : true,
                isVerified: true
            }
        });

        res.json({ success: true, data: profile });
    } catch (error) {
        console.error('Save payment profile error:', error);
        res.status(500).json({ error: { message: 'Failed to save payment profile' } });
    }
});

export default router;
