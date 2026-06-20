import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';
import orderDistribution from '../services/orderDistribution.js';
import { v4 as uuidv4 } from 'uuid';
import { createOrderChat } from '../services/chatService.js';
import smsService from '../services/smsService.js';
import snippeService from '../services/snippeService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for product image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = join(__dirname, '../../uploads/products');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

// Configure multer for payment receipts
const receiptStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = join(__dirname, '../../uploads/receipts');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadReceipt = multer({
    storage: receiptStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp|pdf/;
        const mimetype = filetypes.test(file.mimetype) || file.mimetype === 'application/pdf';
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files (jpg, jpeg, png, webp) and PDFs are allowed!'));
    }
});

// Get all orders (with filters based on role)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build where clause based on user role
        let where = {};

        if (req.user.role === 'CUSTOMER') {
            where.customerId = req.user.id;
        } else if (req.user.role === 'AGENT' && req.user.agent) {
            where.agentId = req.user.agent.id;
        }

        if (status) {
            where.status = status;
        }

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    customer: {
                        select: { id: true, fullName: true, email: true, phone: true }
                    },
                    agent: {
                        include: {
                            user: { select: { fullName: true, phone: true } }
                        }
                    },
                    transportMethod: true
                },
                orderBy: { placedAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.order.count({ where })
        ]);

        res.json({
            success: true,
            data: orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch orders' } });
    }
});

// Get single order by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: {
                customer: {
                    select: { id: true, fullName: true, email: true, phone: true }
                },
                agent: {
                    include: {
                        user: { select: { fullName: true, phone: true } },
                        verifications: {
                            where: { status: 'APPROVED' },
                            orderBy: { createdAt: 'desc' },
                            take: 1
                        }
                    }
                },
                transportMethod: true,
                salesRecord: true,
                review: true,
                complaints: true
            }
        });

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        // Check permissions
        if (req.user.role === 'CUSTOMER' && order.customerId !== req.user.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        if (req.user.role === 'AGENT' && order.agentId !== req.user.agent?.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: { message: 'Failed to fetch order' } });
    }
});

// Upload product images (multiple)
router.post('/upload-image', authenticateToken, upload.array('productImages', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: { message: 'No files uploaded' } });
        }
        const productImageUrls = req.files.map(file => `/uploads/products/${file.filename}`);
        res.json({ success: true, data: { productImageUrls } });
    } catch (error) {
        console.error('Product image upload error:', error);
        res.status(500).json({ error: { message: 'Failed to upload product images' } });
    }
});

// Upload payment receipt (Customer only)
// POST /api/orders/:id/upload-receipt
router.post('/:id/upload-receipt', authenticateToken, uploadReceipt.single('receipt'), async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id }
        });

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        if (order.customerId !== req.user.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        if (!req.file) {
            return res.status(400).json({ error: { message: 'No file uploaded' } });
        }

        const receiptUrl = `/uploads/receipts/${req.file.filename}`;

        // Update order status to PENDING and save the receipt url
        const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: {
                paymentStatus: 'PENDING',
                paymentReceiptUrl: receiptUrl
            }
        });

        // Create notification for the agent if assigned
        if (order.agentId) {
            const agent = await prisma.agent.findUnique({
                where: { id: order.agentId }
            });
            if (agent) {
                await prisma.notification.create({
                    data: {
                        userId: agent.userId,
                        type: 'PAYMENT_CONFIRMED',
                        title: 'Payment Receipt Uploaded',
                        message: `Customer uploaded a payment receipt for order #${order.orderNumber}. Please verify the receipt and confirm the payment.`,
                        relatedOrderId: order.id
                    }
                });
            }
        }

        res.json({
            success: true,
            data: {
                paymentReceiptUrl: receiptUrl,
                paymentStatus: updatedOrder.paymentStatus
            }
        });
    } catch (error) {
        console.error('Upload receipt error:', error);
        res.status(500).json({ error: { message: error.message || 'Failed to upload receipt' } });
    }
});

