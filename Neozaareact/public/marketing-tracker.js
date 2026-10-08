(function (global) {
  const key = (name) => `neozaar_marketing_${name}`;
  const getId = (name) => {
    let value = localStorage.getItem(key(name));
    if (!value) { value = crypto.randomUUID(); localStorage.setItem(key(name), value); }
    return value;
  };
  const visitorId = getId('visitor_id');
  let sessionId = sessionStorage.getItem(key('session_id'));
  if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem(key('session_id'), sessionId); }
  const params = new URLSearchParams(location.search);
  global.NeoZaarMarketing = { track(eventType, fields) {
    const payload = Object.assign({ visitorId, sessionId, idempotencyKey: crypto.randomUUID(), eventType,
      url: location.href, landingPage: location.href, referrer: document.referrer || undefined,
      utmSource: params.get('utm_source') || undefined, utmMedium: params.get('utm_medium') || undefined,
      utmCampaign: params.get('utm_campaign') || undefined, utmTerm: params.get('utm_term') || undefined,
      utmContent: params.get('utm_content') || undefined,
      device: { language: navigator.language, screenWidth: screen.width, screenHeight: screen.height } }, fields || {});
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) navigator.sendBeacon('/api/marketing/events', new Blob([body], { type: 'application/json' }));
    else fetch('/api/marketing/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }};
})(window);
