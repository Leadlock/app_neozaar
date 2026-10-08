'use client';

import Link from 'next/link';

const BENEFITS = [
  'Access relevant enterprise opportunities',
  'Discover ISVs that complement your portfolio',
  'Build bundled solutions around customer outcomes',
  'Attach implementation and managed services',
  'Create recurring MSP offerings',
  'Become a NeoZaar Partner of Choice',
  'Get directly positioned into opportunities that match your capabilities',
  'Collaborate on marketplace and co-sell motions',
];

export default function SolutionPartnerPath() {
  return (
    <section
      id="solution-partner-path"
      className="w-full bg-[#020202] py-24 px-4 sm:px-6 border-t border-white/[0.05]"
    >
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/25 bg-orange-500/[0.07] mb-6">
          <span className="text-[9px] font-bold tracking-widest uppercase text-orange-400">Solution Partners</span>
        </div>

        <h2 className="text-white font-light text-2xl sm:text-3xl lg:text-4xl leading-tight mb-4">
          Expand Your Portfolio.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
            Win More Opportunities. Build Recurring Revenue.
          </span>
        </h2>

        <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-8">
          Turn your existing Microsoft, AWS, GCP and technology capabilities into more
          customer-facing solution and services opportunities.
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
            href="/solution-partner"
            className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 px-8 py-4 text-sm font-semibold tracking-wide text-orange-400 transition-all duration-200 hover:border-orange-500 hover:bg-orange-500 hover:text-white"
          >
            Read More
          </Link>
        </div>
      </div>
    </section>
  );
}
