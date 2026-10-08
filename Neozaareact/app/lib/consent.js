"use client";

/**
 * DPDPA consent client — Phase 2.
 * ─────────────────────────────────────────────────────────────
 * - A first-party visitor id (nz_aid) so an anonymous visitor's
 *   choice can be recorded server-side before they ever sign in.
 * - Local consent state in localStorage (key `cookie-consent`,
 *   kept for back-compat) plus every change POSTed to the
 *   backend consent ledger (/api/consent/events).
 * - A pub/sub channel + a "clear cookies for a category" helper
 *   so tag loaders (Phase 3) can react without a page reload.
 *
 * Bump NOTICE_VERSION here (and the seeded row in
 * consent_notices) whenever purposes / recipients / retention
 * change — that forces re-consent.
 */

export const NOTICE_VERSION = "v1";
export const NOTICE_LOCALE = "en";
export const SOURCE_APP = "neozaar.com";

const AID_KEY = "nz_aid";
const CONSENT_KEY = "cookie-consent";
const QUEUE_KEY = "nz_consent_queue";
const CONSENT_EVT = "nz:consent-change";
const OPEN_PREFS_EVT = "nz:open-cookie-preferences";
const REFRESH_MS = 182 * 864e5; // ~6 months

const isBrowser = () => typeof window !== "undefined";
const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_ANALYTICS_URL ||
  ""
).replace(/\/+$/, "");

