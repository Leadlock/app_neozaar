/**
 * Consent Audit Console API — DPDPA Phase 1. SUPER_ADMIN only.
 * Mounted at /api/admin/consent (after global auth).
 *
 * Read-only over the consent ledger. This is a Data Fiduciary
 * consent register, NOT a DPDP "Consent Manager" (a DPB-registered
 * entity) — keep that wording out of any user-facing label.
 *
 *   GET /overview                     KPI block + daily trend
 *   GET /events                       paged, filterable ledger
 *   GET /events/export.csv            same filter, CSV stream
 *   GET /subjects/:id                 one subject's timeline + notices seen
 *   GET /notices                      notice version registry + counts
 *   GET /notices/:version/:locale     one notice, rendered
 *   GET /integrity                    hash-chain verification
 */
const router = require('express').Router();
const verifyToken = require('../../middlewares/auth');
const ledger = require('../../services/consentLedger.service');
const { toCSV } = require('../../utils/csv.util');

// SUPER_ADMIN (role_id 4) only.
router.use(verifyToken, (req, res, next) => {
  if (req.user?.role_id === 4 || req.user?.role_type === 'SUPER_ADMIN') return next();
  return res.status(403).json({ status: 'fail', message: 'Superadmin access required' });
});

function filtersFrom(query) {
  const { from, to, country, sourceApp, action, q } = query;
  return { from, to, country, sourceApp, action, q };
}

router.get('/overview', async (req, res, next) => {
  try {
    res.json({ status: 'success', data: await ledger.overview(filtersFrom(req.query)) });
  } catch (e) { next(e); }
});

router.get('/events', async (req, res, next) => {
  try {
    const data = await ledger.listEvents({
      ...filtersFrom(req.query),
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ status: 'success', data });
  } catch (e) { next(e); }
});

router.get('/events/export.csv', async (req, res, next) => {
  try {
    const { rows } = await ledger.listEvents({ ...filtersFrom(req.query), limit: 10000, offset: 0 });
    const flat = rows.map(r => ({
      id: r.id,
      at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      subject_type: r.subject_type,
      anon_id: r.anon_id,
      user_id: r.user_id ?? '',
      user_email: r.user_email ?? '',
      action: r.action,
      necessary: r.purposes?.necessary ?? true,
      analytics: r.purposes?.analytics ?? false,
      marketing: r.purposes?.marketing ?? false,
      notice_version: r.notice_version,
      locale: r.notice_locale,
      ui_surface: r.ui_surface,
      country: r.country ?? '',
      ip_trunc: r.ip_trunc ?? '',
      source_app: r.source_app,
      row_hash: r.row_hash,
    }));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="consent-events-${Date.now()}.csv"`);
    res.send(toCSV(flat));
  } catch (e) { next(e); }
});

router.get('/subjects/:id', async (req, res, next) => {
  try {
    const data = await ledger.getSubject(req.params.id);
    if (!data) return res.status(404).json({ status: 'fail', message: 'No consent events for that subject' });
    res.json({ status: 'success', data });
  } catch (e) { next(e); }
});

router.get('/notices', async (req, res, next) => {
  try {
    res.json({ status: 'success', data: await ledger.listNotices() });
  } catch (e) { next(e); }
});

router.get('/notices/:version/:locale', async (req, res, next) => {
  try {
    const notice = await ledger.getNotice(req.params.version, req.params.locale);
    if (!notice) return res.status(404).json({ status: 'fail', message: 'Notice not found' });
    res.json({ status: 'success', data: notice });
  } catch (e) { next(e); }
});

router.get('/integrity', async (req, res, next) => {
  try {
    res.json({ status: 'success', data: await ledger.verifyChain({}) });
  } catch (e) { next(e); }
});

router.get('/dsar', async (req, res, next) => {
  try {
    res.json({ status: 'success', data: await ledger.listDsar({ status: req.query.status }) });
  } catch (e) { next(e); }
});

module.exports = router;
