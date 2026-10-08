const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../utils/jwt');
const socialAuth = require('../services/social-auth.service');

const STATE_COOKIE = 'neozaar_oauth_state';

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || '').split(';').filter(Boolean).map((part) => {
      const index = part.indexOf('=');
      return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
    }),
  );
}

function frontendCallbackUrl(params = {}) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:3000/').replace(/\/+$/, '');
  const url = new URL(`${base}/auth/oauth/callback`);
  Object.entries(params).forEach(([key, value]) => value && url.searchParams.set(key, value));
  return url.toString();
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role_type: user.role_type,
    role_id: user.role_id,
    email_verified: user.is_email_verified,
    mobile_verified: user.is_mobile_verified,
  };
}

exports.start = (req, res) => {
  try {
    const nonce = crypto.randomBytes(24).toString('base64url');
    const intent = req.query.intent === 'register' ? 'register' : 'login';
    const state = jwt.sign({ nonce, intent, provider: req.params.provider }, process.env.JWT_SECRET, { expiresIn: '10m' });
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${STATE_COOKIE}=${encodeURIComponent(nonce)}; HttpOnly; SameSite=Lax; Path=/api/oauth; Max-Age=600${secure}`);
    res.redirect(socialAuth.buildAuthorizationUrl(req.params.provider, state));
  } catch (error) {
    res.redirect(frontendCallbackUrl({ error: error.message }));
  }
};

exports.callback = async (req, res) => {
  try {
    if (req.query.error) throw Object.assign(new Error(req.query.error_description || 'Sign-in was cancelled'), { status: 400 });
    const state = jwt.verify(req.query.state || '', process.env.JWT_SECRET);
    const cookieNonce = parseCookies(req)[STATE_COOKIE];
    if (!cookieNonce || cookieNonce !== state.nonce || state.provider !== req.params.provider) {
      throw Object.assign(new Error('The sign-in request could not be verified. Please try again.'), { status: 400 });
    }
    if (!req.query.code) throw Object.assign(new Error('Provider did not return an authorization code'), { status: 400 });
    const profile = await socialAuth.fetchProfile(req.params.provider, req.query.code);
    const user = await socialAuth.findOrCreateUser(req.params.provider, profile);
    const code = await socialAuth.createLoginCode(user.id);
    res.setHeader('Set-Cookie', `${STATE_COOKIE}=; HttpOnly; SameSite=Lax; Path=/api/oauth; Max-Age=0`);
    res.redirect(frontendCallbackUrl({ code, intent: state.intent }));
  } catch (error) {
    console.error('Social authentication callback failed:', error.response?.data || error.message);
    res.redirect(frontendCallbackUrl({ error: error.message || 'Social sign-in failed' }));
  }
};

exports.exchange = async (req, res) => {
  try {
    const user = await socialAuth.consumeLoginCode(req.body.code || '');
    if (!user) return res.status(400).json({ status: 'fail', message: 'This sign-in code is invalid or expired' });
    const token = generateToken(user);
    return res.json({ status: 'success', message: 'Login successful', data: { token, user: publicUser(user) } });
  } catch (error) {
    console.error('Social authentication exchange failed:', error.message);
    return res.status(500).json({ status: 'fail', message: 'Unable to complete sign-in' });
  }
};
