"use client";

/**
 * Google Consent Mode v2 glue — DPDPA Phase 3.
 * ─────────────────────────────────────────────────────────────
 * INLINE_CONSENT_DEFAULT is injected as a plain <script> at the very
 * top of <body>, before GTM / gtag.js, so the default state is set
 * before any Google tag can read cookies. It reads the choice a
 * returning visitor already made (localStorage `cookie-consent`) so
 * they don't flash to "denied".
 *
 * applyConsentUpdate() is called client-side whenever the choice
 * changes (see ConsentModeBridge).
 *
 * Keep the 'v1' below in sync with NOTICE_VERSION in ./consent.js —
 * this snippet is deliberately dependency-free vanilla JS.
 */

export const INLINE_CONSENT_DEFAULT = `
(function () {
  try {
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = window.gtag || gtag;

    var analytics = false, marketing = false;
    try {
      var raw = localStorage.getItem('cookie-consent');
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.noticeVersion === 'v1') {
          analytics = d.analytics === true;
          marketing = d.marketing === true;
        }
      }
    } catch (e) {}

    gtag('consent', 'default', {
      ad_storage:          marketing ? 'granted' : 'denied',
      ad_user_data:        marketing ? 'granted' : 'denied',
      ad_personalization:  marketing ? 'granted' : 'denied',
      analytics_storage:   analytics ? 'granted' : 'denied',
      functionality_storage: 'granted',
      security_storage:      'granted',
      wait_for_update: 500
    });
    gtag('set', 'ads_data_redaction', !marketing);
    gtag('set', 'url_passthrough', true);
  } catch (e) {}
})();
`;

function consentState(purposes) {
  const g = (b) => (b ? "granted" : "denied");
  return {
    ad_storage: g(purposes.marketing),
    ad_user_data: g(purposes.marketing),
    ad_personalization: g(purposes.marketing),
    analytics_storage: g(purposes.analytics),
  };
}

/** Push a Consent Mode `update` for the given resolved purposes. */
export function applyConsentUpdate(purposes) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  const gtag =
    window.gtag ||
    function () {
      window.dataLayer.push(arguments);
    };
  gtag("consent", "update", consentState(purposes));
  gtag("set", "ads_data_redaction", !purposes.marketing);
}
