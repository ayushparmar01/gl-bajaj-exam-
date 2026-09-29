/**
 * In-memory Sliding Window Rate Limiter Middleware
 * Protects sensitive endpoints against brute-force and DDoS attacks without external dependencies
 */

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // default 1 minute window
    this.max = options.max || 100; // default max requests per window
    this.message = options.message || 'Too many requests, please try again later.';
    this.statusCode = options.statusCode || 429;
    this.hits = new Map();

    // Periodic cleanup of expired entries every 2 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, records] of this.hits.entries()) {
        const valid = records.filter(timestamp => now - timestamp < this.windowMs);
        if (valid.length === 0) {
          this.hits.delete(key);
        } else {
          this.hits.set(key, valid);
        }
      }
    }, 2 * 60 * 1000).unref();
  }

  middleware() {
    return (req, res, next) => {
      // In serverless environments or behind proxies, get client IP
      const clientIp = (
        req.headers['x-forwarded-for'] ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        'unknown'
      ).split(',')[0].trim();

      const key = `${clientIp}:${req.baseUrl || ''}${req.path || ''}`;
      const now = Date.now();

      const timestamps = this.hits.get(key) || [];
      const validTimestamps = timestamps.filter(timestamp => now - timestamp < this.windowMs);

      if (validTimestamps.length >= this.max) {
        const oldestTimestamp = validTimestamps[0];
        const retryAfterSeconds = Math.ceil((this.windowMs - (now - oldestTimestamp)) / 1000);
        res.setHeader('Retry-After', Math.max(1, retryAfterSeconds));
        return res.status(this.statusCode).json({
          success: false,
          message: this.message,
          retryAfterSeconds: Math.max(1, retryAfterSeconds)
        });
      }

      validTimestamps.push(now);
      this.hits.set(key, validTimestamps);
      next();
    };
  }
}

// 1. Auth Limiter: login, register, google auth (20 requests per 15 mins)
const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again after 15 minutes.'
}).middleware();

// 2. OTP Limiter: forgot password, verify OTP, resend (10 requests per 10 mins)
const otpLimiter = new RateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Too many OTP requests from this IP. Please try again in 10 minutes.'
}).middleware();

// 3. Sensitive Admin Actions Limiter (60 requests per minute)
const sensitiveAdminLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Admin action rate limit reached. Please slow down.'
}).middleware();

// 4. General API Limiter (generous: 600 requests per minute to ensure exam heartbeat never trips)
const generalApiLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 600,
  message: 'Too many requests. Please slow down.'
}).middleware();

module.exports = {
  authLimiter,
  otpLimiter,
  sensitiveAdminLimiter,
  generalApiLimiter
};
