"use client";

// ─── External imports ─────────────────────────────────────────────────────────
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";
import {
  AlertCircle, ArrowRight, Lock, LogIn,
  CheckCircle, Cloud, DollarSign, Package, Briefcase, Layers,
} from "lucide-react";

// ─── Layout ───────────────────────────────────────────────────────────────────
import Header from "../layouts/Header";
import Footer from "../layouts/Footer";

// ─── Sub-components ───────────────────────────────────────────────────────────
import ProductHero            from "../../components/product/ProductHero";
import ProductTrustStrip      from "../../components/product/ProductTrustStrip";
import ProductTabs            from "../../components/product/ProductTabs";
import ProductOverview        from "../../components/product/ProductOverview";
import { ProductFeatures, ProductUseCases, ProductTechnical, ProductMetadata } from "../../components/product/ProductSections";
import ProductResources       from "../../components/product/ProductResources";
import ProductRecommendations from "../../components/product/ProductRecommendations";
import ProductAds             from "../../components/product/ProductAds";
import ProductLoginModal      from "../../components/product/ProductLoginModal";
import { ProductDemoModal, ProductSuccessModal } from "../../components/product/ProductModals";
import ProductGalleryModal    from "../../components/product/ProductGalleryModal";
import ProductBottomStrip     from "../../components/product/ProductBottomStrip";

// ─── Tracking ─────────────────────────────────────────────────────────────────
import { trackEvent } from "../lib/track";
import { useCatalogEngagement } from "../lib/useCatalogEngagement";

// ═════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════════════════════════════════
const PRODUCT_CACHE_KEY  = "neozaar_product_data_cache";
const URL_CACHE_KEY      = "neozaar_product_url_cache";
const MAX_CACHE_SIZE     = 20;
const CACHE_EXPIRY_MS    = 7 * 24 * 60 * 60 * 1000; // 7 days

const CTA_LEADTYPE_MAP = {
  "request a demo"    : "demo",
  "book an assessment": "book_assessment",
  "talk to an expert" : "talk_to_expert",
  "proof of concept"  : "book_assessment",
};

// ═════════════════════════════════════════════════════════════════════════════
// SECURITY — identifier validation (fixes SSRF: lines 427, 1068, 1167, 1341)
// Only allow alphanumeric, hyphens, underscores — max 200 chars
// ═════════════════════════════════════════════════════════════════════════════
const validateIdentifier = (id) => {
  if (!id || typeof id !== "string") return null;
  const clean = id.trim();
  return /^[a-zA-Z0-9_-]{1,200}$/.test(clean) ? clean : null;
};

// ═════════════════════════════════════════════════════════════════════════════
// CACHE UTILITIES
// ═════════════════════════════════════════════════════════════════════════════
const getProductCache = (identifier) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${PRODUCT_CACHE_KEY}_${identifier}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !parsed?.data) return null;
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(`${PRODUCT_CACHE_KEY}_${identifier}`);
      return null;
    }
    return parsed.data;
  } catch { return null; }
};

const setProductCache = (identifier, data) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${PRODUCT_CACHE_KEY}_${identifier}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {}
};

const getUrlCache = () => {
  if (typeof window === "undefined") return { urls: [], lastVisited: null };
  try {
    const raw = localStorage.getItem(URL_CACHE_KEY);
    if (!raw) return { urls: [], lastVisited: null };
    const parsed = JSON.parse(raw);
    const cutoff = Date.now() - CACHE_EXPIRY_MS;
    return {
      urls: (parsed.urls || []).filter((i) => i.timestamp > cutoff),
      lastVisited: parsed.lastVisited || null,
    };
  } catch { return { urls: [], lastVisited: null }; }
};

const saveUrlCache = (cache) => {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(URL_CACHE_KEY, JSON.stringify(cache)); } catch {}
};

const saveCurrentUrlToCache = (slug) => {
  if (typeof window === "undefined" || !slug) return;
  const cache = getUrlCache();
  const url   = window.location.href;
  const idx   = cache.urls.findIndex((i) => i.url === url);
  if (idx !== -1) {
    cache.urls[idx].timestamp = Date.now();
  } else {
    cache.urls.unshift({ url, pathname: window.location.pathname, timestamp: Date.now(), productId: slug });
    if (cache.urls.length > MAX_CACHE_SIZE) cache.urls = cache.urls.slice(0, MAX_CACHE_SIZE);
  }
  cache.lastVisited = { url, timestamp: Date.now(), productId: slug };
  saveUrlCache(cache);
};

