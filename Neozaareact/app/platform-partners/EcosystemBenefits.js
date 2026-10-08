'use client';

import { useState } from 'react';

const BENEFITS = [
  {
    id: 'enterprise-demand',
    label: 'Access Enterprise Demand',
    desc: 'Connect your technology, services or relationships to active enterprise requirements and business outcomes.',
    icon: '🏢',
    color: '#f97316',
    highlights: ['Enterprise Customers', 'Requirements', 'Opportunities'],
  },
  {
    id: 'stronger-solutions',
    label: 'Build Stronger Solutions',
    desc: 'Combine products, services, partner capabilities and cloud platforms to create complete customer solutions.',
    icon: '🧩',
    color: '#fbbf24',
    highlights: ['ISVs', 'Solution Partners', 'Services', 'Cloud Platforms'],
  },
  {
    id: 'expand-ecosystem',
    label: 'Expand Your Ecosystem',
    desc: 'Work with ISVs, Solution Partners, Consulting Advisors and hyperscaler ecosystems through a common platform.',
    icon: '🌐',
    color: '#fb923c',
    highlights: ['ISVs', 'Solution Partners', 'Consulting Advisors', 'Hyperscalers'],
  },
  {
    id: 'new-revenue',
    label: 'Create New Revenue Streams',
    desc: 'Generate revenue through product sales, implementation, managed services, referrals, private offers and recurring engagements.',
    icon: '💰',
    color: '#f97316',
    highlights: ['Products', 'Implementation', 'Managed Services', 'Referrals', 'Private Offers'],
  },
  {
    id: 'marketplace',
    label: 'Activate Marketplace & Co-Sell',
    desc: 'Build relevant AWS, Azure and GCP marketplace, private-offer and co-sell motions where applicable.',
    icon: '🛒',
    color: '#fbbf24',
    highlights: ['AWS', 'Azure', 'GCP', 'Marketplace', 'Private Offers', 'Co-Sell'],
  },
  {
    id: 'matched',
    label: 'Get Matched to the Right Opportunities',
    desc: 'NeoZaar maps customer requirements to relevant products, services and partner capabilities — helping the right ecosystem participant engage at the right time.',
    icon: '🎯',
    color: '#fdba74',
    highlights: ['Customer Requirements', 'Products', 'Services', 'Partner Capabilities'],
  },
];

