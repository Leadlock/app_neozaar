const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request.endsWith('config/database')) return { query: async () => ({ rows: [] }), connect: async () => ({ query: async () => ({ rows: [] }), release() {} }) };
  if (request.endsWith('event-ingestion.service')) return { ingestEvent: async () => {} };
  if (request.endsWith('identity.service')) return { resolveIdentity: async () => ({ marketingContactId: null }) };
  if (request.endsWith('email-delivery.adapter')) return { send: async () => ({ providerMessageId: null }) };
  return originalLoad(request, parent, isMain);
};
const email = require('../src/services/marketing/email.service');
const forms = require('../src/services/marketing/forms.service');
Module._load = originalLoad;

test('email HTML removes script, event handlers and javascript URLs', () => {
  const html = email.sanitizeHtml('<p onclick="bad()">Hi</p><script>alert(1)</script><a href="javascript:bad()">x</a>');
  assert.equal(html, '<p>Hi</p><a href="bad()">x</a>');
});

test('personalization exposes only the approved Marketing fields', () => {
  assert.equal(email.personalize('Hi {{ first_name }} {{password}}', { first_name: 'Ada', password: 'secret' }), 'Hi Ada ');
});

test('public form text is normalized before persistence', () => {
  assert.equal(forms.clean('  <Ada>  '), 'Ada');
});
