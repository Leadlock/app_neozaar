import { NextResponse } from "next/server";

// Click redirect for a public shareable link. The rewritten <a href> in the page
// (see backend publicLinkRewrite.js) point here as
//   /p/<slug>/go?e=cta|block&u=<base64url target>&b=<listingId>
// This logs the click via the backend, then 307s to the backend-validated target.
// Same "lives outside /api/, emit our own redirect" shape as
// app/go/affiliate-track/route.js. See PUBLIC-LINKS-PLAN.md — Phase 3.

export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/").replace(/\/?$/, "/");

function redirect(location) {
  const res = new NextResponse(null, { status: 307 });
  res.headers.set("Location", location);
  res.headers.set("Cache-Control", "no-store");
  // Don't leak the /p/<slug>/go?u=... URL to the destination site.
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
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
  const sp = new URL(request.url).searchParams;
  const u = sp.get("u") || "";
  if (!u) return redirect("/");

  const qs = new URLSearchParams({ e: sp.get("e") || "cta", u });
  const b = sp.get("b");
  if (b) qs.set("b", b);

  try {
    const r = await fetch(
      `${API_BASE}public-links/by-slug/${encodeURIComponent(slug)}/click?${qs.toString()}`,
      { cache: "no-store", headers: visitorHeaders(request) }
    );
    if (!r.ok) return redirect("/");
    const { url } = await r.json();
    // Backend already ran safeDestination() on this; accept only an absolute
    // http(s) URL or a root-relative path, otherwise fall back to home.
    if (typeof url === "string" && url) {
      if (/^https?:\/\//i.test(url)) return redirect(url);
      if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) return redirect(url);
    }
    return redirect("/");
  } catch (err) {
    console.error("[public-link] click failed:", err?.message);
    return redirect("/");
  }
}
