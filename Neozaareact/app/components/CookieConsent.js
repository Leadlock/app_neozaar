"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  needsConsent,
  readConsent,
  writeConsent,
  onOpenCookiePreferences,
  flushConsentQueue,
} from "@/app/lib/consent";
import {
  EN,
  NOTICE_LOCALES,
  loadNoticeStrings,
  isSupportedLocale,
} from "@/app/lib/consentNotice";

const LOCALE_KEY = "nz_locale";

function LanguagePicker({ value, onChange, id }) {
  return (
    <label className="inline-flex items-center gap-1 text-[11px] text-gray-500">
      <span className="sr-only">Language</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M3 5h12M9 3v2m1.5 14 4-9 4 9M6 5c0 6-3 9-3 9m0 0s3-1 5-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir="ltr"
        className="bg-transparent border border-gray-300 rounded px-1 py-0.5 text-[11px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-300"
      >
        {NOTICE_LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native === l.english ? l.english : `${l.native} — ${l.english}`}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [surface, setSurface] = useState("banner");
  const [locale, setLocale] = useState("en");
  const [t, setT] = useState({ ...EN, locale: "en", dir: "ltr" });
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
  });

  const cats = t.categories || EN.categories;
  const rtl = t.dir === "rtl";

  useEffect(() => {
    flushConsentQueue();

    try {
      const savedLocale = localStorage.getItem(LOCALE_KEY);
      if (savedLocale && isSupportedLocale(savedLocale)) setLocale(savedLocale);
    } catch (_) {}

    const saved = readConsent();
    if (saved) {
      setPreferences({ necessary: true, analytics: saved.purposes.analytics });
    }
    if (needsConsent()) setShowBanner(true);

    const off = onOpenCookiePreferences(() => {
      const cur = readConsent();
      setPreferences({
        necessary: true,
        analytics: cur?.purposes.analytics ?? false,
      });
      setSurface("settings");
      setShowModal(true);
    });
    return off;
  }, []);

  // Load (dynamic-import) the strings for the chosen language.
  useEffect(() => {
    let live = true;
    loadNoticeStrings(locale).then((next) => {
      if (live) setT(next);
    });
    return () => {
      live = false;
    };
  }, [locale]);

  const changeLocale = (code) => {
    setLocale(code);
    try { localStorage.setItem(LOCALE_KEY, code); } catch (_) {}
  };

  // t.locale is the locale of the text actually rendered (falls back to 'en')
  const persist = (prefs, uiSurface) => {
    writeConsent(prefs, uiSurface, t.locale);
    setShowBanner(false);
    setShowModal(false);
  };

  const surfaceNow = () => (showModal ? surface : "banner");
  const handleAcceptAll = () => persist({ analytics: true }, surfaceNow());
  const handleRejectAll = () => persist({ analytics: false }, surfaceNow());
  const handleSavePreferences = () => persist(preferences, surface);
  const openCustomise = () => {
    setSurface("modal");
    setShowModal(true);
  };

  return (
    <>
      {showBanner && (
        <div
          dir={t.dir}
          className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-gray-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-[9999] p-4 md:p-6 transition-all duration-300"
        >
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 md:gap-6 text-black">
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3 mb-1">
                <h2 className="text-base md:text-lg font-bold text-gray-900">{t.bannerTitle}</h2>
                <LanguagePicker id="cc-lang-banner" value={locale} onChange={changeLocale} />
              </div>
              <p className={`text-xs md:text-sm text-gray-600 leading-relaxed max-w-4xl ${rtl ? "text-right" : ""}`}>
                {t.bannerBody} {t.policyLine}{" "}
                <Link href="/cookie-policy" className="underline hover:text-gray-900">
                  {t.cookiePolicy}
                </Link>{" "}
                {t.and}{" "}
                <Link href="/privacy-policy" className="underline hover:text-gray-900">
                  {t.privacyPolicy}
                </Link>
                . {t.withdrawLine}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0" dir="ltr">
              <button
                className="px-5 py-2.5 text-sm font-semibold rounded border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors duration-200 cursor-pointer text-center"
                onClick={openCustomise}
              >
                {t.customise}
              </button>
              <button
                className="px-5 py-2.5 text-sm font-semibold rounded bg-[#0b1c3f] text-white hover:bg-opacity-90 transition-colors duration-200 cursor-pointer text-center"
                onClick={handleRejectAll}
              >
                {t.rejectAll}
              </button>
              <button
                className="px-5 py-2.5 text-sm font-semibold rounded bg-[#2563eb] text-white hover:bg-opacity-90 transition-colors duration-200 cursor-pointer text-center"
                onClick={handleAcceptAll}
              >
                {t.acceptAll}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 animate-fade-in">
          <div
            dir={t.dir}
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-gray-800 border border-gray-100"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 gap-3" dir="ltr">
              <h3 className="text-lg font-bold text-gray-900">{t.modalTitle}</h3>
              <div className="flex items-center gap-3">
                <LanguagePicker id="cc-lang-modal" value={locale} onChange={changeLocale} />
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-100 rounded-lg text-lg leading-none"
                  aria-label="Close"
                >
                  &#10005;
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className={`text-xs md:text-sm text-gray-500 leading-relaxed ${rtl ? "text-right" : ""}`}>
                {t.modalIntro}{" "}
                <Link href="/cookie-policy" className="underline hover:text-gray-700">
                  {t.seeFullList}
                </Link>
              </p>

              {["necessary", "analytics"].map((key) => {
                const cat = cats[key];
                const always = key === "necessary";
                return (
                  <div
                    key={key}
                    className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-800">{cat.label}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{cat.desc}</p>
                      <p className="text-[11px] text-gray-400 mt-1" dir={rtl ? "rtl" : "ltr"}>{cat.detail}</p>
                    </div>
                    {always ? (
                      <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded whitespace-nowrap">
                        {t.alwaysActive}
                      </span>
                    ) : (
                      <label className="relative inline-flex items-center cursor-pointer select-none mt-0.5">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={preferences[key]}
                          onChange={(e) =>
                            setPreferences({ ...preferences, [key]: e.target.checked })
                          }
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100 gap-3" dir="ltr">
              <button
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors cursor-pointer w-full sm:w-auto text-center"
                onClick={handleRejectAll}
              >
                {t.rejectAll}
              </button>
              <button
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors cursor-pointer w-full sm:w-auto text-center"
                onClick={handleSavePreferences}
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
