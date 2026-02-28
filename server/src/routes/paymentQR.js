import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { authenticateToken, authorize } from '../middleware/auth.js';
import fs from 'fs/promises';

const router = express.Router();
const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = join(__dirname, '../../uploads/qr-codes');
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${file.originalname.substring(file.originalname.lastIndexOf('.'))}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Get all active payment QR codes
router.get('/', async (req, res) => {
    try {
        const qrCodes = await prisma.paymentQRCode.findMany({
            where: { isActive: true },
            select: {
                id: true,
                provider: true,
                accountName: true,
                lipaNumber: true,
                qrCodeUrl: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: qrCodes });
    } catch (error) {
        console.error('Get QR codes error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch QR codes' } });
    }
});

// Upload new QR code (Admin only)
router.post('/', authenticateToken, authorize('ADMIN'), upload.single('qrCode'), async (req, res) => {
    try {
        const { provider, accountName, lipaNumber } = req.body;

        if (!provider || !accountName || !req.file) {
            return res.status(400).json({
                error: { message: 'Provider, account name, and QR code image are required' }
            });
        }

        // Validate provider
        const validProviders = ['M_PESA', 'TIGO_PESA', 'SELCOM', 'RIPA'];
        if (!validProviders.includes(provider)) {
            return res.status(400).json({
                error: { message: 'Invalid provider' }
            });
        }

        const qrCodeUrl = `/uploads/qr-codes/${req.file.filename}`;

        const qrCode = await prisma.paymentQRCode.create({
            data: {
                provider,
                accountName,
                lipaNumber,
                qrCodeUrl,
                uploadedBy: req.user.id
            }
        });

        res.status(201).json({ success: true, data: qrCode });
    } catch (error) {
        console.error('Upload QR code error:', error);
        res.status(500).json({ error: { message: 'Failed to upload QR code' } });
    }
});

// Deactivate QR code (Admin only)
router.delete('/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const qrCode = await prisma.paymentQRCode.update({
            where: { id: req.params.id },
            data: { isActive: false }
        });

        res.json({ success: true, data: qrCode });
    } catch (error) {
        console.error('Deactivate QR code error:', error);
        res.status(500).json({ error: { message: 'Failed to deactivate QR code' } });
    }
});

export default router;