// Create new order
router.post('/', authenticateToken, async (req, res) => {
    try {
        let {
            pickupAddress,
            pickupLat,
            pickupLng,
            deliveryAddress,
            deliveryLat,
            deliveryLng,
            transportMethodId,
            description,
            packageWeight,
            productImageUrls,
            orderType,
            productPrice,
            agentId,
            productId
        } = req.body;

        // Sanitize transportMethodId: convert empty string to null
        if (transportMethodId === "" || transportMethodId === "null" || transportMethodId === undefined) {
            transportMethodId = null;
        }

        // Validate UUID format if not null
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (transportMethodId && !uuidRegex.test(transportMethodId)) {
            transportMethodId = null;
        }

        // Validation
        if (!pickupAddress || !deliveryAddress) {
            return res.status(400).json({
                error: { message: 'Pickup and delivery addresses are required' }
            });
        }

        // Validate and set order type (default to TYPE_A)
        const validOrderTypes = ['TYPE_A', 'TYPE_B', 'TYPE_C'];
        if (!orderType || !validOrderTypes.includes(orderType)) {
            orderType = 'TYPE_A';
        }

        // Order type-specific validation
        if (orderType === 'TYPE_B') {
            if (!productPrice || isNaN(parseFloat(productPrice)) || parseFloat(productPrice) <= 0) {
                return res.status(400).json({
                    error: { message: 'Product price is required for Type B orders' }
                });
            }
        }

        // Check selected agent if any
        let selectedAgent = null;
        if (agentId) {
            selectedAgent = await prisma.agent.findUnique({
                where: { id: agentId },
                include: {
                    user: true,
                    subscriptions: {
                        where: {
                            status: 'ACTIVE',
                            endDate: { gte: new Date() }
                        }
                    }
                }
            });
            if (!selectedAgent) {
                return res.status(400).json({
                    error: { message: 'The selected sourcing agent does not exist' }
                });
            }
            if (selectedAgent.subscriptions.length === 0) {
                return res.status(400).json({
                    error: { message: 'The selected agent does not have an active subscription and cannot accept orders.' }
                });
            }
        }

        // Set estimated cost to null (will be set by agent later)
        let estimatedCost = null;

        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${uuidv4().substring(0, 4).toUpperCase()}`;
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Admin can create order on behalf of customer
        let finalCustomerId = req.user.id;
        if (req.user.role === 'ADMIN' && req.body.customerId) {
            const targetCustomer = await prisma.user.findUnique({
                where: { id: req.body.customerId, role: 'CUSTOMER' }
            });
            if (targetCustomer) {
                finalCustomerId = req.body.customerId;
            } else {
                return res.status(400).json({
                    error: { message: 'Invalid customer ID provided' }
                });
            }
        }

        // Create order
        const order = await prisma.order.create({
            data: {
                customerId: finalCustomerId,
                orderNumber,
                orderType,
                pickupAddress,
                pickupLat: (pickupLat !== undefined && pickupLat !== null && pickupLat !== '' && !isNaN(pickupLat)) ? parseFloat(pickupLat) : null,
                pickupLng: (pickupLng !== undefined && pickupLng !== null && pickupLng !== '' && !isNaN(pickupLng)) ? parseFloat(pickupLng) : null,
                deliveryAddress,
                deliveryLat: (deliveryLat !== undefined && deliveryLat !== null && deliveryLat !== '' && !isNaN(deliveryLat)) ? parseFloat(deliveryLat) : null,
                deliveryLng: (deliveryLng !== undefined && deliveryLng !== null && deliveryLng !== '' && !isNaN(deliveryLng)) ? parseFloat(deliveryLng) : null,
                transportMethodId,
                description,
                packageWeight: (packageWeight !== undefined && packageWeight !== null && !isNaN(packageWeight)) ? parseFloat(packageWeight) : null,
                estimatedCost,
                productPrice: (productPrice !== undefined && productPrice !== null && !isNaN(productPrice)) ? parseFloat(productPrice) : null,
                productImageUrls: Array.isArray(productImageUrls) ? productImageUrls : (productImageUrls ? [productImageUrls] : []),
                verificationCode,
                productId: productId || null,
                agentId: selectedAgent ? selectedAgent.id : null,
                status: selectedAgent ? 'AGENT_ASSIGNED' : 'REQUEST_SUBMITTED'
            },
            include: {
                customer: {
                    select: { fullName: true, phone: true }
                },
                transportMethod: true
            }
        });

        // Automatically assign order to agent or use pre-selected agent
        let assignment = { agentId: selectedAgent ? selectedAgent.id : null, agentUserId: selectedAgent ? selectedAgent.userId : null, queued: false };
        try {
            if (selectedAgent) {
                // Pre-selected agent chat initialization
                await createOrderChat(order.id, finalCustomerId, selectedAgent.userId);

                // Notifications
                await prisma.notification.create({
                    data: {
                        userId: selectedAgent.userId,
                        type: 'ORDER_ASSIGNED',
                        title: 'New Sourcing Order Assigned',
                        message: `Customer ${order.customer.fullName} selected you for order #${orderNumber}`,
                        relatedOrderId: order.id
                    }
                });

                if (selectedAgent.user.phone) {
                    const smsMessage = `New Sourcing Order Assigned\nOrder ID: ${orderNumber}\nPickup: ${pickupAddress}\nDelivery: ${deliveryAddress}\nPlease login to LotusRise.`;
                    await smsService.sendSms(selectedAgent.user.phone, smsMessage);
                }
            } else {
                // Auto-assignment queue
                assignment = await orderDistribution.assignOrder(order.id);
                await createOrderChat(order.id, finalCustomerId, assignment?.agentUserId);
            }
        } catch (assignError) {
            console.error('Order assignment/chat failed, but order was created:', assignError);
        }

        // Check for high-value order (> 1,000,000 TZS)
        if (order.estimatedCost > 1000000) {
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN' },
                select: { id: true }
            });

            const notificationData = admins.map(admin => ({
                userId: admin.id,
                type: 'ADMIN_ALERT',
                title: 'High Value Order Alert',
                message: `New high-value order #${orderNumber} placed. Value: TZS ${order.estimatedCost.toLocaleString()}`,
                relatedOrderId: order.id
            }));

            if (assignment?.agentUserId) {
                notificationData.push({
                    userId: assignment.agentUserId,
                    type: 'ADMIN_ALERT',
                    title: 'High Value Order Alert',
                    message: `New high-value order #${orderNumber} assigned to you. Value: TZS ${order.estimatedCost.toLocaleString()}`,
                    relatedOrderId: order.id
                });
            }

            if (notificationData.length > 0) {
                await prisma.notification.createMany({
                    data: notificationData
                });
            }
        }

        // Fetch updated order with agent info
        const updatedOrder = await prisma.order.findUnique({
            where: { id: order.id },
            include: {
                customer: {
                    select: { fullName: true, phone: true }
                },
                agent: {
                    include: {
                        user: { select: { fullName: true, phone: true } }
                    }
                },
                transportMethod: true
            }
        });

        res.status(201).json({
            success: true,
            data: updatedOrder,
            assignment: {
                agentId: assignment?.agentId,
                queued: assignment?.queued
            }
        });
    } catch (error) {
        console.error('Create order error details:', error);
        res.status(500).json({ error: { message: 'Failed to create order: ' + error.message } });
    }
});

