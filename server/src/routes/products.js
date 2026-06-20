import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all products (Public - for directory listing or profiles)
router.get('/public', async (req, res) => {
    try {
        const { agentId, limit, search } = req.query;

        const where = {};
        if (agentId) {
            where.agentId = agentId;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        const products = await prisma.product.findMany({
            where,
            include: {
                agent: {
                    include: {
                        user: { select: { fullName: true, avatarUrl: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit ? parseInt(limit) : undefined
        });

        res.json({ success: true, data: products });
    } catch (error) {
        console.error('Get public products error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch public products' } });
    }
});

// Get products (Authenticated - for catalog manager)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const where = {};
        if (req.user.role === 'AGENT') {
            if (!req.user.agent) {
                return res.status(400).json({ error: { message: 'Agent profile not found' } });
            }
            where.agentId = req.user.agent.id;
        }

        const products = await prisma.product.findMany({
            where,
            include: {
                agent: {
                    include: {
                        user: { select: { fullName: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: products });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch products' } });
    }
});

// Create product (Admin or Agent)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, price, description, imageUrl, sourceLink, agentId } = req.body;

        if (!name || !price) {
            return res.status(400).json({ error: { message: 'Product name and price are required' } });
        }

        let finalAgentId = null;

        if (req.user.role === 'ADMIN') {
            if (!agentId) {
                return res.status(400).json({ error: { message: 'Agent ID is required for Admin to create products' } });
            }
            finalAgentId = agentId;
        } else if (req.user.role === 'AGENT') {
            if (!req.user.agent) {
                return res.status(400).json({ error: { message: 'Agent profile not found' } });
            }
            finalAgentId = req.user.agent.id;
        } else {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        // Generate slug from name
        const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().substring(8)}`;

        const product = await prisma.product.create({
            data: {
                name,
                slug,
                description,
                price: parseFloat(price),
                imageUrl,
                sourceLink,
                agentId: finalAgentId
            }
        });

        res.status(201).json({ success: true, data: product });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: { message: 'Failed to create product' } });
    }
});

// Delete product
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id }
        });

        if (!product) {
            return res.status(404).json({ error: { message: 'Product not found' } });
        }

        // Check permission: Admin can delete any, Agent can only delete their own
        if (req.user.role === 'AGENT') {
            if (!req.user.agent || product.agentId !== req.user.agent.id) {
                return res.status(403).json({ error: { message: 'Access denied' } });
            }
        } else if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        await prisma.product.delete({
            where: { id: req.params.id }
        });

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: { message: 'Failed to delete product' } });
    }
});

// Get public product details by slug
router.get('/slug/:slug', async (req, res) => {
    try {
        const product = await prisma.product.findUnique({
            where: { slug: req.params.slug },
            include: {
                agent: {
                    include: {
                        user: { select: { fullName: true, avatarUrl: true, phone: true } }
                    }
                }
            }
        });

        if (!product) {
            return res.status(404).json({ error: { message: 'Product not found' } });
        }

        res.json({ success: true, data: product });
    } catch (error) {
        console.error('Get product by slug error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch product details' } });
    }
});

// Get product details by ID (Authenticated)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
            include: {
                agent: {
                    include: {
                        user: { select: { fullName: true, avatarUrl: true, phone: true } }
                    }
                }
            }
        });

        if (!product) {
            return res.status(404).json({ error: { message: 'Product not found' } });
        }

        res.json({ success: true, data: product });
    } catch (error) {
        console.error('Get product by ID error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch product details' } });
    }
});

// Increment view count
router.post('/:slug/view', async (req, res) => {
    try {
        const product = await prisma.product.update({
            where: { slug: req.params.slug },
            data: { views: { increment: 1 } }
        });
        res.json({ success: true, data: { views: product.views } });
    } catch (error) {
        console.error('Increment product view error:', error);
        res.status(500).json({ error: { message: 'Failed to track view' } });
    }
});

// Increment click count
router.post('/:slug/click', async (req, res) => {
    try {
        const product = await prisma.product.update({
            where: { slug: req.params.slug },
            data: { clicks: { increment: 1 } }
        });
        res.json({ success: true, data: { clicks: product.clicks } });
    } catch (error) {
        console.error('Increment product click error:', error);
        res.status(500).json({ error: { message: 'Failed to track click' } });
    }
});

// Increment conversion count
router.post('/:slug/conversion', async (req, res) => {
    try {
        const product = await prisma.product.update({
            where: { slug: req.params.slug },
            data: { conversions: { increment: 1 } }
        });
        res.json({ success: true, data: { conversions: product.conversions } });
    } catch (error) {
        console.error('Increment product conversion error:', error);
        res.status(500).json({ error: { message: 'Failed to track conversion' } });
    }
});

export default router;
