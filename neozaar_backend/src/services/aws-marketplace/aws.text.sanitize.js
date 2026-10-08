/**
 * Text sanitiser for AWS Marketplace Catalog API payloads.
 *
 * AWS rejects strings that contain:
 *   - control characters: code points 0x00-0x08, 0x0B-0x1F, 0x7F-0x84, 0x86-0x9F
 *     (so \r is forbidden; \t = 0x09 and \n = 0x0A are allowed)
 *   - typographic "smart" punctuation in text fields, e.g.
 *     "Invalid 'LongDescription' field. Remove unsupported characters [<em-dash>]."
 *
 * Implemented as a per-code-point scan so the source file stays pure ASCII
 * (no literal special characters, no \u escapes to be mangled by tooling).
 */

// Code point -> ASCII replacement for smart / typographic punctuation.
const SMART_MAP = {
  0x2010: '-', 0x2011: '-', 0x2012: '-', 0x2013: '-', 0x2014: '-', 0x2015: '-', // dashes
  0x2018: '\'', 0x2019: '\'', 0x201a: '\'', 0x201b: '\'', 0x2032: '\'',              // single quotes / prime
  0x201c: '"', 0x201d: '"', 0x201e: '"', 0x201f: '"', 0x2033: '"',              // double quotes / double prime
  0x2026: '...',                                                                 // ellipsis
  0x2022: '-', 0x00b7: '-', 0x2219: '-',                                         // bullet / middle dot
  0x00a0: ' ', 0x2007: ' ', 0x2009: ' ', 0x202f: ' ',                            // non-breaking / thin spaces
  0x2028: '\n', 0x2029: '\n',                                                    // line / paragraph separators
  0x200b: '',                                                                    // zero-width space
};

function isForbiddenControl(c) {
  return (
    c <= 0x08 ||
    (c >= 0x0b && c <= 0x1f) ||
    (c >= 0x7f && c <= 0x84) ||
    (c >= 0x86 && c <= 0x9f)
  );
}

function sanitizeText(s) {
  if (typeof s !== 'string') return s;
  const normalised = s.replace(/\r\n?/g, '\n');
  let out = '';
  for (const ch of normalised) {
    const c = ch.codePointAt(0);
    if (isForbiddenControl(c)) continue;
    if (Object.prototype.hasOwnProperty.call(SMART_MAP, c)) {
      out += SMART_MAP[c];
      continue;
    }
    out += ch;
  }
  return out.trim();
}

function sanitizeDeep(obj) {
  if (typeof obj === 'string') return sanitizeText(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeDeep);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = sanitizeDeep(v);
    return out;
  }
  return obj;
}

// Product descriptions come from a rich-text editor and contain HTML. The
// listing APIs take plain text only, so convert to text and decode entities.
function htmlToText(s) {
  if (typeof s !== 'string') return s;
  const text = s
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '- ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, '\'')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || null;
}

module.exports = { sanitizeText, sanitizeDeep, htmlToText };
