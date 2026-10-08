'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Boxes,
  Bot,
  BriefcaseBusiness,
  Building2,
  Cloud,
  Database,
  HardDrive,
  LifeBuoy,
  LockKeyhole,
  Network,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from 'lucide-react';

const FALLBACK_CATEGORIES = [
  { id: 'cloud', name: 'Cloud & Infrastructure' },
  { id: 'security', name: 'Cybersecurity' },
  { id: 'ai', name: 'AI & Automation' },
  { id: 'data', name: 'Data & Analytics' },
  { id: 'compliance', name: 'Compliance & Governance' },
  { id: 'managed', name: 'Managed Services' },
];

function categoryIcon(name) {
  const value = name.toLowerCase();
  if (value.includes('security') || value.includes('cyber')) return ShieldCheck;
  if (value.includes('cloud')) return Cloud;
  if (value.includes('analytic')) return BarChart3;
  if (value.includes('data') || value.includes('database')) return Database;
  if (value.includes('ai ') || value.includes('artificial') || value.includes('intelligence') || value.includes('automation') || value.includes(' ml')) return Bot;
  if (value.includes('compliance') || value.includes('governance')) return LockKeyhole;
  if (value.includes('storage') || value.includes('backup')) return HardDrive;
  if (value.includes('network')) return Network;
  if (value.includes('continuity') || value.includes('resilience') || value.includes('disaster') || value.includes('recovery')) return LifeBuoy;
  if (value.includes('people') || value.includes('talent') || value.includes('workforce') || value.includes(' hr') || value.includes('human')) return Users;
  if (value.includes('workplace') || value.includes('collaboration') || value.includes('productivity') || value.includes('digital')) return Sparkles;
  if (value.includes('workflow') || value.includes('operation') || value.includes('process')) return Workflow;
  if (value.includes('service') || value.includes('consult') || value.includes('managed')) return BriefcaseBusiness;
  if (value.includes('enterprise') || value.includes('business') || value.includes('industry')) return Building2;
  return Boxes;
}

export default function TopCategoriesSlider() {
  const sliderRef = useRef(null);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  // Tracks whether the row overflows and where it's scrolled, so the arrows + the
  // right-edge fade only show when there's actually more to scroll (e.g. once more
  // categories are added), and each arrow disables at its end.
  const [scrollState, setScrollState] = useState({ scrollable: false, atStart: true, atEnd: true });

  useEffect(() => {
    let cancelled = false;

    fetch(`${process.env.NEXT_PUBLIC_API_BASE}catalog/marketplace/published?page=1&limit=1`)
      .then((response) => response.json())
      .then((result) => {
        if (cancelled || !Array.isArray(result?.filters?.categories)) return;

        const seen = new Set();
        const cleaned = result.filters.categories.reduce((items, category, index) => {
          const name = (category?.name || '').trim();
          const key = name.toLowerCase();
          if (!name || seen.has(key)) return items;
          seen.add(key);
          items.push({ id: category.id ?? index, name });
          return items;
        }, []);

        if (cleaned.length) setCategories(cleaned);
      })
      .catch(() => {})
      .finally(() => {});

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return undefined;
    const update = () => {
      const scrollable = el.scrollWidth - el.clientWidth > 4;
      const atStart = el.scrollLeft <= 4;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
      setScrollState((prev) =>
        prev.scrollable === scrollable && prev.atStart === atStart && prev.atEnd === atEnd
          ? prev
          : { scrollable, atStart, atEnd }
      );
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [categories]);

  const scroll = (direction) => {
    sliderRef.current?.scrollBy({
      left: direction * Math.min(sliderRef.current.clientWidth * 0.75, 720),
      behavior: 'smooth',
    });
  };

  return (
    <section className="border-b border-white/5 bg-[#080808] px-4 py-8 sm:px-6 md:py-10 lg:px-8">
      <div className="mx-auto max-w-screen-xl">
        <div className="mb-5 md:mb-12 flex items-end justify-between gap-4 md:gap-6">
          <div className="border-l-4 border-orange-500 pl-4">
            <h2 className="text-3xl font-bold text-white mb-2 lg:text-4xl">What Do You Want To <span className="text-orange-500">Achieve?</span></h2>
            <p className="text-slate-400">Start here, choose your priority and we'll help you find the right products, services and experts.</p>
          </div>
          {/* Arrows only exist once the row actually overflows (i.e. enough
              categories to need scrolling); each disables at its end. */}
          {scrollState.scrollable && (
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => scroll(-1)}
                disabled={scrollState.atStart}
                aria-label="Scroll left"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-all hover:border-orange-500 hover:text-orange-500 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/25 disabled:hover:border-white/10 disabled:hover:text-white/25"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                disabled={scrollState.atEnd}
                aria-label="Scroll right"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-500 bg-orange-500 text-white transition-all hover:bg-orange-600 hover:border-orange-600 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/25 disabled:hover:bg-white/10"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <div
            ref={sliderRef}
            className={`scrollbar-hide flex gap-3 overflow-x-auto py-3 -my-3 sm:gap-4 ${
              scrollState.scrollable ? 'snap-x snap-mandatory' : 'justify-center'
            }`}
          >
            {categories.map((category) => {
              const Icon = categoryIcon(category.name);
              return (
                <Link
                  key={category.id}
                  href={`/marketplace/category/${encodeURIComponent(category.name)}`}
                  className="group relative flex h-[164px] w-[172px] flex-none snap-start flex-col items-start justify-between overflow-hidden rounded-2xl border border-orange-500/25 bg-gradient-to-br from-white/[0.09] to-white/[0.025] p-5 text-left shadow-[0_14px_35px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-300 ease-out hover:-translate-y-1.5 hover:border-orange-400/70 hover:bg-white hover:shadow-[0_18px_44px_rgba(0,0,0,0.5),0_0_28px_-8px_rgba(249,115,22,0.6)] sm:h-[176px] sm:w-[198px]"
                >
                  <span aria-hidden="true" className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl transition duration-300 group-hover:bg-orange-500/20" />
                  <span className="relative grid h-12 w-12 flex-none place-items-center rounded-xl border border-white/10 bg-white/[0.08] transition duration-300 ease-out group-hover:border-orange-200 group-hover:bg-orange-50">
                    <Icon
                      size={26}
                      strokeWidth={1.75}
                      className="text-white transition duration-300 ease-out group-hover:scale-110 group-hover:text-orange-600"
                    />
                  </span>
                  <span className="relative flex w-full items-end justify-between gap-3 text-base font-semibold leading-snug text-white transition duration-300 ease-out group-hover:text-neutral-900 sm:text-lg">
                    <span className="line-clamp-2">{category.name}</span>
                    <svg className="h-5 w-5 flex-none text-orange-500 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Right-edge fade — signals there's more to scroll; hidden once at the end
              or when the row fits without scrolling. */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#080808] to-transparent transition-opacity duration-300 sm:w-20 ${
              scrollState.scrollable && !scrollState.atEnd ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      </div>
    </section>
  );
}
