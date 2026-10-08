import { NextResponse } from "next/server";

// Public shareable-link page. Lives OUTSIDE /api/ because the production reverse
// proxy routes every /api/* path to the Express backend. A Route Handler (not a
// page.jsx) so it can return the backend's pre-rendered, self-contained HTML
// document as-is — a React page would be wrapped in the marketplace root layout
// (header, cookie banner, floating WhatsApp button, GA4), which this page must not
// carry. View logging + the <a href> rewrite already happen backend-side in
// /public-links/by-slug/<slug>/render. See PUBLIC-LINKS-PLAN.md — Phase 3.

export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/").replace(/\/?$/, "/");

const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// Neozaar-styled "this link is no longer active" page — also used when the backend
// is unreachable. `kind` only changes the wording.
function fallbackHtml(kind) {
  const heading = kind === "error" ? "This link can’t be opened right now" : "This link is no longer active";
  const sub =
    kind === "error"
      ? "Something went wrong loading this shared page. Please try again in a little while."
      : "The shared page you’re looking for has been deactivated or has expired.";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(heading)} — Neozaar</title>
<style>
  body { margin:0; background:#0c0c0c; color:#f5f5f5; font-family:'Segoe UI',Arial,Helvetica,sans-serif; }
  .wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; box-sizing:border-box; }
  .card { max-width:440px; width:100%; text-align:center; }
  .card img { height:34px; width:auto; margin:0 0 28px; }
  .bar { width:44px; height:3px; background:#ea580c; border-radius:2px; margin:0 auto 22px; }
  h1 { font-size:22px; line-height:1.35; font-weight:800; margin:0 0 12px; }
  p { font-size:15px; line-height:1.6; color:#bdbdbd; margin:0 0 26px; }
  a.btn { display:inline-block; background:#ea580c; color:#fff; text-decoration:none; padding:13px 30px; border-radius:9999px; font-size:15px; font-weight:700; }
</style>
</head>
<body>
  <div class="wrap"><div class="card">
    <img src="/image/Logo.png" alt="Neozaar">
    <div class="bar"></div>
    <h1>${esc(heading)}</h1>
    <p>${esc(sub)}</p>
    <a class="btn" href="/">Go to Neozaar &rarr;</a>
  </div></div>
</body>
</html>`;
}

// Insert OG / Twitter / noindex tags into the rendered document's <head> so the
// link unfurls nicely in Slack / WhatsApp / LinkedIn without being indexable.
function injectHead(html, { title, description, image }) {
  const tags = [
    `<meta name="robots" content="noindex, nofollow">`,
    `<meta property="og:type" content="website">`,
    title && `<meta property="og:title" content="${esc(title)}">`,
    description && `<meta property="og:description" content="${esc(description)}">`,
    image && `<meta property="og:image" content="${esc(image)}">`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    title && `<meta name="twitter:title" content="${esc(title)}">`,
    description && `<meta name="twitter:description" content="${esc(description)}">`,
    image && `<meta name="twitter:image" content="${esc(image)}">`,
  ]
    .filter(Boolean)
    .join("\n");
  return html.includes("</head>") ? html.replace("</head>", `${tags}\n</head>`) : html;
}

function visitorHeaders(request) {
  const xff = request.headers.get("x-forwarded-for");
  return {
    "x-visitor-ip": (xff ? xff.split(",")[0].trim() : "") || request.headers.get("x-real-ip") || "",
    "x-visitor-ua": request.headers.get("user-agent") || "",
    "x-visitor-referer": request.headers.get("referer") || "",
  };
}

export async function GET(request, { params }) {
  const { slug } = await params;

  try {
    const r = await fetch(
      `${API_BASE}public-links/by-slug/${encodeURIComponent(slug)}/render`,
      { cache: "no-store", headers: visitorHeaders(request) }
    );
    if (!r.ok) {
      return new NextResponse(fallbackHtml(r.status === 404 ? "inactive" : "error"), {
        status: r.status === 404 ? 404 : 502,
        headers: HTML_HEADERS,
      });
    }
    const data = await r.json();
    if (data.status !== "ok" || !data.html) {
      return new NextResponse(fallbackHtml("inactive"), { status: 404, headers: HTML_HEADERS });
    }
    return new NextResponse(injectHead(data.html, data), { status: 200, headers: HTML_HEADERS });
  } catch (err) {
    console.error("[public-link] render failed:", err?.message);
    return new NextResponse(fallbackHtml("error"), { status: 502, headers: HTML_HEADERS });
  }
}
