// Rewrites every clickable <a href> in a rendered public-link page so the click
// goes through the Next.js /p/<slug>/go redirect handler (which logs it, then
// 302s to the real target). Used only on the public-link render path — the email
// / Zoho push render is never touched.
//
// cheerio is already a dependency (campaignTemplate.js). A round-trip through it
// preserves the <!DOCTYPE>, the MSO conditional comments the campaign composer
// relies on, and existing &amp; entities (verified on cheerio 1.2.0).
//
// Two markers control the rewrite (both stripped from the output):
//   data-nz-skip   — leave this link alone (footer "Chat with Neo" prompt).
//   data-nz-block  — attribute the click to a campaign block (event `block_click`,
//                    `b=<listingId>`); absent = generic `cta_click`.

const cheerio = require("cheerio");

const SKIP_HREF_RE = /^(#|mailto:|tel:|sms:|data:|javascript:)/i;

function trackHref(slug, rawHref, blockListingId) {
  const params = new URLSearchParams();
  params.set("e", blockListingId ? "block" : "cta");
  params.set("u", Buffer.from(rawHref, "utf8").toString("base64url"));
  if (blockListingId) params.set("b", String(blockListingId));
  return `/p/${slug}/go?${params.toString()}`;
}

function rewriteLinksForTracking(html, slug) {
  if (!html || !slug) return html;
  const $ = cheerio.load(html);

  $("a[href]").each((_, el) => {
    const $a = $(el);
    if ($a.attr("data-nz-skip") !== undefined) {
      $a.removeAttr("data-nz-skip").removeAttr("data-nz-block");
      return;
    }
    const href = $a.attr("href"); // cheerio returns this entity-decoded
    if (!href || SKIP_HREF_RE.test(href)) return;
    $a.attr("href", trackHref(slug, href, $a.attr("data-nz-block")));
    $a.removeAttr("data-nz-block");
  });

  // The campaign composer duplicates each block's <a> inside an <!--[if mso]>-->
  // conditional comment for Outlook. cheerio treats comment bodies as opaque text,
  // so those copies still carry the markers and their raw href — finish them by
  // string. Every such anchor is single-line with a double-quoted href.
  return $.html().replace(/<a\b[^>]*>/gi, (tag) => {
    if (/\bdata-nz-skip=/i.test(tag)) {
      return tag.replace(/\s*data-nz-(?:skip|block)="[^"]*"/gi, "");
    }
    const bidM = tag.match(/\bdata-nz-block="([^"]*)"/i);
    if (!bidM) return tag;
    const hrefM = tag.match(/\bhref="([^"]*)"/i);
    const stripped = tag.replace(/\s*data-nz-block="[^"]*"/i, "");
    if (!hrefM) return stripped;
    const rawHref = hrefM[1].replace(/&amp;/g, "&");
    return stripped.replace(/\bhref="[^"]*"/i, `href="${trackHref(slug, rawHref, bidM[1])}"`);
  });
}

module.exports = { rewriteLinksForTracking };
