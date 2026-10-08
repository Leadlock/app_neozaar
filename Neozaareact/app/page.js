"use client";

import Image from "next/image";
import Header from '@/app/layouts/Header';
import Footer from '@/app/layouts/Footer';
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/app/layouts/BottomNav";
import Chatbot from '@/app/layouts/Chatbot';
import Link from "next/link";
import StarBorder from '@/app/components/StarBorder/StarBorder';
import TopCategoriesSlider from '@/app/components/TopCategoriesSlider/TopCategoriesSlider';
import GradientWaves from '@/app/components/GradientWaves/GradientWaves';

const getTextStyle = (type, color, colorEnd, direction) => {
  if (type === 'gradient' && color && colorEnd) {
    return {
      backgroundImage: `linear-gradient(${direction || 'to right'}, ${color}, ${colorEnd})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    };
  }
  return { color: color || undefined };
};

// ctaModelValues: which cta_model tags to check for at least one published match.
// alwaysVisible: skip the catalog check entirely (e.g. a standing lead-gen page,
// not tied to product availability).
const ENGAGE_CTAS = [
  { key: 'assessment', img: '/assests/ctaicons/RequestAssessment.jpg', label: 'Request Assessment', desc: 'Review your environment, risks, costs and readiness across cloud, security, modernisation and AI.', route: '/marketplace/cta_model/Request Assessment', ctaModelValues: ['Request Assessment'] },
  { key: 'scoping',    img: '/assests/ctaicons/RequestScoping.jpg',    label: 'Request Scoping',    desc: 'Define requirements, architecture, integration points, effort and the path to implementation.', route: '/marketplace/cta_model/Request Scoping', ctaModelValues: ['Request Scoping'] },
  { key: 'poc',        img: '/assests/ctaicons/Proof_of_Concept.jpg',  label: 'Proof of Concept',  desc: 'Validate the solution in your environment through a focused, time-bound pilot.', route: '/marketplace/cta_model/Proof of Concept', ctaModelValues: ['Proof of Concept'] },
  { key: 'demo',       img: '/assests/ctaicons/Request_a_Demo.jpg',    label: 'Demo / Free Trial', desc: 'See the solution in action or evaluate selected technologies before moving forward.', route: '/marketplace/cta_model/Request for Demo,Free Trial', ctaModelValues: ['Request for Demo', 'Free Trial'] },
  { key: 'funding',    img: '/assests/ctaicons/Check_FundingEligibility.jpg', label: 'Check Funding Eligibility', desc: 'Explore available cloud funding, credits and acceleration programs for eligible initiatives.', route: '/marketplace/cta_model/Check Funding Eligibility', ctaModelValues: ['Check Funding Eligibility'] },
  { key: 'offers',     img: '/assests/ctaicons/Private_offers.jpg',    label: 'Request Private Offer', desc: 'Get a tailored commercial offer based on your requirements, licensing needs and applicable Marketplace procurement options.', route: '/private-offer', alwaysVisible: true },
];

const HOME_CTA_STRIP = [
  { key: 'demo', label: 'Discover' },
  { key: 'assessment', label: 'Assess' },
  { key: 'poc', label: 'Pilot' },
  { key: 'scoping', label: 'Quote' },
  { key: 'funding', label: 'Funding' },
];

const LIGHT_SECTION_SHINE = {
  backgroundColor: '#ffffff',
  backgroundImage: 'linear-gradient(105deg, rgba(59, 130, 246, 0.16) 0%, rgba(255, 255, 255, 0.96) 48%, rgba(249, 115, 22, 0.18) 100%)',
};

const fetchPublishedCatalog =async ({ type, limit = 12 } = {}) => {
  const params = new URLSearchParams({ page: '1', limit: String(limit) });
  if (type) params.set('action_type', type);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE}catalog/marketplace/published?${params.toString()}`,
  );
  if (!response.ok) throw new Error(`Published catalog request failed (${response.status})`);

  const data = await response.json();
  return Array.isArray(data?.data) ? data.data : [];
};

export default function Page() {
  const router = useRouter();

  const solutionsScrollRef = useRef(null);
  const [solutionCanScrollLeft, setSolutionCanScrollLeft] = useState(false);
  const [solutionCanScrollRight, setSolutionCanScrollRight] = useState(false);
  const scrollSolutions = (dir) => {
    const el = solutionsScrollRef.current;
    if (!el) return;
    const card = el.querySelector('[data-solution-card]');
    const amount = card ? card.offsetWidth + 24 : el.offsetWidth / 4;
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  const ctaScrollRef = useRef(null);
  const [ctaCanScrollLeft, setCtaCanScrollLeft] = useState(false);
  const [ctaCanScrollRight, setCtaCanScrollRight] = useState(false);
  const scrollCta = (dir) => {
    const el = ctaScrollRef.current;
    if (!el) return;
    const card = el.querySelector('[data-cta-card]');
    const amount = card ? card.offsetWidth + 24 : el.offsetWidth / 4;
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  const servicesScrollRef = useRef(null);
  const [serviceCanScrollLeft, setServiceCanScrollLeft] = useState(false);
  const [serviceCanScrollRight, setServiceCanScrollRight] = useState(false);
  const scrollServices = (dir) => {
    const el = servicesScrollRef.current;
    if (!el) return;
    const card = el.querySelector('[data-service-card]');
    const amount = card ? card.offsetWidth + 24 : el.offsetWidth / 4;
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  const [heroBanner, setHeroBanner] = useState(null);
  const [loadingHero, setLoadingHero] = useState(true);
  const [featuredServices, setFeaturedServices] = useState([]);

  useEffect(() => {
    const el = servicesScrollRef.current;
    if (!el) return;
    const update = () => {
      setServiceCanScrollLeft(el.scrollLeft > 1);
      setServiceCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    };
    update();
    el.addEventListener('scroll', update);
    return () => el.removeEventListener('scroll', update);
  }, [featuredServices]);

  const [segments, setSegments] = useState([]);
  const [featuredSolutions, setFeaturedSolutions] = useState([]);

  useEffect(() => {
    const el = solutionsScrollRef.current;
    if (!el) return;
    const update = () => {
      setSolutionCanScrollLeft(el.scrollLeft > 1);
      setSolutionCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    };
    update();
    el.addEventListener('scroll', update);
    return () => el.removeEventListener('scroll', update);
  }, [featuredSolutions]);

  useEffect(() => {
    const el = ctaScrollRef.current;
    if (!el) return;
    const update = () => {
      setCtaCanScrollLeft(el.scrollLeft > 1);
      setCtaCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    };
    update();
    el.addEventListener('scroll', update);
    return () => el.removeEventListener('scroll', update);
  }, []);

  const [adsItems, setAdsItems] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSegments, setLoadingSegments] = useState(true);
  const [loadingSolutions, setLoadingSolutions] = useState(true);
  const [loadingAds, setLoadingAds] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showAllSegments, setShowAllSegments] = useState(false);

  // --- Ask The Champ state (rendered as a banner strip below Featured Services) ---
  const [askTheChampItems, setAskTheChampItems] = useState([]);
  const [loadingAskTheChamp, setLoadingAskTheChamp] = useState(true);

  // --- Hero Carousel state (homepage masthead right-hand / narrow panel) ---
  const [heroCarouselItems, setHeroCarouselItems] = useState([]);
  const [loadingHeroCarousel, setLoadingHeroCarousel] = useState(true);
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    if (heroCarouselItems.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setHeroSlide((current) => (current + 1) % heroCarouselItems.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [heroCarouselItems.length]);

  useEffect(() => {
    if (heroCarouselItems.length > 0 && heroSlide >= heroCarouselItems.length) setHeroSlide(0);
  }, [heroCarouselItems.length, heroSlide]);

  // --- Hero Wide Banner state (homepage masthead left / wide panel).
  //     When nothing is featured here the wide slot falls back to the
  //     GradientWaves animation + hero title/subtitle text. ---
  const [heroWideItems, setHeroWideItems] = useState([]);
  const [loadingHeroWide, setLoadingHeroWide] = useState(true);
  const [heroWideSlide, setHeroWideSlide] = useState(0);

  useEffect(() => {
    if (heroWideItems.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setHeroWideSlide((current) => (current + 1) % heroWideItems.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [heroWideItems.length]);

  useEffect(() => {
    if (heroWideItems.length > 0 && heroWideSlide >= heroWideItems.length) setHeroWideSlide(0);
  }, [heroWideItems.length, heroWideSlide]);

  // --- Explore by Category state ---
  const [categoryShowcase, setCategoryShowcase] = useState([]);
  const [loadingCategoryShowcase, setLoadingCategoryShowcase] = useState(true);

  // --- Engage NeoZaar CTA visibility (only show a card if it has matching results) ---
  const [visibleCtaKeys, setVisibleCtaKeys] = useState(null); // null = still checking

  // Fix hydration issues by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const results = await Promise.all(
          ENGAGE_CTAS.map(async (cta) => {
            if (cta.alwaysVisible) return [cta.key, true];
            const params = new URLSearchParams({ page: '1', limit: '1' });
            (cta.ctaModelValues || []).forEach(v => params.append('cta_model', v));
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}catalog/marketplace/published?${params.toString()}`);
            const data = await res.json();
            return [cta.key, (data?.pagination?.total || 0) > 0];
          })
        );
        if (!cancelled) {
          setVisibleCtaKeys(new Set(results.filter(([, hasResults]) => hasResults).map(([key]) => key)));
        }
      } catch {
        // Fail open — if the check itself fails, don't hide the whole section.
        if (!cancelled) setVisibleCtaKeys(new Set(ENGAGE_CTAS.map(c => c.key)));
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Navigation handlers
  const handleServiceClick = (service) => {
    router.push(`/services/${service.id}`);
  };

  const handleVendorClick = (vendor) => {
    if (!vendor || !vendor.name) return;
    router.push(`/marketplace/brand/${vendor.name}`);
  };

  const handleSegmentClick = (segment) => {
    const slug = encodeURIComponent(segment.name.toLowerCase().replace(/\s+/g, '-'));
    router.push(`/marketplace/segment/${slug}`);
  };

  const handleSolutionClick = (solution) => {
    router.push(`/solution/${solution.id}`);
  };

  const handleProductCollectionClick = (collection) => {
    router.push(`/product-collection/${collection.id}`);
  };

  const handleProductClick = (product, e) => {
    e.stopPropagation();
    if (product?.slug) {
      router.push(`/product/${product.slug}`);
    } else if (product?.id) {
      router.push(`/product/${product.id}`);
    }
  };

  // ✅ Fetch Homepage Banner – handles single object response
  useEffect(() => {
    const fetchHeroBanner = async () => {
      try {
        setLoadingHero(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}homemaster/get`);
        const data = await response.json();

        // Expected response: { status: "success", data: { ...banner } }
        let banner = null;
        if (data.status === 'success' && data.data) {
          banner = data.data;
        } else if (data.data && !Array.isArray(data.data)) {
          banner = data.data;
        } else if (Array.isArray(data) && data.length > 0) {
          banner = data[0];
        } else if (data.id) {
          banner = data;
        }

        setHeroBanner(banner);
      } catch (error) {
        console.error('Error fetching homepage banner:', error);
        setHeroBanner(null);
      } finally {
        setLoadingHero(false);
      }
    };

    fetchHeroBanner();
  }, []);

  // Fetch Ads API
  useEffect(() => {
    const fetchAds = async () => {
      try {
        setLoadingAds(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}advertisment/ads`);
        const data = await response.json();

        if (data.status === 'success' && data.data) {
          const ads = Array.isArray(data.data) ? data.data : [data.data].filter(Boolean);
          setAdsItems(ads);
        } else {
          setAdsItems([]);
        }
      } catch (error) {
        console.error('Error fetching ads:', error);
        setAdsItems([]);
      } finally {
        setLoadingAds(false);
      }
    };

    fetchAds();
  }, []);

  // Fetch Ask The Champ API
  useEffect(() => {
    const fetchAskTheChamp = async () => {
      try {
        setLoadingAskTheChamp(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}ask-the-champ/homepage/ask-the-champ`);
        const data = await response.json();

        let items = [];
        if (data.status === 'success' && Array.isArray(data.data)) {
          items = data.data;
        } else if (Array.isArray(data)) {
          items = data;
        } else if (data.data && Array.isArray(data.data)) {
          items = data.data;
        }

        setAskTheChampItems(items);
      } catch (error) {
        console.error('Error fetching Ask The Champ:', error);
        setAskTheChampItems([]);
      } finally {
        setLoadingAskTheChamp(false);
      }
    };

    fetchAskTheChamp();
  }, []);

  // Fetch Hero Carousel API (drives the masthead right-hand panel)
  useEffect(() => {
    const fetchHeroCarousel = async () => {
      try {
        setLoadingHeroCarousel(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}hero-carousel/homepage/hero-carousel`);
        const data = await response.json();

        let items = [];
        if (data.status === 'success' && Array.isArray(data.data)) {
          items = data.data;
        } else if (Array.isArray(data)) {
          items = data;
        } else if (data.data && Array.isArray(data.data)) {
          items = data.data;
        }

        setHeroCarouselItems(items);
      } catch (error) {
        console.error('Error fetching Hero Carousel:', error);
        setHeroCarouselItems([]);
      } finally {
        setLoadingHeroCarousel(false);
      }
    };

    fetchHeroCarousel();
  }, []);

  // Fetch Hero Wide Banner API (drives the masthead left-hand / wide panel)
  useEffect(() => {
    const fetchHeroWide = async () => {
      try {
        setLoadingHeroWide(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}hero-wide-banner/homepage/hero-wide-banner`);
        const data = await response.json();

        let items = [];
        if (data.status === 'success' && Array.isArray(data.data)) {
          items = data.data;
        } else if (Array.isArray(data)) {
          items = data;
        } else if (data.data && Array.isArray(data.data)) {
          items = data.data;
        }

        setHeroWideItems(items);
      } catch (error) {
        console.error('Error fetching Hero Wide Banner:', error);
        setHeroWideItems([]);
      } finally {
        setLoadingHeroWide(false);
      }
    };

    fetchHeroWide();
  }, []);

  // Fetch Explore by Category API
  useEffect(() => {
    const fetchCategoryShowcase = async () => {
      try {
        setLoadingCategoryShowcase(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}catalog/get-category-showcase`);
        const data = response.ok ? await response.json() : null;

        let groups = [];
        if (data?.status === 'success' && Array.isArray(data.data)) {
          groups = data.data;
        } else {
          const published = await fetchPublishedCatalog({ limit: 200 });
          const grouped = new Map();

          published.forEach((item) => {
            const categories = Array.isArray(item.category) ? item.category : [item.category];
            categories.filter(Boolean).forEach((category) => {
              if (!grouped.has(category)) grouped.set(category, []);
              const items = grouped.get(category);
              if (items.length < 4) items.push(item);
            });
          });

          groups = Array.from(grouped, ([category, items]) => ({ category, items }))
            .filter((group) => group.items.length > 0)
            .slice(0, 6);
        }

        const stripHtml = (html) => (html || '').replace(/<[^>]*>/g, '').trim();
        const transformed = groups
          .map((g) => ({
            ...g,
            items: (g.items || []).map((item) => ({
              ...item,
              description: stripHtml(item.short_description) || 'No description available',
            })),
          }))
          .filter((g) => g.items.length > 0);

        setCategoryShowcase(transformed);
      } catch (error) {
        console.error('Error fetching category showcase:', error);
        setCategoryShowcase([]);
      } finally {
        setLoadingCategoryShowcase(false);
      }
    };

    fetchCategoryShowcase();
  }, []);

  // Fetch Featured Services API
  useEffect(() => {
    const fetchFeaturedServices = async () => {
      try {
        setLoadingServices(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}catalog/get-featured-services`);
        const data = response.ok ? await response.json() : null;
        const services = data?.status === 'success' && Array.isArray(data.data?.services)
          ? data.data.services
          : await fetchPublishedCatalog({ type: 'service', limit: 12 });

        if (services.length > 0) {
          const stripHtml = (html) => (html || '').replace(/<[^>]*>/g, '').trim();
          const transformed = services.map((item, index) => ({
            id: item.id || `service-${index}`,
            title: item.name,
            description: stripHtml(item.short_description) || "No description available",
            image: item.product_logo || item.image_url || "/assets/placeholder.png",
            originalData: item
          }));
          setFeaturedServices(transformed);
        } else {
          setFeaturedServices([]);
        }
      } catch (error) {
        console.error('Error fetching featured services:', error);
        setFeaturedServices([]);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchFeaturedServices();
  }, []);

  // Fetch Browse Segments API
  useEffect(() => {
    const fetchSegments = async () => {
      try {
        setLoadingSegments(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}catalog/get-target-segments`);
        const data = await response.json();
        const segmentsData = data?.data?.segments || data?.data?.target_segments || data?.data?.targetSegments || [];

        if (data.status === 'success' && Array.isArray(segmentsData) && segmentsData.length > 0) {
          const transformedSegments = segmentsData.map((segment, index) => ({
            id: segment.id || `segment-${index}-${Date.now()}-${Math.random()}`,
            name: segment.name || segment.target_segment || segment.title || `Segment ${index + 1}`,
            logoUrl: segment.logo || segment.image || segment.image_url || segment.logo_url || null,
            iconUrl: segment.icon || segment.icon_url || segment.logo || segment.image || null,
            gradient: segment.gradient || "from-orange-600/20 to-orange-600/1",
            target_segment: segment.target_segment,
            originalData: segment
          }));
          setSegments(transformedSegments);
        } else {
          setSegments([]);
        }
      } catch (error) {
        console.error('Error fetching segments:', error);
        setSegments([]);
      } finally {
        setLoadingSegments(false);
      }
    };

    fetchSegments();
  }, []);

  // Fetch Featured Solutions API
  useEffect(() => {
    const fetchFeaturedSolutions = async () => {
      try {
        setLoadingSolutions(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}catalog/get-featured-soutions`);

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Response is not JSON");
        }

        const data = await response.json();

        if (data.status === 'success' && data.data.solutions && data.data.solutions.length > 0) {
          const transformedSolutions = data.data.solutions.map((solution, index) => ({
            id: solution.id || `solution-${index}-${Date.now()}-${Math.random()}`,
            title: solution.name,
            description: solution.short_description || "No description available",
            artist: solution.brand_name || "Solution Provider",
            price: "Contact for Pricing",
            bid: "Request Demo",
            image: solution.product_logo || solution.image_url || "/assests/cyberprotect.png",
            avatar: solution.product_logo || "https://via.placeholder.com/100",
            categories: solution.category_subcategory || [],
            originalData: solution
          }));
          setFeaturedSolutions(transformedSolutions);
        } else {
          setFeaturedSolutions([]);
        }
      } catch (error) {
        console.error('Error fetching featured solutions:', error);
        setFeaturedSolutions([]);
      } finally {
        setLoadingSolutions(false);
      }
    };

    fetchFeaturedSolutions();
  }, []);

  // ========== RESPONSIVE BACKGROUND FOR ASK THE CHAMP ==========
  const getChampBg = (item) => {
    if (!item) return '/brand-log/neozaardefault.jpg';
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return item.mobile_banner || item.banner || '/brand-log/neozaardefault.jpg';
    }
    return item.banner || item.mobile_banner || '/brand-log/neozaardefault.jpg';
  };

  // ========== BACKGROUND FOR HERO CAROUSEL ==========
  // The narrow carousel is desktop-only (hidden below lg), so there is no mobile
  // variant — always the single banner image.
  const getHeroBg = (item) => {
    if (!item) return '/brand-log/neozaardefault.jpg';
    return item.banner || item.mobile_banner || '/brand-log/neozaardefault.jpg';
  };

  // ========== RESPONSIVE BACKGROUND FOR HERO WIDE BANNER ==========
  const getHeroWideBg = (item) => {
    if (!item) return '/brand-log/neozaardefault.jpg';
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return item.mobile_banner || item.banner || '/brand-log/neozaardefault.jpg';
    }
    return item.banner || item.mobile_banner || '/brand-log/neozaardefault.jpg';
  };

  // ========== RESPONSIVE BACKGROUND FOR ADS ==========
  const getAdBg = (ad) => {
    if (!ad) return '/bannerforAdd.jpg';
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return ad.mobile_banner || ad.image || '/bannerforAdd.jpg';
    }
    return ad.image || ad.mobile_banner || '/bannerforAdd.jpg';
  };


  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <>
      <main className="bg-black min-h-screen w-full mx-auto max-w-[1920px] overflow-hidden">
        {/* Header remains separate so it does not overlap the hero or advertisement. */}
        <div className="relative z-30 w-full bg-black">
          <Header />
        </div>

        {/* Homepage masthead: two rounded banners floating on a shared GradientWaves
            backdrop. Left = wide (62%) Hero Wide Banner carousel; right = narrow
            (38%) Hero Carousel. When no wide banner is featured, the left card is
            transparent so the backdrop waves + hero title/subtitle show through. */}
        <div className="relative border-b border-white/5 bg-black">
          {/* Shared animated backdrop behind both cards + the gutter between them */}
          <div className="absolute inset-0">
            <GradientWaves
              horizonColor="#ffffff"
              waveColor="#F97316"
              crestColor="#F97316"
              speed={0.4}
              amplitude={2.5}
              waveScale={0.6}
              waveRatio={0.9}
              swell={35}
              turbulence={20}
              tilt={1.11}
              zoom={1}
              height={5.5}
              fogDepth={15}
              detail="medium"
              brightness={1}
              opacity={1}
              grain
              grainIntensity={0.05}
              mouseInteraction
              parallaxStrength={0.5}
            />
            {/* Calm the waves slightly so the rounded cards read as raised panels */}
            <div className="pointer-events-none absolute inset-0 bg-black/25" />
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-[1920px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-stretch lg:gap-5 lg:px-8 lg:py-6">

            {/* ── WIDE BANNER — 62% (Master Data › Hero Wide Banner) ── */}
            <section className="relative aspect-[2/1] w-full shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.45)] lg:aspect-[3/1] lg:w-[62%]">
              {loadingHeroWide ? (
                <div className="h-full w-full animate-pulse bg-white/5" />
              ) : heroWideItems.length > 0 ? (
                <div className="group relative h-full w-full bg-black">
                  {heroWideItems.map((item, index) => {
                    const active = index === heroWideSlide;
                    return (
                      <a
                        key={item.id ?? index}
                        href={item.link || '#'}
                        target={item.link ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        aria-label={item.title || 'Hero banner'}
                        aria-hidden={!active}
                        tabIndex={active ? 0 : -1}
                        className={`absolute inset-0 block transition-opacity duration-[900ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                      >
                        <img
                          src={getHeroWideBg(item)}
                          alt={item.title || 'Hero banner'}
                          className="absolute inset-0 h-full w-full object-cover object-center"
                          onError={(event) => { event.currentTarget.src = '/brand-log/neozaardefault.jpg'; }}
                        />
                      </a>
                    );
                  })}

                  {heroWideItems.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setHeroWideSlide((current) => (current - 1 + heroWideItems.length) % heroWideItems.length)}
                        aria-label="Previous slide"
                        className="absolute left-3 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition duration-200 hover:bg-black/70 hover:ring-white/40 active:scale-95 lg:grid lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeroWideSlide((current) => (current + 1) % heroWideItems.length)}
                        aria-label="Next slide"
                        className="absolute right-3 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition duration-200 hover:bg-black/70 hover:ring-white/40 active:scale-95 lg:grid lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </button>
                      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/65 px-3 py-2 backdrop-blur-md">
                        {heroWideItems.map((item, index) => (
                          <button
                            key={item.id ?? index}
                            type="button"
                            onClick={() => setHeroWideSlide(index)}
                            aria-label={`Show slide ${index + 1}`}
                            className={`h-1.5 rounded-full transition-all duration-500 ease-out ${index === heroWideSlide ? 'w-5 bg-orange-500' : 'w-1.5 bg-white/60 hover:bg-white'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Fallback — no wide banner featured: transparent card, backdrop waves
                   show through, hero title/subtitle on top. */
                <div className="relative z-10 flex h-full w-full items-center px-6 text-left sm:px-10 lg:px-12">
                  {!loadingHero && (
                    <div className="w-full max-w-2xl">
                      <h1 className="mb-3 text-2xl font-bold leading-tight sm:text-3xl lg:mb-5 lg:text-5xl">
                        <span style={getTextStyle(
                          heroBanner?.title_color_type,
                          heroBanner?.title_color,
                          heroBanner?.title_color_end,
                          heroBanner?.title_color_direction
                        )}>
                          {heroBanner?.title || "Accelerate Your"}
                        </span>
                        {heroBanner?.color_title ? (
                          <div style={getTextStyle(
                            heroBanner?.color_title_color_type,
                            heroBanner?.color_title_color,
                            heroBanner?.color_title_color_end,
                            heroBanner?.color_title_color_direction
                          )}>
                            {heroBanner.color_title}
                          </div>
                        ) : (
                          !heroBanner?.title && <div className="text-orange-500">Business Growth</div>
                        )}
                      </h1>
                      <p className="max-w-xl text-sm sm:text-base lg:text-lg line-clamp-3"
                         style={getTextStyle(
                           heroBanner?.subtitle_color_type,
                           heroBanner?.subtitle_color,
                           heroBanner?.subtitle_color_end,
                           heroBanner?.subtitle_color_direction
                         )}>
                        {heroBanner?.subtitle || "Innovative solutions for modern enterprises"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── NARROW BANNER — 38% (Master Data › Hero Carousel) ── */}
            <aside className="relative hidden aspect-[2/1] w-full shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.45)] lg:block lg:aspect-[11/6] lg:w-[38%]">
              {loadingHeroCarousel ? (
                <div className="h-full w-full animate-pulse bg-white/5" />
              ) : heroCarouselItems[heroSlide] ? (
                <div className="group relative h-full w-full bg-black">
                  {/* All slides are stacked; only the active one is opaque/clickable, so
                      switching is a slow cross-fade with a gentle Ken Burns drift. */}
                  {heroCarouselItems.map((item, index) => {
                    const active = index === heroSlide;
                    return (
                      <a
                        key={item.id ?? index}
                        href={item.link || '#'}
                        target={item.link ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        aria-label={item.title || 'Hero carousel slide'}
                        aria-hidden={!active}
                        tabIndex={active ? 0 : -1}
                        className={`absolute inset-0 block transition-opacity duration-[900ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                      >
                        <img
                          src={getHeroBg(item)}
                          alt={item.title || 'Hero carousel'}
                          className="absolute inset-0 h-full w-full object-cover object-center"
                          onError={(event) => { event.currentTarget.src = '/brand-log/neozaardefault.jpg'; }}
                        />
                      </a>
                    );
                  })}

                  {heroCarouselItems.length > 1 && (
                    <>
                      {/* Prev / Next — only shown with multiple slides. Frosted glass pill,
                          legible on light or dark art; fades in on hover (desktop),
                          always visible on touch. */}
                      <button
                        type="button"
                        onClick={() => setHeroSlide((current) => (current - 1 + heroCarouselItems.length) % heroCarouselItems.length)}
                        aria-label="Previous slide"
                        className="absolute left-2.5 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition duration-200 hover:bg-black/70 hover:ring-white/40 active:scale-95 lg:grid lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeroSlide((current) => (current + 1) % heroCarouselItems.length)}
                        aria-label="Next slide"
                        className="absolute right-2.5 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition duration-200 hover:bg-black/70 hover:ring-white/40 active:scale-95 lg:grid lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </button>
                      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/65 px-3 py-2 backdrop-blur-md">
                        {heroCarouselItems.map((item, index) => (
                          <button
                            key={item.id ?? index}
                            type="button"
                            onClick={() => setHeroSlide(index)}
                            aria-label={`Show slide ${index + 1}`}
                            className={`h-1.5 rounded-full transition-all duration-500 ease-out ${index === heroSlide ? 'w-5 bg-orange-500' : 'w-1.5 bg-white/60 hover:bg-white'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex h-full w-full flex-col justify-end bg-gradient-to-br from-orange-500/20 via-[#15100d] to-black p-7">
                  <span className="mb-auto text-xs font-bold uppercase tracking-[0.22em] text-orange-400">NeoZaar</span>
                  <p className="text-2xl font-bold text-white">Connecting enterprises with trusted solutions.</p>
                </div>
              )}
            </aside>
          </div>
        </div>

        {/* --- PRIMARY CTA STRIP — horizontal scroll on mobile, grid from sm --- */}
        <nav
          aria-label="Popular actions"
          className="border-y border-slate-200 bg-white"
          style={LIGHT_SECTION_SHINE}
        >
          <div className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5">
            {HOME_CTA_STRIP.map((item) => {
              const cta = ENGAGE_CTAS.find((entry) => entry.key === item.key);
              return (
                <Link
                  key={item.key}
                  href={cta?.route || '#'}
                  className="group flex min-h-16 w-[40%] shrink-0 snap-start items-center justify-center border-b border-r border-slate-200 px-4 py-3 text-center transition-colors last:border-r-0 hover:bg-orange-50 sm:w-auto lg:border-b-0"
                >
                  <h2 className="text-sm font-semibold leading-snug text-slate-700 transition-colors group-hover:text-orange-600 md:text-base">
                    {item.label}
                  </h2>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* --- TOP CATEGORIES SLIDER --- */}
        <TopCategoriesSlider />

        {/* --- HOME SEARCH BAR — Hidden (search now lives in the header) --- */}
        {/* <section className="px-4 sm:px-6 lg:px-8 max-w-screen-xl m-auto pt-8 md:pt-12">
          <HomeSearch />
        </section> */}

        {/* --- SOLUTIONS SECTION --- */}
        {(loadingSolutions || featuredSolutions.length > 0) && (
          <section
            className="border-b border-slate-200 bg-white px-4 py-12 sm:px-6 lg:px-8 md:py-20"
            style={LIGHT_SECTION_SHINE}
          >
            <div className="mx-auto max-w-screen-xl">
            <div className="mb-8 flex flex-col items-start justify-between gap-5 md:mb-10 md:flex-row md:items-end">
              <div className="max-w-2xl border-l-4 border-orange-500 pl-4">
                <h2 className="mb-2 text-3xl font-bold text-slate-950 lg:text-4xl">Solutions <span className="text-orange-500">Marketplace</span></h2>
                <p className="text-base text-slate-600">Practical solutions for cloud, security, data, AI, resilience, and compliance.</p>
              </div>
              <div className="flex items-center gap-3">
                {(solutionCanScrollLeft || solutionCanScrollRight) && (
                  <div className="hidden md:flex items-center gap-2">
                    <button
                      onClick={() => scrollSolutions(-1)}
                      disabled={!solutionCanScrollLeft}
                      className={`flex h-9 w-9 items-center justify-center rounded-md border bg-white transition-colors ${solutionCanScrollLeft ? 'border-slate-300 text-slate-700 hover:border-orange-500 hover:text-orange-600' : 'cursor-not-allowed border-slate-200 text-slate-300'}`}
                      aria-label="Scroll left"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => scrollSolutions(1)}
                      disabled={!solutionCanScrollRight}
                      className={`flex h-9 w-9 items-center justify-center rounded-md border bg-white transition-colors ${solutionCanScrollRight ? 'border-slate-300 text-slate-700 hover:border-orange-500 hover:text-orange-600' : 'cursor-not-allowed border-slate-200 text-slate-300'}`}
                      aria-label="Scroll right"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </button>
                  </div>
                )}
                {featuredSolutions.length > 0 && (
                  <StarBorder onClick={() => router.push('marketplace/solution')} borderRadius="16px" padding="12px 26px" className="cursor-pointer">
                    Explore all Solutions →
                  </StarBorder>
                )}
              </div>
            </div>
            <div className="relative">
              <div ref={solutionsScrollRef} className="overflow-x-auto scrollbar-hide scroll-smooth py-3 -my-3 px-3 -mx-3">
                <div className="flex items-stretch gap-6">
                  {loadingSolutions ? (
                    [...Array(4)].map((_, i) => (
                      <div key={`solution-skeleton-${i}`} className="w-[36vw] flex-none animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 md:w-[200px]">
                        <div className="aspect-square rounded-xl border border-slate-200 bg-slate-100"></div>
                        <div className="space-y-3 p-3">
                          <div className="h-5 bg-slate-100 rounded w-3/4"></div>
                          <div className="h-4 bg-slate-100 rounded w-full"></div>
                          <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    featuredSolutions.map((solution) => {
                      const titleSlug = solution.title
                        .toLowerCase()
                        .trim()
                        .replace(/[^\w\s-]/g, '')
                        .replace(/[\s_-]+/g, '-')
                        .replace(/^-+|-+$/g, '');

                      return (
                        <div
                          key={`solution-${solution.id}`}
                          data-solution-card=""
                          className="group flex w-[36vw] flex-none cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-3 transition-colors hover:border-orange-300 md:w-[200px]"
                          onClick={() => router.push(`/solution/${solution.id || titleSlug}`)}
                        >
                          <div className="relative aspect-square rounded-xl border border-slate-200 bg-slate-100 p-1.5">
                            <div className="relative h-full w-full overflow-hidden rounded-lg">
                              <Image
                                src={solution.image}
                                alt={solution.title}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                unoptimized={true}
                              />
                            </div>
                          </div>
                          <div className="flex flex-1 flex-col space-y-1 p-3">
                            <h4 className="min-h-[3rem] text-base font-bold leading-snug text-slate-900 line-clamp-2">{solution.title}</h4>
                            {solution.categories && solution.categories.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {solution.categories.slice(0, 2).map((category, idx) => (
                                  <span key={`${solution.id}-category-${idx}`} className="rounded bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">
                                    {category}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="line-clamp-2 text-xs text-slate-600">{solution.description}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            </div>
          </section>
        )}

        {/* --- FEATURED SERVICES SECTION --- */}
        {(loadingServices || featuredServices.length > 0) && (
          <section
            className="border-b border-slate-200 bg-white px-4 py-12 sm:px-6 lg:px-8 md:py-20"
            style={LIGHT_SECTION_SHINE}
          >
            <div className="mx-auto max-w-screen-xl">
            <div className="mb-8 flex flex-col items-start justify-between gap-5 md:mb-10 md:flex-row md:items-end">
              <div className="max-w-2xl border-l-4 border-orange-500 pl-4">
                <h2 className="mb-2 text-3xl font-bold text-slate-950 lg:text-4xl">Services <span className="text-orange-500">Marketplace</span></h2>
                <p className="text-base text-slate-600">Expertise to assess, design, deploy, optimise, and manage your technology environment.</p>
              </div>
              <div className="flex items-center gap-3">
                {(serviceCanScrollLeft || serviceCanScrollRight) && (
                  <div className="hidden md:flex items-center gap-2">
                    <button
                      onClick={() => scrollServices(-1)}
                      disabled={!serviceCanScrollLeft}
                      className={`flex h-9 w-9 items-center justify-center rounded-md border bg-white transition-colors ${serviceCanScrollLeft ? 'border-slate-300 text-slate-700 hover:border-orange-500 hover:text-orange-600' : 'cursor-not-allowed border-slate-200 text-slate-300'}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => scrollServices(1)}
                      disabled={!serviceCanScrollRight}
                      className={`flex h-9 w-9 items-center justify-center rounded-md border bg-white transition-colors ${serviceCanScrollRight ? 'border-slate-300 text-slate-700 hover:border-orange-500 hover:text-orange-600' : 'cursor-not-allowed border-slate-200 text-slate-300'}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </button>
                  </div>
                )}
                {featuredServices.length > 0 && (
                  <StarBorder onClick={() => router.push('/marketplace/service')} borderRadius="16px" padding="12px 26px" className="cursor-pointer">
                    Explore all Services →
                  </StarBorder>
                )}
              </div>
            </div>

            <div ref={servicesScrollRef} className="overflow-x-auto scrollbar-hide scroll-smooth py-3 -my-3 px-3 -mx-3">
              <div className="flex items-stretch gap-6">
                {loadingServices ? (
                  [...Array(4)].map((_, i) => (
                    <div key={`service-skeleton-${i}`} className="w-[36vw] flex-none animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 md:w-[200px]">
                      <div className="aspect-square rounded-xl border border-slate-200 bg-slate-100"></div>
                      <div className="space-y-3 p-3">
                        <div className="h-5 w-3/4 rounded bg-slate-100"></div>
                        <div className="h-4 w-full rounded bg-slate-100"></div>
                        <div className="h-4 w-2/3 rounded bg-slate-100"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  featuredServices.map((service) => (
                    <div
                      key={`service-${service.id}`}
                      data-service-card=""
                      className="group flex w-[36vw] flex-none cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-3 transition-colors hover:border-orange-300 md:w-[200px]"
                      onClick={() => router.push(`/service/${service.id}`)}
                    >
                      <div className="relative aspect-square rounded-xl border border-slate-200 bg-slate-100 p-1.5">
                        <div className="relative h-full w-full overflow-hidden rounded-lg">
                          <Image src={service.image} alt={service.title} fill className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" unoptimized={true} onError={(e) => { e.target.src = '/assets/placeholder.png'; }} />
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col space-y-1 p-3">
                        <h4 className="min-h-[3rem] text-base font-bold leading-snug text-slate-900 line-clamp-2">{service.title}</h4>
                        <div className="line-clamp-2 text-xs text-slate-600">{service.description}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            </div>
          </section>
        )}

        {/* AskTheChamp — banner strip (same treatment as the Ads section), shown when featured */}
        {(loadingAskTheChamp || askTheChampItems.length > 0) && (
          <section className="mt-4 md:mt-0 md:pt-24 mx-auto max-w-[96%] lg:max-w-7xl space-y-4">
            {loadingAskTheChamp ? (
              <div className="h-[200px] rounded-3xl bg-white/5 animate-pulse ring-1 ring-orange-500/10" />
            ) : (
              askTheChampItems.map((ad, idx) => (
                <a
                  key={ad.id ?? idx}
                  href={ad.link || "#"}
                  target={ad.link ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="relative w-full h-[200px] md:h-[220px] rounded-3xl overflow-hidden ring-1 ring-orange-500/25 shadow-[0_0_40px_rgba(249,115,22,0.08)] group block cursor-pointer"
                >
                  <img
                    src={getChampBg(ad)}
                    alt={ad.title || "AskTheChamp"}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => { e.target.src = '/brand-log/neozaardefault.jpg'; }}
                  />
                </a>
              ))
            )}
          </section>
        )}


        {/* Browse Segment Section - Hidden */}
        {false && (loadingSegments || segments.length > 0) && (
          <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-screen-xl m-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
              <div className="border-l-4 border-orange-500 pl-6">
                <h2 className="text-3xl font-bold text-white mb-2 lg:text-4xl">Browse <span className="text-orange-500">Segments</span></h2>
                <p className="text-slate-400">Explore our curated industry segments</p>
              </div>
              {segments.length > 0 && (
                <StarBorder onClick={() => router.push('/marketplace/segment')} borderRadius="16px" padding="12px 26px" className="cursor-pointer">
                  View More →
                </StarBorder>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {loadingSegments ? (
                [...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-white/10 rounded-2xl"></div>
                    <div className="h-6 bg-white/10 rounded w-3/4 mt-4 mx-auto"></div>
                  </div>
                ))
              ) : (
                (showAllSegments ? segments : segments.slice(-8)).map((segment) => (
                  <div
                    key={segment.id}
                    onClick={() => handleSegmentClick(segment)}
                    className="group cursor-pointer rounded-2xl overflow-hidden
                               bg-white/5 border border-white/10
                               hover:border-orange-500/40
                               transition-all duration-300
                               hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10"
                  >
                    <div
                      className={`aspect-square relative flex items-center justify-center
                                  bg-gradient-to-br ${segment.gradient}`}
                    >
                      <img
                        src={segment.logoUrl || segment.logo || '/brand-log/neozaardefault.jpg'}
                        alt={segment.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-80 transition-all duration-500 group-hover:scale-110 rounded-2xl group-hover:opacity-20"
                      />
                      <div className="relative z-10 w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-full group-hover:scale-110 transition">
                        <img
                          src={segment.iconUrl || segment.logoUrl || '/brand-log/neozaardefault.jpg'}
                          alt={`${segment.name} icon`}
                          className="w-10 h-10 md:w-16 md:h-16 object-contain"
                        />
                      </div>
                      <div className="absolute inset-0 opacity-0 backdrop-blur-sm bg-black/20 transition-all duration-300 group-hover:opacity-100"></div>
                    </div>
                    <div className="p-4 text-center bg-black/40 backdrop-blur-md">
                      <span className="font-semibold text-white text-base md:text-lg group-hover:text-orange-400 transition">
                        {segment.name}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ========== EXPLORE BY CATEGORY SECTION ========== */}
        {(loadingCategoryShowcase || categoryShowcase.length > 0) && (
          <>
            {loadingCategoryShowcase ? (
              <section className="py-8 md:pt-24 px-4 sm:px-6 lg:px-8 max-w-screen-xl m-auto relative">
                <div className="border-l-4 border-orange-500 pl-6 mb-8 md:mb-12">
                  <h2 className="text-3xl font-bold text-white mb-2 lg:text-4xl">Explore by <span className="text-orange-500">Category</span></h2>
                  <p className="text-slate-400">Top products, services and solutions curated for each category.</p>
                </div>
                <div className="space-y-10">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="space-y-4">
                      <div className="h-6 w-40 rounded bg-white/10 animate-pulse" />
                      <div className="flex gap-6 overflow-hidden">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <div key={j} className="flex-none w-[36vw] md:w-[200px] aspect-square rounded-2xl bg-white/5 animate-pulse" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              categoryShowcase.map((group, idx) => {
                // Alternate bands: dark first, then light (matches Solutions / Services), and so on.
                const light = idx % 2 === 1;
                return (
                  <section
                    key={group.category}
                    className={light ? 'border-y border-slate-200 bg-white' : ''}
                    style={light ? LIGHT_SECTION_SHINE : undefined}
                  >
                    <div className={`px-4 sm:px-6 lg:px-8 max-w-screen-xl m-auto relative ${idx === 0 ? 'py-8 md:pt-24 md:pb-12' : 'py-10 md:py-14'}`}>
                      {idx === 0 && (
                        <div className="border-l-4 border-orange-500 pl-6 mb-8 md:mb-12">
                          <h2 className="text-3xl font-bold text-white mb-2 lg:text-4xl">Explore by <span className="text-orange-500">Category</span></h2>
                          <p className="text-slate-400">Top products, services and solutions curated for each category.</p>
                        </div>
                      )}
                      <h3 className={`mb-5 text-2xl font-bold leading-tight md:text-3xl ${light ? 'text-slate-950' : 'text-white'}`}>{group.category}</h3>
                      <div className="overflow-x-auto scrollbar-hide scroll-smooth py-3 -my-3 px-3 -mx-3">
                        <div className="flex gap-6 items-stretch">
                          {group.items.map((item) => {
                            const overlayLabel = item.action_type === 'product'
                              ? item.brand_name
                              : item.action_type === 'service'
                                ? 'Service'
                                : item.action_type === 'solution'
                                  ? 'Solution'
                                  : null;
                            return (
                              <div
                                key={`${group.category}-${item.action_type}-${item.id}`}
                                className={`flex-none w-[36vw] md:w-[200px] rounded-2xl hover:scale-105 transition-transform border hover:border-orange-600/50 cursor-pointer p-3 flex flex-col ${light ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/10 border-white/10'}`}
                                onClick={() => router.push(`/${item.action_type}/${item.id}`)}
                              >
                                <div className="aspect-square relative rounded-xl">
                                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                                    <Image
                                      src={item.product_logo || item.image_url || '/assets/placeholder.png'}
                                      alt={item.name}
                                      fill
                                      className="object-cover"
                                      unoptimized={true}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent" />
                                  </div>
                                  {overlayLabel && (
                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[85%] text-center text-[10px] font-semibold text-white/90 truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                                      {overlayLabel}
                                    </div>
                                  )}
                                </div>
                                <div className="p-3 space-y-1">
                                  <h4 className={`text-base font-bold line-clamp-2 min-h-[3rem] ${light ? 'text-slate-950' : 'text-white'}`}>{item.name}</h4>
                                  <div className={`text-xs line-clamp-2 ${light ? 'text-slate-600' : 'text-slate-500'}`}>{item.description}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })
            )}
          </>
        )}

        {/* How It Works Section */}
        {(visibleCtaKeys === null || visibleCtaKeys.size > 0) && (
        <section className="py-8 md:pt-24 px-4 sm:px-6 lg:px-8 max-w-screen-xl m-auto relative">
          <div className="flex flex-col md:flex-row justify-between items-end mb-5 md:mb-12 gap-4 md:gap-6">
            <div className="border-l-4 border-orange-500 pl-6">
              <h2 className="text-3xl font-bold text-white mb-2 lg:text-4xl">Engage <span className="text-orange-500">NeoZaar</span></h2>
              <p className="text-slate-400">Choose how you want to move forward — assess, scope, validate, explore funding, or structure the right commercial path.</p>
            </div>
            {(ctaCanScrollLeft || ctaCanScrollRight) && (
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => scrollCta(-1)}
                  disabled={!ctaCanScrollLeft}
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${ctaCanScrollLeft ? 'border-white/20 text-white hover:border-orange-500 hover:text-orange-500' : 'border-white/10 text-white/20 cursor-not-allowed'}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>
                <button
                  onClick={() => scrollCta(1)}
                  disabled={!ctaCanScrollRight}
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${ctaCanScrollRight ? 'border-white/20 text-white hover:border-orange-500 hover:text-orange-500' : 'border-white/10 text-white/20 cursor-not-allowed'}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div ref={ctaScrollRef} className="overflow-x-auto scrollbar-hide scroll-smooth py-3 -my-3 px-3 -mx-3">
            <div className="flex gap-6 items-stretch">
              {visibleCtaKeys === null ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex-none w-[44vw] sm:w-[32vw] md:w-[220px] h-[220px] bg-white/5 animate-pulse rounded-2xl"
                  />
                ))
              ) : (
                ENGAGE_CTAS.filter(({ key }) => visibleCtaKeys.has(key)).map(({ key, img, label, desc, route }) => (
                  <div
                    key={key}
                    data-cta-card=""
                    className="flex-none w-[44vw] sm:w-[32vw] md:w-[220px] flex flex-col bg-white/10 hover:scale-105 transition-transform border border-white/10 hover:border-orange-600/50 cursor-pointer p-5 rounded-2xl text-center space-y-3"
                    onClick={() => router.push(route)}
                  >
                    <div className="w-[80px] h-[80px] rounded-full mx-auto overflow-hidden">
                      <Image
                        src={img}
                        alt={label}
                        width={80}
                        height={80}
                        className="object-cover rounded-full w-full h-full"
                        unoptimized={true}
                      />
                    </div>
                    <h3 className="text-base font-bold text-white">{label}</h3>
                    <p className="text-slate-400 text-xs line-clamp-3">{desc}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
        )}

        {/* Ads Section — only rendered when items are featured */}
        {(loadingAds || adsItems.length > 0) && (
          <section className="mt-4 md:mt-0 md:pt-24 mx-auto max-w-[96%] lg:max-w-7xl space-y-4">
            {loadingAds ? (
              <div className="h-[200px] rounded-3xl bg-white/5 animate-pulse ring-1 ring-orange-500/10" />
            ) : (
              adsItems.map((ad, idx) => (
                <a
                  key={ad.id ?? idx}
                  href={ad.link || "#"}
                  target={ad.link ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="relative w-full h-[200px] md:h-[220px] rounded-3xl overflow-hidden ring-1 ring-orange-500/25 shadow-[0_0_40px_rgba(249,115,22,0.08)] group block cursor-pointer"
                >
                  <img
                    src={getAdBg(ad)}
                    alt={ad.title || "Promotional Banner"}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => { e.target.src = '/bannerforAdd.jpg'; }}
                  />
                </a>
              ))
            )}
          </section>
        )}
      </main>

      {/* --- INFORMATION STRIP --- */}
      <div className="border-t border-white/[0.08] bg-[#0d0d0d] px-4 py-2 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-wide text-white/70 sm:text-sm">
          Connecting Technology Innovation to <span className="text-orange-400">Enterprise Outcomes</span>
        </p>
      </div>

      <BottomNav />
      <Footer />
      {/* <Chatbot /> */}
    </>
  );
}
