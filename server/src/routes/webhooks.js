import express from 'express';
import { PrismaClient } from '@prisma/client';
import snippeService from '../services/snippeService.js';
import smsService from '../services/smsService.js';
import orderDistribution from '../services/orderDistribution.js';

const router = express.Router();
const prisma = new PrismaClient();

// Snippe webhook — must receive raw body for signature verification
// Express raw body is set up in index.js for this route
router.post('/snippe', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-webhook-signature'];
    const rawBody = req.body;

    // Verify signature
    if (signature) {
        const isValid = snippeService.verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
            console.warn('Snippe webhook: invalid signature');
            return res.status(401).json({ error: 'Invalid webhook signature' });
        }
    }

    let event;
    try {
        event = JSON.parse(rawBody.toString());
    } catch {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const eventType = event.type;
    const eventData = event.data;

    console.log(`Snippe webhook received: ${eventType} | ref: ${eventData?.reference}`);

    // Respond quickly — process async
    res.status(200).json({ received: true });

    try {
        if (eventType === 'payment.completed') {
            await handlePaymentCompleted(eventData);
        } else if (eventType === 'payment.failed') {
            await handlePaymentFailed(eventData);
        }
    } catch (err) {
        console.error(`Snippe webhook processing error (${eventType}):`, err);
    }
});

async function handlePaymentCompleted(data) {
    const reference = data.reference;
    const amountPaid = data.amount?.value;
    const orderId = data.metadata?.order_id;

    if (!orderId) {
        console.warn('Snippe webhook: payment.completed missing order_id in metadata');
        return;
    }

    const order = await prisma.order.findFirst({
        where: {
            OR: [
                { id: orderId },
                { snippeReference: reference }
            ]
        },
        include: {
            agent: true,
            customer: { select: { fullName: true, phone: true } }
        }
    });

    if (!order) {
        console.warn(`Snippe webhook: order not found for id=${orderId} ref=${reference}`);
        return;
    }

    if (order.paymentStatus === 'CONFIRMED') {
        console.log(`Snippe webhook: order ${order.orderNumber} already confirmed, skipping`);
        return;
    }

    const provider = data.channel?.provider || 'MOBILE_MONEY';
    const paymentMethod = mapProviderToMethod(provider);

    // Confirm payment and complete order
    const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
            paymentStatus: 'CONFIRMED',
            paymentMethod,
            actualCost: amountPaid ? parseFloat(amountPaid) : order.actualCost,
            paymentConfirmedAt: new Date(),
            status: 'COMPLETED',
            completedAt: new Date()
        },
        include: {
            customer: { select: { fullName: true, phone: true } }
        }
    });

    // Create sales record if agent is assigned
    if (order.agent) {
        const amount = parseFloat(updatedOrder.actualCost);
        const agentCommission = amount * (parseFloat(order.agent.commissionRate) / 100);
        const profit = amount - agentCommission;

        await prisma.salesRecord.create({
            data: {
                orderId: order.id,
                agentId: order.agentId,
                amount,
                agentCommission,
                profit
            }
        });

        await prisma.agent.update({
            where: { id: order.agentId },
            data: {
                totalEarnings: { increment: agentCommission },
                totalDeliveries: { increment: 1 },
                currentOrderCount: { decrement: 1 }
            }
        });
    }

    // Notify customer
    await prisma.notification.create({
        data: {
            userId: order.customerId,
            type: 'PAYMENT_CONFIRMED',
            title: 'Payment Confirmed',
            message: `Your payment of TZS ${parseFloat(updatedOrder.actualCost).toLocaleString()} for order #${order.orderNumber} has been confirmed.`,
            relatedOrderId: order.id
        }
    });

    // Notify agent if assigned
    if (order.agent) {
        await prisma.notification.create({
            data: {
                userId: order.agent.userId,
                type: 'PAYMENT_CONFIRMED',
                title: 'Payment Received',
                message: `Customer paid for order #${order.orderNumber} via ${paymentMethod.replace('_', ' ')}.`,
                relatedOrderId: order.id
            }
        });
    }

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
        await prisma.notification.create({
            data: {
                userId: admin.id,
                type: 'PAYMENT_CONFIRMED',
                title: 'Payment Received',
                message: `Order #${order.orderNumber} paid via STK push (${paymentMethod.replace('_', ' ')}).`,
                relatedOrderId: order.id
            }
        });
    }

    // Send SMS
    try {
        await smsService.sendOrderCompletionSms(updatedOrder.customer, order);
    } catch (smsErr) {
        console.error('SMS after STK payment failed (non-blocking):', smsErr.message);
    }

    // Process order queue
    await orderDistribution.processQueue();

    console.log(`Snippe webhook: order ${order.orderNumber} payment confirmed via STK push`);
}

