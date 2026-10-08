// Renders a product/service/solution row into the subject + HTML body of a Zoho Campaigns draft.
// Pure functions only — no DB access, no network calls — so this can be tested in isolation.

const cheerio = require("cheerio");
const DataTransformer = require("../../utils/dataTransformer");

const TYPE_LABELS = {
  product: "Product",
  service: "Service",
  solution: "Solution",
};

function labelFor(actionType) {
  return TYPE_LABELS[actionType] || "Listing";
}

// Make a value safe to drop inside a double-quoted HTML attribute. A raw "&" in a
// src/href starts an entity in strict renderers (Outlook, Zoho) and a raw '"'
// closes the attribute early — screenshot/logo blob URLs routinely carry "&" and
// "()" from the original filename, which is what breaks the image in email.
function attr(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// primary_use_cases is real HTML (its own <ul><li>...), not a plain array like
// key_features — on some rows it's clean, on others (e.g. Word-paste content) it's
// deeply nested spans with inline styles. cheerio parses the actual structure so each
// item's plain text comes out clean either way, rather than a regex mangling messy markup.
function extractListItems(html) {
  if (!html) return [];
  const $ = cheerio.load(html);
  const items = $("li")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  if (items.length) return items;

  // Some rows have no <li> at all — instead one top-level <div>/<p> per line (e.g.
  // "<div>Label:</div><div>Description.</div>" pairs from manual entry). cheerio's
  // .text() has no whitespace between block boundaries, so reading the whole document
  // as one string glues every line together with zero separation ("...instantly.HR &
  // Recruitment..."). Read each top-level block on its own instead, and fold a
  // "Label:"-ending block into the very next block so a label/description pair still
  // renders as one readable "Label: Description" item rather than two orphaned halves.
  const blocks = $("body")
    .children()
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  if (blocks.length > 1) {
    const merged = [];
    for (let i = 0; i < blocks.length; i++) {
      if (/:$/.test(blocks[i]) && i + 1 < blocks.length) {
        merged.push(`${blocks[i]} ${blocks[i + 1]}`);
        i++;
      } else {
        merged.push(blocks[i]);
      }
    }
    return merged;
  }

  // Last resort — no block structure at all, just inline/plain text.
  const wholeText = $.root().text().replace(/\s+/g, " ").trim();
  return wholeText ? [wholeText] : [];
}

// Products draw this from primary_use_cases (HTML text, needs cheerio). Solutions have
// their own separate use_cases column — a plain Postgres text[], not HTML, and distinct
// from primary_use_cases (which is empty on most solutions — confirmed against real
// listings; the site's own solution detail page reads use_cases for this section, not
// primary_use_cases). Services get Challenges Addressed instead — see serviceBodyHtml.
function featureSectionItems(row) {
  if (row.action_type === "product") {
    return extractListItems(row.primary_use_cases);
  }
  if (row.action_type === "solution") {
    return Array.isArray(row.use_cases) ? row.use_cases.filter(Boolean) : [];
  }
  return DataTransformer.jsonStringToArray(row.key_features);
}

function featureSectionLabel(row) {
  if (row.action_type === "product") return "Primary Use Cases";
  if (row.action_type === "solution") return "Use Cases";
  return "Key Features";
}

function frontendBase() {
  const base = process.env.FRONTEND_URL || "https://www.neozaar.com/";
  return base.endsWith("/") ? base : `${base}/`;
}

// launch_url is a legacy field the current admin form doesn't collect (empty on every
// listing today), so the CTA falls back to the listing's own Neozaar page — same URL
// pattern already used by the portal's "Live Page" link (frontendUrl + type + '/' + id).
function listingUrl(row) {
  const type = TYPE_LABELS[row.action_type] ? row.action_type : "product";
  return `${frontendBase()}${type}/${row.id}`;
}

// Same logo asset the marketplace's own header uses (Neozaareact/app/layouts/Header.js).
function logoUrl() {
  return `${frontendBase()}image/Logo.png`;
}

// Vendor logo, top-right of the header — products only. Services and solutions are
// Neozaar's own offering, not a third-party ISV's product, so there's no vendor mark to show.
function vendorLogoHtml(row, height = 22) {
  if (row.action_type !== "product" || !row.product_logo) return "";
  // Bordered + shadowed white badge — the border/shadow is what keeps this visible when
  // it sits on a white card background (the composer's block header), not just on the
  // black header bar (the single-listing template) it was originally designed for.
  return `<span style="display:inline-block;background:#ffffff;border:1px solid #ececec;border-radius:10px;padding:7px 9px;line-height:0;box-shadow:0 1px 4px rgba(17,17,17,0.10);"><img src="${attr(row.product_logo)}" alt="${attr(row.brand_name || "")}" height="${height}" style="display:block;border:0;max-height:${height}px;width:auto;"></span>`;
}

// Neozaar's own LinkedIn company page — same link the marketplace footer uses
// (Neozaareact/app/layouts/Footer.js).
const LINKEDIN_URL = "https://www.linkedin.com/company/neozaar/";

// Self-contained "in" badge (LinkedIn brand blue, #0A66C2) — no external asset
// dependency, same reasoning as placeholderGalleryImage() below.
function linkedinIconUrl(size = 28) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#0A66C2"/><text x="14" y="19" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#ffffff" text-anchor="middle">in</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// Top-right "follow us" mark in every header (single-listing and composer). It's
// Neozaar's own nav link, not tied to any one listing, so it's excluded from
// public-link click tracking (data-nz-skip) — same treatment as the footer
// WhatsApp icons in helpBandHtml() below.
function linkedinBadgeHtml(size = 28) {
  return `<a href="${attr(LINKEDIN_URL)}" data-nz-skip="1" target="_blank" style="display:inline-block;line-height:0;text-decoration:none;"><img src="${linkedinIconUrl(size)}" width="${size}" height="${size}" alt="Neozaar on LinkedIn" style="display:block;border:0;border-radius:6px;"></a>`;
}

// A neutral, self-contained "add an image" placeholder — no external asset dependency.
// Shown when a listing has no screenshot yet, so there's still a real <img> element in
// the draft an admin can click to replace (or delete) inside Zoho's own content editor.
// `lines` is one or more strings stacked in the middle of the dashed box — e.g. an upload
// hint plus a recommended-dimensions line for a specific slot (the composer's square
// image, sized differently from this template's own default rectangular gallery image).
function placeholderGalleryImage(width = 600, height = 280, lines = ["Add product image"]) {
  const items = Array.isArray(lines) ? lines : [lines];
  const lineHeight = 22;
  const startY = height / 2 - ((items.length - 1) * lineHeight) / 2;
  const textEls = items
    .map(
      (line, i) =>
        `<text x="50%" y="${startY + i * lineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="#9ca3af" text-anchor="middle" dy=".3em">${line}</text>`
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2" stroke-dasharray="8,6"/>${textEls}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function galleryImageUrl(row) {
  const screenshots = Array.isArray(row.screenshots) ? row.screenshots.filter(Boolean) : [];
  return screenshots[0] || placeholderGalleryImage();
}

function ctaHref(row) {
  const launchUrl = typeof row.launch_url === "string" ? row.launch_url.trim() : "";
  return launchUrl || listingUrl(row);
}

function ctaLabel(row) {
  const fromCtaModel = Array.isArray(row.cta_model) ? row.cta_model[0] : null;
  const label = typeof fromCtaModel === "string" ? fromCtaModel.trim() : "";
  return label || "Learn More";
}

function renderSubject(row) {
  return `New ${labelFor(row.action_type)}: ${row.name || ""}`.trim();
}

// A single feature rendered as a "card": circular check badge + text, on a tinted
// background. Table-based (not flex/grid) because Outlook desktop only renders tables
// reliably — this is an HTML email, not a web page.
function featureCardHtml(feature) {
  return `<table role="presentation" width="100%" style="border-collapse:collapse;background:#fff9f5;border:1px solid #fbe0c8;border-radius:10px;"><tr>
    <td style="padding:13px 14px;" valign="top">
      <table role="presentation" style="border-collapse:collapse;"><tr>
        <td width="24" valign="top" style="padding-right:9px;">
          <span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;background:#ea580c;border-radius:50%;color:#ffffff;font-size:11px;font-weight:700;">&#10003;</span>
        </td>
        <td valign="top" style="font-size:13px;line-height:1.5;color:#333333;">${feature}</td>
      </tr></table>
    </td>
  </tr></table>`;
}

// Lays features out two-per-row. An odd count doesn't leave a lopsided empty cell —
// the final feature gets its own full-width row instead. The `feat-*` classes let the
// @media block in renderCampaignHtml collapse each pair to one-per-row on mobile.
function featureRowsHtml(features) {
  const rows = [];
  for (let i = 0; i < features.length; i += 2) {
    const isLastOdd = i === features.length - 1;
    rows.push(
      isLastOdd
        ? `<table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 10px;"><tr>
            <td valign="top">${featureCardHtml(features[i])}</td>
          </tr></table>`
        : `<table role="presentation" width="100%" class="feat-row" style="border-collapse:collapse;margin:0 0 10px;"><tr>
            <td class="feat-cell" width="49%" valign="top">${featureCardHtml(features[i])}</td>
            <td class="feat-gap" width="2%">&nbsp;</td>
            <td class="feat-cell" width="49%" valign="top">${featureCardHtml(features[i + 1])}</td>
          </tr></table>`
    );
  }
  return rows.join("");
}

// A titled section of checkmark cards — used for Primary Use Cases / Key Features on
// products/solutions, and for Challenges Addressed on services.
function cardSectionHtml(label, items) {
  return items.length
    ? `<div style="margin:4px 0 28px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#ea580c;margin:0 0 12px;">${label}</div>
        ${featureRowsHtml(items)}
      </div>`
    : "";
}

// Any already-HTML paragraph field (long_description, overview) rendered the same way —
// embedded as-is, since it's WYSIWYG editor output, same handling the site already gives
// it elsewhere.
function paragraphBlockHtml(html) {
  return html ? `<div style="font-size:14px;line-height:1.65;margin:0 0 26px;color:#555555;">${html}</div>` : "";
}

// Name + short description as one panel, gradient top-to-bottom from Neozaar black into
// Neozaar orange — background-color is a solid-black fallback for clients that don't
// render CSS gradients (Outlook desktop); everywhere else (Zoho's own preview included)
// gets the actual gradient. Vendor line only ever shows for products — services and
// solutions are Neozaar's own offering, not a third-party brand. The vendor *logo* lives
// in the header now (see renderCampaignHtml), not here.
function heroBlockHtml(row) {
  const vendorHtml = row.brand_name && row.action_type === "product"
    ? `<div style="font-size:13px;letter-spacing:0.03em;color:#cfcfcf;text-transform:uppercase;margin:0 0 10px;">By ${row.brand_name}</div>`
    : "";

  return `
    <div class="hero-pad" style="background-color:#0c0c0c;background-image:linear-gradient(180deg, #0c0c0c 0%, #ea580c 100%);border-radius:18px;padding:26px 28px;margin:0 0 30px;">
      ${vendorHtml}
      <h1 style="font-size:23px;line-height:1.3;font-weight:800;letter-spacing:-0.01em;margin:0 0 ${row.short_description ? "18" : "0"}px;color:#ffffff;">${row.name || ""}</h1>
      ${row.short_description ? `<div style="font-size:15px;line-height:1.6;color:#ffffff;">${row.short_description}</div>` : ""}
    </div>`;
}

function galleryBlockHtml(row) {
  return `<table role="presentation" width="100%" style="border-collapse:collapse;background-color:#ea580c;background-image:linear-gradient(90deg, #0c0c0c, #ea580c);border-radius:18px;margin:0 0 26px;"><tr><td style="padding:5px;">
      <img src="${attr(galleryImageUrl(row))}" alt="${attr(row.name || "")}" width="614" style="display:block;width:100%;height:auto;border-radius:14px;">
    </td></tr></table>`;
}

function ctaBlockHtml(row) {
  return `<table role="presentation" width="100%" style="border-collapse:collapse;margin:6px 0 0;"><tr><td align="center">
      <a href="${attr(ctaHref(row))}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;padding:14px 34px;border-radius:9999px;font-size:15px;font-weight:700;box-shadow:0 6px 18px rgba(234,88,12,0.35);">${ctaLabel(row)} &rarr;</a>
    </td></tr></table>`;
}

// ── Footer "Chat with Neo" help band ───────────────────────────────────────────
// Shared by both this single-listing template and the campaign composer
// (campaignComposer.js imports helpBandHtml from here), so every outbound email —
// single-listing Push to Zoho / Send as Email and the multi-block campaign — carries
// the same "Chat with Neo" prompt just above the black copyright footer.
//
// QR PNG served from the frontend's public/image dir, same host/convention as logoUrl().
// The file lives at Neozaareact/public/image/neo-qr-whatsapp.png and must be deployed
// with the frontend. 300×300 source, displayed at 100px.
const FOOTER_QR_IMAGE_URL = `${frontendBase()}image/neo-qr-whatsapp.png`;

// WhatsApp Business number (same as the site's floating button,
// Neozaareact/app/components/WhatsAppButton.js) with a prefilled message that matches
// what the QR itself encodes. Both the WhatsApp icon and the QR image link here, so a
// desktop reader can click through instead of scanning.
const FOOTER_WHATSAPP_URL = `https://wa.me/917900120345?text=${encodeURIComponent(
  "Hi Neo, can you help me find, build or buy the right thing?"
)}`;

// WhatsApp mark PNG (green disc + white glyph), served from the frontend's public/image
// dir like logoUrl() / the QR. A `data:` URI won't work here — Gmail and Outlook strip
// inline image data. The file lives at Neozaareact/public/image/neo-wa-icon.png.
const FOOTER_CHAT_ICON_URL = `${frontendBase()}image/neo-wa-icon.png`;

// Warm light band sitting just above the black copyright footer: a "Have Questions?"
// prompt on the left, a scannable QR on the right with a "Find, Build or Buy" caption.
// Table-based two-column layout for Outlook; stacks acceptably on narrow mobile widths.
function helpBandHtml() {
  return `
  <div style="background:#f4f1ea;padding:16px 26px;">
    <table role="presentation" width="100%" style="border-collapse:collapse;"><tr>
      <td class="hlp-cell hlp-txt" valign="middle" style="padding-right:16px;">
        <table role="presentation" style="border-collapse:collapse;"><tr>
          <td width="46" valign="middle" style="padding-right:12px;">
            <a href="${attr(FOOTER_WHATSAPP_URL)}" data-nz-skip="1" target="_blank" style="display:block;text-decoration:none;">
              <img src="${attr(FOOTER_CHAT_ICON_URL)}" alt="Chat on WhatsApp" width="38" height="38" style="display:block;border:0;">
            </a>
          </td>
          <td valign="middle">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#ea580c;margin:0 0 4px;">Have Questions?</div>
            <div style="font-size:15px;font-weight:400;line-height:1.3;color:#1a1a1a;">Chat with Neo &mdash; Get Expert Help, Fast</div>
          </td>
        </tr></table>
      </td>
      <td class="hlp-cell hlp-qr" width="100" valign="middle" align="right">
        <a href="${attr(FOOTER_WHATSAPP_URL)}" data-nz-skip="1" target="_blank" style="display:block;text-decoration:none;">
          <img src="${attr(FOOTER_QR_IMAGE_URL)}" alt="Scan or tap to chat with Neo on WhatsApp" width="100" height="100" style="display:block;border:0;margin:0 0 6px;border-radius:8px;">
        </a>
        <div style="font-size:9px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:#ea580c;text-align:center;">Find, Build or Buy</div>
      </td>
    </tr></table>
  </div>`;
}

// Products/solutions: hero, gallery, long description, Primary Use Cases (products) or
// Key Features (solutions), CTA.
function productOrSolutionBodyHtml(row) {
  const features = featureSectionItems(row);
  return `
    ${heroBlockHtml(row)}
    ${galleryBlockHtml(row)}
    ${paragraphBlockHtml(row.long_description)}
    ${cardSectionHtml(featureSectionLabel(row), features)}
  `;
}

// Services: hero, gallery, Overview, Challenges Addressed — deliberately different from
// products/solutions. Overview/Challenges Addressed live in product_other_details, not
// the main products row, joined in by the controller before this ever gets called.
function serviceBodyHtml(row) {
  const challenges = extractListItems(row.challenges_addressed);
  return `
    ${heroBlockHtml(row)}
    ${galleryBlockHtml(row)}
    ${paragraphBlockHtml(row.overview)}
    ${cardSectionHtml("Challenges Addressed", challenges)}
  `;
}

// Styling mirrors the live marketplace (Neozaareact/app/layouts/Header.js): black header
// bar with the same logo asset, orange-600 (#ea580c) as the accent — the same color used
// for the site's own CTA buttons and category icons — and a matching black footer band.
// The outer card is rounded + shadowed for a "premium" feel; Outlook desktop ignores
// border-radius/box-shadow and just falls back to square corners, which is a safe
// degradation, not a broken layout.
//
// Returns a full HTML document (not a fragment): the <meta viewport> + <style> @media
// block is what lets mobile clients collapse the two-per-row feature grid and the help
// band to single-column. Desktop clients — and Outlook desktop, which ignores @media —
// render the unchanged two-column layout. Same approach as campaignComposer.js.
function renderCampaignHtml(row) {
  const bodyHtml = row.action_type === "service" ? serviceBodyHtml(row) : productOrSolutionBodyHtml(row);
  const vendorLogo = vendorLogoHtml(row, 40);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${row.name || "Neozaar"}</title>
<style>
  /* Mobile: collapse the feature grid and help band to a single column, tighten the
     side padding. Desktop (no media match, and Outlook desktop) is untouched. */
  @media only screen and (max-width:600px) {
    .body-pad { padding:26px 18px 24px !important; }
    .hero-pad { padding:22px 18px !important; }
    /* Keep the wrapper a real full-width table (blocking it makes Outlook mobile drop
       width="100%" and shrink each row to its text). Only the cells stack. */
    .feat-row { width:100% !important; table-layout:fixed !important; margin:0 !important; }
    .feat-cell { display:block !important; width:100% !important; box-sizing:border-box !important; padding-bottom:10px !important; }
    .feat-gap { display:none !important; }
    .hlp-cell { display:block !important; width:100% !important; padding:0 !important; text-align:center !important; }
    .hlp-txt table { margin:0 auto !important; }
    .hlp-qr { padding-top:14px !important; }
    .hlp-qr img { margin-left:auto !important; margin-right:auto !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #ececec;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(17,17,17,0.08);">
  <div style="background:#000000;padding:14px 26px;">
    <table role="presentation" width="100%" style="border-collapse:collapse;"><tr>
      <td align="left">
        <table role="presentation" style="border-collapse:collapse;"><tr>
          <td><img src="${attr(logoUrl())}" alt="Neozaar" height="32" style="display:block;border:0;"></td>
          ${vendorLogo ? `<td style="padding:0 14px;"><div style="width:1px;height:24px;line-height:24px;font-size:0;background-color:#4d4d4d;">&nbsp;</div></td><td>${vendorLogo}</td>` : ""}
        </tr></table>
      </td>
      <td align="right">${linkedinBadgeHtml(28)}</td>
    </tr></table>
  </div>
  <div style="background:#ea580c;height:3px;line-height:3px;font-size:0;">&nbsp;</div>
  <div class="body-pad" style="padding:34px 28px 30px;color:#222222;">
    ${bodyHtml}
    ${ctaBlockHtml(row)}
  </div>
  ${helpBandHtml()}
  <div style="background:#000000;padding:20px 26px;text-align:center;">
    <span style="font-size:12px;color:#999999;">&copy; ${new Date().getFullYear()} Neozaar. All rights reserved.</span>
  </div>
</div>
</body>
</html>
`.trim();
}

// Single source of truth for which optional text fields exist per action_type — used
// both by the campaign composer's block renderer (campaignComposer.js) and, via the
// campaigns API, by the portal's field-toggle checkboxes, so the UI can never offer a
// field the renderer doesn't know how to draw. `key` is what a block's `includeFields`
// array stores; `render(row)` produces that field's HTML for a given live listing row.
// Name, vendor logo (products only), and CTA are NOT in here — those are always shown,
// never toggleable.
const AVAILABLE_FIELDS = {
  product: [
    { key: "short_description", label: "Short Description", render: (row) => paragraphBlockHtml(row.short_description) },
    { key: "long_description", label: "Long Description", render: (row) => paragraphBlockHtml(row.long_description) },
    { key: "primary_use_cases", label: "Primary Use Cases", render: (row) => cardSectionHtml("Primary Use Cases", extractListItems(row.primary_use_cases)) },
  ],
  service: [
    { key: "overview", label: "Overview", render: (row) => paragraphBlockHtml(row.overview) },
    { key: "challenges_addressed", label: "Challenges Addressed", render: (row) => cardSectionHtml("Challenges Addressed", extractListItems(row.challenges_addressed)) },
  ],
  solution: [
    { key: "long_description", label: "Overview", render: (row) => paragraphBlockHtml(row.long_description) },
    { key: "use_cases", label: "Use Cases", render: (row) => cardSectionHtml("Use Cases", Array.isArray(row.use_cases) ? row.use_cases.filter(Boolean) : []) },
  ],
};

module.exports = {
  renderSubject,
  renderCampaignHtml,
  ctaHref,
  ctaLabel,
  listingUrl,
  galleryImageUrl,
  frontendBase,
  // exposed for campaignComposer.js's per-block rendering:
  AVAILABLE_FIELDS,
  paragraphBlockHtml,
  cardSectionHtml,
  extractListItems,
  logoUrl,
  vendorLogoHtml,
  ctaBlockHtml,
  placeholderGalleryImage,
  helpBandHtml,
  linkedinBadgeHtml,
  attr,
};
