'use client';

export default function SDGImpactSection() {
  return (
    <section className="w-full bg-[#060608] py-24 px-4 sm:px-6 border-t border-white/[0.05] overflow-hidden">
      <div className="max-w-4xl mx-auto text-center flex flex-col items-center">

        {/* SDG badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/[0.07] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-xs font-bold tracking-widest uppercase text-amber-400">
            Aligned to UN SDG 17 — Partnerships for the Goals
          </span>
        </div>

        {/* Heading */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {/* SDG 17 custom SVG */}
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="SDG 17">
            {/* Outer ring */}
            <circle cx="28" cy="28" r="27" stroke="#19486A" strokeWidth="1.5" fill="#19486A" fillOpacity="0.15"/>
            {/* Five interlocking petal rings — SDG 17 flower symbol */}
            {/* Top */}
            <circle cx="28" cy="16" r="8.5" stroke="#f97316" strokeWidth="1.4" fill="none" opacity="0.85"/>
            {/* Bottom-right */}
            <circle cx="36.1" cy="32.5" r="8.5" stroke="#fbbf24" strokeWidth="1.4" fill="none" opacity="0.85"/>
            {/* Bottom-left */}
            <circle cx="19.9" cy="32.5" r="8.5" stroke="#fb923c" strokeWidth="1.4" fill="none" opacity="0.85"/>
            {/* Top-right */}
            <circle cx="33.5" cy="19.5" r="8.5" stroke="#fde68a" strokeWidth="1.4" fill="none" opacity="0.6"/>
            {/* Top-left */}
            <circle cx="22.5" cy="19.5" r="8.5" stroke="#fdba74" strokeWidth="1.4" fill="none" opacity="0.6"/>
            {/* Center dot */}
            <circle cx="28" cy="28" r="3" fill="#f97316" opacity="0.9"/>
            {/* 17 label */}
            <text x="28" y="48.5" textAnchor="middle" fill="#fbbf24" fontSize="7" fontWeight="700" letterSpacing="0.5" fontFamily="sans-serif">SDG 17</text>
          </svg>

          <h2 className="text-white font-light text-3xl sm:text-4xl lg:text-5xl leading-tight">
            Partnering for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              Impact
            </span>
          </h2>
        </div>

        {/* Body */}
        <p className="text-gray-400 text-base sm:text-lg leading-relaxed max-w-2xl mb-10">
          NeoZaar believes meaningful technology outcomes are built through strong partnerships.
          By bringing together ISVs, hyperscalers, solution partners, consulting advisors and
          enterprises, we create an ecosystem that enables shared growth, expands market access
          and helps deliver greater customer impact.
        </p>

        {/* Tagline pills — one consistent brand-orange style, not a rotating palette. */}
        <div className="flex flex-wrap items-center gap-3 justify-center">
          {['Partnerships', 'Innovation', 'Impact', 'Growth'].map((word) => (
            <span
              key={word}
              className="rounded-lg border border-orange-500/25 bg-orange-500/[0.07] px-4 py-2 text-xs font-bold uppercase tracking-wider text-orange-400"
            >
              {word}
            </span>
          ))}
        </div>

      </div>
    </section>
  );
}
