"use client";

import { useEffect } from "react";
import { currentPurposes, onConsentChange } from "@/app/lib/consent";
import { applyConsentUpdate } from "@/app/lib/consentMode";

/**
 * Pushes a Google Consent Mode v2 `update` on mount (reconciling the
 * inline default with the current stored choice) and on every later
 * consent change. Renders nothing.
 */
export default function ConsentModeBridge() {
  useEffect(() => {
    applyConsentUpdate(currentPurposes());
    return onConsentChange((p) =>
      applyConsentUpdate({ analytics: !!p.analytics, marketing: !!p.marketing })
    );
  }, []);
  return null;
}
