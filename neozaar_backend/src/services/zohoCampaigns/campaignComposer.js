// Renders a campaign (title + description + an ordered list of blocks, each block
// referencing one product/service/solution) into one combined HTML email.
// Pure functions only — no DB access, no network calls — same testing approach as
// campaignTemplate.js. Reuses that file's per-type field logic and shell pieces rather
// than duplicating them.

const {
  logoUrl,
  vendorLogoHtml,
  listingUrl,
  ctaHref,
  ctaLabel,
  placeholderGalleryImage,
  helpBandHtml,
  linkedinBadgeHtml,
  attr,
} = require("./campaignTemplate");

// Vendor logo chip, then the "By <brand>" line, then the listing name — all stacked
// in normal flow, left-aligned. Was a 2-column table with the logo in a right-floated
// `<td width="1">`: that cell collapsed to zero width in Zoho's mobile app (logo
// vanished) and looked detached from the block in a narrow column. No nested table
// now, so it renders the same in every client.
function blockHeaderHtml(row) {
  const isProduct = row.action_type === "product";
  const logo = isProduct && row.product_logo
    ? `<div style="margin:0 0 10px;line-height:0;">${vendorLogoHtml(row, 24)}</div>`
    : "";
  const vendor = isProduct && row.brand_name
    ? `<div style="font-size:11px;letter-spacing:0.05em;color:#8a8a8a;text-transform:uppercase;font-weight:600;margin:0 0 5px;">By ${row.brand_name}</div>`
    : "";
  return `${logo}${vendor}<h2 style="font-size:19px;line-height:1.3;font-weight:800;margin:0 0 12px;color:#111111;">${row.name || ""}</h2>`;
}

// Square, gradient-framed, cropped placeholder — deliberately NOT pre-filled from the
// listing's own screenshots (see campaign-create's onPickerClosed). The admin's actual
// image choice happens inside Zoho's own content editor after pushing, same "still a real
// <img> element you can click to replace" pattern the single-listing template already
// uses when a listing has no screenshot — here it's the pattern always, by design.
function blockImageHtml(block) {
  const src = block.image || placeholderGalleryImage(600, 600, ["Upload a square photo", "600 × 600px recommended"]);
  // Fluid: width follows the column, height keeps the image's own aspect. No fixed
  // px width/height so it scales cleanly whether the block is side-by-side (desktop)
  // or full-column (mobile). Composer asks admins for a square photo, so this reads
  // as a square in practice.
  return `<table role="presentation" width="100%" style="border-collapse:collapse;background-color:#ea580c;background-image:linear-gradient(135deg, #0c0c0c, #ea580c);border-radius:14px;box-shadow:0 8px 20px rgba(17,17,17,0.14);"><tr><td style="padding:3px;">
      <img src="${attr(src)}" alt="" style="display:block;width:100%;height:auto;border-radius:11px;border:0;">
    </td></tr></table>`;
}

// The short description with an inline "View More" link appended right after the text
// (same paragraph, not a separate button) — always to the listing's own Neozaar page.
function descriptionHtml(row) {
  if (!row.short_description) return "";
  const viewMore = ` <a href="${attr(listingUrl(row))}" data-nz-block="${row.id}" style="color:#ea580c;font-weight:700;text-decoration:none;white-space:nowrap;">View More &rarr;</a>`;
  return `<div style="font-size:14px;line-height:1.65;margin:0 0 20px;color:#555555;">${row.short_description}${viewMore}</div>`;
}

// The listing's own branded CTA button (cta_model label + launch_url, same logic the
// single-listing template uses) — "View More" already lives inline in the description
// above, so this button is the listing's real call to action (e.g. "Free Trial",
// "Request for Demo"), not a second, redundant "View More".
function blockCtaHtml(row) {
  return `<a href="${attr(ctaHref(row))}" data-nz-block="${row.id}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:9999px;font-size:14px;font-weight:700;">${ctaLabel(row)} &rarr;</a>`;
}

