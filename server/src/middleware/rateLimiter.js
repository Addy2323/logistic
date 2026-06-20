/**
 * OTP Rate Limiter Middleware
 * Limits OTP requests per phone number to prevent abuse.
 * Uses in-memory store (suitable for single-instance deployments).
 * For multi-instance, swap to Redis.
 */

const otpAttempts = new Map(); // phone -> { count, resetAt }

const OTP_RATE_LIMIT = {
    maxAttempts: 3,       // Max OTP requests
    windowMs: 5 * 60 * 1000, // Per 5-minute window
};

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [phone, data] of otpAttempts.entries()) {
        if (now > data.resetAt) {
            otpAttempts.delete(phone);
        }
    }
}, 60 * 1000); // Clean every minute

/**
 * Rate limit middleware for OTP endpoints
 * Extracts phone from req.body
 */
export function otpRateLimiter(req, res, next) {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({
            error: { message: 'Phone number is required' }
        });
    }

    const now = Date.now();
    const record = otpAttempts.get(phone);

    // No record or expired window → allow and start new window
    if (!record || now > record.resetAt) {
        otpAttempts.set(phone, {
            count: 1,
            resetAt: now + OTP_RATE_LIMIT.windowMs,
        });
        return next();
    }

    // Within window but under limit
    if (record.count < OTP_RATE_LIMIT.maxAttempts) {
        record.count++;
        return next();
    }

    // Rate limited
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    return res.status(429).json({
        error: {
            message: `Too many OTP requests. Please wait ${retryAfterSec} seconds before trying again.`,
            retryAfter: retryAfterSec,
        }
    });
}

export default otpRateLimiter;
