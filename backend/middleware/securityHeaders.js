/**
 * Security Headers Middleware
 * Adds standard security response headers without breaking API or frontend functionality
 */
const securityHeaders = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking / frame embedding
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Cross-Site Scripting (XSS) filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (allow camera for proctoring on same origin, restrict others)
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

  // Remove Express powered-by header
  res.removeHeader('X-Powered-By');

  next();
};

module.exports = securityHeaders;