// Update order status (Agent/Admin only)
router.patch('/:id/status', authenticateToken, authorize('AGENT', 'ADMIN'), async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = [
            'REQUEST_SUBMITTED',
            'AGENT_ASSIGNED',
            'PRODUCT_SOURCING',
            'PRODUCT_PURCHASED',
            'PRODUCT_PACKED',
            'READY_FOR_DELIVERY',
            'DRIVER_ASSIGNED',
            'OUT_FOR_DELIVERY',
            'DRIVER_ARRIVED',
            'DELIVERED_SUCCESSFULLY',
            'CANCELLED'
        ];

        console.log(`[Order Status Update] Order ID: ${req.params.id}, New Status: ${status}, User: ${req.user.email} (${req.user.role})`);

        if (!validStatuses.includes(status)) {
            console.error(`[Order Status Update] Invalid status received: ${status}`);
            return res.status(400).json({
                error: { message: 'Invalid status' }
            });
        }

        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: { agent: true }
        });

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        // Check if agent owns this order
        if (req.user.role === 'AGENT' && order.agentId !== req.user.agent?.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        // Check verification code if updating to DELIVERED_SUCCESSFULLY
        if (status === 'DELIVERED_SUCCESSFULLY') {
            const { verificationCode: reqCode } = req.body;
            if (order.verificationCode) {
                if (!reqCode) {
                    return res.status(400).json({ error: { message: 'Customer delivery verification code is required to complete delivery' } });
                }
                if (order.verificationCode !== String(reqCode).trim()) {
                    return res.status(400).json({ error: { message: 'Invalid delivery verification code. Please request the correct code from the customer.' } });
                }
            }
        }

        // Update with timestamp
        const updateData = { status };
        const now = new Date();

        if (status === 'AGENT_ASSIGNED') {
            updateData.assignedAt = now;
        } else if (status === 'DELIVERED_SUCCESSFULLY') {
            updateData.deliveredAt = now;
            updateData.completedAt = now;
        }

        const updatedOrder = await prisma.order.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                customer: { select: { fullName: true, phone: true } },
                agent: { include: { user: { select: { fullName: true } } } }
            }
        });

        // Handle agent stats and accounting for final statuses
        if (['DELIVERED_SUCCESSFULLY', 'CANCELLED'].includes(status) && !['DELIVERED_SUCCESSFULLY', 'CANCELLED'].includes(order.status)) {
            if (order.agentId) {
                await prisma.agent.update({
                    where: { id: order.agentId },
                    data: { currentOrderCount: { decrement: 1 } }
                });

                // If DELIVERED_SUCCESSFULLY, also update totalDeliveries and handle accounting if needed
                if (status === 'DELIVERED_SUCCESSFULLY') {
                    await prisma.agent.update({
                        where: { id: order.agentId },
                        data: { totalDeliveries: { increment: 1 } }
                    });

                    // If payment not confirmed and we have actualCost, perform accounting
                    if (order.paymentStatus === 'AWAITING_PAYMENT' && (order.actualCost || updateData.actualCost)) {
                        const finalAmount = updateData.actualCost || parseFloat(order.actualCost.toString());
                        const commissionRate = parseFloat(order.agent?.commissionRate || 10);
                        const agentCommission = finalAmount * (commissionRate / 100);
                        const profit = finalAmount - agentCommission;

                        // Update order payment status
                        await prisma.order.update({
                            where: { id: req.params.id },
                            data: {
                                paymentStatus: 'CONFIRMED',
                                paymentMethod: 'CASH',
                                paymentConfirmedAt: new Date(),
                                paymentConfirmedBy: req.user.id
                            }
                        });

                        // Create sales record
                        await prisma.salesRecord.create({
                            data: {
                                orderId: order.id,
                                agentId: order.agentId,
                                amount: finalAmount,
                                agentCommission,
                                profit
                            }
                        });

                        // Update agent earnings
                        await prisma.agent.update({
                            where: { id: order.agentId },
                            data: { totalEarnings: { increment: agentCommission } }
                        });
                    }
                }
            }
        } else if (!['DELIVERED_SUCCESSFULLY', 'CANCELLED'].includes(status) && ['DELIVERED_SUCCESSFULLY', 'CANCELLED'].includes(order.status)) {
            // Moving back from final to active status
            if (order.agentId) {
                await prisma.agent.update({
                    where: { id: order.agentId },
                    data: { currentOrderCount: { increment: 1 } }
                });

                if (order.status === 'DELIVERED_SUCCESSFULLY') {
                    await prisma.agent.update({
                        where: { id: order.agentId },
                        data: { totalDeliveries: { decrement: 1 } }
                    });
                }
            }
        }

        // Create notification for customer
        await prisma.notification.create({
            data: {
                userId: order.customerId,
                type: 'STATUS_UPDATE',
                title: 'Order Status Updated',
                message: `Your order #${order.orderNumber} is now ${status.toLowerCase().replace('_', ' ')}`,
                relatedOrderId: order.id
            }
        });

        // Send SMS to customer when order is out for delivery
        if (status === 'OUT_FOR_DELIVERY') {
            try {
                const latestAssignment = await prisma.driverAssignment.findFirst({
                    where: { orderId: req.params.id },
                    orderBy: { assignedAt: 'desc' }
                });

                if (latestAssignment) {
                    const smsMessage = `Hello ${updatedOrder.customer.fullName || 'Customer'}, your order ${order.orderNumber} is Out for Delivery!\n\nDriver: ${latestAssignment.driverName} (${latestAssignment.driverPhone})\nVehicle: ${latestAssignment.vehiclePlateNumber} (${latestAssignment.vehicleType})\nCustomer Phone: ${updatedOrder.customer.phone}\n\nThank you for choosing LotusRise Logistics.`;
                    
                    await smsService.sendSms(updatedOrder.customer.phone, smsMessage);
                    console.log(`Out for delivery SMS sent to customer: ${updatedOrder.customer.phone}`);
                } else {
                    console.warn(`[SMS OUT_FOR_DELIVERY] No driver assignment found for order ${order.orderNumber}`);
                }
            } catch (smsError) {
                console.error('SMS out for delivery notification failed:', smsError.message || smsError);
            }
        }

        // Send SMS to customer when order is completed
        if (status === 'DELIVERED_SUCCESSFULLY') {
            try {
                await smsService.sendOrderCompletionSms(updatedOrder.customer, order);
            } catch (smsError) {
                console.error('SMS notification failed (non-blocking):', smsError.message);
            }
        }

        res.json({ success: true, data: updatedOrder });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: { message: 'Failed to update status' } });
    }
});

