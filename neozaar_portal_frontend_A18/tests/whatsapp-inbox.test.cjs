const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { of, Subject, throwError } = require('rxjs');

function harness() {
  const actions = [];
  const requests = [];
  const api = {
    getConversation: () => { const response = new Subject(); requests.push(response); return response; },
    getContacts: () => of({ data: [] }), getStats: () => of({ data: { unread: 0 } }),
    agentAction: (phone, action, body) => { actions.push({ phone, action, body }); return of({ data: { unread: false } }); },
  };
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/app/pages/whatsapp-conversations/whatsapp-conversations.component.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, document: { visibilityState: 'visible' }, setInterval, clearInterval, setTimeout, clearTimeout,
    require: name => name === '@angular/core' ? { Component: () => c => c, inject: () => api } : {} });
  return { component: new exports.WhatsappConversationsComponent(), api, actions, requests };
}

test('read is sent only after transcript loads, using the displayed inbound watermark', () => {
  const h = harness();
  h.component.openContact({ phone: '919999000001', unread: true });
  assert.equal(h.actions.length, 0);
  h.requests[0].next({ contact: { unread: true }, messages: [{ id: '21', direction: 'in' }, { id: '22', direction: 'out' }] });
  assert.equal(h.actions[0].action, 'read'); assert.equal(h.actions[0].body.through_id, '21');
});

test('stale transcript cannot replace or mark a different conversation read', () => {
  const h = harness();
  h.component.openContact({ phone: '919999000001' });
  h.component.openContact({ phone: '919999000002' });
  h.requests[0].next({ contact: { phone: '919999000001', unread: true }, messages: [{ id: 1, direction: 'in' }] });
  assert.equal(h.component.selected.phone, '919999000002'); assert.equal(h.actions.length, 0);
});

test('composer blocks bot, opt-out and expired windows; sends only HUMAN active conversations', () => {
  const h = harness(); h.component.draft = 'Agent reply';
  for (const selected of [
    { conversation_mode: 'BOT', window_active: true },
    { conversation_mode: 'HUMAN', opted_out: true, window_active: true },
    { conversation_mode: 'HUMAN', window_active: false },
  ]) { h.component.selected = { phone: '919999000001', ...selected }; h.component.control('messages'); }
  assert.equal(h.actions.length, 0);
  h.component.selected = { phone: '919999000001', conversation_mode: 'HUMAN', window_active: true };
  h.component.control('messages'); assert.equal(h.actions.length, 1); assert.equal(h.actions[0].body.message, 'Agent reply');
  assert.equal(h.component.draft, '');
});

test('failed send retains draft and surfaces server explanation', () => {
  const h = harness(); h.component.selected = { phone: '919999000001', conversation_mode: 'HUMAN', window_active: true };
  h.component.draft = 'Keep this draft';
  h.api.agentAction = () => throwError(() => ({ error: { message: 'Window expired' } }));
  h.component.control('messages'); assert.equal(h.component.draft, 'Keep this draft');
  assert.equal(h.component.actionError, 'Window expired'); assert.equal(h.component.actionBusy, false);
});
