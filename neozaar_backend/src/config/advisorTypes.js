// Consulting Advisor specialisations (the "Type of advisor" dropdown on the registration form).
// Keep in sync with Neozaareact/app/components/isvclient.js (ADVISOR_TYPES).
const ADVISOR_TYPES = [
  'Compliance Advisors',
  'HR & People Advisors',
  'Finance & Accounting Advisors',
  'Security & Cybersecurity Advisors',
  'Operations Advisors',
  'AI Advisors',
  'Transformation Advisors',
  'Cloud Infrastructure Advisors',
];

// Existing advisors registered before this field existed are backfilled with this value (migration 059).
const DEFAULT_ADVISOR_TYPE = 'Compliance Advisors';

module.exports = { ADVISOR_TYPES, DEFAULT_ADVISOR_TYPE };