// Update order details (Agent/Admin only)
router.patch('/:id', authenticateToken, authorize('AGENT', 'ADMIN'), async (req, res) => {
    try {
        const {
            actualCost,
            estimatedCost,
            packageWeight,
            description,
            productPrice,
            agentMargin,
            pickupFee,
            packingFee,
            transportFee
        } = req.body;

        const order = await prisma.order.findUnique({
            where: { id: req.params.id }
        });

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        // Check if agent owns this order
        if (req.user.role === 'AGENT' && order.agentId !== req.user.agent?.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        const updateData = {};
        if (actualCost !== undefined) updateData.actualCost = parseFloat(actualCost);
        if (estimatedCost !== undefined) updateData.estimatedCost = parseFloat(estimatedCost);
        if (packageWeight !== undefined) updateData.packageWeight = parseFloat(packageWeight);
        if (description !== undefined) updateData.description = description;

        // Pricing fields (set by agent during verification)
        if (productPrice !== undefined) updateData.productPrice = parseFloat(productPrice);
        if (agentMargin !== undefined) updateData.agentMargin = parseFloat(agentMargin);
        if (pickupFee !== undefined) updateData.pickupFee = parseFloat(pickupFee);
        if (packingFee !== undefined) updateData.packingFee = parseFloat(packingFee);
        if (transportFee !== undefined) updateData.transportFee = parseFloat(transportFee);

        // Auto-calculate totalAmount based on order type
        // TYPE_A: Pickup + Packing + Transport
        // TYPE_B: Product Price + Pickup + Packing + Transport  
        // TYPE_C: Product Price + Agent Margin + Pickup + Packing + Transport
        const finalProductPrice = updateData.productPrice ?? (order.productPrice ? parseFloat(order.productPrice.toString()) : 0);
        const finalAgentMargin = updateData.agentMargin ?? (order.agentMargin ? parseFloat(order.agentMargin.toString()) : 0);
        const finalPickupFee = updateData.pickupFee ?? (order.pickupFee ? parseFloat(order.pickupFee.toString()) : 0);
        const finalPackingFee = updateData.packingFee ?? (order.packingFee ? parseFloat(order.packingFee.toString()) : 0);
        const finalTransportFee = updateData.transportFee ?? (order.transportFee ? parseFloat(order.transportFee.toString()) : 0);

        let totalAmount = 0;
        if (order.orderType === 'TYPE_A') {
            totalAmount = finalPickupFee + finalPackingFee + finalTransportFee;
        } else if (order.orderType === 'TYPE_B') {
            totalAmount = finalProductPrice + finalPickupFee + finalPackingFee + finalTransportFee;
        } else if (order.orderType === 'TYPE_C') {
            totalAmount = finalProductPrice + finalAgentMargin + finalPickupFee + finalPackingFee + finalTransportFee;
        }

        if (totalAmount > 0) {
            updateData.totalAmount = totalAmount;
            // Also update actualCost for compatibility with existing payment flow
            updateData.actualCost = totalAmount;
        }

        const updatedOrder = await prisma.order.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                customer: { select: { fullName: true, phone: true } },
                agent: { include: { user: { select: { fullName: true } } } },
                transportMethod: true
            }
        });

        res.json({ success: true, data: updatedOrder });
    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({ error: { message: 'Failed to update order' } });
    }
});

