const axios = require('axios');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/database');

const PROVIDERS = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scopes: ['openid', 'profile', 'email'],
    clientIdEnv: 'GOOGLE_OAUTH_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_OAUTH_CLIENT_SECRET',
  },
  linkedin: {
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoUrl: 'https://api.linkedin.com/v2/userinfo',
    scopes: ['openid', 'profile', 'email'],
    clientIdEnv: 'LINKEDIN_OAUTH_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_OAUTH_CLIENT_SECRET',
  },
  microsoft: {
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
    scopes: ['openid', 'profile', 'email'],
    clientIdEnv: 'MICROSOFT_OAUTH_CLIENT_ID',
    clientSecretEnv: 'MICROSOFT_OAUTH_CLIENT_SECRET',
  },
};

function getProvider(name) {
  const provider = PROVIDERS[name];
  if (!provider) throw Object.assign(new Error('Unsupported sign-in provider'), { status: 404 });
  const clientId = process.env[provider.clientIdEnv];
  const clientSecret = process.env[provider.clientSecretEnv];
  if (!clientId || !clientSecret) {
    throw Object.assign(new Error(`${name} sign-in is not configured`), { status: 503 });
  }
  return { ...provider, clientId, clientSecret };
}

function getCallbackUrl(providerName) {
  const base = (process.env.BACKEND_URL || 'http://localhost:5000/api/').replace(/\/+$/, '');
  const apiBase = /\/api$/i.test(base) ? base : `${base}/api`;
  return `${apiBase}/oauth/${providerName}/callback`;
}

function buildAuthorizationUrl(providerName, state) {
  const provider = getProvider(providerName);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: provider.clientId,
    redirect_uri: getCallbackUrl(providerName),
    scope: provider.scopes.join(' '),
    state,
  });
  if (providerName === 'google') params.set('prompt', 'select_account');
  if (providerName === 'microsoft') params.set('prompt', 'select_account');
  return `${provider.authorizeUrl}?${params.toString()}`;
}

async function fetchProfile(providerName, code) {
  const provider = getProvider(providerName);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    redirect_uri: getCallbackUrl(providerName),
  });
  const tokenResponse = await axios.post(provider.tokenUrl, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });
  const accessToken = tokenResponse.data.access_token;
  if (!accessToken) throw new Error('Provider did not return an access token');
  const profileResponse = await axios.get(provider.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 15000,
  });
  return normalizeProfile(providerName, profileResponse.data);
}

function normalizeProfile(provider, raw) {
  const subject = raw.sub || raw.id;
  const email = (raw.email || raw.preferred_username || '').trim().toLowerCase();
  if (!subject) throw new Error('Provider profile is missing its stable user identifier');
  if (!email) throw Object.assign(new Error('Your provider account does not expose an email address'), { status: 422 });
  if (provider === 'google' && raw.email_verified !== true) {
    throw Object.assign(new Error('Google has not verified this email address'), { status: 422 });
  }
  return {
    subject: String(subject),
    email,
    name: raw.name || [raw.given_name, raw.family_name].filter(Boolean).join(' ') || email.split('@')[0],
    picture: raw.picture || null,
    raw: {
      given_name: raw.given_name || null,
      family_name: raw.family_name || null,
      picture: raw.picture || null,
      locale: raw.locale || null,
      tenant_id: raw.tid || null,
      hosted_domain: raw.hd || null,
    },
  };
}

async function findOrCreateUser(provider, profile) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let result = await client.query(
      `SELECT u.* FROM user_oauth_identities oi
       JOIN users u ON u.id = oi.user_id
       WHERE oi.provider = $1 AND oi.provider_subject = $2
       FOR UPDATE OF u`,
      [provider, profile.subject],
    );
    let user = result.rows[0];
    if (!user) {
      result = await client.query('SELECT * FROM users WHERE LOWER(email) = $1 FOR UPDATE', [profile.email]);
      user = result.rows[0];
      if (!user) {
        const randomPassword = crypto.randomBytes(48).toString('base64url');
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        result = await client.query(
          `INSERT INTO users
             (role_id, role_type, name, email, password, is_active, is_email_verified, is_mobile_verified, lead_source)
           VALUES (1, 'CLIENT', $1, $2, $3, TRUE, TRUE, FALSE, $4)
           RETURNING *`,
          [profile.name, profile.email, passwordHash, provider],
        );
        user = result.rows[0];
      } else if (!user.is_email_verified) {
        await client.query(
          'UPDATE users SET is_email_verified = TRUE, is_active = TRUE, updated_at = NOW() WHERE id = $1',
          [user.id],
        );
        user.is_email_verified = true;
        user.is_active = true;
      }
      await client.query(
        `INSERT INTO user_oauth_identities
           (user_id, provider, provider_subject, provider_email, profile)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT (provider, provider_subject) DO UPDATE SET
           provider_email = EXCLUDED.provider_email,
           profile = EXCLUDED.profile,
           updated_at = NOW()`,
        [user.id, provider, profile.subject, profile.email, JSON.stringify(profile.raw)],
      );
    } else {
      await client.query(
        `UPDATE user_oauth_identities SET provider_email = $1, profile = $2::jsonb, updated_at = NOW()
         WHERE provider = $3 AND provider_subject = $4`,
        [profile.email, JSON.stringify(profile.raw), provider, profile.subject],
      );
    }
    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createLoginCode(userId) {
  const code = crypto.randomBytes(32).toString('base64url');
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  await pool.query(
    `INSERT INTO oauth_login_codes (code_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '2 minutes')`,
    [codeHash, userId],
  );
  return code;
}

async function consumeLoginCode(code) {
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  const result = await pool.query(
    `UPDATE oauth_login_codes SET consumed_at = NOW()
     WHERE code_hash = $1 AND consumed_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    [codeHash],
  );
  if (!result.rows[0]) return null;
  const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [result.rows[0].user_id]);
  return userResult.rows[0] || null;
}

module.exports = {
  buildAuthorizationUrl,
  fetchProfile,
  findOrCreateUser,
  createLoginCode,
  consumeLoginCode,
};
