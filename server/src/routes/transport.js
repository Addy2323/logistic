import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all transport methods
router.get('/', async (req, res) => {
    try {
        const methods = await prisma.transportMethod.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        });

        res.json({ success: true, data: methods });
    } catch (error) {
        console.error('Get transport methods error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch transport methods' } });
    }
});

// Create transport method (Admin only)
router.post('/', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { name, description, basePrice, pricePerKm, pricePerKg, icon } = req.body;

        if (!name || basePrice === undefined) {
            return res.status(400).json({
                error: { message: 'Name and base price are required' }
            });
        }

        const method = await prisma.transportMethod.create({
            data: {
                name,
                description,
                basePrice: parseFloat(basePrice),
                pricePerKm: pricePerKm ? parseFloat(pricePerKm) : null,
                pricePerKg: pricePerKg ? parseFloat(pricePerKg) : null,
                icon
            }
        });

        res.status(201).json({ success: true, data: method });
    } catch (error) {
        console.error('Create transport method error:', error);
        res.status(500).json({ error: { message: 'Failed to create transport method' } });
    }
});

// Update transport method (Admin only)
router.patch('/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { name, description, basePrice, pricePerKm, pricePerKg, icon, isActive } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (basePrice !== undefined) updateData.basePrice = parseFloat(basePrice);
        if (pricePerKm !== undefined) updateData.pricePerKm = pricePerKm ? parseFloat(pricePerKm) : null;
        if (pricePerKg !== undefined) updateData.pricePerKg = pricePerKg ? parseFloat(pricePerKg) : null;
        if (icon !== undefined) updateData.icon = icon;
        if (isActive !== undefined) updateData.isActive = isActive;

        const method = await prisma.transportMethod.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json({ success: true, data: method });
    } catch (error) {
        console.error('Update transport method error:', error);
        res.status(500).json({ error: { message: 'Failed to update transport method' } });
    }
});

// Delete transport method (Admin only)
router.delete('/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const method = await prisma.transportMethod.update({
            where: { id: req.params.id },
            data: { isActive: false }
        });

        res.json({ success: true, data: method });
    } catch (error) {
        console.error('Delete transport method error:', error);
        res.status(500).json({ error: { message: 'Failed to delete transport method' } });
    }
});

export default router;