// Dispute payment (Customer only)
router.patch('/:id/dispute-payment', authenticateToken, async (req, res) => {
    try {
        const { reason, category } = req.body;
        if (!reason) {
            return res.status(400).json({ error: { message: 'Reason for dispute is required' } });
        }

        const order = await prisma.order.findUnique({
            where: { id: req.params.id }
        });

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        if (order.customerId !== req.user.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        const updatedOrder = await prisma.order.update({
            where: { id: req.params.id },
            data: {
                paymentStatus: 'DISPUTED'
            },
            include: {
                customer: { select: { fullName: true, phone: true } },
                agent: { include: { user: { select: { fullName: true } } } },
                transportMethod: true
            }
        });

        await prisma.complaint.create({
            data: {
                orderId: order.id,
                customerId: req.user.id,
                agentId: order.agentId,
                category: category || 'DELIVERY_ISSUES',
                description: `Payment marked as DISPUTED by customer. Reason: ${reason}`,
                status: 'PENDING'
            }
        });

        res.json({ success: true, data: updatedOrder });
    } catch (error) {
        console.error('Dispute payment error:', error);
        res.status(500).json({ error: { message: 'Failed to dispute payment' } });
    }
});

// Confirm payment (Agent/Admin only)
router.patch('/:id/payment', authenticateToken, authorize('AGENT', 'ADMIN'), async (req, res) => {
    try {
        const { paymentMethod, amount } = req.body;

        if (!paymentMethod || !amount) {
            return res.status(400).json({
                error: { message: 'Payment method and amount are required' }
            });
        }

        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: { agent: true }
        });

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        // Update order payment status
        const updatedOrder = await prisma.order.update({
            where: { id: req.params.id },
            data: {
                paymentStatus: 'CONFIRMED',
                paymentMethod,
                actualCost: parseFloat(amount),
                paymentConfirmedAt: new Date(),
                paymentConfirmedBy: req.user.id,
                status: 'COMPLETED',
                completedAt: new Date()
            },
            include: {
                customer: { select: { fullName: true, phone: true } }
            }
        });

        // Create sales record
        const agentCommission = parseFloat(amount) * (parseFloat(order.agent.commissionRate) / 100);
        const profit = parseFloat(amount) - agentCommission;

        await prisma.salesRecord.create({
            data: {
                orderId: order.id,
                agentId: order.agentId,
                amount: parseFloat(amount),
                agentCommission,
                profit
            }
        });

        // Update agent stats
        await prisma.agent.update({
            where: { id: order.agentId },
            data: {
                totalEarnings: {
                    increment: agentCommission
                },
                totalDeliveries: {
                    increment: 1
                },
                currentOrderCount: {
                    decrement: 1
                }
            }
        });

        // Create notifications
        await prisma.notification.create({
            data: {
                userId: order.customerId,
                type: 'PAYMENT_CONFIRMED',
                title: 'Payment Confirmed',
                message: `Payment for order #${order.orderNumber} has been confirmed`,
                relatedOrderId: order.id
            }
        });

        // Send SMS to customer when order is completed via payment confirmation
        try {
            await smsService.sendOrderCompletionSms(updatedOrder.customer, order);
        } catch (smsError) {
            console.error('SMS notification failed (non-blocking):', smsError.message);
            // Don't throw - SMS failure shouldn't block payment confirmation
        }

        // Process queue after agent completes order
        await orderDistribution.processQueue();

        res.json({ success: true, data: updatedOrder });
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({ error: { message: 'Failed to confirm payment' } });
    }
});

// Customer notifies that they have made payment
router.post('/:id/payment-done', authenticateToken, async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: {
                customer: {
                    select: { fullName: true, phone: true }
                },
                agent: {
                    include: {
                        user: { select: { id: true, fullName: true } }
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        // Verify that the requester is the customer who made the order
        if (order.customerId !== req.user.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        const notificationMessage = `Customer ${order.customer.fullName} claims to have paid for Order #${order.orderNumber}. Awaiting agent confirmation.`;

        // Create notification for agent
        if (order.agent) {
            await prisma.notification.create({
                data: {
                    userId: order.agent.user.id,
                    type: 'PAYMENT_CONFIRMED',
                    title: 'Customer Claims Payment Made',
                    message: notificationMessage,
                    relatedOrderId: order.id
                }
            });
        }

        // Also notify admin
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' }
        });

        for (const admin of admins) {
            await prisma.notification.create({
                data: {
                    userId: admin.id,
                    type: 'PAYMENT_CONFIRMED',
                    title: 'Customer Claims Payment Made',
                    message: notificationMessage,
                    relatedOrderId: order.id
                }
            });
        }

        console.log(`Customer ${order.customer.fullName} notified payment done for order ${order.orderNumber}`);

        res.json({
            success: true,
            message: 'Agent has been notified of your payment'
        });
    } catch (error) {
        console.error('Payment done notification error:', error);
        res.status(500).json({ error: { message: 'Failed to notify agent' } });
    }
});

