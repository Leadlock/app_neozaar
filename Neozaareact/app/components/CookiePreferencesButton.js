"use client";

import { openCookiePreferences } from "@/app/lib/consent";

/**
 * Client button that opens the cookie preference centre. Usable from
 * server components (e.g. the Cookie Policy page).
 */
export default function CookiePreferencesButton({ className = "", label = "Manage cookie preferences" }) {
  return (
    <button
      type="button"
      onClick={openCookiePreferences}
      className={
        className ||
        "inline-flex items-center px-4 py-2 text-sm font-semibold rounded border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
      }
    >
      {label}
    </button>
  );
}