// ═════════════════════════════════════════════════════════════════════════════
// COOKIE UTILITIES
// ═════════════════════════════════════════════════════════════════════════════
const cookieUtils = {
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

// ═════════════════════════════════════════════════════════════════════════════
// UTM UTILITIES
// ═════════════════════════════════════════════════════════════════════════════
const utmUtils = {
  store: (searchParams) => {
    if (!searchParams || typeof window === "undefined") return null;
    const p = {
      utm_source  : searchParams.get("utm_source"),
      utm_medium  : searchParams.get("utm_medium"),
      utm_campaign: searchParams.get("utm_campaign"),
      utm_term    : searchParams.get("utm_term"),
      utm_content : searchParams.get("utm_content"),
      timestamp   : Date.now(),
      url         : window.location.href,
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
      if (params.utm_source)   u.searchParams.set("utm_source",   params.utm_source);
      if (params.utm_medium)   u.searchParams.set("utm_medium",   params.utm_medium);
      if (params.utm_campaign) u.searchParams.set("utm_campaign", params.utm_campaign);
      if (params.utm_term)     u.searchParams.set("utm_term",     params.utm_term);
      if (params.utm_content)  u.searchParams.set("utm_content",  params.utm_content);
      return u.toString();
    } catch { return url; }
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// REDIRECT UTILITIES
// ═════════════════════════════════════════════════════════════════════════════
const redirectUtils = {
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

// ═════════════════════════════════════════════════════════════════════════════
// TRACKER COOKIE
// ═════════════════════════════════════════════════════════════════════════════
const setTrackerCookie    = (data) => { if (data) cookieUtils.set("user_tracker", data, 180); };
const getTrackerCookie    = ()     => cookieUtils.get("user_tracker");
const updateTrackerCookie = (newData) => {
  const existing = getTrackerCookie() || {};
  setTrackerCookie({ ...existing, ...newData, lastUpdated: Date.now() });
};

// ═════════════════════════════════════════════════════════════════════════════
// FETCH WITH RETRY
// ═════════════════════════════════════════════════════════════════════════════
const fetchWithRetry = async (url, options = {}, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        ...options,
        mode       : "cors",
        credentials: "include",
        headers    : { "Content-Type": "application/json", ...options.headers },
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

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════════════
const cleanHTML = (html) => {
  if (!html) return "";
  return html.toString().replace(/&nbsp;/g, " ");
};

const getProductLink = (product) => {
  if (product.action_type === "service")  return `/service/${product.id}`;
  if (product.action_type === "solution") return `/solution/${product.id}`;
  return `/product/${product.id}`;
};

// This one component renders /product/[slug], /service/[slug] AND
// /solution/[slug] (all three route to it — see the sibling page.js files),
// so the view-tracking event type has to branch on the item's own
// action_type rather than being fixed to one type.
const trackDetailView = (product) => {
  if (!product?.id) return;
  const eventType = product.action_type === "service" ? "SERVICE_VIEW"
    : product.action_type === "solution" ? "SOLUTION_VIEW"
    : "PRODUCT_VIEW";
  window.NeoZaarMarketing?.track(eventType, { refType: product.action_type || "product", refId: product.id });
};

const decodePostgresArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    if (val.startsWith("{") && val.endsWith("}")) {
      return val.slice(1, -1).split(",").map(s => s.trim().replace(/^"|"$/g, ""));
    }
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
};

const groupByBrand = (items) => {
  const map = {};
  items.forEach(item => {
    const brand = item.brand_name || "Other";
    if (!map[brand]) map[brand] = { brand, logo: item.product_logo, items: [] };
    map[brand].items.push(item);
  });
  return Object.values(map);
};

// ═════════════════════════════════════════════════════════════════════════════
// SEO META TAGS COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
function SeoMetaTags({ seoData, productDetails }) {
  const product = productDetails?.product;

  const metaTitle = seoData?.meta_title
    || (product?.product_name ? `${product.product_name} - NeoZaar Marketplace` : "Product - NeoZaar Marketplace");

  const metaDesc = seoData?.meta_description
    || (product?.short_description
        ? cleanHTML(product.short_description).replace(/<[^>]*>/g, "").substring(0, 160)
        : "Explore this product on NeoZaar Marketplace.");

  const canonicalUrl = seoData?.canonical_url
    || (typeof window !== "undefined" ? window.location.href : "");

  const ogImage = seoData?.og_image
    || product?.screenshots?.[0]
    || product?.product_logo
    || "/brand-log/neozaardefault.jpg";

  const robotsContent = seoData
    ? `${seoData.is_index === 1 ? "index" : "noindex"}, ${seoData.is_follow === 1 ? "follow" : "nofollow"}`
    : "index, follow";

  const productSchema = product ? {
    "@context" : "https://schema.org",
    "@type"    : "Product",
    name       : product.product_name || product.name,
    description: cleanHTML(product.short_description || "").replace(/<[^>]*>/g, ""),
    image      : product.screenshots?.[0] || product.product_logo || "/brand-log/neozaardefault.jpg",
    brand      : { "@type": "Brand", name: product.brand_name || "NeoZaar" },
    offers     : {
      "@type"       : "Offer",
      availability  : "https://schema.org/InStock",
      priceCurrency : "INR",
      price         : product.starting_price && Number(product.starting_price) > 1 ? product.starting_price : "0",
      url           : canonicalUrl,
    },
  } : null;

  const breadcrumbSchema = {
    "@context"       : "https://schema.org",
    "@type"          : "BreadcrumbList",
    itemListElement  : [
      { "@type": "ListItem", position: 1, name: "Home",        item: typeof window !== "undefined" ? window.location.origin : "" },
      { "@type": "ListItem", position: 2, name: "Marketplace", item: typeof window !== "undefined" ? `${window.location.origin}/marketplace` : "" },
      { "@type": "ListItem", position: 3, name: product?.product_name || product?.name || "Product", item: canonicalUrl },
    ],
  };

  return (
    <>
      <title>{metaTitle}</title>
      <meta name="description"        content={metaDesc} />
      {seoData?.meta_keywords && <meta name="keywords" content={seoData.meta_keywords} />}
      <link rel="canonical"           href={canonicalUrl} />
      <meta name="robots"             content={robotsContent} />

      <meta property="og:title"       content={seoData?.og_title       || metaTitle} />
      <meta property="og:description" content={seoData?.og_description || metaDesc} />
      <meta property="og:image"       content={ogImage} />
      <meta property="og:type"        content="product" />
      <meta property="og:url"         content={canonicalUrl} />

      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={seoData?.twitter_title       || metaTitle} />
      <meta name="twitter:description" content={seoData?.twitter_description || metaDesc} />
      <meta name="twitter:image"       content={seoData?.twitter_image       || ogImage} />

      {product?.updated_at && <meta property="article:modified_time" content={product.updated_at} />}

      {seoData?.schema_markup ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: seoData.schema_markup }} />
      ) : (
        <>
          {productSchema && (
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
          )}
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        </>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function ProductPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const params       = useParams();

  // ── Routing ────────────────────────────────────────────────────────────────
  const [slug, setSlug] = useState(null);

  useEffect(() => {
    const resolve = async () => {
      try {
        const resolved = await params;
        setSlug(resolved?.slug || null);
      } catch {}
    };
    resolve();
  }, [params]);

  // ── Core data state ────────────────────────────────────────────────────────
  const [productDetails,  setProductDetails]  = useState(null);
  useCatalogEngagement(productDetails?.product?.id, "product");
  const [seoData,         setSeoData]         = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [adsData,         setAdsData]         = useState(null);
  const [featuredAds,     setFeaturedAds]     = useState([]);

  // ── Loading / error state ──────────────────────────────────────────────────
  const [isLoading,    setIsLoading]    = useState(true);
  const [isNotFound,   setIsNotFound]   = useState(false);
  const [fetchError,   setFetchError]   = useState(null);
  const [loadingAds,   setLoadingAds]   = useState(false);

  // ── Auth state ─────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId,          setUserId]          = useState(null);

  // ── Login modal state ──────────────────────────────────────────────────────
  const [showLoginModal,  setShowLoginModal]  = useState(false);
  const [pendingAction,   setPendingAction]   = useState(null);
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [showPassword,    setShowPassword]    = useState(false);
  const [loginError,      setLoginError]      = useState("");
  const [isLoggingIn,     setIsLoggingIn]     = useState(false);

  // ── Demo modal state ────────────────────────────────────────────────────────
  const [isModalOpen,      setIsModalOpen]      = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [message,          setMessage]          = useState("");

  // ── Gallery state ──────────────────────────────────────────────────────────
  const [isGalleryOpen,     setIsGalleryOpen]     = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview");

  // ── Linked products/services/solutions ──────────────────────────────────────
  const [linkedProductsByBrand, setLinkedProductsByBrand] = useState([]);
  const [linkedServicesByBrand, setLinkedServicesByBrand] = useState([]);
  const [linkedSolutions, setLinkedSolutions] = useState([]);

  // ── Tracking ───────────────────────────────────────────────────────────────
  const [hasTrackedView, setHasTrackedView] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const abortControllerRef = useRef(null);
  const hasFetchedRef      = useRef(false);
  const productIdRef       = useRef(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredScreenshots = useMemo(() => {
    if (!productDetails?.product?.screenshots) return [];
    return productDetails.product.screenshots.filter(
      (s) => typeof s === "string" && s.trim() !== ""
    );
  }, [productDetails]);

  const rawCta   = productDetails?.cta_model?.[0] || productDetails?.product?.cta_model?.[0];
  const leadType = CTA_LEADTYPE_MAP[rawCta?.toLowerCase()] || "demo";

  // ── Cal.com init ───────────────────────────────────────────────────────────
  useEffect(() => {
    (function (C, A, L) {
      let p = (a, ar) => { a.q.push(ar); };
      let d = document;
      C.Cal = C.Cal || function () {
        let cal = C.Cal, ar = arguments;
        if (!cal.loaded) {
          cal.ns = {}; cal.q = cal.q || [];
          const s = d.createElement("script"); s.src = A; d.head.appendChild(s); cal.loaded = true;
        }
        if (ar[0] === L) {
          const api = function () { p(api, arguments); };
          const ns  = ar[1]; api.q = api.q || [];
          if (typeof ns === "string") { cal.ns[ns] = cal.ns[ns] || api; p(cal.ns[ns], ar); p(cal, ["initNamespace", ns]); }
          else p(cal, ar); return;
        }
        p(cal, ar);
      };
    })(window, "https://app.cal.com/embed/embed.js", "init");
    window.Cal("init", "30min", { origin: "https://app.cal.com" });
    window.Cal.ns["30min"]("ui", { layout: "month_view", hideEventTypeDetails: false });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════
  const checkAuth = useCallback(() => {
    if (typeof window === "undefined") return false;
    try {
      const token  = localStorage.getItem("token");
      const expiry = localStorage.getItem("tokenExpiry");
      if (!token || token.trim() === "") return false;
      if (expiry && Date.now() > parseInt(expiry)) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("tokenExpiry");
        return false;
      }
      return true;
    } catch { return false; }
  }, []);

  useEffect(() => {
    setIsAuthenticated(checkAuth());
  }, [checkAuth]);

  // ── Store UTM params on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && searchParams) {
      utmUtils.store(searchParams);
    }
  }, [searchParams]);

  // ── Resolve slug → userId ──────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    const productid = searchParams?.get("productid");
    const raw       = productid || slug;
    const safe      = validateIdentifier(raw);   // SSRF fix
    if (safe && safe !== productIdRef.current) {
      productIdRef.current = safe;
      setUserId(safe);
    } else if (!safe) {
      setIsNotFound(true);
      setIsLoading(false);
    }
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  }, [searchParams, slug]);

  // ── Save URL to cache once slug is known ──────────────────────────────────
  useEffect(() => {
    if (slug) saveCurrentUrlToCache(slug);
  }, [slug]);

  // ── Update document title ─────────────────────────────────────────────────
  useEffect(() => {
    if (productDetails?.product?.product_name) {
      document.title = seoData?.meta_title
        || `${productDetails.product.product_name} - NeoZaar Marketplace`;
    }
  }, [productDetails, seoData]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH SEO DATA
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchSeoData = useCallback(async (identifier) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}seo/page/${identifier}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === "success") setSeoData(data.data);
      }
    } catch {}
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH ADS
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchAds = useCallback(async (productId) => {
    if (!productId) return;
    setLoadingAds(true);
    try {
      const token   = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res  = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}advertisment/ads?page=product&product_id=${productId}`,
        { headers }
      );
      const data = await res.json();
      if (data.status === "success" && data.data) setAdsData(data.data);
      else setAdsData(null);
    } catch { setAdsData(null); }
    finally { setLoadingAds(false); }
  }, []);

  useEffect(() => {
    if (productDetails?.product?.id) fetchAds(productDetails.product.id);
  }, [productDetails?.product?.id, fetchAds]);

  // ── Fetch featured homepage ads (shown above footer) ──────────────────────
  useEffect(() => {
    const fetchFeaturedAds = async () => {
      try {
        const res  = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}advertisment/ads?page=homepage`);
        const data = await res.json();
        if (data.status === "success" && Array.isArray(data.data)) {
          setFeaturedAds(data.data);
        } else if (data.status === "success" && data.data) {
          setFeaturedAds([data.data]);
        }
      } catch { setFeaturedAds([]); }
    };
    fetchFeaturedAds();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // BACKGROUND REFRESH (after cache hit)
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchProductBackground = useCallback(async (identifier) => {
    const safe = validateIdentifier(identifier);   // SSRF fix
    if (!safe) return;
    try {
      const token   = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const apiBase = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "");
      const res     = await fetch(`${apiBase}/catalog/marketplace/products/${safe}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setProductDetails(data.data);
          if (Array.isArray(data.data.recommendations)) setRecommendations(data.data.recommendations);
          setProductCache(safe, data.data);
        }
      }
    } catch {}
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIMARY FETCH PRODUCT
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchProduct = useCallback(async (identifier) => {
    if (hasFetchedRef.current || !identifier) return;

    const safe = validateIdentifier(identifier);   // SSRF fix
    if (!safe) { setIsNotFound(true); setIsLoading(false); return; }

    setIsLoading(true);
    setFetchError(null);
    setIsNotFound(false);
    hasFetchedRef.current = true;

    const token = localStorage.getItem("token");

    // ── Try cache first ──────────────────────────────────────────────────────
    const cached = getProductCache(safe);
    if (cached) {
      setProductDetails(cached);
      if (Array.isArray(cached.recommendations)) setRecommendations(cached.recommendations);
      setIsLoading(false);
      trackDetailView(cached.product);
      setTimeout(() => fetchProductBackground(safe), 150);
      return;
    }

    // ── Live fetch ───────────────────────────────────────────────────────────
    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      const headers = { "Content-Type": "application/json", Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const apiBase = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "");
      const res     = await fetchWithRetry(
        `${apiBase}/catalog/marketplace/products/${safe}`,
        { headers, signal: abortControllerRef.current.signal },
        3
      );

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("tokenExpiry");
        setIsAuthenticated(false);
        setShowLoginModal(true);
        toast.error("Session expired. Please login again.");
        setIsLoading(false);
        return;
      }

      if (res.status === 404) { setIsNotFound(true); setIsLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data.data) {
        setProductDetails(data.data);
        setProductCache(safe, data.data);
        if (Array.isArray(data.data.recommendations)) setRecommendations(data.data.recommendations);
        trackDetailView(data.data.product);

        const tracker = getTrackerCookie();
        if (tracker) updateTrackerCookie({ viewedProductId: data.data.product?.id, viewedAt: Date.now() });

        if (token) fetchSeoData(safe);
        if (data.data.product?.id) fetchAds(data.data.product.id);
      } else {
        setIsNotFound(true);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setFetchError(err.message || "Failed to load product");
        const fallback = getProductCache(safe);
        if (fallback) {
          setProductDetails(fallback);
          if (Array.isArray(fallback.recommendations)) setRecommendations(fallback.recommendations);
          toast.success("Using cached data");
        } else {
          setIsNotFound(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchSeoData, fetchAds, fetchProductBackground]);

  // ── Trigger fetch when userId is ready ────────────────────────────────────
  useEffect(() => {
    if (userId && !hasFetchedRef.current) fetchProduct(userId);
    return () => { hasFetchedRef.current = false; };
  }, [userId, fetchProduct]);

  // ── Fetch linked products/services/solutions ───────────────────────────────
  useEffect(() => {
    if (!productDetails?.product) return;
    const current = productDetails.product;
    const actionType = current.action_type;

    if (!["solution", "product", "service"].includes(actionType)) return;

    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const apiBase = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "");
    if (!apiBase) return;

    const fetchItem = (id) =>
      fetch(`${apiBase}/catalog/marketplace/products/${id}`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(d => d?.data?.product || null)
        .catch(() => null);

    if (actionType === "solution") {
      setLinkedSolutions([]);
      const productIds = decodePostgresArray(current.select_isv_products).map(Number).filter(Boolean);
      const serviceIds = decodePostgresArray(current.select_spectrum_partner_services).map(Number).filter(Boolean);

      if (!productIds.length && !serviceIds.length) {
        setLinkedProductsByBrand([]);
        setLinkedServicesByBrand([]);
        return;
      }

      Promise.all([
        Promise.all(productIds.map(fetchItem)),
        Promise.all(serviceIds.map(fetchItem)),
      ]).then(([products, services]) => {
        setLinkedProductsByBrand(groupByBrand(products.filter(Boolean)));
        setLinkedServicesByBrand(groupByBrand(services.filter(Boolean)));
      });
      return;
    }

    // ── product / service pages: reverse lookup via solutions that link this item ──
    const solutions = productDetails.linked_solutions || [];
    setLinkedSolutions(solutions);

    if (!solutions.length) {
      setLinkedProductsByBrand([]);
      setLinkedServicesByBrand([]);
      return;
    }

    const complementaryColumn = actionType === "product"
      ? "select_spectrum_partner_services"
      : "select_isv_products";

    const complementaryIds = [...new Set(
      solutions.flatMap(s => decodePostgresArray(s[complementaryColumn]).map(Number).filter(Boolean))
    )];

    if (!complementaryIds.length) {
      if (actionType === "product") setLinkedServicesByBrand([]);
      else setLinkedProductsByBrand([]);
      return;
    }

    Promise.all(complementaryIds.map(fetchItem)).then((items) => {
      const grouped = groupByBrand(items.filter(Boolean));
      if (actionType === "product") setLinkedServicesByBrand(grouped);
      else setLinkedProductsByBrand(grouped);
    });
  }, [productDetails]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH GATE — wraps any action that requires login
  // ═══════════════════════════════════════════════════════════════════════════
  const handleAuthenticatedAction = useCallback((action, actionParams = [], actionName = "") => {
    if (checkAuth()) {
      if (typeof action === "function") action(...actionParams);
    } else {
      const currentUrl  = window.location.href;
      const storedUtm   = utmUtils.get();
      const trackerData = {
        productId  : productDetails?.product?.id,
        productSlug: slug,
        action     : actionName,
        timestamp  : Date.now(),
        url        : currentUrl,
      };
      redirectUtils.store(currentUrl, trackerData, storedUtm || {
        utm_source  : searchParams?.get("utm_source"),
        utm_medium  : searchParams?.get("utm_medium"),
        utm_campaign: searchParams?.get("utm_campaign"),
      });
      setTrackerCookie(trackerData);
      setPendingAction({ action, actionParams, actionName });
      setShowLoginModal(true);
    }
  }, [checkAuth, productDetails, slug, searchParams]);

  // ── Track event (auth-gated) ───────────────────────────────────────────────
  const trackEventSafe = useCallback((eventData) => {
    handleAuthenticatedAction(() => {
      try { trackEvent(eventData); } catch {}
    }, [], "trackEvent");
  }, [handleAuthenticatedAction]);

  // ── Demo modal ────────────────────────────────────────────────────────────
  const handleDemoClick = useCallback(() => {
    handleAuthenticatedAction(() => setIsModalOpen(true), [], "handleDemoClick");
  }, [handleAuthenticatedAction]);

  // ── Private offer ──────────────────────────────────────────────────────────
  const handlePrivatePriceClick = useCallback(() => {
    handleAuthenticatedAction(
      () => router.push(`/private-offer?productid=${productDetails?.product?.id}`),
      [],
      "handlePrivatePriceClick"
    );
  }, [handleAuthenticatedAction, router, productDetails]);

  // ── Book a meeting ────────────────────────────────────────────────────────
  const handleBookMeetingClick = useCallback(() => {
    handleAuthenticatedAction(async () => {
      const bookingsUrl = process.env.NEXT_PUBLIC_MS_BOOKINGS_URL;
      if (!bookingsUrl) {
        router.push("/contact-us");
        return;
      }
      const name = productDetails?.product?.product_name || productDetails?.product?.name || "";
      try {
        await navigator.clipboard.writeText(name);
        toast.success(`Copied "${name}" — paste it into "Which Product/Service/Solution are you interested in?" when booking`, { duration: 6000 });
      } catch {
        // Clipboard access can fail (permissions, insecure context) — booking still proceeds.
      }
      window.open(bookingsUrl, "_blank", "noopener,noreferrer");
      trackEventSafe({ eventType: "BOOK_MEETING_CLICK", entityType: "product", entityId: productDetails?.product?.id });
    }, [], "handleBookMeetingClick");
  }, [handleAuthenticatedAction, productDetails, router, trackEventSafe]);

  // ── Demo video ────────────────────────────────────────────────────────────
  const handleDemoVideoClick = useCallback(() => {
    handleAuthenticatedAction(() => {
      if (productDetails?.product?.demo_video_link) {
        window.open(productDetails.product.demo_video_link, "_blank");
        trackEventSafe({ eventType: "DEMO_VIDEO_CLICK", entityType: "product", entityId: productDetails.product.id });
      }
    }, [], "handleDemoVideoClick");
  }, [handleAuthenticatedAction, productDetails, trackEventSafe]);

  // ── Brochure download ─────────────────────────────────────────────────────
  const handleBrochureDownload = useCallback((e, url) => {
    e.preventDefault();
    handleAuthenticatedAction(() => {
      window.open(url, "_blank");
      trackEventSafe({ eventType: "BROCHURE_DOWNLOAD", entityType: "product", entityId: productDetails?.product?.id });
    }, [url], "handleBrochureDownload");
  }, [handleAuthenticatedAction, productDetails, trackEventSafe]);

  // ── Case study ────────────────────────────────────────────────────────────
  const handleCaseStudyClick = useCallback((e, url) => {
    e.preventDefault();
    handleAuthenticatedAction(() => {
      window.open(url, "_blank");
      trackEventSafe({ eventType: "CASE_STUDY", entityType: "product", entityId: productDetails?.product?.id });
    }, [url], "handleCaseStudyClick");
  }, [handleAuthenticatedAction, productDetails, trackEventSafe]);

  // ── Gallery ───────────────────────────────────────────────────────────────
  const handleImageClick = useCallback((index) => {
    handleAuthenticatedAction(() => {
      setCurrentImageIndex(index);
      setIsGalleryOpen(true);
      trackEventSafe({ eventType: "PRODUCT_IMAGE_CLICK", entityType: "product", entityId: productDetails?.product?.id });
    }, [index], "handleImageClick");
  }, [handleAuthenticatedAction, productDetails, trackEventSafe]);

  const handleGalleryNavigate = useCallback((direction) => {
    handleAuthenticatedAction(() => {
      const total = filteredScreenshots.length;
      setCurrentImageIndex((prev) =>
        direction === "prev" ? (prev === 0 ? total - 1 : prev - 1) : (prev === total - 1 ? 0 : prev + 1)
      );
    }, [direction], "handleGalleryNavigate");
  }, [handleAuthenticatedAction, filteredScreenshots]);

  const handleThumbnailClick = useCallback((index) => {
    handleAuthenticatedAction(() => setCurrentImageIndex(index), [index], "handleThumbnailClick");
  }, [handleAuthenticatedAction]);

  // ── Tab change ────────────────────────────────────────────────────────────
  const handleTabChange = useCallback((tabId) => {
    if (tabId === "overview") { setActiveTab(tabId); return; }
    handleAuthenticatedAction(() => {
      setActiveTab(tabId);
      trackEventSafe({ eventType: `TAB_${tabId.toUpperCase()}`, entityType: "product", entityId: productDetails?.product?.id });
    }, [tabId], "handleTabChange");
  }, [handleAuthenticatedAction, productDetails, trackEventSafe]);

  // ── Recommendation product click ──────────────────────────────────────────
  const handleProductClick = useCallback((product) => {
    handleAuthenticatedAction(() => {
      trackEventSafe({ eventType: "PRODUCT_CLICK", entityType: "product", entityId: product.id });
      router.push(getProductLink(product));
    }, [product], "handleProductClick");
  }, [handleAuthenticatedAction, trackEventSafe, router]);

  // ── Ad click ──────────────────────────────────────────────────────────────
  const handleAdClick = useCallback((ad, position) => {
    trackEventSafe({ eventType: "AD_CLICK", entityType: "advertisement", entityId: ad.id, adPosition: position });
    if (ad.link) window.open(ad.link, "_blank");
  }, [trackEventSafe]);

  // ── Retry ─────────────────────────────────────────────────────────────────
  const handleRetry = () => {
    hasFetchedRef.current = false;
    fetchProduct(userId);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAD SUBMIT — Demo (POST /lead/create)
  // ═══════════════════════════════════════════════════════════════════════════
  const handleSubmitDemo = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) { handleAuthenticatedAction(() => setIsModalOpen(true), [], "handleSubmitDemo"); return; }
      const apiBase = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "");
      const res = await fetch(`${apiBase}/lead/create`, {
        method : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body   : JSON.stringify({
          action_id  : productDetails?.product?.id,
          action_type: productDetails?.product?.action_type,
          action_for : "",
          status     : "new",
          leadType,
          message    : message || "",
          demoData   : {},
          track      : { pageUrl: window.location.href, utm: utmUtils.get() || {} },
        }),
      });
      if (res.ok) {
        utmUtils.clear();
        setIsModalOpen(false);
        setMessage("");
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 9000);
      } else {
        toast.error("Failed to submit request.");
      }
    } catch { toast.error("Something went wrong."); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN SUBMIT
  // ═══════════════════════════════════════════════════════════════════════════
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "");
      const res     = await fetch(`${apiBase}/login`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ email, password }),
      });
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        toast.error("Unexpected server response."); return;
      }
      const data = await res.json();
      if (res.ok && data.status === "success") {
        const { token, user } = data.data;
        localStorage.setItem("token",       token);
        localStorage.setItem("user",        JSON.stringify(user));
        localStorage.setItem("tokenExpiry", String(Date.now() + 24 * 60 * 60 * 1000));
        cookieUtils.set("token",     token,                          1);
        cookieUtils.set("user",      JSON.stringify(user),           1);
        cookieUtils.set("user_email", user.email,                    1);
        cookieUtils.set("user_role",  String(user.role_id),          1);
        cookieUtils.set("user_name",  user.name || user.email.split("@")[0], 1);
        setIsAuthenticated(true);
        toast.success("Login successful!");
        const redirectInfo = redirectUtils.get();
        redirectUtils.clear();
        setShowLoginModal(false);
        setEmail("");
        setPassword("");
        setLoginError("");
        if (redirectInfo?.url) {
          router.push(redirectInfo.url);
        } else if (pendingAction?.action) {
          setTimeout(() => {
            pendingAction.action(...pendingAction.actionParams);
            setPendingAction(null);
          }, 400);
        }
      } else {
        setLoginError(data.message || "Login failed. Please try again.");
      }
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setIsLoggingIn(false); }
  };

  // ── Registration redirect ─────────────────────────────────────────────────
  const handleRegistrationClick = () => {
    const storedUtm  = utmUtils.get();
    const currentUrl = window.location.href;
    redirectUtils.store(currentUrl, { productId: productDetails?.product?.id, productSlug: slug, timestamp: Date.now() }, storedUtm);
    let regUrl = "/auth/register/";
    if (storedUtm) regUrl = utmUtils.appendToUrl(regUrl, storedUtm);
    router.push(regUrl);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // GUARD RENDERS
  // ═══════════════════════════════════════════════════════════════════════════
  const Spinner = ({ label = "Loading…" }) => (
    <>
      <Header compact />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="w-14 h-14 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
          <p className="mt-4 text-sm text-gray-500 font-medium">{label}</p>
        </div>
      </div>
      <Footer />
    </>
  );

  if (!slug || isLoading) return <Spinner label={!slug ? "Loading…" : "Loading product details…"} />;

  if (fetchError && !productDetails) return (
    <>
      <Header compact />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm mx-auto p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-sm text-gray-500 mb-6">Unable to load product details. Please check your connection.</p>
          <button onClick={handleRetry} className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all">
            Retry
          </button>
        </div>
      </div>
      <Footer />
    </>
  );

  if (isNotFound) return (
    <>
      <Header compact />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm mx-auto p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">This product doesn&apos;t exist or is no longer available.</p>
          <Link href="/" className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold">
            Go to Home <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );

  if (!productDetails?.product) return (
    <>
      <Header compact />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm mx-auto p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Product Unavailable</h2>
          <p className="text-sm text-gray-500 mb-6">Unable to load product details. Please try again later.</p>
          <Link href="/" className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold">
            Go to Home <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );

  // ── Shorthand ─────────────────────────────────────────────────────────────
  const product = productDetails.product;

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── SEO ── */}
      <SeoMetaTags seoData={seoData} productDetails={productDetails} />

      {/* ── Header ── */}
      <Header compact />

      {/* ── Hero (breadcrumb + 3-col layout) ── */}
      <ProductHero
        product={product}
        isAuthenticated={isAuthenticated}
        filteredScreenshots={filteredScreenshots}
        onDemoClick={handleDemoClick}
        onOfferClick={handlePrivatePriceClick}
        onLoginClick={() => setShowLoginModal(true)}
        onImageClick={handleImageClick}
        onBookMeetingClick={handleBookMeetingClick}
      />

      {/* ── Trust strip ── */}
      <ProductTrustStrip product={product} />

      {/* ── Tab navigation ── */}
      <ProductTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isAuthenticated={isAuthenticated}
        actionType={product.action_type}
        hasResources={
          (product.brochures?.length > 0) ||
          (product.customer_case_studies?.length > 0) ||
          !!product.demo_video_link
        }
      />

      {/* ── Main content area ── */}
      <div className="bg-white min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* ── Left content ── */}
            <div className="flex-1 min-w-0">

              {/* Auth gate for non-overview tabs */}
              {activeTab !== "overview" && !isAuthenticated ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-orange-50 border border-orange-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <Lock className="w-8 h-8 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Login Required</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                    Please sign in to view {activeTab} information and get full access to product details.
                  </p>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all inline-flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" /> Sign In
                  </button>
                </div>
              ) : (
                <>
                  {/* Overview tab */}
                  {activeTab === "overview" && (
                    <ProductOverview
                      product={product}
                      filteredScreenshots={filteredScreenshots}
                      isAuthenticated={isAuthenticated}
                      onImageClick={handleImageClick}
                      onLoginClick={() => setShowLoginModal(true)}
                    />
                  )}

                  {/* Key Features tab */}
                  {activeTab === "features" && <ProductFeatures product={product} />}

                  {/* Use Cases tab */}
                  {activeTab === "usecases" && <ProductUseCases product={product} />}

                  {/* Scope tab (services) */}
                  {activeTab === "scope" && (
                    <ProductOverview
                      product={product}
                      filteredScreenshots={[]}
                      isAuthenticated={isAuthenticated}
                      onImageClick={handleImageClick}
                      onLoginClick={() => setShowLoginModal(true)}
                      singleSection="scope"
                    />
                  )}

                  {/* Approach tab (services) — shows Approach then Scope below */}
                  {activeTab === "approach" && (
                    <div className="space-y-6">
                      <ProductOverview
                        product={product}
                        filteredScreenshots={[]}
                        isAuthenticated={isAuthenticated}
                        onImageClick={handleImageClick}
                        onLoginClick={() => setShowLoginModal(true)}
                        singleSection="approach"
                      />
                      <ProductOverview
                        product={product}
                        filteredScreenshots={[]}
                        isAuthenticated={isAuthenticated}
                        onImageClick={handleImageClick}
                        onLoginClick={() => setShowLoginModal(true)}
                        singleSection="scope"
                      />
                    </div>
                  )}

                  {/* Technical / Demographics tab */}
                  {activeTab === "technical" && (
                    <div className="space-y-6">
                      {product.action_type === "solution" ? (
                        <>
                          <ProductMetadata   product={product} />
                          <ProductTechnical  product={product} />
                        </>
                      ) : product.action_type === "service" ? (
                        <>
                          <ProductMetadata   product={product} />
                          <ProductTechnical  product={product} />
                        </>
                      ) : (
                        <>
                          <ProductMetadata  product={product} />
                          <ProductUseCases  product={product} />
                          <ProductTechnical product={product} />
                        </>
                      )}
                    </div>
                  )}

                  {/* Resources tab */}
                  {activeTab === "resources" && (
                    <ProductResources
                      product={product}
                      isAuthenticated={isAuthenticated}
                      onBrochureClick={handleBrochureDownload}
                      onCaseStudyClick={handleCaseStudyClick}
                      onDemoVideoClick={handleDemoVideoClick}
                      onLoginClick={() => setShowLoginModal(true)}
                      brochureAndPdfOnly={product.action_type === "solution"}
                    />
                  )}
                </>
              )}

            </div>

            {/* ── Right sidebar ── */}
            <div className="lg:w-72 xl:w-80 flex-shrink-0 space-y-5">

              {/* Right advertisement */}
              {!loadingAds && adsData?.right && (
                <ProductAds ad={adsData.right} position="right" onClick={handleAdClick} />
              )}

              {/* Linked Solutions (product/service pages only) */}
              {linkedSolutions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <h3 className="text-sm font-bold text-gray-900">Linked Solutions</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {linkedSolutions.map((sol) => (
                      <button
                        key={sol.id}
                        onClick={() => router.push(getProductLink(sol))}
                        className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors group"
                      >
                        <div className="text-sm font-medium text-gray-900 group-hover:text-orange-600 leading-snug">{sol.name}</div>
                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-orange-500">
                          View solution <ArrowRight className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Technology Powering the Solution / Linked Products */}
              {linkedProductsByBrand.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <h3 className="text-sm font-bold text-gray-900">
                      {productDetails?.product?.action_type === "solution" ? "Technology Powering the Solution" : "Linked Products"}
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {linkedProductsByBrand.map((group) => (
                      <div key={`prod-brand-${group.brand}`}>
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50">
                          {group.logo && (
                            <Image src={group.logo} alt={group.brand} width={20} height={20} className="rounded object-contain bg-white border border-gray-100" />
                          )}
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{group.brand}</span>
                        </div>
                        {group.items.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => router.push(getProductLink(p))}
                            className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors group"
                          >
                            <div className="text-sm font-medium text-gray-900 group-hover:text-orange-600 leading-snug">{p.name}</div>
                            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-orange-500">
                              View product <ArrowRight className="w-3 h-3" />
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Services */}
              {linkedServicesByBrand.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <h3 className="text-sm font-bold text-gray-900">Linked Services</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {linkedServicesByBrand.map((group) => (
                      <div key={`svc-brand-${group.brand}`}>
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50">
                          {group.logo && (
                            <Image src={group.logo} alt={group.brand} width={20} height={20} className="rounded object-contain bg-white border border-gray-100" />
                          )}
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{group.brand}</span>
                        </div>
                        {group.items.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => router.push(getProductLink(s))}
                            className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors group"
                          >
                            <div className="text-sm font-medium text-gray-900 group-hover:text-orange-600 leading-snug">{s.name}</div>
                            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-orange-500">
                              View service <ArrowRight className="w-3 h-3" />
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recommendations ── */}
      <ProductRecommendations
        recommendations={recommendations}
        isAuthenticated={isAuthenticated}
        onProductClick={handleProductClick}
        onLoginClick={() => setShowLoginModal(true)}
        actionType={product.action_type}
      />

      {/* ── Bottom trust strip ── */}
      <ProductBottomStrip />

      {/* ── Featured Ads (above footer) ── */}
      {featuredAds.length > 0 && (
        <section className="bg-gray-900 py-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-4">
            {featuredAds.map((ad, idx) => {
              const src = typeof window !== "undefined" && window.innerWidth < 768
                ? (ad.mobile_banner || ad.image || null)
                : (ad.image || ad.mobile_banner || null);
              if (!src) return null;
              return (
                <a
                  key={ad.id ?? idx}
                  href={ad.link || "#"}
                  target={ad.link ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="relative w-full h-[200px] md:h-[220px] rounded-3xl overflow-hidden ring-1 ring-orange-500/20 group block cursor-pointer"
                >
                  <img
                    src={src}
                    alt={ad.title || "Advertisement"}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <Footer />

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* Login modal */}
      {showLoginModal && (
        <ProductLoginModal
          email={email}           setEmail={setEmail}
          password={password}     setPassword={setPassword}
          showPassword={showPassword} setShowPassword={setShowPassword}
          loginError={loginError}
          isLoggingIn={isLoggingIn}
          onSubmit={handleLoginSubmit}
          onClose={() => {
            setShowLoginModal(false);
            setPendingAction(null);
            setEmail(""); setPassword(""); setLoginError("");
            redirectUtils.clear();
          }}
          onRegister={handleRegistrationClick}
        />
      )}

      {/* Demo request modal */}
      {isModalOpen && isAuthenticated && (
        <ProductDemoModal
          product={product}
          ctaLabel={product.cta_model?.[0] || "Request a Demo"}
          message={message}
          setMessage={setMessage}
          onSubmit={handleSubmitDemo}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Success modal */}
      {showSuccessModal && (
        <ProductSuccessModal onClose={() => setShowSuccessModal(false)} />
      )}

      {/* Gallery lightbox */}
      {isGalleryOpen && isAuthenticated && filteredScreenshots.length > 0 && (
        <ProductGalleryModal
          screenshots={filteredScreenshots}
          currentIndex={currentImageIndex}
          productName={product.product_name || product.name || ""}
          onClose={() => setIsGalleryOpen(false)}
          onNavigate={handleGalleryNavigate}
          onThumbnailClick={handleThumbnailClick}
        />
      )}

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { border: "1px solid #f0f0f0", padding: "14px", color: "#1a1a1a", borderRadius: "12px" },
          success: { style: { border: "1px solid #10b981", background: "#f0fdf4" } },
          error  : { style: { border: "1px solid #ef4444", background: "#fef2f2" } },
        }}
      />

      {/* Global styles for HTML content and Swiper overrides */}
      <style jsx global>{`
        .html-content ul, .prose-content ul { list-style: disc !important; padding-left: 1.5rem !important; margin: 0.5rem 0 !important; }
        .html-content ol, .prose-content ol { list-style: decimal !important; padding-left: 1.5rem !important; margin: 0.5rem 0 !important; }
        .html-content li, .prose-content li  { margin-bottom: 0.25rem !important; line-height: 1.6 !important; }
        .html-content strong, .prose-content strong { font-weight: 600 !important; color: #1f2937 !important; }
        .html-content p, .prose-content p    { margin-bottom: 0.5rem !important; }
        .scrollbar-hide::-webkit-scrollbar   { display: none; }
        .scrollbar-hide                      { -ms-overflow-style: none; scrollbar-width: none; }
        .swiper-button-next, .swiper-button-prev {
          color: #f97316 !important;
          background: white;
          width: 36px !important; height: 36px !important;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        .swiper-button-next:after, .swiper-button-prev:after { font-size: 14px !important; }
        .swiper-pagination-bullet        { background: #f97316 !important; opacity: 0.4; }
        .swiper-pagination-bullet-active { opacity: 1; width: 20px; border-radius: 4px; }
      `}</style>
    </>
  );
}
