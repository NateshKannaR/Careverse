import rateLimit from 'express-rate-limit';
// Global API rate limiter
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // limit each IP to 300 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: {
        error: 'Too many requests from this client. Please slow down and try again later.'
    }
});
// Stricter rate limiter for sensitive authentication & invitation routes
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: {
        error: 'Too many authentication attempts. Please try again after 15 minutes.'
    }
});
