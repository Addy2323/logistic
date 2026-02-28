import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: { message: 'Access token required' } });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
                agent: true
            }
        });

        if (!user || user.status !== 'ACTIVE') {
            return res.status(403).json({ error: { message: 'User not found or inactive' } });
        }

        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            agent: user.agent
        };


        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: { message: 'Invalid token' } });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: { message: 'Token expired' } });
        }
        return res.status(500).json({ error: { message: 'Authentication error' } });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: { message: 'Unauthorized' } });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: { message: 'Forbidden: Insufficient permissions' }
            });
        }

        next();
    };
};
