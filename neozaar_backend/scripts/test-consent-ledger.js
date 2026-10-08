/**
 * Ad-hoc Phase 1 check: append events, verify the hash chain,
 * tamper a row, confirm the chain reports the break, then clean up.
 * Run: node scripts/test-consent-ledger.js
 */
require('dotenv').config();
const pool = require('../src/config/database');
const ledger = require('../src/services/consentLedger.service');

const AID1 = '11111111-1111-4111-8111-111111111111';
const AID2 = '22222222-2222-4222-8222-222222222222';

(async () => {
  let failures = 0;
  const assert = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

  try {
    const before = (await pool.query('SELECT COUNT(*)::int n FROM consent_events')).rows[0].n;

    const e1 = await ledger.recordEvent({
      anonId: AID1, action: 'grant',
      purposes: { analytics: true, marketing: false },
      noticeVersion: 'v1', noticeLocale: 'en', uiSurface: 'banner',
      sourceApp: 'test', country: 'IN', ipHash: 'x', ipTrunc: '203.0.113.0',
    });
    assert(!!e1.id, 'record anon grant');

    const e2 = await ledger.recordEvent({
      anonId: AID1, action: 'withdraw',
      purposes: { analytics: false, marketing: false },
      noticeVersion: 'v1', uiSurface: 'settings', sourceApp: 'test',
    });
    assert(e2.prevHash === e1.rowHash, 'chain links e2.prev -> e1.row');

    await ledger.recordEvent({
      anonId: AID2, userId: null, action: 'grant',
      purposes: { analytics: true, marketing: true },
      noticeVersion: 'v1', uiSurface: 'banner', sourceApp: 'test',
    });

    const state = await ledger.currentState({ anonId: AID1 });
    assert(state && state.action === 'withdraw' && state.purposes.analytics === false,
      'currentState reflects latest (withdraw) for AID1');

    const hist = await ledger.history({ anonId: AID1 });
    assert(hist.length === 2, 'history returns 2 events for AID1');

    const chain = await ledger.verifyChain({});
    assert(chain.ok === true, `verifyChain ok on clean ledger (checked ${chain.checked})`);

    // Tamper: flip a purpose directly in the row, bypassing the service.
    await pool.query(
      `UPDATE consent_events SET purposes = '{"necessary":true,"analytics":true,"marketing":true}'::jsonb
       WHERE id = $1`, [e1.id]
    );
    const broken = await ledger.verifyChain({});
    assert(broken.ok === false && Number(broken.brokenAt) === Number(e1.id),
      `verifyChain detects tamper at id ${e1.id} (got ${broken.brokenAt}, reason: ${broken.reason})`);

    const notice = await ledger.getNotice('v1', 'en');
    assert(notice && Array.isArray(notice.categories) && notice.categories.length === 3,
      'notice v1/en has 3 categories');

    const ov = await ledger.overview({ sourceApp: 'test' });
    assert(ov.total_events === 3, `overview counts 3 test events (got ${ov.total_events})`);

    // Cleanup
    await pool.query('DELETE FROM consent_events WHERE source_app = $1', ['test']);
    const after = (await pool.query('SELECT COUNT(*)::int n FROM consent_events')).rows[0].n;
    assert(after === before, 'cleanup restores row count');

  } catch (e) {
    console.error('ERROR', e);
    failures++;
  } finally {
    await pool.end();
    console.log(failures ? `\n${failures} failure(s)` : '\nall green');
    process.exit(failures ? 1 : 0);
  }
})();
