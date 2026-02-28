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
                        user: { select: { fullName: true, phone: true } }
                    }
                },
                transportMethod: true,
                salesRecord: true
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
            productPrice
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
        // Type A: Logistics only, no product price needed
        // Type B: Product price required from customer
        // Type C: Product price set by agent later after sourcing
        if (orderType === 'TYPE_B') {
            if (!productPrice || isNaN(parseFloat(productPrice)) || parseFloat(productPrice) <= 0) {
                return res.status(400).json({
                    error: { message: 'Product price is required for Type B orders' }
                });
            }
        }

        // Set estimated cost to null (will be set by agent later)
        let estimatedCost = null;

        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${uuidv4().substring(0, 4).toUpperCase()}`;

        // Admin can create order on behalf of customer
        let finalCustomerId = req.user.id;
        if (req.user.role === 'ADMIN' && req.body.customerId) {
            // Verify if the customer exists
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
                status: 'PLACED'
            },
            include: {
                customer: {
                    select: { fullName: true, phone: true }
                },
                transportMethod: true
            }
        });

        // Check for high-value order (> 1,000,000 TZS)
        if (order.estimatedCost > 1000000) {
            // Find all admins
            const admins = await prisma.user.findMany({
                where: { role: 'ADMIN' },
                select: { id: true }
            });

            // Create notifications for admins
            const notificationData = admins.map(admin => ({
                userId: admin.id,
                type: 'ADMIN_ALERT',
                title: 'High Value Order Alert',
                message: `New high-value order #${orderNumber} placed. Value: TZS ${order.estimatedCost.toLocaleString()}`,
                relatedOrderId: order.id
            }));

            // Also notify the assigned agent if any
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

        // Automatically assign order to agent and create chat
        let assignment = { agentId: null, agentUserId: null, queued: false };
        try {
            assignment = await orderDistribution.assignOrder(order.id);
            await createOrderChat(order.id, req.user.id, assignment?.agentUserId);
        } catch (assignError) {
            console.error('Order assignment/chat failed, but order was created:', assignError);
            // We continue as the order is already created in the database
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
        const validStatuses = ['PLACED', 'QUEUED', 'ASSIGNED', 'PICKED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED'];

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

        // Update with timestamp
        const updateData = { status };
        const now = new Date();

        if (status === 'ASSIGNED') {
            updateData.assignedAt = now;
        } else if (status === 'PICKED') {
            updateData.pickedAt = now;
        } else if (status === 'IN_TRANSIT') {
            // No specific timestamp for in_transit in schema, but we could add one if needed
        } else if (status === 'DELIVERED') {
            updateData.deliveredAt = now;
        } else if (status === 'COMPLETED') {
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
        if (['COMPLETED', 'CANCELLED'].includes(status) && !['COMPLETED', 'CANCELLED'].includes(order.status)) {
            if (order.agentId) {
                await prisma.agent.update({
                    where: { id: order.agentId },
                    data: { currentOrderCount: { decrement: 1 } }
                });

                // If COMPLETED, also update totalDeliveries and handle accounting if needed
                if (status === 'COMPLETED') {
                    await prisma.agent.update({
                        where: { id: order.agentId },
                        data: { totalDeliveries: { increment: 1 } }
                    });

                    // If payment not confirmed and we have actualCost, perform accounting
                    if (order.paymentStatus === 'PENDING' && (order.actualCost || updateData.actualCost)) {
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
        } else if (!['COMPLETED', 'CANCELLED'].includes(status) && ['COMPLETED', 'CANCELLED'].includes(order.status)) {
            // Moving back from final to active status
            if (order.agentId) {
                await prisma.agent.update({
                    where: { id: order.agentId },
                    data: { currentOrderCount: { increment: 1 } }
                });

                if (order.status === 'COMPLETED') {
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

        // Send SMS to customer when order is completed
        if (status === 'COMPLETED') {
            try {
                await smsService.sendOrderCompletionSms(updatedOrder.customer, order);
            } catch (smsError) {
                console.error('SMS notification failed (non-blocking):', smsError.message);
                // Don't throw - SMS failure shouldn't block order completion
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
        res.json({ success: true, data: { status: 'pending', paymentStatus: 'PENDING' } });
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

export default router;
