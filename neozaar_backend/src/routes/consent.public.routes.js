/**
 * Public consent API — DPDPA Phase 1.
 * Mounted at /api/consent BEFORE the global auth middleware, so
 * anonymous visitors can record a choice. A signed-in client may
 * still send a Bearer token; it is decoded opportunistically to
 * attach user_id.
 *
 *   POST /api/consent/events            record grant/withdraw/update/renew
 *   GET  /api/consent/notice/:v/:locale fetch a notice version (for the banner)
 */
const router = require('express').Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const ledger = require('../services/consentLedger.service');
const { rateLimit } = require('../middlewares/rateLimit.middleware');

const IP_SALT = process.env.CONSENT_IP_SALT || process.env.JWT_SECRET || 'neozaar-consent-salt';
const VALID_ACTIONS = ['grant', 'withdraw', 'update', 'renew'];
const VALID_SURFACES = ['banner', 'modal', 'settings', 'api'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clientIp(req) {
  const xff = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || req.ip || req.socket?.remoteAddress || null;
}
function hashIp(ip) {
  return ip ? crypto.createHash('sha256').update(`${IP_SALT}|${ip}`).digest('hex') : null;
}
function truncIp(ip) {
  if (!ip) return null;
  if (ip.includes('.')) { const p = ip.split('.'); if (p.length === 4) { p[3] = '0'; return p.join('.'); } }
  if (ip.includes(':')) { return ip.split(':').slice(0, 4).join(':') + '::'; }
  return null;
}
function geoCountry(req) {
  const c = req.headers['cf-ipcountry']
    || req.headers['x-vercel-ip-country']
    || req.headers['x-geo-country']
    || req.headers['x-country-code'];
  return c && c !== 'XX' ? String(c).slice(0, 2).toUpperCase() : null;
}

router.post(
  '/events',
  rateLimit({ windowMs: 60_000, max: 20, message: 'Too many consent updates. Please try again shortly.' }),
  async (req, res) => {
    try {
      const {
        anonId, action, purposes,
        noticeVersion, noticeLocale = 'en',
        uiSurface = 'banner', policyUrl, sourceApp = 'neozaar.com',
      } = req.body || {};

      if (!anonId || !UUID_RE.test(anonId)) {
        return res.status(400).json({ status: 'fail', message: 'anonId (uuid v4) is required' });
      }
      if (!VALID_ACTIONS.includes(action)) {
        return res.status(400).json({ status: 'fail', message: `action must be one of ${VALID_ACTIONS.join(', ')}` });
      }
      if (!purposes || typeof purposes !== 'object') {
        return res.status(400).json({ status: 'fail', message: 'purposes object is required' });
      }
      if (!noticeVersion) {
        return res.status(400).json({ status: 'fail', message: 'noticeVersion is required' });
      }
      if (!VALID_SURFACES.includes(uiSurface)) {
        return res.status(400).json({ status: 'fail', message: `uiSurface must be one of ${VALID_SURFACES.join(', ')}` });
      }

      // Opportunistic identity — this route is not behind global auth.
      let userId = null;
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        try { userId = jwt.verify(token, process.env.JWT_SECRET)?.id ?? null; } catch (_) { /* anonymous */ }
      }

      const ip = clientIp(req);
      const rec = await ledger.recordEvent({
        anonId,
        userId,
        action,
        purposes: {
          analytics: purposes.analytics === true,
          marketing: purposes.marketing === true,
        },
        noticeVersion: String(noticeVersion).slice(0, 20),
        noticeLocale: String(noticeLocale).slice(0, 12),
        uiSurface,
        policyUrl: policyUrl ? String(policyUrl).slice(0, 500) : null,
        ipHash: hashIp(ip),
        ipTrunc: truncIp(ip),
        userAgent: (req.headers['user-agent'] || '').slice(0, 500) || null,
        country: geoCountry(req),
        sourceApp: String(sourceApp).slice(0, 30),
      });

      return res.status(201).json({ status: 'success', id: rec.id, at: rec.createdAt });
    } catch (e) {
      console.error('POST /api/consent/events failed:', e.message);
      return res.status(500).json({ status: 'fail', message: 'Could not record consent.' });
    }
  }
);

router.get('/notice/:version/:locale', async (req, res) => {
  try {
    const notice = await ledger.getNotice(req.params.version, req.params.locale);
    if (!notice) return res.status(404).json({ status: 'fail', message: 'Notice version not found' });
    return res.json({ status: 'success', notice });
  } catch (e) {
    console.error('GET /api/consent/notice failed:', e.message);
    return res.status(500).json({ status: 'fail', message: 'Error loading notice.' });
  }
});

module.exports = router;
