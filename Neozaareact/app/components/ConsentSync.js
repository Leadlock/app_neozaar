"use client";

import { useEffect } from "react";
import { getAnonId, flushConsentQueue, reconcileConsentOnAuth } from "@/app/lib/consent";

/**
 * Mount-once client helper:
 *  - ensures the first-party visitor id exists,
 *  - re-sends any consent events that failed to reach the server earlier,
 *  - if the visitor is signed in, links their existing (possibly anonymous)
 *    choice to their account so /track gating sees it.
 * Renders nothing.
 */
export default function ConsentSync() {
  useEffect(() => {
    getAnonId();
    flushConsentQueue();
    reconcileConsentOnAuth();
  }, []);
  return null;
}
