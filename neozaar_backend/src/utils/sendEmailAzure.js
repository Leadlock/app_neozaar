require('dotenv').config();
const axios = require('axios');
const commonConstant = require('../config/common.constant');

const SENDER = 'no_reply@neozaar.com';

async function getGraphToken() {
  const tokenUrl = `https://login.microsoftonline.com/${commonConstant.AZURE_MAIL.MS_TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: commonConstant.AZURE_MAIL.MS_CLIENT_ID,
    client_secret: commonConstant.AZURE_MAIL.MS_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const { data } = await axios.post(tokenUrl, params);
  return data.access_token;
}

async function sendViaGraph(token, to, subject, body, isHtml, fromAddress = SENDER, fromName, options = {}) {
  const sender = (fromAddress || SENDER).trim();
  const fromEmail = { address: sender };
  if (fromName && String(fromName).trim()) fromEmail.name = String(fromName).trim();
  const emailPayload = {
    message: {
      subject,
      body: { contentType: isHtml ? 'HTML' : 'Text', content: body },
      toRecipients: [{ emailAddress: { address: to } }],
      from: { emailAddress: fromEmail },
    },
    saveToSentItems: 'true',
  };
  if (options.replyTo) emailPayload.message.replyTo = [{ emailAddress: { address: options.replyTo } }];
  // NOTE: Graph's sendMail only accepts *custom* internetMessageHeaders
  // (names must start with "x-"); it silently drops/rejects standard
  // headers like List-Unsubscribe set this way. Kept here so a header IS
  // sent if Graph ever accepts it for this tenant, but this is unverified
  // — do not rely on it for compliance without confirming against a real
  // send in this tenant.
  if (options.headers && Object.keys(options.headers).length) {
    emailPayload.message.internetMessageHeaders = Object.entries(options.headers).map(([name, value]) => ({ name, value }));
  }
  return axios.post(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
    emailPayload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'outlook.body-content-type="html"',
      },
    }
  );
}

async function sendEmail(to, subject, body, isHtml = true, fromAddress, fromName, options) {
  try {
    const token = await getGraphToken();
    const response = await sendViaGraph(token, to, subject, body, isHtml, fromAddress, fromName, options);
    console.log(`✅ Email sent to ${to}: ${response.status}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Sends the same email to many recipients, one message each (no address leakage between
// them). Fetches the Graph token once. `fromAddress` (optional) overrides the default
// no_reply@neozaar.com sender — it must be a real mailbox in the tenant that the app is
// allowed to send as. Returns { sent: [...], failed: [{ email, error }] }.
async function sendEmailToMany(recipients, subject, body, isHtml = true, fromAddress = SENDER, fromName) {
  const list = [...new Set((recipients || []).map((e) => String(e).trim()).filter(Boolean))];
  const result = { sent: [], failed: [] };
  if (!list.length) return result;

  let token;
  try {
    token = await getGraphToken();
  } catch (error) {
    const msg = error.response?.data || error.message;
    console.error('❌ Graph token fetch failed:', msg);
    list.forEach((email) => result.failed.push({ email, error: 'auth' }));
    return result;
  }

  for (const email of list) {
    try {
      await sendViaGraph(token, email, subject, body, isHtml, fromAddress, fromName);
      result.sent.push(email);
    } catch (error) {
      const msg = error.response?.data || error.message;
      console.error(`❌ Email to ${email} failed:`, msg);
      result.failed.push({ email, error: typeof msg === 'string' ? msg : 'send_failed' });
    }
  }
  console.log(`✅ Bulk email: ${result.sent.length} sent, ${result.failed.length} failed`);
  return result;
}

module.exports = sendEmail;
module.exports.toMany = sendEmailToMany;
