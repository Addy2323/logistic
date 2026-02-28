import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = join(__dirname, '../../uploads/avatars');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }

});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {

        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, jpg, png, webp) are allowed'));
    }
});

// Update profile details
router.patch('/profile', authenticateToken, async (req, res) => {
    try {
        const { fullName, phone } = req.body;
        const userId = req.user.id;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                fullName,
                phone
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                role: true,
                avatarUrl: true,
                agent: true
            }
        });

        res.json({ success: true, data: updatedUser });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: { message: 'Failed to update profile' } });
    }
});

// Upload avatar
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        console.log('📸 Avatar upload request from user:', req.user.id);
        if (!req.file) {
            console.error('❌ No file in request');
            return res.status(400).json({ error: { message: 'No file uploaded' } });
        }

        console.log('📁 File received:', req.file.filename);
        const userId = req.user.id;
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        // Update user with new avatar URL
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                role: true,
                avatarUrl: true
            }
        });

        console.log('✅ Avatar updated in DB for user:', userId);
        res.json({ success: true, data: updatedUser });
    } catch (error) {
        console.error('🔴 Avatar upload error:', error);
        res.status(500).json({ error: { message: 'Failed to upload avatar: ' + error.message } });
    }
});



export default router;