export default function EcosystemBenefits() {
  const [active, setActive] = useState(BENEFITS[0].id);
  const activeBenefit = BENEFITS.find((b) => b.id === active);

  return (
    <section className="w-full bg-[#020202] py-24 px-4 sm:px-6 border-t border-white/[0.05]">
      <div className="max-w-7xl mx-auto">

        {/* Heading */}
        <div className="text-center mb-16">
          <p className="text-xs font-bold tracking-widest uppercase text-orange-500 mb-3">
            Why Partner
          </p>
          <h2 className="text-white font-light text-3xl sm:text-4xl lg:text-5xl leading-tight">
            Why Partner with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              NeoZaar
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">

          {/* Left: benefit navigation list */}
          <div className="lg:col-span-2 flex flex-col gap-2">
            {BENEFITS.map((b) => (
              <button
                key={b.id}
                onClick={() => setActive(b.id)}
                className="group w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-200"
                style={{
                  borderColor: active === b.id ? `${b.color}35` : 'rgba(255,255,255,0.05)',
                  backgroundColor: active === b.id ? `${b.color}07` : 'transparent',
                }}
              >
                <span
                  className="text-xl flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border"
                  style={{
                    backgroundColor: active === b.id ? `${b.color}12` : 'rgba(255,255,255,0.03)',
                    borderColor: active === b.id ? `${b.color}30` : 'rgba(255,255,255,0.06)',
                  }}
                >
                  {b.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-semibold leading-snug transition-colors duration-200"
                    style={{ color: active === b.id ? b.color : 'rgba(255,255,255,0.55)' }}
                  >
                    {b.label}
                  </p>
                  {active === b.id && (
                    <p className="text-[11px] text-gray-500 leading-relaxed mt-1.5">
                      {b.desc}
                    </p>
                  )}
                </div>
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 transition-opacity duration-200"
                  style={{ color: b.color, opacity: active === b.id ? 1 : 0 }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          {/* Right: ecosystem map SVG — highlights change with selection */}
          <div className="lg:col-span-3 flex items-center justify-center">
            <div className="w-full max-w-md" aria-hidden="true">
              <svg viewBox="0 0 380 380" className="w-full h-auto">
                <defs>
                  <radialGradient id="eb_center_glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={activeBenefit?.color ?? '#a855f7'} stopOpacity="0.12" />
                    <stop offset="100%" stopColor={activeBenefit?.color ?? '#a855f7'} stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Background glow */}
                <ellipse cx="190" cy="190" rx="100" ry="100" fill="url(#eb_center_glow)" />

                {/* Outer orbit */}
                <circle cx="190" cy="190" r="140" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <circle cx="190" cy="190" r="90" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />

                {/* NeoZaar center */}
                <circle cx="190" cy="190" r="44" fill="rgba(249,115,22,0.08)" stroke="rgba(249,115,22,0.25)" strokeWidth="1.5" />
                <circle cx="190" cy="190" r="30" fill="rgba(249,115,22,0.12)" stroke="rgba(249,115,22,0.4)" strokeWidth="1" />
                <text x="190" y="186" textAnchor="middle" fill="white" fontSize="8" fontWeight="800" letterSpacing="2">NEOZAAR</text>
                <text x="190" y="198" textAnchor="middle" fill="rgba(249,115,22,0.85)" fontSize="6" fontWeight="600" letterSpacing="1.5">PLATFORM</text>

                {/* 6 benefit nodes arranged in a hexagon */}
                {BENEFITS.map((b, i) => {
                  const angle = (i * 60 - 90) * (Math.PI / 180);
                  const r = 140;
                  const cx = 190 + r * Math.cos(angle);
                  const cy = 190 + r * Math.sin(angle);
                  const isActive = active === b.id;
                  return (
                    <g key={b.id} onClick={() => setActive(b.id)} style={{ cursor: 'pointer' }}>
                      {/* Spoke */}
                      <line
                        x1="190" y1="190" x2={cx} y2={cy}
                        stroke={isActive ? `${b.color}45` : 'rgba(255,255,255,0.04)'}
                        strokeWidth={isActive ? 1.5 : 1}
                        strokeDasharray="4 3"
                      />
                      {/* Node */}
                      <circle
                        cx={cx} cy={cy} r={isActive ? 28 : 22}
                        fill={isActive ? `${b.color}14` : 'rgba(255,255,255,0.025)'}
                        stroke={isActive ? `${b.color}50` : 'rgba(255,255,255,0.07)'}
                        strokeWidth={isActive ? 1.5 : 1}
                        style={{ transition: 'all 0.3s ease' }}
                      />
                      <text x={cx} y={cy - 4} textAnchor="middle" fill={isActive ? b.color : 'rgba(255,255,255,0.3)'} fontSize="9" fontWeight="700">
                        {b.icon}
                      </text>
                      <text
                        x={cx}
                        y={cy + 7}
                        textAnchor="middle"
                        fill={isActive ? b.color : 'rgba(255,255,255,0.2)'}
                        fontSize="5"
                        fontWeight={isActive ? '700' : '400'}
                        letterSpacing="0.5"
                      >
                        {b.label.split(' ').slice(0, 2).join(' ')}
                      </text>
                    </g>
                  );
                })}

                {/* Highlight nodes for active benefit */}
                {activeBenefit && activeBenefit.highlights.map((hl, i) => {
                  const angle = (i * (360 / activeBenefit.highlights.length) - 90) * (Math.PI / 180);
                  const r = 90;
                  const cx = 190 + r * Math.cos(angle);
                  const cy = 190 + r * Math.sin(angle);
                  return (
                    <g key={hl}>
                      <circle cx={cx} cy={cy} r="18" fill={`${activeBenefit.color}10`} stroke={`${activeBenefit.color}35`} strokeWidth="1" />
                      <text x={cx} y={cy + 3} textAnchor="middle" fill={activeBenefit.color} fontSize="5" fontWeight="600">
                        {hl.split(' ').slice(0, 2).join(' ')}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
