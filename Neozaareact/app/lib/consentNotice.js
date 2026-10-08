"use client";

/**
 * Consent-notice strings + language handling — DPDPA.
 * ─────────────────────────────────────────────────────────────
 * DPDP Act s.5(3): the notice must be available in English or any
 * of the 22 languages in the Eighth Schedule to the Constitution.
 *
 * Every language has a file in ./notice-i18n/<code>.json (same
 * shape as en.json). `loadNoticeStrings(code)` dynamic-imports the
 * one that is needed; Vite/Next splits each into its own chunk, so
 * only the selected language is fetched. English falls back in if a
 * file is missing or fails to load.
 *
 * Translations are drafts pending a native-speaker / legal pass —
 * see ./notice-i18n/README.md for the confidence tiers.
 */

import en from "./notice-i18n/en.json";

export const EN = en;

// English + the 22 Eighth Schedule languages (ISO 639 codes).
export const NOTICE_LOCALES = [
  { code: "en", english: "English", native: "English" },
  { code: "as", english: "Assamese", native: "অসমীয়া" },
  { code: "bn", english: "Bengali", native: "বাংলা" },
  { code: "brx", english: "Bodo", native: "बर’" },
  { code: "doi", english: "Dogri", native: "डोगरी" },
  { code: "gu", english: "Gujarati", native: "ગુજરાતી" },
  { code: "hi", english: "Hindi", native: "हिन्दी" },
  { code: "kn", english: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ks", english: "Kashmiri", native: "کٲشُر" },
  { code: "kok", english: "Konkani", native: "कोंकणी" },
  { code: "mai", english: "Maithili", native: "मैथिली" },
  { code: "ml", english: "Malayalam", native: "മലയാളം" },
  { code: "mni", english: "Manipuri", native: "ꯃꯤꯇꯩ ꯂꯣꯟ" },
  { code: "mr", english: "Marathi", native: "मराठी" },
  { code: "ne", english: "Nepali", native: "नेपाली" },
  { code: "or", english: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "pa", english: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "sa", english: "Sanskrit", native: "संस्कृतम्" },
  { code: "sat", english: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ" },
  { code: "sd", english: "Sindhi", native: "سنڌي" },
  { code: "ta", english: "Tamil", native: "தமிழ்" },
  { code: "te", english: "Telugu", native: "తెలుగు" },
  { code: "ur", english: "Urdu", native: "اردو" },
];

const LOCALE_CODES = new Set(NOTICE_LOCALES.map((l) => l.code));
const RTL_LOCALES = new Set(["ur", "ks", "sd"]);

export function isRtlLocale(code) {
  return RTL_LOCALES.has(code);
}

export function localeMeta(code) {
  return NOTICE_LOCALES.find((l) => l.code === code) || NOTICE_LOCALES[0];
}

export function isSupportedLocale(code) {
  return LOCALE_CODES.has(code);
}

/**
 * Load the notice strings for a locale. Always resolves — falls back
 * to English on an unknown code or a failed import. The returned
 * object carries `locale` (what actually rendered — record this in
 * the ledger) and `dir` ('rtl' | 'ltr').
 */
export async function loadNoticeStrings(requested) {
  const code = LOCALE_CODES.has(requested) ? requested : "en";
  if (code === "en") return { ...en, locale: "en", dir: "ltr" };
  try {
    const mod = await import(`./notice-i18n/${code}.json`);
    const strings = mod.default || mod;
    return {
      ...en,        // fill any key a translation is missing
      ...strings,
      categories: { ...en.categories, ...(strings.categories || {}) },
      locale: code,
      dir: RTL_LOCALES.has(code) ? "rtl" : "ltr",
    };
  } catch (_) {
    return { ...en, locale: "en", dir: "ltr" };
  }
}
