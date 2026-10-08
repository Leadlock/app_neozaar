"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { currentPurposes, onConsentChange } from "@/app/lib/consent";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || "G-88XST2Y1BK";

/**
 * GA4 loader gated on analytics consent. The script is not injected at
 * all until the visitor opts in; if they opt in later (without a reload)
 * it mounts then. Consent Mode still governs its runtime behaviour.
 */
export default function Analytics4() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(currentPurposes().analytics === true);
    return onConsentChange((p) => setAllowed(p.analytics === true));
  }, []);

  if (!allowed || !GA4_ID) return null;

  return (
    <>
      <Script
        id="ga4-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          gtag('js', new Date());
          gtag('config', '${GA4_ID}');
        `}
      </Script>
    </>
  );
}
