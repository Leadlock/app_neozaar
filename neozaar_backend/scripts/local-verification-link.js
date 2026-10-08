require('dotenv').config();
const pool = require('../src/config/database');

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('This helper is disabled in production');
  }
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Usage: npm run dev:verification-link -- customer@example.com');
  }

  const { rows } = await pool.query(
    `SELECT email,verification_token,is_email_verified
     FROM users WHERE LOWER(TRIM(email))=$1 AND role_type='CLIENT'
     ORDER BY id DESC LIMIT 1`,
    [email]
  );
  if (!rows.length) throw new Error('Local CLIENT registration not found for that email');
  if (rows[0].is_email_verified) throw new Error('That customer is already verified');
  if (!rows[0].verification_token) throw new Error('That customer has no verification token');

  const url = new URL('/user/verify-email', process.env.FRONTEND_URL || 'http://localhost:3000/');
  url.searchParams.set('token', rows[0].verification_token);
  url.searchParams.set('email', rows[0].email);
  console.log('\nOpen this URL in the same local test browser:\n');
  console.log(url.toString());
}

main()
  .catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => pool.end());
