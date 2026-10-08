'use client';

import { useState } from 'react';
import Link from 'next/link';

const ICONS = {
  isv: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  'solution-partner': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  'consulting-advisor': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
};

// One shared brand-orange accent for every path — previously each card had its own
// hue (orange / amber / peach), which read as inconsistent rather than as a themed
// set. Card identity now comes from opacity + flex-grow (active/inactive) alone.
const ACCENT = {
  color: '#f97316',
  bg: 'rgba(249,115,22,0.08)',
  bgLight: 'rgba(249,115,22,0.04)',
  border: 'rgba(249,115,22,0.28)',
  borderLight: 'rgba(249,115,22,0.14)',
};

const PATHS = [
  {
    id: 'isv',
    label: 'ISVs / SaaS Companies',
    identity: 'PRODUCT',
    decisionTag: 'You build technology',
    headline: 'Reach Enterprise Customers. Build Your Channel. Scale Faster.',
    intro:
      'Position your technology against real customer requirements, activate Solution Partners and build marketplace and co-sell motions across AWS, Azure and GCP.',
    benefits: [
      'Reach enterprise customers',
      'Build and activate a channel ecosystem',
      'Get mapped to relevant solutions and use cases',
      'Get positioned into matching customer opportunities',
      'Create partner-led solution and MSP motions',
      'Build marketplace, private-offer and co-sell opportunities',
      'Access GTM and pipeline-building support',
    ],
    cta: 'Register Your ISV / SaaS',
    href: '/isv-form',
    readMoreHref: '/isv-registration',
  },
  {
    id: 'solution-partner',
    label: 'Solution Partners',
    identity: 'DELIVERY',
    decisionTag: 'You deliver services',
    headline: 'Expand Your Portfolio. Win More Opportunities. Build Recurring Revenue.',
    intro:
      'Turn your existing Microsoft, AWS, GCP and technology capabilities into more customer-facing solution and services opportunities.',
    benefits: [
      'Access relevant enterprise opportunities',
      'Discover ISVs that complement your portfolio',
      'Build bundled solutions around customer outcomes',
      'Attach implementation and managed services',
      'Create recurring MSP offerings',
      'Become a NeoZaar Partner of Choice',
      'Get directly positioned into matching opportunities',
      'Collaborate on marketplace and co-sell motions',
    ],
    cta: 'Register as a Solution Partner',
    href: '/solution-partner-registration',
    readMoreHref: '/solution-partner',
  },
  {
    id: 'consulting-advisor',
    label: 'Consulting Advisors',
    identity: 'RELATIONSHIPS',
    decisionTag: 'You bring relationships',
    headline: 'Turn Trusted Relationships Into Revenue Opportunities.',
    intro:
      'Refer customer requirements, recommend relevant products and services, collaborate with NeoZaar on solutioning and participate commercially when opportunities convert.',
    benefits: [
      'Refer customer opportunities',
      'Recommend and upsell products and services',
      'Introduce adjacent solutions',
      'Collaborate on discovery and scoping',
      'Track referred opportunities',
      'Earn through referral, advisory or success-fee models',
    ],
    cta: 'Become a Consulting Advisor',
    href: '/consulting-advisor-registration',
    readMoreHref: '/consulting-advisor',
  },
];

