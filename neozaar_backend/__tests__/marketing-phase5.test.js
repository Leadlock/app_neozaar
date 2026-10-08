jest.mock('../src/config/database', () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock('../src/services/marketing/event-ingestion.service', () => ({ ingestEvent: jest.fn() }));
jest.mock('../src/services/marketing/identity.service', () => ({ resolveIdentity: jest.fn() }));
jest.mock('../src/services/marketing/adapters/email-delivery.adapter', () => ({ send: jest.fn() }));

const email = require('../src/services/marketing/email.service');
const forms = require('../src/services/marketing/forms.service');

describe('Marketing email safety', () => {
  test('sanitizes executable HTML', () => {
    expect(email.sanitizeHtml('<p onclick="bad()">Hi</p><script>alert(1)</script><a href="javascript:bad()">x</a>'))
      .toBe('<p>Hi</p><a href="bad()">x</a>');
  });

  test('personalizes only allowlisted fields', () => {
    expect(email.personalize('Hi {{ first_name }} {{password}}', { first_name: 'Ada', password: 'secret' }))
      .toBe('Hi Ada ');
  });
});

describe('Marketing form safety', () => {
  test('trims and strips basic markup from public values', () => {
    expect(forms.clean('  <Ada>  ')).toBe('Ada');
  });
});
