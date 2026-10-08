'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export default function StudioHero() {
  return (
    <section className="relative w-full min-h-[88vh] bg-[#0a0a0a] flex flex-col overflow-hidden">

      {/* Warm ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-8%] left-[-4%] w-[600px] h-[600px] bg-orange-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-4%] w-[500px] h-[500px] bg-amber-400/6 rounded-full blur-[120px]" />
        <div className="absolute top-[45%] left-[40%] w-[300px] h-[300px] bg-orange-600/5 rounded-full blur-[100px]" />
      </div>

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '60px 60px' }}
      />

      <div className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">

        {/* ── LEFT: copy ── */}
        <div className="flex flex-col items-start">

          <div className="inline-flex items-center gap-2 mb-7">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-orange-400">
              Neo AI · Your Solution Advisor
            </span>
            <span className="w-8 h-px bg-orange-500/50" />
          </div>

          <h1 className="text-white font-light text-[40px] sm:text-[52px] lg:text-[60px] leading-[1.05] mb-5 tracking-tight">
            Build Your Request with{' '}
            <em className="not-italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              Neo AI
            </em>
          </h1>

          <p className="text-orange-300/90 text-lg font-medium mb-5">
            Tell us what you need. Neo will help you build the rest.
          </p>

          <div className="w-12 h-0.5 bg-orange-500 mb-6" />

          <p className="text-gray-400 text-[15px] leading-relaxed max-w-xl mb-8">
            Whether you&rsquo;re solving a business challenge, evaluating technology,
            planning a migration, strengthening security or simply exploring your
            options, Neo AI will guide you from your initial need to a structured
            proposal request.
          </p>

          {/* "you don't need to know…" callout */}
          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 max-w-lg">
            <ShieldCheck className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-300 leading-relaxed">
              You don&rsquo;t need to know the solution, product or technical
              specifications before you start.
            </p>
          </div>

          <Link
            href="/neo"
            className="group mt-8 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-orange-500 to-orange-700 text-white font-semibold text-base shadow-lg shadow-orange-900/30 hover:-translate-y-px transition-transform focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-black"
          >
            Build your proposal
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </div>

        {/* ── RIGHT: animated Neo mark (desktop only) ── */}
        <div className="hidden lg:flex lg:justify-end">
          <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] lg:w-[460px] lg:h-[460px] flex items-center justify-center">
            <div className="absolute inset-0 bg-orange-500/10 rounded-full blur-[90px]" />
            {/* Animated NeoZaar logo mark (looping animated WebP, transparent). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assests/neo-hero.webp"
              alt="Neo AI"
              width={1380}
              height={1380}
              className="relative w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_20px_50px_rgba(249,115,22,0.25)]"
            />
          </div>
        </div>

      </div>
    </section>
  );
}