export default function PartnerTypeSelector() {
  const [locked, setLocked] = useState(null);
  const [hovered, setHovered] = useState(null);

  const displayed = locked || hovered;

  const getFlexGrow = (id) => {
    if (!displayed) return 1;
    return displayed === id ? 2.8 : 0.75;
  };

  const getOpacity = (id) => {
    if (!displayed) return 1;
    return displayed === id ? 1 : 0.5;
  };

  const handleClick = (id) => {
    setLocked((prev) => (prev === id ? null : id));
    setHovered(null);
  };

  return (
    <section
      id="partner-selector"
      className="w-full bg-[#020202] py-20 px-4 sm:px-6 border-t border-white/[0.06] scroll-mt-0"
    >
      <div className="max-w-7xl mx-auto">

        {/* Section heading */}
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-widest uppercase text-orange-500 mb-4">
            Partner Paths
          </p>
          <h2 className="text-white font-light text-3xl sm:text-4xl lg:text-5xl leading-tight mb-4">
            Choose How You Want to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              Partner
            </span>
          </h2>
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent mx-auto" />
        </div>

        {/* Quick decision guide */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-0 mb-10 sm:divide-x sm:divide-white/10">
          <span className="text-[10px] font-bold tracking-widest uppercase text-gray-600 sm:pr-5">
            What do you bring?
          </span>
          {PATHS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleClick(p.id)}
              className="flex items-center gap-1.5 text-[10px] font-semibold sm:px-5 transition-all duration-200"
              style={{ color: displayed === p.id ? ACCENT.color : 'rgba(255,255,255,0.35)' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: displayed === p.id ? ACCENT.color : 'rgba(255,255,255,0.2)' }}
              />
              <span className="uppercase tracking-wider">{p.decisionTag}</span>
              <svg className="w-2.5 h-2.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="uppercase tracking-wider">{p.identity}</span>
            </button>
          ))}
        </div>

        {/* Desktop: flex-row expanding cards */}
        <div className="hidden lg:flex gap-3 min-h-[480px]">
          {PATHS.map((path) => {
            const isActive = displayed === path.id;
            return (
              <div
                key={path.id}
                className="relative rounded-2xl border overflow-hidden cursor-pointer group/card"
                style={{
                  flexGrow: getFlexGrow(path.id),
                  flexShrink: 1,
                  flexBasis: '0%',
                  opacity: getOpacity(path.id),
                  borderColor: isActive ? ACCENT.border : 'rgba(255,255,255,0.07)',
                  backgroundColor: isActive ? ACCENT.bgLight : 'rgba(255,255,255,0.02)',
                  boxShadow: isActive ? `0 0 60px -10px ${ACCENT.color}40, inset 0 1px 0 rgba(255,255,255,0.04)` : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                  transition:
                    'flex-grow 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease, border-color 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease',
                }}
                onClick={() => handleClick(path.id)}
                onMouseEnter={() => !locked && setHovered(path.id)}
                onMouseLeave={() => !locked && setHovered(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleClick(path.id)}
                aria-expanded={isActive}
                aria-label={`${path.label} partner path`}
              >
                {/* Identity badge */}
                <div className="absolute top-5 right-5 z-10">
                  <span
                    className="text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border"
                    style={{
                      color: ACCENT.color,
                      borderColor: ACCENT.border,
                      backgroundColor: ACCENT.bg,
                    }}
                  >
                    {path.identity}
                  </span>
                </div>

                <div className="p-7 h-full flex flex-col">
                  {/* Icon + label */}
                  <div className="mb-5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 border"
                      style={{
                        backgroundColor: ACCENT.bg,
                        borderColor: ACCENT.border,
                        color: ACCENT.color,
                      }}
                    >
                      {ICONS[path.id]}
                    </div>
                    <p
                      className="text-sm font-bold uppercase tracking-wider leading-snug"
                      style={{ color: ACCENT.color }}
                    >
                      {path.label}
                    </p>
                  </div>

                  {/* Headline — always visible */}
                  <p className="text-white text-sm font-medium leading-snug mb-4">
                    {path.headline}
                  </p>

                  {/* Expanded content */}
                  <div
                    className="overflow-hidden"
                    style={{
                      maxHeight: isActive ? '700px' : '0px',
                      opacity: isActive ? 1 : 0,
                      transition: 'max-height 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
                    }}
                  >
                    <p className="text-gray-500 text-xs leading-relaxed mb-5">
                      {path.intro}
                    </p>

                    {/* Benefits */}
                    <p
                      className="text-[9px] font-bold tracking-widest uppercase mb-3"
                      style={{ color: ACCENT.color }}
                    >
                      What you can do
                    </p>
                    <ul className="space-y-1.5 mb-6">
                      {path.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-xs text-gray-400">
                          <svg
                            className="w-3 h-3 mt-0.5 flex-shrink-0"
                            style={{ color: ACCENT.color }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          {b}
                        </li>
                      ))}
                    </ul>

                    {/* CTA — Read More only; the Register button is hidden here. */}
                    <div className="mt-auto flex flex-wrap items-center gap-3">
                      <Link
                        href={path.readMoreHref}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 px-6 py-3 font-bold text-xs tracking-widest uppercase text-orange-400 transition-all duration-200 hover:border-orange-500 hover:bg-orange-500 hover:text-white"
                      >
                        Read More
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>

                  {/* Collapsed hint */}
                  {!isActive && (
                    <p className="mt-auto text-[10px] tracking-widest uppercase text-gray-700 pt-3 flex items-center gap-1.5">
                      <span>Explore</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile: stacked accordion */}
        <div className="flex flex-col gap-3 lg:hidden">
          {PATHS.map((path) => {
            const isActive = locked === path.id;
            return (
              <div
                key={path.id}
                className="rounded-2xl border overflow-hidden"
                style={{
                  borderColor: isActive ? ACCENT.border : 'rgba(255,255,255,0.08)',
                  backgroundColor: isActive ? ACCENT.bgLight : 'rgba(255,255,255,0.015)',
                }}
              >
                {/* Header — always visible, tap to expand */}
                <button
                  className="w-full flex items-center gap-4 p-5 text-left"
                  onClick={() => handleClick(path.id)}
                  aria-expanded={isActive}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
                    style={{ backgroundColor: ACCENT.bg, borderColor: ACCENT.border, color: ACCENT.color }}
                  >
                    {ICONS[path.id]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{path.label}</p>
                    <p className="text-[10px] font-bold tracking-widest uppercase mt-0.5" style={{ color: ACCENT.color }}>
                      {path.identity}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-600 flex-shrink-0 transition-transform duration-300"
                    style={{ transform: isActive ? 'rotate(180deg)' : 'none' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded content */}
                {isActive && (
                  <div className="px-5 pb-6 border-t" style={{ borderColor: ACCENT.borderLight }}>
                    <p className="text-white font-medium text-sm leading-snug mt-4 mb-3">
                      {path.headline}
                    </p>
                    <p className="text-gray-500 text-xs leading-relaxed mb-4">
                      {path.intro}
                    </p>
                    <p className="text-[9px] font-bold tracking-widest uppercase mb-3" style={{ color: ACCENT.color }}>
                      What you can do
                    </p>
                    <ul className="space-y-2 mb-5">
                      {path.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-xs text-gray-400">
                          <svg className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: ACCENT.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          {b}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={path.readMoreHref}
                        className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 px-5 py-2.5 font-bold text-xs tracking-widest uppercase text-orange-400 transition-all duration-200 hover:border-orange-500 hover:bg-orange-500 hover:text-white"
                      >
                        Read More
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-700 mt-8 lg:hidden">
          Select a partner path to expand and register.
        </p>
      </div>
    </section>
  );
}
