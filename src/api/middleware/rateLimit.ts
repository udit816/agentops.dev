import rateLimit from 'express-rate-limit';

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000'); // 1 hour
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000');

// Rate limiter for ingestion endpoints
export const ingestRateLimiter = rateLimit({
    windowMs: WINDOW_MS,
    max: MAX_REQUESTS,
    message: {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${MAX_REQUESTS} requests per hour.`,
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use IP address as key (in production, could use API key)
    keyGenerator: (req) => {
        return req.userId || req.ip || 'unknown';
    },
});