async function handlePaymentFailed(data) {
    const orderId = data.metadata?.order_id;
    const reference = data.reference;
    const reason = data.failure_reason || 'Payment failed';

    if (!orderId) return;

    const order = await prisma.order.findFirst({
        where: {
            OR: [
                { id: orderId },
                { snippeReference: reference }
            ]
        }
    });

    if (!order) return;

    // Notify customer of failure
    await prisma.notification.create({
        data: {
            userId: order.customerId,
            type: 'PAYMENT_CONFIRMED',
            title: 'Payment Failed',
            message: `Your payment for order #${order.orderNumber} was not completed. Reason: ${reason}. Please try again.`,
            relatedOrderId: order.id
        }
    });

    // Clear the reference so customer can retry
    await prisma.order.update({
        where: { id: order.id },
        data: { snippeReference: null }
    });

    console.log(`Snippe webhook: payment failed for order ${order.orderNumber} — ${reason}`);
}

function mapProviderToMethod(provider) {
    const p = (provider || '').toLowerCase();
    if (p.includes('mpesa') || p.includes('m-pesa')) return 'M_PESA';
    if (p.includes('airtel')) return 'AIRTEL_MONEY';
    if (p.includes('tigo') || p.includes('mixx') || p.includes('yas')) return 'TIGO_PESA';
    if (p.includes('halotel')) return 'HALOTEL';
    return 'MOBILE_MONEY';
}

// ─── Ghala WhatsApp Webhook ────────────────────────────────────────
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { createOrderChat } from '../services/chatService.js';
import bcrypt from 'bcryptjs';

/**
 * Verify Ghala webhook signature
 */
function verifyGhalaSignature(rawBody, timestamp, signature) {
    const secret = process.env.GHALA_WEBHOOK_SECRET;
    if (!secret) return false;

    const payload = `${timestamp}${rawBody}`;
    const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
    );
}

/**
 * Format phone number for Ghala customers
 */
function formatGhalaPhone(phone) {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '255' + cleaned.substring(1);
    if (!cleaned.startsWith('255')) cleaned = '255' + cleaned;
    return cleaned;
}