// Initiate STK push payment via Snippe (Customer only)
router.post('/:id/stk-push', authenticateToken, async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: {
                customer: {
                    select: { id: true, fullName: true, phone: true, email: true }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        if (order.customerId !== req.user.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        if (!order.actualCost || parseFloat(order.actualCost) <= 0) {
            return res.status(400).json({ error: { message: 'Order cost has not been set yet' } });
        }

        if (order.paymentStatus === 'CONFIRMED') {
            return res.status(400).json({ error: { message: 'This order has already been paid' } });
        }

        const customer = order.customer;
        const nameParts = (customer.fullName || 'Customer').trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || nameParts[0];

        if (!customer.phone) {
            return res.status(400).json({ error: { message: 'Your account does not have a phone number. Please update your profile first.' } });
        }

        const idempotencyKey = `order-${order.id}-${Date.now()}`;

        const snippePayment = await snippeService.initiateSTKPush({
            amount: parseFloat(order.actualCost),
            phone: customer.phone,
            firstName,
            lastName,
            email: customer.email,
            orderId: order.id,
            orderNumber: order.orderNumber,
            idempotencyKey
        });

        // Store the Snippe payment reference on the order for webhook matching
        await prisma.order.update({
            where: { id: order.id },
            data: { snippeReference: snippePayment.reference }
        });

        res.json({
            success: true,
            data: {
                reference: snippePayment.reference,
                status: snippePayment.status,
                message: 'STK push sent to your phone. Please check your phone and enter your PIN to complete payment.'
            }
        });
    } catch (error) {
        console.error('STK push error:', error);
        res.status(500).json({ error: { message: error.message || 'Failed to initiate payment' } });
    }
});

// Check STK push payment status (Customer only)
// Accepts ?reference=<snippe_reference> to poll a specific payment
router.get('/:id/stk-status', authenticateToken, async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            select: { id: true, customerId: true, paymentStatus: true, snippeReference: true }
        });

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        if (order.customerId !== req.user.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        // If order already confirmed in DB, return immediately
        if (order.paymentStatus === 'CONFIRMED') {
            return res.json({ success: true, data: { status: 'completed', paymentStatus: 'CONFIRMED' } });
        }

        // Use reference from query param (fresh push) or fall back to stored one
        const reference = req.query.reference || order.snippeReference;

        if (!reference) {
            return res.json({ success: true, data: { status: 'no_payment_initiated' } });
        }

        const snippeStatus = await snippeService.getPaymentStatus(reference);

        // If completed via polling (no webhook), confirm the order now
        if (snippeStatus.status === 'completed' && order.paymentStatus !== 'CONFIRMED') {
            const updatedOrder = await prisma.order.update({
                where: { id: order.id },
                data: {
                    paymentStatus: 'CONFIRMED',
                    paymentMethod: 'MOBILE_MONEY',
                    actualCost: snippeStatus.amount?.value ? parseFloat(snippeStatus.amount.value) : undefined,
                    paymentConfirmedAt: new Date(),
                    status: 'COMPLETED',
                    completedAt: new Date()
                },
                include: {
                    agent: true,
                    customer: { select: { fullName: true, phone: true } }
                }
            });

            // Create sales record if agent assigned
            if (updatedOrder.agent) {
                const amount = parseFloat(updatedOrder.actualCost);
                const agentCommission = amount * (parseFloat(updatedOrder.agent.commissionRate) / 100);
                await prisma.salesRecord.create({
                    data: {
                        orderId: order.id,
                        agentId: updatedOrder.agentId,
                        amount,
                        agentCommission,
                        profit: amount - agentCommission
                    }
                }).catch(() => {}); // ignore if already exists

                await prisma.agent.update({
                    where: { id: updatedOrder.agentId },
                    data: {
                        totalEarnings: { increment: amount * (parseFloat(updatedOrder.agent.commissionRate) / 100) },
                        totalDeliveries: { increment: 1 },
                        currentOrderCount: { decrement: 1 }
                    }
                }).catch(() => {});
            }

            await prisma.notification.create({
                data: {
                    userId: order.customerId,
                    type: 'PAYMENT_CONFIRMED',
                    title: 'Payment Confirmed',
                    message: `Your payment for order #${order.id} has been confirmed.`,
                    relatedOrderId: order.id
                }
            }).catch(() => {});

            await orderDistribution.processQueue().catch(() => {});
        }

        res.json({
            success: true,
            data: {
                status: snippeStatus.status,
                paymentStatus: snippeStatus.status === 'completed' ? 'CONFIRMED' : order.paymentStatus
            }
        });
    } catch (error) {
        console.error('STK status check error:', error);
        // Return pending on error so frontend keeps polling
        res.json({ success: true, data: { status: 'pending', paymentStatus: 'AWAITING_PAYMENT' } });
    }
});

