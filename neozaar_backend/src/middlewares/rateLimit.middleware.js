/**
 * Simple in-memory rate limiter — no external dependency.
 * Keyed by IP address. Suitable for single-process deployments.
 * For multi-process/cluster, replace the store with Redis.
 *
 * Usage:
 *   const { rateLimit } = require('./rateLimit.middleware');
 *   router.post('/endpoint', rateLimit({ windowMs: 60000, max: 10 }), handler);
 */

const store = new Map(); // ip → { count, resetAt }

/**
 * @param {{ windowMs: number, max: number, message?: string }} opts
 */
function rateLimit({ windowMs = 60_000, max = 20, message = 'Too many requests, please try again later.' } = {}) {
  return (req, res, next) => {
    const ip  = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const rec = store.get(ip);

    if (!rec || now > rec.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    rec.count += 1;
    if (rec.count > max) {
      res.setHeader('Retry-After', Math.ceil((rec.resetAt - now) / 1000));
      return res.status(429).json({ status: 'fail', message });
    }
    next();
  };
}

// Periodically purge expired entries to prevent unbounded memory growth
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of store) {
    if (now > rec.resetAt) store.delete(ip);
  }
}, 5 * 60_000);
// The maintenance timer must not keep short-lived scripts or test workers alive.
cleanupTimer.unref?.();

module.exports = { rateLimit };
