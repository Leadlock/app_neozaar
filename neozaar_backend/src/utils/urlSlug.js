// Readable URL slugs for public shareable links (PUBLIC-LINKS-PLAN.md).
// Pure functions + one async helper; no DB import so it stays unit-testable.

const crypto = require("crypto");

const MAX_SLUG_LEN = 60;

// "Meet Your DPDPA Obligations" -> "meet-your-dpdpa-obligations"
// Accents/other scripts are reduced the same way sanitizeFilename does for blob names.
function slugify(input) {
  return String(input == null ? "" : input)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")        // strip combining accents, keep the base letter
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")           // everything else -> "-"
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LEN)
    .replace(/-+$/g, "");                  // re-trim if the slice landed on a "-"
}

// A short, URL-safe random token (base36). Used for the "Unlisted" suffix and as a
// last-resort base when a title/label slugifies to nothing.
function randomToken(len = 4) {
  return crypto
    .randomBytes(Math.ceil((len * 8) / 5))
    .toString("base64")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .slice(0, len)
    .padEnd(len, "0");
}

// Compose the desired base slug from a title (+ optional channel label), with an
// optional random suffix for unlisted links. Not yet dedup-checked — see uniqueSlug.
function composeSlug({ title, label, unlisted } = {}) {
  const parts = [slugify(title), slugify(label)].filter(Boolean);
  let base = parts.join("-").slice(0, MAX_SLUG_LEN).replace(/-+$/g, "");
  if (!base) base = `link-${randomToken(6)}`;
  if (unlisted) base = `${base}-${randomToken(4)}`;
  return base;
}

// Given a desired slug and an async `exists(slug) => bool`, return the first free
// variant: `slug`, then `slug-2`, `slug-3`, … Caps at 50 tries then falls back to a
// random token so a create can never hard-loop.
async function uniqueSlug(desired, exists) {
  const base = slugify(desired) || `link-${randomToken(6)}`;
  if (!(await exists(base))) return base;
  for (let n = 2; n <= 50; n++) {
    const candidate = `${base.slice(0, MAX_SLUG_LEN - 4)}-${n}`.replace(/-+/g, "-");
    if (!(await exists(candidate))) return candidate;
  }
  return `${base.slice(0, MAX_SLUG_LEN - 8)}-${randomToken(6)}`;
}

module.exports = { slugify, randomToken, composeSlug, uniqueSlug, MAX_SLUG_LEN };
