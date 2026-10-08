const axios = require('axios');

// Mounted behind existing verifyToken + crmAccess + SUPER_ADMIN middleware.
// Fixed server configuration, never a URL from a request. No Meta token here.
exports.action = action => async (req, res) => {
  const phone = String(req.params.phone || '');
  if (!/^\+?[1-9]\d{6,14}$/.test(phone)) return res.status(400).json({ message: 'Invalid phone' });
  const origin = process.env.WHATSAPP_APP_ORIGIN;
  if (!origin) return res.status(503).json({ message: 'WhatsApp agent bridge is not configured' });
  try {
    const url = new URL(origin);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
        (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))))
      throw new Error('Invalid bridge origin');
    const result = await axios.post(
      `${url.origin}/allapi/whatsapp/internal/conversations/${encodeURIComponent(phone)}/${action}`,
      req.body || {},
      { headers: { Authorization: req.header('Authorization') }, timeout: 60000, maxRedirects: 0 }
    );
    return res.status(result.status).json(result.data);
  } catch (error) {
    const status = error.response?.status;
    if ([400, 401, 403, 404, 409, 502, 503].includes(status)) return res.status(status).json(error.response.data);
    return res.status(503).json({ message: 'Agent service unavailable or result uncertain. Refresh before retrying' });
  }
};
