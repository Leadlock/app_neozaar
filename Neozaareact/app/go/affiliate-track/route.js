import { NextResponse } from 'next/server';

// Both acquisition methods pass through the marketplace, so attribution survives
// browsing on its first-party cookie. Cookies contain only an opaque token.
// This handler lives outside /api/ on purpose: in production the reverse proxy
// routes every /api/* path to the Express backend, which would shadow it.
export async function GET(request) {
  const incoming = new URL(request.url);
  const slug = incoming.searchParams.get('slug');
  const campaign = incoming.searchParams.get('campaign');
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api/').replace(/\/?$/, '/');
  // Behind the production proxy (Cloudflare -> nginx -> Next), request.url carries
  // the internal origin (localhost:3000). Never build an absolute redirect from
  // it — emit a root-relative Location and let the browser resolve it against the
  // real public URL it requested.
  const redirectTo = (location, extraHeaders) => {
    const res = new NextResponse(null, { status: 307 });
    res.headers.set('Location', location);
    res.headers.set('Cache-Control', 'no-store');
    for (const [k, v] of Object.entries(extraHeaders || {})) res.headers.set(k, v);
    return res;
  };
  const failure = (message, status = 502) => new NextResponse(message, {
    status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  });
  if (!slug && !campaign) return redirectTo('/');
  try {
    const endpoint = campaign ? 'affiliate/track-click?token=' + encodeURIComponent(campaign)
      : 'affiliate/track/' + encodeURIComponent(slug);
    const result = await fetch(apiBase + endpoint, { cache: 'no-store' });
    if (!result.ok) {
      return result.status === 404
        ? failure('This affiliate link is unavailable or inactive.', 404)
        : failure('Unable to open this affiliate link right now. Please retry shortly.');
    }
    const { data = {} } = await result.json();
    if (!data.redirect_url || !data.aff_token) return failure('Unable to prepare this affiliate link. Please retry shortly.');
    // The destination must be a same-origin path. Reject absolute URLs and
    // protocol-relative / backslash tricks that could point off-site.
    const raw = String(data.redirect_url);
    if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
      return failure('This affiliate link has an invalid destination.');
    }
    const dest = new URL(raw, 'http://internal.invalid');
    // Tokens belong in the cookie, not in shared URLs/referrer logs.
    dest.searchParams.delete('aff_token');
    const response = redirectTo(dest.pathname + dest.search, { 'Referrer-Policy': 'same-origin' });
    const existing = request.cookies.get('aff_token')?.value;
    let keepFirst = false;
    if (existing) {
      const check = await fetch(apiBase + 'affiliate/token-status?token=' + encodeURIComponent(existing), { cache: 'no-store' });
      // Fail closed on a transient validation failure: don't replace first touch.
      keepFirst = !check.ok || (await check.json()).valid;
    }
    if (!keepFirst && data.aff_token) {
      const secure = incoming.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
      const cookie = { maxAge: 7 * 24 * 60 * 60, path: '/', sameSite: 'lax', httpOnly: false, secure };
      response.cookies.set('aff_token', data.aff_token, cookie);
      response.cookies.set('stored_utm_params', JSON.stringify({ utm_source: data.utm_source, utm_medium: data.utm_medium, utm_campaign: data.utm_campaign }), cookie);
    }
    return response;
  } catch (error) {
    console.error('[affiliate-track] tracking failed:', error.message);
    return failure('The affiliate tracking service is temporarily unavailable. Please retry shortly.', 503);
  }
}
