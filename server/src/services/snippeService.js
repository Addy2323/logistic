import crypto from 'crypto';

const SNIPPE_BASE_URL = 'https://api.snippe.sh';
const SNIPPE_API_KEY = process.env.SNIPPE_API_KEY;
const SNIPPE_WEBHOOK_SECRET = process.env.SNIPPE_WEBHOOK_SECRET;

/**
 * Initiate an STK push (mobile money USSD push) via Snippe
 * @param {object} params
 * @param {number} params.amount - Amount in TZS
 * @param {string} params.phone - Customer phone in 255XXXXXXXXX format
 * @param {string} params.firstName
 * @param {string} params.lastName
 * @param {string} params.email
 * @param {string} params.orderId - Internal order ID for metadata
 * @param {string} params.orderNumber - Human-readable order number
 * @param {string} params.idempotencyKey - Unique key to prevent duplicate charges
 */
async function initiateSTKPush({ amount, phone, firstName, lastName, email, orderId, orderNumber, idempotencyKey }) {
    if (!SNIPPE_API_KEY) {
        throw new Error('Snippe API key is not configured');
    }

    const backendUrl = process.env.BACKEND_URL || '';
    const webhookUrl = backendUrl.startsWith('https://')
        ? `${backendUrl}/api/webhooks/snippe`
        : null;

    const payload = {
        payment_type: 'mobile',
        details: {
            amount: Math.round(amount),
            currency: 'TZS'
        },
        phone_number: normalizePhone(phone),
        customer: {
            firstname: firstName,
            lastname: lastName,
            email: email || 'noreply@mhemaexpress.co.tz'
        },
        ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
        metadata: {
            order_id: orderId,
            order_number: orderNumber
        }
    };

    const response = await fetch(`${SNIPPE_BASE_URL}/v1/payments`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SNIPPE_API_KEY}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || data.status === 'error') {
        throw new Error(data.message || `Snippe API error: ${response.status}`);
    }

    return data.data;
}

/**
 * Get payment status from Snippe by reference
 */
async function getPaymentStatus(reference) {
    if (!SNIPPE_API_KEY) {
        throw new Error('Snippe API key is not configured');
    }

    const response = await fetch(`${SNIPPE_BASE_URL}/v1/payments/${reference}`, {
        headers: {
            'Authorization': `Bearer ${SNIPPE_API_KEY}`
        }
    });

    const data = await response.json();

    if (!response.ok || data.status === 'error') {
        throw new Error(data.message || `Snippe API error: ${response.status}`);
    }

    return data.data;
}

/**
 * Verify webhook signature using HMAC-SHA256
 */
function verifyWebhookSignature(rawBody, signature) {
    if (!SNIPPE_WEBHOOK_SECRET) {
        console.warn('Snippe webhook secret not configured — skipping signature verification');
        return true;
    }

    const expectedSignature = crypto
        .createHmac('sha256', SNIPPE_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch {
        return false;
    }
}

/**
 * Normalize phone to 255XXXXXXXXX format
 */
function normalizePhone(phone) {
    if (!phone) return phone;
    let p = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    if (p.startsWith('+255')) return p.substring(1);
    if (p.startsWith('255')) return p;
    if (p.startsWith('0')) return '255' + p.substring(1);
    return '255' + p;
}

export default {
    initiateSTKPush,
    getPaymentStatus,
    verifyWebhookSignature,
    normalizePhone
};
