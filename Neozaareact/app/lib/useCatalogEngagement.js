"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "./track";

const readStoredUtm = () => {
  try {
    return JSON.parse(sessionStorage.getItem("stored_utm_params") || "null") || {};
  } catch {
    return {};
  }
};

// Passive engagement tracking must never interrupt browsing with a login modal.
// Anonymous affiliate clicks remain attached to the first-party attribution
// token; these events are recorded only after the visitor has an authenticated
// customer identity.
export function useCatalogEngagement(entityId, entityType) {
  const trackedKey = useRef("");

  useEffect(() => {
    if (!entityId || typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const user = (() => {
      try { return JSON.parse(localStorage.getItem("user") || "{}"); }
      catch { return {}; }
    })();
    const day = new Date().toISOString().slice(0, 10);
    const key = `${user.id || "customer"}:${entityType}:${entityId}:${day}`;
    if (trackedKey.current === key) return;
    trackedKey.current = key;

    const base = {
      entityType,
      entityId,
      pageUrl: window.location.pathname,
      utm: readStoredUtm(),
    };
    trackEvent({
      ...base,
      eventType: "PRODUCT_VIEW",
      idempotency_key: `catalog-view:${key}`,
    });

    let scrolled = false;
    const onScroll = () => {
      if (scrolled) return;
      const root = document.documentElement;
      const available = Math.max(0, root.scrollHeight - window.innerHeight);
      if (available < 200 || window.scrollY / available < 0.5) return;
      scrolled = true;
      trackEvent({
        ...base,
        eventType: "CATALOG_SCROLL",
        metadata: { depth_percent: 50 },
        idempotency_key: `catalog-scroll-50:${key}`,
      });
      window.removeEventListener("scroll", onScroll);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [entityId, entityType]);
}
