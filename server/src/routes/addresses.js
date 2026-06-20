import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all saved addresses for the current user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const addresses = await prisma.savedAddress.findMany({
            where: { customerId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: addresses });
    } catch (error) {
        console.error('Get saved addresses error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch saved addresses' } });
    }
});

// Create a new saved address
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, type, address, lat, lng, street, ward, district, region, country = 'Tanzania' } = req.body;

        if (!name || !address || lat === undefined || lng === undefined) {
            return res.status(400).json({ error: { message: 'Name, address, latitude, and longitude are required' } });
        }

        const newAddress = await prisma.savedAddress.create({
            data: {
                customerId: req.user.id,
                name,
                type: type || 'OTHER',
                address,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                street: street || null,
                ward: ward || null,
                district: district || null,
                region: region || null,
                country
            }
        });

        res.status(201).json({ success: true, data: newAddress });
    } catch (error) {
        console.error('Create saved address error:', error);
        res.status(500).json({ error: { message: 'Failed to save address' } });
    }
});

// Delete a saved address
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const address = await prisma.savedAddress.findUnique({
            where: { id: req.params.id }
        });

        if (!address) {
            return res.status(404).json({ error: { message: 'Address not found' } });
        }

        if (address.customerId !== req.user.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        await prisma.savedAddress.delete({
            where: { id: req.params.id }
        });

        res.json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
        console.error('Delete saved address error:', error);
        res.status(500).json({ error: { message: 'Failed to delete address' } });
    }
});

export default router;
