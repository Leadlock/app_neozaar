"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { currentPurposes, onConsentChange } from "@/app/lib/consent";

/**
 * Marketing visitor/session tracker (Mautic-style behavioral tracking for
 * the backend Marketing module — see /api/marketing/events). Gated on
 * analytics consent exactly like Analytics4: the script is not injected at
 * all until the visitor opts in, and mounts immediately if they opt in
 * later without a reload.
 *
 * Fires a PAGE_VIEW on first mount and on every client-side route change —
 * Next.js app-router navigations don't reload the page, so a plain
 * `<script>`-only load would otherwise only ever see the first URL.
 */
export default function MarketingTracker() {
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setAllowed(currentPurposes().analytics === true);
    return onConsentChange((p) => setAllowed(p.analytics === true));
  }, []);

  useEffect(() => {
    if (ready && window.NeoZaarMarketing) window.NeoZaarMarketing.track("PAGE_VIEW");
  }, [ready, pathname]);

  if (!allowed) return null;

  return (
    <Script
      src="/marketing-tracker.js"
      strategy="afterInteractive"
      onReady={() => setReady(true)}
    />
  );
}
