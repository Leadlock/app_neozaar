'use client';

import { useEffect, useState } from 'react';

// The discovery/recommendation API returns a name (+ sometimes a vendor) but no
// image. NeoZaar's marketplace catalog and brands endpoints do carry images, so
// we build a name → image and vendor → logo lookup once per page session and
// resolve recommendation items against it.
let cache = null; // { byName: Map<normName, url>, byVendor: Map<normName, url> }
let inflight = null;

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const base = () => process.env.NEXT_PUBLIC_API_BASE;

async function fetchCatalog(actionType) {
  try {
    const r = await fetch(
      `${base()}catalog/marketplace/products?page=1&limit=300&action_type=${actionType}&action_for=both`
    );
    const j = await r.json();
    return Array.isArray(j?.data) ? j.data : [];
  } catch {
    return [];
  }
}

function load() {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = Promise.all([
    fetchCatalog('solution'),
    fetchCatalog('product'),
    fetchCatalog('service'),
    fetch(`${base()}brands/get-all-brand?page_type=vendor`).then((r) => r.json()).catch(() => ({})),
  ])
    .then(([sol, prod, svc, brandsJson]) => {
      const byName = new Map();
      const addAll = (arr) =>
        (Array.isArray(arr) ? arr : []).forEach((x) => {
          const nm = norm(x?.name || x?.title);
          const img = x?.image_url || x?.product_logo || x?.logo || x?.icon;
          if (nm && img && !byName.has(nm)) byName.set(nm, img);
        });
      // solutions first, then products, then services — first match wins
      addAll(sol);
      addAll(prod);
      addAll(svc);

      const byVendor = new Map();
      (Array.isArray(brandsJson?.data) ? brandsJson.data : []).forEach((b) => {
        if (b?.name && b?.icon) byVendor.set(norm(b.name), b.icon);
      });

      cache = { byName, byVendor };
      return cache;
    })
    .catch(() => {
      cache = { byName: new Map(), byVendor: new Map() };
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useRecoImages() {
  const [c, setC] = useState(cache);
  useEffect(() => {
    if (c) return;
    let alive = true;
    load().then((v) => alive && setC(v));
    return () => {
      alive = false;
    };
  }, [c]);
  return c; // null until the first fetch resolves, then { byName, byVendor }
}

// item: a recommendation entry — { name, vendor, ... }. A product usually carries
// a vendor, and that brand logo is the most recognisable + least ambiguous, so
// try it first; services/solutions have no vendor, so fall back to matching the
// catalog image by name.
export function imageFor(c, item) {
  if (!c || !item) return null;
  const byVendor = item.vendor ? c.byVendor.get(norm(item.vendor)) : null;
  return byVendor || c.byName.get(norm(item.name)) || null;
}
