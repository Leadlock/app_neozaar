'use client';

import Image from 'next/image';

export default function PlatformHero({ onChooseClick }) {
  return (
    <section
      className="w-full bg-[#020202] flex flex-col lg:flex-row items-stretch pt-16 lg:pt-20 lg:h-[calc(60vh+80px)]"
    >

      {/* Left — Image: fixed height on mobile, full height on desktop */}
      <div className="w-full lg:w-[50%] flex-shrink-0 flex items-center justify-center overflow-hidden h-[260px] sm:h-[340px] lg:h-full">
        <Image
          src="/assests/platform-partner-hero.jpg"
          alt="NeoZaar Platform Partners"
          width={768}
          height={768}
          priority
          style={{ width: 'auto', height: '100%', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
        />
      </div>

      {/* Right — Content 50% */}
      <div className="w-full lg:w-[50%] flex flex-col justify-center px-8 sm:px-12 lg:px-14 py-10 lg:py-0 border-t border-white/[0.05] lg:border-t-0 lg:border-l lg:border-white/[0.05]">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.03] mb-5 self-start">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-semibold tracking-widest uppercase text-gray-500">
            Partner Ecosystem
          </span>
        </div>

        <p className="text-xs font-bold tracking-widest uppercase text-orange-500 mb-3">
          Platform Partners
        </p>

        <h1 className="text-white font-light text-3xl sm:text-4xl xl:text-5xl leading-tight mb-5">
          Build.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
            Collaborate.
          </span>{' '}
          Co-Sell. Grow.
        </h1>

        <p className="text-gray-400 text-sm leading-relaxed mb-3">
          NeoZaar brings together ISVs, Solution Partners and Consulting Advisors on one platform to
          create more enterprise opportunities, build stronger solution ecosystems and accelerate
          revenue.
        </p>

        <p className="text-gray-600 text-xs leading-relaxed mb-8">
          Whether you build technology, deliver services or influence customer decisions, NeoZaar
          helps connect your capabilities to the right customers, partners and commercial motions.
        </p>

        <button
          onClick={onChooseClick}
          className="group relative self-start inline-flex items-center gap-4 px-8 py-5 text-sm font-bold tracking-[0.16em] uppercase text-white overflow-hidden transition-all duration-500"
          style={{
            background: 'linear-gradient(#0c0602, #060300) padding-box, linear-gradient(135deg, rgba(249,115,22,0.95) 0%, rgba(251,191,36,0.65) 50%, rgba(249,115,22,0.55) 100%) border-box',
            border: '1px solid transparent',
            boxShadow: '0 8px 48px rgba(249,115,22,0.2), 0 2px 12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Shimmer sweep */}
          <span
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.12) 50%, transparent 100%)' }}
          />
          {/* Bottom glow line on hover */}
          <span
            className="absolute bottom-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.9), transparent)' }}
          />
          {/* Live pulse dot */}
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse flex-shrink-0 relative z-10" />
          <span className="relative z-10 group-hover:text-orange-50 transition-colors duration-300">
            Choose How You Want to Partner
          </span>
          <svg
            className="relative z-10 w-4 h-4 text-orange-400 group-hover:translate-y-1 group-hover:text-amber-300 transition-all duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

    </section>
  );
}