// Reassign order (Admin only)
router.patch('/:id/assign', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const { agentId, reason } = req.body;

        if (!agentId) {
            return res.status(400).json({
                error: { message: 'Agent ID is required' }
            });
        }

        const [order, agent] = await Promise.all([
            prisma.order.findUnique({ where: { id: req.params.id } }),
            prisma.agent.findUnique({ where: { id: agentId }, include: { user: true } })
        ]);

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        if (!agent) {
            return res.status(404).json({ error: { message: 'Agent not found' } });
        }

        // Decrement old agent's count if exists
        if (order.agentId) {
            await prisma.agent.update({
                where: { id: order.agentId },
                data: { currentOrderCount: { decrement: 1 } }
            });
        }

        // Update order
        const updatedOrder = await prisma.order.update({
            where: { id: req.params.id },
            data: {
                agentId,
                status: 'ASSIGNED',
                assignedAt: new Date()
            },
            include: {
                customer: { select: { fullName: true } },
                agent: { include: { user: { select: { fullName: true } } } }
            }
        });

        // Increment new agent's count
        await prisma.agent.update({
            where: { id: agentId },
            data: { currentOrderCount: { increment: 1 } }
        });

        // Notify new agent
        await prisma.notification.create({
            data: {
                userId: agent.userId,
                type: 'ORDER_ASSIGNED',
                title: 'Order Reassigned to You',
                message: `Order #${order.orderNumber} has been reassigned to you${reason ? `: ${reason}` : ''}`,
                relatedOrderId: order.id
            }
        });

        // Ensure new agent is in the chat room
        const chatRoom = await prisma.chatRoom.findFirst({
            where: { orderId: order.id }
        });

        if (chatRoom) {
            await prisma.chatParticipant.upsert({
                where: {
                    chatId_userId: {
                        chatId: chatRoom.id,
                        userId: agent.userId
                    }
                },
                create: {
                    chatId: chatRoom.id,
                    userId: agent.userId
                },
                update: {}
            });
        }

        res.json({ success: true, data: updatedOrder });

    } catch (error) {
        console.error('Reassign order error:', error);
        res.status(500).json({ error: { message: 'Failed to reassign order' } });
    }
});

// Verify order (Agent/Admin only)
router.patch('/:id/verify', authenticateToken, authorize('AGENT', 'ADMIN'), async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id }
        });

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        // Check if agent owns this order
        if (req.user.role === 'AGENT' && order.agentId !== req.user.agent?.id) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        const updatedOrder = await prisma.order.update({
            where: { id: req.params.id },
            data: { isVerified: true },
            include: {
                customer: { select: { fullName: true, phone: true } },
                agent: { include: { user: { select: { fullName: true } } } }
            }
        });

        // Create notification for customer
        await prisma.notification.create({
            data: {
                userId: order.customerId,
                type: 'STATUS_UPDATE',
                title: 'Order Verified',
                message: `Your order #${order.orderNumber} has been verified by the agent`,
                relatedOrderId: order.id
            }
        });

        res.json({ success: true, data: updatedOrder });
    } catch (error) {
        console.error('Verify order error:', error);
        res.status(500).json({ error: { message: 'Failed to verify order' } });
    }
});

// Delete order (Admin only)
router.delete('/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: {
                salesRecord: true,
                chatRooms: true
            }
        });

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        // Use a transaction to ensure all related data is deleted
        await prisma.$transaction(async (tx) => {
            // 1. Delete sales records if any
            if (order.salesRecord) {
                await tx.salesRecord.delete({
                    where: { orderId: order.id }
                });
            }

            // 2. Delete chat rooms and related data
            if (order.chatRooms && order.chatRooms.length > 0) {
                for (const room of order.chatRooms) {
                    // Delete messages
                    await tx.chatMessage.deleteMany({
                        where: { chatId: room.id }
                    });
                    // Delete participants
                    await tx.chatParticipant.deleteMany({
                        where: { chatId: room.id }
                    });
                    // Delete room
                    await tx.chatRoom.delete({
                        where: { id: room.id }
                    });
                }
            }

            // 3. Delete notifications
            await tx.notification.deleteMany({
                where: { relatedOrderId: order.id }
            });

            // 4. Delete from queue if exists
            await tx.orderQueue.deleteMany({
                where: { orderId: order.id }
            });

            // 5. Decrement agent's current order count if assigned
            if (order.agentId && order.status !== 'COMPLETED' && order.status !== 'CANCELLED') {
                await tx.agent.update({
                    where: { id: order.agentId },
                    data: {
                        currentOrderCount: {
                            decrement: 1
                        }
                    }
                });
            }

            // 6. Finally delete the order
            await tx.order.delete({
                where: { id: order.id }
            });
        });

        res.json({ success: true, message: 'Order and related data deleted successfully' });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({ error: { message: 'Failed to delete order' } });
    }
});

