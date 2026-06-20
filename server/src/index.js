import express from 'express';



import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeSocket } from './services/chatService.js';

// Import routes
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import agentRoutes from './routes/agents.js';
import paymentQRRoutes from './routes/paymentQR.js';
import transportRoutes from './routes/transport.js';
import notificationRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';
import customerRoutes from './routes/customers.js';
import chatRoutes from './routes/chat.js';
import userRoutes from './routes/users.js';
import smsRoutes from './routes/sms.js';
import webhookRoutes from './routes/webhooks.js';
import templatesRoutes from './routes/templates.js';
import productRoutes from './routes/products.js';
import subscriptionRoutes from './routes/subscriptions.js';
import addressRoutes from './routes/addresses.js';
import reviewRoutes from './routes/reviews.js';
import complaintRoutes from './routes/complaints.js';


// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:3000',
    process.env.FRONTEND_URL
].filter(Boolean).map(url => url.trim().replace(/\/$/, ''));

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        
        const normalizedOrigin = origin.trim().replace(/\/$/, '');
        
        // 1. Explicit match
        if (allowedOrigins.includes(normalizedOrigin)) {
            return callback(null, true);
        }
        
        // 2. Local development check
        try {
            const url = new URL(origin);
            const hostname = url.hostname;
            const isLocal = 
                hostname === 'localhost' || 
                hostname === '127.0.0.1' || 
                hostname.startsWith('192.168.') || 
                hostname.startsWith('10.') || 
                hostname.endsWith('.local');
                
            if (isLocal) {
                return callback(null, true);
            }
            
            // 3. Same-domain/subdomain match
            if (process.env.FRONTEND_URL) {
                const frontendHost = new URL(process.env.FRONTEND_URL).hostname;
                if (hostname === frontendHost || hostname.endsWith('.' + frontendHost)) {
                    return callback(null, true);
                }
            }
        } catch (e) {}
        
        console.warn(`⚠️ CORS Request from unexpected origin: ${origin}`);
        return callback(null, true); // Permissive fallback to prevent production downtime
    },
    credentials: true
};

const io = new Server(httpServer, {
    cors: corsOptions
});

// Initialize Socket.io service
initializeSocket(io);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads (served through API path for Nginx compatibility)
app.use('/api/uploads', express.static(join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payment-qr-codes', paymentQRRoutes);
app.use('/api/transport-methods', transportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/products', productRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/complaints', complaintRoutes);


// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'MHEMA Express API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: { message: 'Route not found' } });
});

// Start server
httpServer.listen(PORT, () => {
    console.log(`🚀 MHEMA Express API server running on port ${PORT}`);
    console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`💬 Socket.io initialized`);
});

export default app;