// One block, one listing — name (+ vendor logo/brand for products), short description
// (with an inline "View More" link), a square image, and the listing's branded CTA
// button. `renderIndex` is the block's position among only the blocks actually being
// rendered (passed in by renderCombinedHtml), computed fresh every render, so
// removing or reordering blocks can never leave two blocks stuck on the same side.
//
// Layout is "fluid hybrid" — two columns side-by-side on desktop, stacked on mobile,
// using ONLY inline `display:inline-block` + `max-width`, no <style> / no @media.
// This matters because Gmail and Zoho drop the <style> block for non-native
// (custom-domain) accounts, so any @media-based responsiveness silently falls back
// to the raw desktop table and squashes on phones (which is the bug this replaces).
//
//  - Each column is `width:100%` capped by `max-width`: both fit on one line while
//    the container is wide enough, otherwise the second wraps below the first.
//  - The image <div> is ALWAYS first in the DOM, so every block stacks image → text
//    on mobile, whatever side it's on.
//  - `dir="rtl"` on the wrapper flips only the horizontal order for "image-right"
//    blocks (desktop); it does not affect vertical stacking, so mobile order stays
//    identical across all blocks.
//  - Outlook desktop ignores inline-block flow, so it gets a fixed-width ghost
//    <table> inside an [if mso] conditional, cells already in visual order.
function renderBlockHtml(row, block, renderIndex) {
  const imageRight = renderIndex % 2 === 0;
  const header = blockHeaderHtml(row);
  const description = descriptionHtml(row);
  const cta = blockCtaHtml(row);
  const image = blockImageHtml(block);

  // Column max-widths: their sum (+gap) must stay under a typical desktop reading
  // pane so both sit on one line there, but IMG_W also caps how big the image gets
  // when stacked on mobile — 270 keeps it a clear hero without forcing a premature
  // stack on narrower desktop panes.
  const IMG_W = 255;
  const TXT_W = 290;
  const GAP = 15;
  const MSO_W = IMG_W + TXT_W + GAP;

  // padding-bottom on the image column is the gap between image and text once the
  // block stacks on mobile (the horizontal GAP spacer sits beside the image there,
  // not below it). On desktop it's just a little whitespace under the image.
  const imgCol = `<div style="display:inline-block;width:100%;max-width:${IMG_W}px;min-width:160px;vertical-align:top;padding-bottom:16px;">${image}</div>`;
  const txtCol = `<div dir="ltr" style="display:inline-block;width:100%;max-width:${TXT_W}px;min-width:210px;vertical-align:top;text-align:left;font-size:14px;">${header}${description}<div>${cta}</div></div>`;
  const gapCol = `<div style="display:inline-block;width:100%;max-width:${GAP}px;min-width:${GAP}px;font-size:0;line-height:0;">&nbsp;</div>`;

  const msoLeft = imageRight ? txtCol : imgCol;
  const msoRight = imageRight ? imgCol : txtCol;

  return `<table role="presentation" width="100%" style="border-collapse:collapse;background:#ffffff;border:1px solid #ececec;border-radius:14px;margin:0 0 24px;"><tr><td style="padding:0;">
      <div style="background:#ea580c;height:3px;line-height:3px;font-size:0;border-radius:14px 14px 0 0;">&nbsp;</div>
      <div style="padding:22px 20px;">
        <!--[if mso]>
        <table role="presentation" width="${MSO_W}" style="border-collapse:collapse;"><tr>
          <td width="${imageRight ? TXT_W : IMG_W}" valign="top">${msoLeft}</td>
          <td width="${GAP}">&nbsp;</td>
          <td width="${imageRight ? IMG_W : TXT_W}" valign="top">${msoRight}</td>
        </tr></table>
        <![endif]-->
        <!--[if !mso]><!-->
        <div dir="${imageRight ? "rtl" : "ltr"}" style="font-size:0;text-align:center;">${imgCol}${gapCol}${txtCol}</div>
        <!--<![endif]-->
      </div>
    </td></tr></table>`;
}

// Optional campaign banner — sits below the title/description and above the listings.
// Deliberately mirrors campaignTemplate.js's single-listing `galleryBlockHtml`: full
// width, 90deg black→orange gradient frame, 18px outer / 14px inner radius, 5px padding.
// When `header_link` is set the whole image is wrapped in an <a>, so a click in the
// preview (and in the sent email) opens that URL. Rendered only when header_image exists.
function headerImageHtml(campaign) {
  const src = typeof campaign.header_image === "string" ? campaign.header_image.trim() : "";
  if (!src) return "";
  const link = typeof campaign.header_link === "string" ? campaign.header_link.trim() : "";
  const img = `<img src="${attr(src)}" alt="${attr(campaign.title || "")}" width="614" style="display:block;width:100%;height:auto;border-radius:14px;border:0;">`;
  const clickable = link
    ? `<a href="${attr(link)}" target="_blank" style="display:block;text-decoration:none;">${img}</a>`
    : img;
  return `<table role="presentation" width="100%" style="border-collapse:collapse;background-color:#ea580c;background-image:linear-gradient(90deg, #0c0c0c, #ea580c);border-radius:18px;margin:0 0 28px;"><tr><td style="padding:5px;">
      ${clickable}
    </td></tr></table>`;
}

// campaign: { title, description, header_image, header_link, blocks: [{ listingId, actionType, image }] }
// rowsByListingId: { [listingId]: <live row from products (+ product_other_details for services)> }
// A block whose row isn't in rowsByListingId (deleted listing, bad id) is silently
// skipped rather than breaking the whole campaign — same "degrade, don't crash" instinct
// as the rest of this template code. Skipped blocks don't consume a renderIndex slot, so
// the left/right alternation always matches what actually appears on the page.
function renderCombinedHtml(campaign, rowsByListingId) {
  const introHtml = campaign.description
    ? `<div style="font-size:15px;line-height:1.6;color:#444444;margin:0 0 28px;">${campaign.description}</div>`
    : "";
  const headerImage = headerImageHtml(campaign);

  let renderIndex = 0;
  const blocksHtml = (campaign.blocks || [])
    .map((block) => {
      const row = rowsByListingId[block.listingId];
      if (!row) return "";
      return renderBlockHtml(row, block, renderIndex++);
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${campaign.title || "Neozaar"}</title>
<style>
  /* The listing blocks are responsive without any CSS here — see renderBlockHtml's
     fluid-hybrid layout (Gmail / Zoho strip this <style> for custom-domain accounts,
     so nothing layout-critical may live in it). These rules only refine the footer
     help band on clients that DO keep the <style>; where they don't, the band stays
     two-column, which is cramped but readable. */
  @media only screen and (max-width:600px) {
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
      <td align="left"><img src="${attr(logoUrl())}" alt="Neozaar" height="32" style="display:block;border:0;"></td>
      <td align="right">${linkedinBadgeHtml(28)}</td>
    </tr></table>
  </div>
  <div style="background:#ea580c;height:3px;line-height:3px;font-size:0;">&nbsp;</div>
  <div style="padding:34px 28px 30px;color:#222222;">
    <h1 style="font-size:24px;line-height:1.3;font-weight:800;margin:0 0 14px;color:#111111;">${campaign.title || ""}</h1>
    ${introHtml}
    ${headerImage}
    ${blocksHtml}
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

module.exports = { renderBlockHtml, renderCombinedHtml, headerImageHtml, helpBandHtml };