/**
 * Assign driver to order (Agent/Admin only)
 * POST /api/orders/:id/assign-driver
 */
router.post('/:id/assign-driver', authenticateToken, authorize('AGENT', 'ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            driverName,
            driverPhone,
            vehicleType,
            vehiclePlateNumber,
            pickupLocation,
            deliveryLocation,
            notes
        } = req.body;

        // Validation
        if (!driverName || !driverPhone || !vehicleType || !vehiclePlateNumber || !pickupLocation || !deliveryLocation) {
            return res.status(400).json({ error: { message: 'All driver and location fields are required' } });
        }

        // Fetch the order
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                customer: true,
                agent: {
                    include: {
                        user: true
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: { message: 'Order not found' } });
        }

        // Access check
        if (req.user.role === 'AGENT') {
            const agent = await prisma.agent.findUnique({
                where: { userId: req.user.id }
            });
            if (!agent || order.agentId !== agent.id) {
                return res.status(403).json({ error: { message: 'Access denied: You are not assigned to this order' } });
            }
        }

        // Generate delivery verification code if not already set
        const verificationCode = order.verificationCode || Math.floor(100000 + Math.random() * 900000).toString();

        // Start transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Driver Assignment history
            const assignment = await tx.driverAssignment.create({
                data: {
                    orderId: order.id,
                    driverName,
                    driverPhone,
                    vehicleType,
                    vehiclePlateNumber,
                    pickupLocation,
                    deliveryLocation,
                    notes
                }
            });

            // 2. Update order status and verification code
            const updatedOrder = await tx.order.update({
                where: { id: order.id },
                data: {
                    status: 'DRIVER_ASSIGNED',
                    verificationCode
                }
            });

            // 3. Create notification for the customer
            await tx.notification.create({
                data: {
                    userId: order.customerId,
                    type: 'STATUS_UPDATE',
                    title: 'Driver Assigned',
                    message: `Driver ${driverName} (${vehiclePlateNumber}) has been assigned to your order #${order.orderNumber}.`,
                    relatedOrderId: order.id
                }
            });

            return { assignment, updatedOrder };
        });

        // Fetch templates for notifications
        const smsTemplate = await prisma.notificationTemplate.findUnique({
            where: { key: 'driver_assignment_sms' }
        });
        const waTemplate = await prisma.notificationTemplate.findUnique({
            where: { key: 'driver_assignment_whatsapp' }
        });

        const agentPhone = order.agent?.user?.phone || req.user.phone || '';
        const lat = order.deliveryLat ? order.deliveryLat.toString() : '-6.819';
        const lng = order.deliveryLng ? order.deliveryLng.toString() : '39.274';

        const templateData = {
            driverName,
            orderNumber: order.orderNumber,
            customerName: order.customer.fullName || 'Customer',
            customerPhone: order.customer.phone,
            pickupLocation,
            deliveryLocation,
            agentPhone,
            latitude: lat,
            longitude: lng,
            notes: notes || 'No special instructions.'
        };

        // Format templates helper
        const formatTemplate = (tmpl, data) => {
            let formatted = tmpl;
            for (const key in data) {
                formatted = formatted.replace(new RegExp(`{${key}}`, 'g'), data[key]);
            }
            return formatted;
        };

        const smsContent = smsTemplate 
            ? formatTemplate(smsTemplate.content, templateData)
            : `Hello ${driverName}, you have been assigned to order ${order.orderNumber}. Customer Phone: ${order.customer.phone}, Pickup: ${pickupLocation}, Delivery: ${deliveryLocation}.`;

        const waContent = waTemplate
            ? formatTemplate(waTemplate.content, templateData)
            : `Hello *${driverName}*, you have been assigned order *${order.orderNumber}*. Customer Phone: ${order.customer.phone}, Pickup: ${pickupLocation}, Delivery: ${deliveryLocation}.`;

        // Log formatted messages to console as requested
        console.log('\n================================================================');
        console.log(`📱 DRIVER ASSIGNED NOTIFICATIONS FOR ORDER #${order.orderNumber}`);
        console.log(`Driver: ${driverName} (${driverPhone})`);
        console.log('----------------------------------------------------------------');
        console.log('[SMS OUTBOX TEMPLATE]:');
        console.log(smsContent);
        console.log('----------------------------------------------------------------');
        console.log('[WHATSAPP OUTBOX TEMPLATE]:');
        console.log(waContent);
        console.log('================================================================\n');

        // Trigger SMS notification to the driver
        const smsResult = await smsService.sendSms(driverPhone, smsContent);
        console.log(`[SMS SEND RESULT]:`, smsResult);

        res.json({
            success: true,
            data: {
                orderId: result.updatedOrder.id,
                status: result.updatedOrder.status,
                verificationCode: result.updatedOrder.verificationCode,
                assignment: result.assignment,
                smsResult
            }
        });
    } catch (error) {
        console.error('Assign driver error:', error);
        res.status(500).json({ error: { message: 'Failed to assign driver: ' + error.message } });
    }
});

export default router;
