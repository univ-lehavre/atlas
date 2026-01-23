/**
 * Rate limiting middleware for CRF service API endpoints
 */
import { rateLimiter } from 'hono-rate-limiter';

/**
 * Rate limiter middleware configuration
 * Limits each IP to 100 requests per 15-minute window.
 */
export const apiRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Max 100 requests per window
  standardHeaders: 'draft-7', // Use standard RateLimit-* headers
  keyGenerator: (c) => {
    const forwarded = c.req.header('x-forwarded-for');
    const realIp = c.req.header('x-real-ip');

    return forwarded !== undefined && forwarded !== ''
      ? (forwarded.split(',')[0]?.trim() ?? 'unknown')
      : realIp !== undefined && realIp !== ''
        ? realIp
        : 'unknown';
  },
});