// ── first-party id ──────────────────────────────────────────
function uuid() {
  if (isBrowser() && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function readCookie(name) {
  if (!isBrowser()) return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name, value, days) {
  if (!isBrowser()) return;
  const d = new Date();
  d.setTime(d.getTime() + days * 864e5);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax${secure}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Stable per-browser id. Persisted in both localStorage and a 13-month cookie. */
export function getAnonId() {
  if (!isBrowser()) return null;
  let id = null;
  try { id = localStorage.getItem(AID_KEY); } catch (_) {}
  if (!id) id = readCookie(AID_KEY);
  if (!id || !UUID_RE.test(id)) id = uuid();
  try { localStorage.setItem(AID_KEY, id); } catch (_) {}
  writeCookie(AID_KEY, id, 397);
  return id;
}

// ── local consent state ─────────────────────────────────────
export function readConsent() {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return {
      purposes: { necessary: true, analytics: !!d.analytics, marketing: !!d.marketing },
      noticeVersion: d.noticeVersion || null,
      savedAt: d.savedAt || 0,
    };
  } catch (_) {
    return null;
  }
}

export function currentPurposes() {
  const c = readConsent();
  return c ? c.purposes : { necessary: true, analytics: false, marketing: false };
}

/** True when the banner should be shown: no choice, stale, or notice changed. */
export function needsConsent() {
  const c = readConsent();
  if (!c) return true;
  if (c.noticeVersion !== NOTICE_VERSION) return true;
  if (Date.now() - c.savedAt > REFRESH_MS) return true;
  return false;
}

// ── server capture ──────────────────────────────────────────
function getToken() {
  try { return localStorage.getItem("token"); } catch (_) { return null; }
}

function actionFor(prev, next) {
  if (!prev) return "grant";
  if (prev.noticeVersion !== NOTICE_VERSION) return "renew";
  const wasOn = prev.purposes.analytics || prev.purposes.marketing;
  const nowOn = next.analytics || next.marketing;
  if (wasOn && !nowOn) return "withdraw";
  return "update";
}

function postEvent(body, attempt = 0) {
  if (!isBrowser() || !API_BASE) return;
  const token = getToken();
  fetch(`${API_BASE}/consent/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    keepalive: true,
  })
    .then((res) => {
      if (!res.ok && res.status >= 500) throw new Error("server");
    })
    .catch(() => {
      if (attempt < 3) {
        setTimeout(() => postEvent(body, attempt + 1), 2000 * (attempt + 1));
      } else {
        try {
          const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
          q.push(body);
          localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-10)));
        } catch (_) {}
      }
    });
}

/** Re-send any events that failed to reach the server on a previous visit. */
export function flushConsentQueue() {
  if (!isBrowser()) return;
  let q = [];
  try { q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch (_) {}
  if (!q.length) return;
  try { localStorage.removeItem(QUEUE_KEY); } catch (_) {}
  q.forEach((b) => postEvent(b));
}

/**
 * Persist a consent choice locally, record it in the ledger, clear
 * cookies for any category just switched off, and notify listeners.
 * @param {{analytics?:boolean, marketing?:boolean}} purposes
 * @param {'banner'|'modal'|'settings'|'api'} uiSurface
 * @param {string} noticeLocale locale of the notice text actually shown
 */
export function writeConsent(purposes, uiSurface = "banner", noticeLocale = NOTICE_LOCALE) {
  if (!isBrowser()) return;
  const next = { necessary: true, analytics: !!purposes.analytics, marketing: !!purposes.marketing };
  const prev = readConsent();

  try {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        analytics: next.analytics,
        marketing: next.marketing,
        noticeVersion: NOTICE_VERSION,
        savedAt: Date.now(),
      })
    );
  } catch (_) {}

  const dropped = [];
  if (prev?.purposes.analytics && !next.analytics) dropped.push("analytics");
  if (prev?.purposes.marketing && !next.marketing) dropped.push("marketing");
  if (dropped.length) clearCookiesFor(dropped);

  postEvent({
    anonId: getAnonId(),
    action: actionFor(prev, next),
    purposes: { analytics: next.analytics, marketing: next.marketing },
    noticeVersion: NOTICE_VERSION,
    noticeLocale: noticeLocale || NOTICE_LOCALE,
    uiSurface,
    policyUrl: `${window.location.origin}/cookie-policy`,
    sourceApp: SOURCE_APP,
  });

  emitConsentChange(next);
}

/**
 * Called after sign-in: if a choice was made while anonymous, link it to
 * the account so the server can mirror analytics consent into user_consents
 * (which gates /track). Checks server state first and only writes a ledger
 * event when it actually differs — so a returning signed-in user with an
 * unchanged choice produces nothing. Runs at most once per session.
 */
export function reconcileConsentOnAuth() {
  if (!isBrowser() || !API_BASE) return;
  const token = getToken();
  const c = readConsent();
  if (!token || !c) return;

  let syncedFor = null;
  try { syncedFor = sessionStorage.getItem("nz_consent_synced"); } catch (_) {}
  const stamp = token.slice(-16);
  if (syncedFor === stamp) return;
  try { sessionStorage.setItem("nz_consent_synced", stamp); } catch (_) {}

  const write = () =>
    postEvent({
      anonId: getAnonId(),
      action: "update",
      purposes: { analytics: c.purposes.analytics, marketing: c.purposes.marketing },
      noticeVersion: c.noticeVersion || NOTICE_VERSION,
      noticeLocale: NOTICE_LOCALE,
      uiSurface: "api",
      policyUrl: `${window.location.origin}/cookie-policy`,
      sourceApp: SOURCE_APP,
    });

  fetch(`${API_BASE}/consent/me?anonId=${encodeURIComponent(getAnonId())}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      const s = d && d.state && d.state.purposes;
      const matches =
        s &&
        !!s.analytics === c.purposes.analytics &&
        !!s.marketing === c.purposes.marketing;
      if (!matches) write();
    })
    .catch(write);
}

// ── cookie cleanup ──────────────────────────────────────────
const COOKIE_PATTERNS = {
  analytics: [/^_ga/, /^_gid$/, /^_gat/, /^_ga_/, /^__utm/, /^AMP_/],
  marketing: [/^_fbp$/, /^_fbc$/, /^fr$/, /^_gcl_/, /^IDE$/, /^test_cookie$/, /^muc_ads$/, /^personalization_id$/],
};

/** Best-effort deletion of client-visible cookies for the given categories. */
export function clearCookiesFor(categories) {
  if (!isBrowser()) return;
  const pats = categories.flatMap((c) => COOKIE_PATTERNS[c] || []);
  if (!pats.length) return;
  const host = window.location.hostname;
  const domains = ["", host, "." + host, "." + host.split(".").slice(-2).join(".")];
  document.cookie.split(";").forEach((raw) => {
    const name = raw.split("=")[0].trim();
    if (!name || !pats.some((re) => re.test(name))) return;
    domains.forEach((d) => {
      document.cookie =
        `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? "; domain=" + d : ""}`;
    });
  });
}

// ── pub/sub + preference-centre opener ──────────────────────
function emitConsentChange(purposes) {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(CONSENT_EVT, { detail: { necessary: true, ...purposes } }));
}

/** Subscribe to consent changes. Returns an unsubscribe fn. */
export function onConsentChange(cb) {
  if (!isBrowser()) return () => {};
  const h = (e) => cb(e.detail);
  window.addEventListener(CONSENT_EVT, h);
  return () => window.removeEventListener(CONSENT_EVT, h);
}

/** Open the cookie preference centre from anywhere (e.g. a footer link). */
export function openCookiePreferences() {
  if (isBrowser()) window.dispatchEvent(new Event(OPEN_PREFS_EVT));
}

export function onOpenCookiePreferences(cb) {
  if (!isBrowser()) return () => {};
  window.addEventListener(OPEN_PREFS_EVT, cb);
  return () => window.removeEventListener(OPEN_PREFS_EVT, cb);
}
