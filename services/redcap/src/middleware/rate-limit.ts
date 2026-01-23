/**
 * Rate limiting middleware for REDCap service API endpoints
 *
 * @description
 * Implements rate limiting to protect against abuse and ensure fair resource usage.
 * Uses a sliding window approach with IP-based identification.
 *
 * @remarks
 * - Default limit: 100 requests per 15 minutes per IP
 * - Uses X-Forwarded-For header when available (for proxied requests)
 * - Returns 429 Too Many Requests when limit is exceeded
 * - Standard rate limit headers included in responses
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { rateLimiter } from './middleware/rate-limit';
 *
 * const app = new Hono();
 * app.use('*', rateLimiter);
 * ```
 *
 * @module
 */
import { rateLimiter } from 'hono-rate-limiter';

/**
 * Rate limiter middleware configuration
 *
 * Limits each IP to 100 requests per 15-minute window.
 * Extracts client IP from X-Forwarded-For or X-Real-IP headers,
 * falling back to connection IP if headers are not present.
 */
export const apiRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Max 100 requests per window
  standardHeaders: 'draft-7', // Use standard RateLimit-* headers
  keyGenerator: (c) => {
    // Extract IP from headers (for reverse proxy scenarios) or fallback to connection IP
    const forwarded = c.req.header('x-forwarded-for');
    const realIp = c.req.header('x-real-ip');

    // X-Forwarded-For can contain multiple IPs, take the first (original client)
    return forwarded !== undefined && forwarded !== ''
      ? (forwarded.split(',')[0]?.trim() ?? 'unknown')
      : realIp !== undefined && realIp !== ''
        ? realIp
        : 'unknown';
  },
});
