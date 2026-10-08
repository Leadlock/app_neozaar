// ─── Shared utilities for the product page ───────────────────────────────────

export const containsHTML = (str) => {
  if (!str) return false;
  return /<\/?[a-z][\s\S]*>/i.test(str);
};

export const cleanHTML = (html) => {
  if (!html) return "";
  return html.toString().replace(/&nbsp;/g, " ");
};

export const stripHTML = (html) => {
  if (!html) return "";
  return html.toString().replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
};

// Validate slug/id — only allow alphanumeric, hyphens, underscores (max 200 chars)
export const validateIdentifier = (id) => {
  if (!id || typeof id !== "string") return null;
  const clean = id.trim();
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(clean)) return null;
  return clean;
};

export const parseKeyFeatures = (featuresString) => {
  if (!featuresString) return [];
  try {
    if (Array.isArray(featuresString)) return featuresString.filter(Boolean);
    const parsed = JSON.parse(featuresString);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [featuresString];
  } catch {
    if (typeof featuresString === "string") {
      return featuresString.split(/[,|\n]/).map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }
};

export const getProductLink = (product) => {
  if (product.action_type === "service") return `/service/${product.slug || product.id}`;
  if (product.action_type === "solution") return `/solution/${product.slug || product.id}`;
  return `/product/${product.slug || product.id}`;
};

// ─── Cache ────────────────────────────────────────────────────────────────────
const CACHE_KEY = "neozaar_product_url_cache";
const PRODUCT_CACHE_KEY = "neozaar_product_data_cache";
const MAX_CACHE_SIZE = 20;
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export const getProductCache = (identifier) => {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(`${PRODUCT_CACHE_KEY}_${identifier}`);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (!parsed?.timestamp || !parsed?.data) return null;
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(`${PRODUCT_CACHE_KEY}_${identifier}`);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

export const setProductCache = (identifier, data) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${PRODUCT_CACHE_KEY}_${identifier}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {}
};

const getUrlCache = () => {
  if (typeof window === "undefined") return { urls: [], lastVisited: {} };
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return { urls: [], lastVisited: {} };
    const parsed = JSON.parse(cached);
    const cutoff = Date.now() - CACHE_EXPIRY_MS;
    return {
      urls: (parsed.urls || []).filter((i) => i.timestamp > cutoff),
      lastVisited: parsed.lastVisited || {},
    };
  } catch {
    return { urls: [], lastVisited: {} };
  }
};

const saveUrlCache = (cache) => {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
};

export const saveCurrentUrlToCache = (slug) => {
  if (typeof window === "undefined" || !slug) return;
  const cache = getUrlCache();
  const url = window.location.href;
  const idx = cache.urls.findIndex((i) => i.url === url);
  if (idx !== -1) {
    cache.urls[idx].timestamp = Date.now();
  } else {
    cache.urls.unshift({ url, pathname: window.location.pathname, timestamp: Date.now(), productId: slug });
    if (cache.urls.length > MAX_CACHE_SIZE) cache.urls = cache.urls.slice(0, MAX_CACHE_SIZE);
  }
  cache.lastVisited = { url, timestamp: Date.now(), productId: slug };
  saveUrlCache(cache);
};

// ─── Cookie utilities ─────────────────────────────────────────────────────────
export const cookieUtils = {
  set: (name, value, days = 1) => {
    if (typeof document === "undefined") return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    const v = typeof value === "object" ? JSON.stringify(value) : value;
    document.cookie = `${name}=${v};expires=${expires};path=/;SameSite=Lax`;
  },
  get: (name) => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.split(";").find((c) => c.trim().startsWith(`${name}=`));
    if (!match) return null;
    const val = match.trim().substring(name.length + 1);
    try { return JSON.parse(val); } catch { return val; }
  },
  remove: (name) => {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  },
};

// ─── UTM utilities ────────────────────────────────────────────────────────────
export const utmUtils = {
  store: (searchParams) => {
    if (!searchParams || typeof window === "undefined") return null;
    const p = {
      utm_source: searchParams.get("utm_source"),
      utm_medium: searchParams.get("utm_medium"),
      utm_campaign: searchParams.get("utm_campaign"),
      utm_term: searchParams.get("utm_term"),
      utm_content: searchParams.get("utm_content"),
      timestamp: Date.now(),
      url: window.location.href,
    };
    if (p.utm_source || p.utm_medium || p.utm_campaign) {
      cookieUtils.set("stored_utm_params", p, 30);
      try { sessionStorage.setItem("stored_utm_params", JSON.stringify(p)); } catch {}
      return p;
    }
    return null;
  },
  get: () => {
    if (typeof window !== "undefined") {
      try {
        const s = sessionStorage.getItem("stored_utm_params");
        if (s) return JSON.parse(s);
      } catch {}
    }
    return cookieUtils.get("stored_utm_params");
  },
  clear: () => {
    cookieUtils.remove("stored_utm_params");
    if (typeof window !== "undefined") {
      try { sessionStorage.removeItem("stored_utm_params"); } catch {}
    }
  },
  appendToUrl: (url, params) => {
    if (!params || !url || typeof window === "undefined") return url;
    try {
      const u = new URL(url, window.location.origin);
      if (params.utm_source) u.searchParams.set("utm_source", params.utm_source);
      if (params.utm_medium) u.searchParams.set("utm_medium", params.utm_medium);
      if (params.utm_campaign) u.searchParams.set("utm_campaign", params.utm_campaign);
      if (params.utm_term) u.searchParams.set("utm_term", params.utm_term);
      if (params.utm_content) u.searchParams.set("utm_content", params.utm_content);
      return u.toString();
    } catch { return url; }
  },
};

// ─── Redirect utilities ───────────────────────────────────────────────────────
export const redirectUtils = {
  store: (url, tracker = null, utm = null) => {
    const data = { url, tracker, utm, timestamp: Date.now() };
    cookieUtils.set("redirect_after_login", data, 180);
    if (typeof window !== "undefined") {
      try { sessionStorage.setItem("redirect_after_login", JSON.stringify(data)); } catch {}
    }
  },
  get: () => {
    if (typeof window !== "undefined") {
      try {
        const s = sessionStorage.getItem("redirect_after_login");
        if (s) return JSON.parse(s);
      } catch {}
    }
    return cookieUtils.get("redirect_after_login");
  },
  clear: () => {
    cookieUtils.remove("redirect_after_login");
    if (typeof window !== "undefined") {
      try { sessionStorage.removeItem("redirect_after_login"); } catch {}
    }
  },
};

// ─── Tracker cookie ───────────────────────────────────────────────────────────
export const setTrackerCookie = (data) => { if (data) cookieUtils.set("user_tracker", data, 180); };
export const getTrackerCookie = () => cookieUtils.get("user_tracker");
export const updateTrackerCookie = (newData) => {
  const existing = getTrackerCookie() || {};
  setTrackerCookie({ ...existing, ...newData, lastUpdated: Date.now() });
};

// ─── Fetch with retry ─────────────────────────────────────────────────────────
export const fetchWithRetry = async (url, options = {}, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        ...options,
        mode: "cors",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...options.headers },
      });
      if (res.status === 401 || res.status === 404) return res;
      if (res.ok) return res;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
  throw new Error("Max retries exceeded");
};
