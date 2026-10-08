'use client';

import Link from 'next/link';

const BENEFITS = [
  'Reach enterprise customers',
  'Build and activate a channel ecosystem',
  'Get mapped to relevant solutions and use cases',
  'Get positioned into matching customer opportunities',
  'Create partner-led solution and MSP motions',
  'Build marketplace, private-offer and co-sell opportunities',
  'Access GTM and pipeline-building support',
];

export default function ISVPartnerPath() {
  return (
    <section
      id="isv-path"
      className="w-full bg-[#060608] py-24 px-4 sm:px-6 border-t border-white/[0.05]"
    >
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/25 bg-orange-500/[0.07] mb-6">
          <span className="text-[9px] font-bold tracking-widest uppercase text-orange-400">ISVs / SaaS Companies</span>
        </div>

        <h2 className="text-white font-light text-2xl sm:text-3xl lg:text-4xl leading-tight mb-4">
          Reach Enterprise Customers.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
            Build Your Channel. Scale Faster.
          </span>
        </h2>

        <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-8">
          Position your technology against real customer requirements, activate Solution Partners
          and build marketplace and co-sell motions across AWS, Azure and GCP.
        </p>

        <p className="text-[10px] font-bold tracking-widest uppercase text-orange-500 mb-4">
          What you can do
        </p>
        <ul className="space-y-3 mb-10">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm text-gray-400">
              <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {b}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/isv-registration"
            className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 px-8 py-4 text-sm font-semibold tracking-wide text-orange-400 transition-all duration-200 hover:border-orange-500 hover:bg-orange-500 hover:text-white"
          >
            Read More
          </Link>
        </div>
      </div>
    </section>
  );
}
