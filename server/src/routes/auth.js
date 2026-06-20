import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { otpRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const prisma = new PrismaClient();

// ─── Helpers ───────────────────────────────────────────────────────

/** Generate a random 6-digit OTP */
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/** Format phone to 255XXXXXXXXX */
function normalizePhone(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '255' + cleaned.substring(1);
    else if (cleaned.length === 9) cleaned = '255' + cleaned;
    return cleaned;
}

// ─── POST /login ─────────────────────────────────────────────
// Direct login if user exists, otherwise send OTP for signup
router.post('/login', otpRateLimiter, async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                error: { message: 'Phone number is required' }
            });
        }

        const normalizedPhone = normalizePhone(phone);

        // Validate format (Tanzania: 255 + 9 digits)
        if (!/^255\d{9}$/.test(normalizedPhone)) {
            return res.status(400).json({
                error: { message: 'Invalid phone number format. Use 255XXXXXXXXX or 7XXXXXXXX' }
            });
        }

        // Find user by phone
        let user = await prisma.user.findUnique({
            where: { phone: normalizedPhone },
            include: { agent: true },
        });

        if (user && user.isPhoneVerified) {
            // ----- USER EXISTS & VERIFIED: DIRECT LOGIN -----
            if (user.status !== 'ACTIVE') {
                return res.status(403).json({
                    error: { message: 'Account is inactive or suspended' }
                });
            }

            const token = jwt.sign(
                { userId: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            console.log(`[AUTH] Direct login for existing user: ${user.id} (${normalizedPhone})`);
            return res.json({
                success: true,
                action: 'login',
                token,
                user: {
                    id: user.id,
                    email: user.email || null,
                    fullName: user.fullName || user.phone,
                    role: user.role,
                    phone: user.phone,
                    avatarUrl: user.avatarUrl,
                    agent: user.agent ? {
                        id: user.agent.id,
                        availabilityStatus: user.agent.availabilityStatus,
                        currentOrderCount: user.agent.currentOrderCount,
                        rating: user.agent.rating,
                    } : null,
                },
            });
        }

        // ----- UNVERIFIED USER / NEW SIGNUP DETAILS CHECK -----
        const { fullName } = req.body;

        if (!fullName) {
            console.log(`[AUTH] Registration details required for phone: ${normalizedPhone}`);
            return res.json({
                success: true,
                action: 'register_details_required',
                phone: normalizedPhone
            });
        }

        // Create or update unverified user record
        if (user) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { fullName: fullName.trim() },
                include: { agent: true }
            });
            console.log(`[AUTH] Updated name for unverified user: ${user.id} (${normalizedPhone})`);
        } else {
            user = await prisma.user.create({
                data: {
                    phone: normalizedPhone,
                    fullName: fullName.trim(),
                    isPhoneVerified: false,
                    role: 'CUSTOMER'
                },
                include: { agent: true }
            });
            console.log(`[AUTH] Created unverified user record: ${user.id} (${normalizedPhone})`);
        }

        // ----- SEND OTP FOR SIGNUP -----
        await prisma.otpCode.updateMany({
            where: { phone: normalizedPhone, verified: false },
            data: { verified: true } 
        });

        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await prisma.otpCode.create({
            data: {
                phone: normalizedPhone,
                code: otpCode,
                expiresAt,
            }
        });

        try {
            console.log(`[OTP] Sending OTP ${otpCode} to ${normalizedPhone}`);
            const smsService = (await import('../services/smsService.js')).default;
            await smsService.sendSms(
                normalizedPhone,
                `Your LotusRise Logistics verification code is: ${otpCode}. Valid for 5 minutes.`
            );
        } catch (smsError) {
            console.error('[OTP] Failed to send SMS:', smsError.message || smsError);
        }

        return res.json({
            success: true,
            action: 'require_otp',
            phone: normalizedPhone,
            message: 'OTP sent successfully for signup',
            expiresIn: 300,
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: { message: 'Authentication failed' } });
    }
});

