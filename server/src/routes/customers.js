import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticateToken, authorize } from '../middleware/auth.js';
import smsService from '../services/smsService.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Format phone number to Tanzania international format (255XXXXXXXXX)
 * @param {string} phone - Phone number in various formats
 * @returns {string} Phone number in format 255XXXXXXXXX
 */
function formatPhoneNumber(phone) {
    if (!phone) return null;

    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle different formats
    if (cleaned.startsWith('0')) {
        // Local format: 0712345678 -> 255712345678
        cleaned = '255' + cleaned.substring(1);
    } else if (cleaned.startsWith('255')) {
        // Already in international format
    } else if (cleaned.length === 9) {
        // Just the number without prefix: 712345678
        cleaned = '255' + cleaned;
    }

    return cleaned;
}

// Get all customers (Admin only)
router.get('/', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { search, status } = req.query;

        const where = {
            role: 'CUSTOMER'
        };

        if (status) {
            where.status = status.toUpperCase();
        }

        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } }
            ];
        }

        const customers = await prisma.user.findMany({
            where,
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                avatarUrl: true,
                status: true,
                createdAt: true,
                _count: {
                    select: { ordersAsCustomer: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map to match frontend expectations
        const formattedCustomers = customers.map(c => ({
            id: c.id,
            name: c.fullName,
            email: c.email,
            phone: c.phone || 'N/A',
            avatarUrl: c.avatarUrl,
            location: 'Tanzania', // Placeholder as location isn't on User model yet
            status: c.status.toLowerCase(),
            joinedAt: c.createdAt,
            ordersCount: c._count.ordersAsCustomer
        }));


        res.json({ success: true, data: formattedCustomers });
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch customers' } });
    }
});

// Delete customer (Admin only)
router.delete('/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if customer exists
        const customer = await prisma.user.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { ordersAsCustomer: true }
                }
            }
        });

        if (!customer) {
            return res.status(404).json({ error: { message: 'Customer not found' } });
        }

        if (customer.role !== 'CUSTOMER') {
            return res.status(400).json({ error: { message: 'User is not a customer' } });
        }

        // Check for associated orders
        if (customer._count.ordersAsCustomer > 0) {
            return res.status(400).json({
                error: { message: 'Cannot delete customer with existing orders. Deactivate them instead.' }
            });
        }

        await prisma.user.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({ error: { message: 'Failed to delete customer' } });
    }
});

// Create new customer (Admin only)
router.post('/', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { fullName, email, phone, password } = req.body;

        // Validate required fields
        if (!fullName || !email || !phone) {
            return res.status(400).json({
                error: { message: 'Full name, email, and phone are required' }
            });
        }

        // Format phone number with 255 prefix
        const formattedPhone = formatPhoneNumber(phone);

        if (!formattedPhone || formattedPhone.length !== 12) {
            return res.status(400).json({
                error: { message: 'Invalid phone number. Please enter a valid Tanzania phone number (e.g., 0712345678 or 255712345678)' }
            });
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({
                error: { message: 'A user with this email already exists' }
            });
        }

        // Check if phone already exists
        const existingPhone = await prisma.user.findFirst({
            where: { phone: formattedPhone }
        });

        if (existingPhone) {
            return res.status(400).json({
                error: { message: 'A user with this phone number already exists' }
            });
        }

        // Generate a default password if not provided
        const defaultPassword = password || 'Customer@123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const customer = await prisma.user.create({
            data: {
                fullName,
                email,
                phone: formattedPhone,
                password: hashedPassword,
                role: 'CUSTOMER',
                status: 'ACTIVE'
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                status: true,
                createdAt: true
            }
        });

        // Send welcome SMS with credentials
        const welcomeMessage = `Congratulations! You have been added successfully to MHEMA Express Logistics.

Your login credentials:
Username: ${email}
Password: ${defaultPassword}

Login here: https://mhemalogistics.co.tz/auth?mode=login

Thank you for joining us!`;

        try {
            await smsService.sendSms(formattedPhone, welcomeMessage);
            console.log(`Welcome SMS sent to new customer: ${formattedPhone}`);
        } catch (smsError) {
            console.error('Failed to send welcome SMS to customer:', smsError);
            // Don't fail the request if SMS fails
        }

        res.status(201).json({
            success: true,
            data: {
                id: customer.id,
                name: customer.fullName,
                email: customer.email,
                phone: customer.phone,
                location: 'Tanzania',
                status: customer.status.toLowerCase(),
                joinedAt: customer.createdAt,
                ordersCount: 0
            },
            message: 'Customer created successfully'
        });
    } catch (error) {
        console.error('Create customer error:', error);
        res.status(500).json({ error: { message: 'Failed to create customer' } });
    }
});

export default router;

