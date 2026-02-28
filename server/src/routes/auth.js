import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Helper to generate a 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName, phone, role = 'CUSTOMER' } = req.body;

        // Validation
        if (!email || !password || !fullName || !phone) {
            return res.status(400).json({
                error: { message: 'Email, password, name, and phone are required' }
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

        // Generate OTP and expiration (10 minutes)
        const otpCode = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
                phone,
                role: role === 'CUSTOMER' ? 'CUSTOMER' : 'CUSTOMER', // Only customers can self-register
                otpCode,
                otpExpiresAt,
                isPhoneVerified: false
            }
        });

        // Send OTP via SMS
        try {
            console.log(`[REGISTER] Sending OTP ${otpCode} to phone: ${phone}`);
            const smsService = (await import('../services/smsService.js')).default;
            const smsResult = await smsService.sendSms(
                phone,
                `Your MHEMA Express verification code is: ${otpCode}. Valid for 10 minutes.`
            );
            console.log(`[REGISTER] SMS result:`, JSON.stringify(smsResult));
        } catch (smsError) {
            console.error('[REGISTER] Failed to send OTP SMS:', smsError.message || smsError);
        }

        // Return requiresOtp flag and userId instead of token
        res.status(201).json({
            success: true,
            requiresOtp: true,
            userId: user.id,
            message: 'OTP sent to your phone'
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: { message: 'Registration failed' } });
    }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { userId, otpCode } = req.body;

        if (!userId || !otpCode) {
            return res.status(400).json({
                error: { message: 'User ID and OTP are required' }
            });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ error: { message: 'User not found' } });
        }

        if (user.isPhoneVerified) {
            return res.status(400).json({ error: { message: 'Phone already verified' } });
        }

        if (user.otpCode !== otpCode) {
            return res.status(400).json({ error: { message: 'Invalid OTP code' } });
        }

        if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
            return res.status(400).json({ error: { message: 'OTP code expired' } });
        }

        // Verify phone and clear OTP
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                isPhoneVerified: true,
                otpCode: null,
                otpExpiresAt: null
            }
        });

        // Generate token
        const token = jwt.sign(
            { userId: updatedUser.id, role: updatedUser.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            token,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                fullName: updatedUser.fullName,
                role: updatedUser.role,
                phone: updatedUser.phone,
                avatarUrl: updatedUser.avatarUrl
            }
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: { message: 'OTP verification failed' } });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: { message: 'Email and password are required' }
            });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: { agent: true }
        });

        if (!user) {
            return res.status(401).json({
                error: { message: 'Invalid email or password' }
            });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                error: { message: 'Invalid email or password' }
            });
        }

        // Check user status
        if (user.status !== 'ACTIVE') {
            return res.status(403).json({
                error: { message: 'Account is inactive or suspended' }
            });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                phone: user.phone,
                avatarUrl: user.avatarUrl,
                agent: user.agent ? {

                    id: user.agent.id,
                    availabilityStatus: user.agent.availabilityStatus,
                    currentOrderCount: user.agent.currentOrderCount,
                    rating: user.agent.rating
                } : null
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: { message: 'Login failed' } });
    }
});

export default router;