router.post('/ghala', express.json(), async (req, res) => {
    const timestamp = req.headers['x-ghala-timestamp'];
    const signature = req.headers['x-ghala-signature'];
    const rawBody = JSON.stringify(req.body);

    console.log(`[Ghala] Webhook received — event: ${req.body?.event}`);

    // Verify signature (skip in dev if no headers)
    if (signature && timestamp) {
        try {
            const valid = verifyGhalaSignature(rawBody, timestamp, signature);
            if (!valid) {
                console.warn('[Ghala] Invalid webhook signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }
        } catch (e) {
            console.warn('[Ghala] Signature verification error:', e.message);
            return res.status(401).json({ error: 'Signature verification failed' });
        }
    }

    // Respond quickly
    res.status(200).json({ received: true });

    try {
        const { event, data } = req.body;

        if (event === 'order.created') {
            await handleGhalaOrderCreated(data);
        } else if (event === 'order.cancelled') {
            await handleGhalaOrderCancelled(data);
        } else {
            console.log(`[Ghala] Unhandled event: ${event}`);
        }
    } catch (err) {
        console.error('[Ghala] Webhook processing error:', err);
    }
});

/**
 * Handle order.created from Ghala
 */
async function handleGhalaOrderCreated(data) {
    const { customer, order: ghalaOrder } = data;

    if (!customer || !ghalaOrder) {
        console.error('[Ghala] Missing customer or order data');
        return;
    }

    const phone = formatGhalaPhone(customer.phone);
    if (!phone) {
        console.error('[Ghala] Invalid customer phone:', customer.phone);
        return;
    }

    console.log(`[Ghala] Processing order #${ghalaOrder.id} from ${customer.name} (${phone})`);

    // 1. Find or create customer user
    let user = await prisma.user.findFirst({
        where: { phone }
    });

    if (!user) {
        // Also try by email
        if (customer.email) {
            user = await prisma.user.findUnique({
                where: { email: customer.email }
            });
        }
    }

    if (!user) {
        // Create a new customer user with a random password
        const randomPassword = crypto.randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        user = await prisma.user.create({
            data: {
                email: customer.email || `whatsapp_${phone}@ghala.local`,
                fullName: customer.name || 'WhatsApp Customer',
                phone,
                password: hashedPassword,
                role: 'CUSTOMER',
                isPhoneVerified: true // Phone is verified via WhatsApp
            }
        });
        console.log(`[Ghala] Created new customer: ${user.id} (${user.fullName})`);
    }

    // 2. Build product description
    const products = ghalaOrder.products || [];
    const productDescription = products
        .map(p => `${p.name} x${p.quantity} @ ${ghalaOrder.currency || 'TZS'} ${p.price}`)
        .join('\n');

    // 3. Generate order number
    const orderNumber = `GHL-${Date.now()}-${uuidv4().substring(0, 4).toUpperCase()}`;

    // 4. Create the order
    const order = await prisma.order.create({
        data: {
            customerId: user.id,
            orderNumber,
            orderType: 'TYPE_B', // Product order from WhatsApp
            pickupAddress: 'Kariakoo (via WhatsApp)', // Default pickup
            deliveryAddress: 'To be confirmed via WhatsApp',
            description: `WhatsApp Order from Ghala #${ghalaOrder.id}\n\n${productDescription}`,
            productPrice: ghalaOrder.total ? parseFloat(ghalaOrder.total) : null,
            estimatedCost: ghalaOrder.total ? parseFloat(ghalaOrder.total) : null,
            productImageUrls: [],
            status: 'PLACED',
            ghalaOrderId: String(ghalaOrder.id)
        },
        include: {
            customer: { select: { fullName: true, phone: true } }
        }
    });

    console.log(`[Ghala] Order created: ${orderNumber} (ID: ${order.id}) for ${user.fullName}`);

    // 5. Assign agent
    let assignment = { agentId: null, agentUserId: null, queued: false };
    try {
        assignment = await orderDistribution.assignOrder(order.id);
        await createOrderChat(order.id, user.id, assignment?.agentUserId);
    } catch (assignError) {
        console.error('[Ghala] Agent assignment failed (non-blocking):', assignError.message);
    }

    // 6. Notify admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    for (const admin of admins) {
        await prisma.notification.create({
            data: {
                userId: admin.id,
                type: 'ADMIN_ALERT',
                title: '📱 New WhatsApp Order',
                message: `New order via WhatsApp from ${customer.name}. ${products.length} product(s), total: ${ghalaOrder.currency || 'TZS'} ${ghalaOrder.total}`,
                relatedOrderId: order.id
            }
        });
    }

    // 7. Send SMS confirmation to customer
    try {
        await smsService.sendSms(
            phone,
            `Hello ${customer.name}, your WhatsApp order #${orderNumber} has been received! Total: TZS ${ghalaOrder.total}. An agent will contact you shortly. — MHEMA Express`
        );
    } catch (smsErr) {
        console.error('[Ghala] SMS confirmation failed (non-blocking):', smsErr.message);
    }

    console.log(`[Ghala] Order ${orderNumber} fully processed ✅`);
}

/**
 * Handle order.cancelled from Ghala
 */
async function handleGhalaOrderCancelled(data) {
    const ghalaOrderId = data?.order?.id;
    if (!ghalaOrderId) return;

    const order = await prisma.order.findFirst({
        where: { ghalaOrderId: String(ghalaOrderId) }
    });

    if (!order) {
        console.log(`[Ghala] Cancelled order not found: Ghala #${ghalaOrderId}`);
        return;
    }

    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
        console.log(`[Ghala] Order ${order.orderNumber} already ${order.status}, skipping cancel`);
        return;
    }

    await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' }
    });

    // Notify customer
    await prisma.notification.create({
        data: {
            userId: order.customerId,
            type: 'STATUS_UPDATE',
            title: 'Order Cancelled',
            message: `Your WhatsApp order #${order.orderNumber} has been cancelled.`,
            relatedOrderId: order.id
        }
    });

    // Free agent
    if (order.agentId) {
        await prisma.agent.update({
            where: { id: order.agentId },
            data: { currentOrderCount: { decrement: 1 } }
        });
    }

    console.log(`[Ghala] Order ${order.orderNumber} cancelled via WhatsApp`);
}

export default router;