// ─── POST /verify-otp ───────────────────────────────────────────
// Validate OTP → auto-create user → generate JWT session
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otpCode } = req.body;

        if (!phone || !otpCode) {
            return res.status(400).json({
                error: { message: 'Phone number and OTP code are required' }
            });
        }

        const normalizedPhone = normalizePhone(phone);

        const otpRecord = await prisma.otpCode.findFirst({
            where: {
                phone: normalizedPhone,
                code: otpCode,
                verified: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!otpRecord) {
            return res.status(400).json({
                error: { message: 'Invalid or expired OTP code' }
            });
        }

        await prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { verified: true },
        });

        // Update user status to verified
        let user = await prisma.user.findUnique({
            where: { phone: normalizedPhone },
            include: { agent: true }
        });

        if (user) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { isPhoneVerified: true },
                include: { agent: true }
            });
            console.log(`[AUTH] User verified via OTP: ${user.id} (${normalizedPhone})`);
        } else {
            // Fallback
            user = await prisma.user.create({
                data: {
                    phone: normalizedPhone,
                    isPhoneVerified: true,
                    role: 'CUSTOMER',
                },
                include: { agent: true },
            });
            console.log(`[AUTH] Created verified user (fallback): ${user.id} (${normalizedPhone})`);
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email || null,
                fullName: user.fullName || user.phone,
                role: user.role,
                phone: user.phone,
                avatarUrl: user.avatarUrl,
                agent: null,
            },
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: { message: 'OTP verification failed' } });
    }
});

// ─── POST /resend-otp ───────────────────────────────────────────
router.post('/resend-otp', otpRateLimiter, async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                error: { message: 'Phone number is required' }
            });
        }

        const normalizedPhone = normalizePhone(phone);

        if (!/^255\d{9}$/.test(normalizedPhone)) {
            return res.status(400).json({
                error: { message: 'Invalid phone number format' }
            });
        }

        await prisma.otpCode.updateMany({
            where: { phone: normalizedPhone, verified: false },
            data: { verified: true },
        });

        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await prisma.otpCode.create({
            data: {
                phone: normalizedPhone,
                code: otpCode,
                expiresAt,
            }
        });

        try {
            console.log(`[OTP-RESEND] Sending OTP ${otpCode} to ${normalizedPhone}`);
            const smsService = (await import('../services/smsService.js')).default;
            await smsService.sendSms(
                normalizedPhone,
                `Your LotusRise Logistics verification code is: ${otpCode}. Valid for 5 minutes.`
            );
        } catch (smsError) {
            console.error('[OTP-RESEND] Failed to send SMS:', smsError.message || smsError);
        }

        res.json({
            success: true,
            phone: normalizedPhone,
            message: 'OTP resent successfully',
            expiresIn: 300,
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ error: { message: 'Failed to resend OTP' } });
    }
});

// ─── POST /admin/login ──────────────────────────────────────────
// Dedicated Email + Password login for ADMIN role only
router.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: { message: 'Email and password are required' }
            });
        }

        const user = await prisma.user.findFirst({
            where: { email },
            include: { agent: true },
        });

        if (!user) {
            return res.status(401).json({
                error: { message: 'Invalid email or password' }
            });
        }

        if (user.role !== 'ADMIN') {
            return res.status(403).json({
                error: { message: 'Access denied. Administrator privileges required.' }
            });
        }

        if (user.status !== 'ACTIVE') {
            return res.status(403).json({
                error: { message: 'Account is inactive or suspended' }
            });
        }

        const bcrypt = (await import('bcryptjs')).default;
        const isValidPassword = await bcrypt.compare(password, user.password || '');
        if (!isValidPassword) {
            return res.status(401).json({
                error: { message: 'Invalid email or password' }
            });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        console.log(`[AUTH] Admin login successful: ${user.email}`);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName || user.phone,
                role: user.role,
                phone: user.phone,
                avatarUrl: user.avatarUrl,
                agent: null,
            },
        });
    } catch (error) {
        console.error('Admin Login error:', error);
        res.status(500).json({ error: { message: 'Authentication failed' } });
    }
});

export default router;
