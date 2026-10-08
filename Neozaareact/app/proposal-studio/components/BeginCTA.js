'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export default function BeginCTA() {
  return (
    <section className="w-full py-20 lg:py-28 bg-[#0a0a0a] border-t border-white/5 relative overflow-hidden">

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-[-30%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-orange-500/8 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 flex flex-col items-center text-center">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-orange-400 mb-6">Ready when you are</p>

        <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-light text-white leading-[1.1] tracking-tight mb-5">
          Start building your{' '}
          <span className="text-orange-400 font-semibold">proposal request</span>.
        </h2>

        <p className="text-gray-400 text-[15px] leading-relaxed max-w-lg mb-10">
          Neo will guide you from your initial need to a structured request — a few
          simple questions, and you can review everything before it goes to the
          NeoZaar team.
        </p>

        <Link
          href="/neo"
          className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-orange-500 to-orange-700 text-white font-semibold text-base shadow-lg shadow-orange-900/30 hover:-translate-y-px transition-transform focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-black"
        >
          Begin your proposal
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
        </Link>

        <div className="flex items-center gap-2 mt-8 text-[12.5px] text-gray-500">
          <ShieldCheck className="w-4 h-4 text-gray-600" />
          Your information is secure and will only be used to build your request.
        </div>
      </div>
    </section>
  );
}
