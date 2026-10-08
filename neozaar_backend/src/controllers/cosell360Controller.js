const sendEmail = require('../utils/sendEmailAzure');

const NOTIFY_EMAIL = process.env.COSELL360_NOTIFY_EMAIL || 'info@neozaar.com';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Trim + cap length so a hostile payload can't bloat the email.
const clean = (value, max = 300) => String(value == null ? '' : value).trim().slice(0, max);

const row = (label, value) => `
  <tr>
    <td style="padding:10px 8px;border-bottom:1px solid #e6e6e6;font-weight:bold;color:#333;width:35%;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 8px;border-bottom:1px solid #e6e6e6;color:#555;vertical-align:top;">${value}</td>
  </tr>`;

const section = (title) => `
  <tr>
    <td colspan="2" style="padding:18px 8px 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#ff6b35;font-weight:bold;">${escapeHtml(title)}</td>
  </tr>`;

const TEAM_COPY = {
  title: 'New CoSell360 Readiness Assessment',
  intro: (d) =>
    `A new assessment was submitted through the CoSell360 page. Details are below — reply to this email to respond to ${escapeHtml(d.name)} directly.`,
  footer: 'Automated notification from the NeoZaar CoSell360 assessment form.',
};

const SUBMITTER_COPY = {
  title: 'Thank you for your CoSell360 assessment',
  intro: (d) =>
    `Hi ${escapeHtml(d.name)}, we have received your assessment and the NeoZaar team will get back to you within 2 business days. Here is a copy of what you submitted.`,
  footer: 'You are receiving this because you submitted the CoSell360 readiness assessment on neozaar.com. Just reply to this email if you need to add anything.',
};

const buildHtml = (d, copy = TEAM_COPY) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;margin:0;">
  <div style="max-width:640px;margin:auto;background:#ffffff;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
    <img src="https://emailimage.blob.core.windows.net/emailimage/Logo_Neozar_For%20White%20Background.png" alt="NeoZaar" style="width:140px;margin-bottom:20px;" />
    <h2 style="color:#333;margin:0 0 10px;">${copy.title}</h2>
    <p style="color:#555;line-height:1.6;">${copy.intro(d)}</p>
    <div style="background:#f7f7f7;padding:12px 20px 20px;border-radius:8px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        ${section('About the company')}
        ${row('Company', escapeHtml(d.company))}
        ${row('Website', escapeHtml(d.website))}
        ${row('Product', escapeHtml(d.product))}
        ${row('Category', escapeHtml(d.category))}
        ${section('Contact')}
        ${row('Contact person', escapeHtml(d.name))}
        ${row('Role / title', escapeHtml(d.role))}
        ${row('Business email', `<a href="mailto:${escapeHtml(d.email)}">${escapeHtml(d.email)}</a>`)}
        ${row('Phone', escapeHtml(d.phone || 'Not provided'))}
        ${row('Country / location', escapeHtml(d.location))}
        ${section('Marketplace')}
        ${row('Marketplace focus', escapeHtml(d.platform))}
        ${row('Current stage', escapeHtml(d.marketplace_stage))}
        ${section('Help needed')}
        ${row('Support areas', d.help.map((h) => `• ${escapeHtml(h)}`).join('<br/>'))}
        ${row('Primary outcome', escapeHtml(d.priority))}
        ${section('In their words')}
        ${row('Situation and goals', escapeHtml(d.needs).replace(/\n/g, '<br/>'))}
        ${row('Consent given', 'Yes')}
      </table>
    </div>
    <p style="color:#888;font-size:13px;text-align:center;">${copy.footer}</p>
  </div>
</body>
</html>`;

/**
 * Public: CoSell360 readiness assessment.
 * Emails the full submission to info@neozaar.com (override with COSELL360_NOTIFY_EMAIL).
 */
const submitAssessment = async (req, res) => {
  const b = req.body || {};

  const data = {
    company: clean(b.company),
    website: clean(b.website),
    product: clean(b.product),
    category: clean(b.category),
    name: clean(b.name),
    role: clean(b.role),
    email: clean(b.email, 254),
    phone: clean(b.phone, 40),
    location: clean(b.location),
    platform: clean(b.platform),
    marketplace_stage: clean(b.marketplace_stage),
    help: (Array.isArray(b.help) ? b.help : []).slice(0, 20).map((h) => clean(h)).filter(Boolean),
    priority: clean(b.priority),
    needs: clean(b.needs, 4000),
    consent: b.consent === true,
  };

  const missing = ['company', 'website', 'product', 'category', 'name', 'role', 'email', 'location', 'platform', 'marketplace_stage', 'priority', 'needs']
    .filter((k) => !data[k]);
  if (!data.help.length) missing.push('help');
  if (missing.length) {
    return res.status(422).json({ status: 'fail', message: 'Missing required fields.', fields: missing });
  }
  if (!EMAIL_RE.test(data.email)) {
    return res.status(422).json({ status: 'fail', message: 'Invalid email address.', fields: ['email'] });
  }
  if (!data.consent) {
    return res.status(422).json({ status: 'fail', message: 'Consent is required.', fields: ['consent'] });
  }

  try {
    const sent = await sendEmail(
      NOTIFY_EMAIL,
      `New CoSell360 Assessment — ${data.company.replace(/[\r\n]+/g, ' ')}`,
      buildHtml(data),
      true,
      undefined,
      undefined,
      { replyTo: data.email },
    );

    if (!sent) {
      return res.status(502).json({ status: 'error', message: 'Could not send your assessment. Please try again.' });
    }

    // Copy to the person who filled the form. The team notification above is what matters,
    // so a failure here is logged but never turns the submission into an error.
    try {
      const copySent = await sendEmail(
        data.email,
        'Thank you — we received your CoSell360 assessment',
        buildHtml(data, SUBMITTER_COPY),
        true,
        undefined,
        undefined,
        { replyTo: NOTIFY_EMAIL },
      );
      if (!copySent) console.error('CoSell360 confirmation email was not delivered to', data.email);
    } catch (error) {
      console.error('CoSell360 confirmation email failed:', error?.message || error);
    }

    return res.status(201).json({ status: 'success', message: 'Assessment received.' });
  } catch (error) {
    console.error('CoSell360 assessment submission failed:', error?.message || error);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

module.exports = { submitAssessment };
