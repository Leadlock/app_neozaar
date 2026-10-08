'use client';

import Link from 'next/link';

const BENEFITS = [
  'Refer customer opportunities',
  'Recommend and upsell products and services',
  'Introduce adjacent solutions',
  'Collaborate on discovery and scoping',
  'Track referred opportunities',
  'Earn through referral, advisory or success-fee models',
];

export default function ConsultingAdvisorPath() {
  return (
    <section
      id="consulting-advisor-path"
      className="w-full bg-[#060608] py-24 px-4 sm:px-6 border-t border-white/[0.05]"
    >
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/25 bg-orange-500/[0.07] mb-6">
          <span className="text-[9px] font-bold tracking-widest uppercase text-orange-400">Consulting Advisors</span>
        </div>

        <h2 className="text-white font-light text-2xl sm:text-3xl lg:text-4xl leading-tight mb-4">
          Turn Trusted Relationships Into{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
            Revenue Opportunities.
          </span>
        </h2>

        <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-8">
          Refer customer requirements, recommend relevant products and services, collaborate with
          NeoZaar on solutioning and participate commercially when opportunities convert.
        </p>

        <p className="text-[10px] font-bold tracking-widest uppercase text-orange-400 mb-4">
          What you can do
        </p>
        <ul className="space-y-3 mb-10">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm text-gray-400">
              <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {b}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/consulting-advisor"
            className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 px-8 py-4 text-sm font-semibold tracking-wide text-orange-400 transition-all duration-200 hover:border-orange-500 hover:bg-orange-500 hover:text-white"
          >
            Read More
          </Link>
        </div>
      </div>
    </section>
  );
}
