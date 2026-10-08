'use client';

export default function PartnerGrowthSection() {
  return (
    <section className="w-full bg-[#060608] py-24 px-4 sm:px-6 border-t border-white/[0.05] overflow-hidden">
      <div className="max-w-6xl mx-auto">

        {/* Heading */}
        <div className="text-center mb-16">
          <p className="text-xs font-bold tracking-widest uppercase text-orange-500 mb-3">
            The Platform
          </p>
          <h2 className="text-white font-light text-3xl sm:text-4xl lg:text-5xl leading-tight mb-6">
            One Platform.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              Multiple Ways to Grow.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: ecosystem composition SVG */}
          <div className="flex items-center justify-center" aria-hidden="true">
            <svg viewBox="0 0 340 380" className="w-full max-w-sm h-auto">
              <defs>
                <linearGradient id="pg_isv" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#fb923c" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="pg_sp" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#fb923c" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="pg_ca" x1="0.5" y1="0" x2="0.5" y2="1">
                  <stop offset="0%" stopColor="#fdba74" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#fb923c" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Enterprise Demand — top */}
              <rect x="85" y="10" width="170" height="36" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <text x="170" y="28" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="7.5" fontWeight="700" letterSpacing="3">ENTERPRISE DEMAND</text>
              <text x="170" y="39" textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="5.5" letterSpacing="1">Customer requirements &amp; business outcomes</text>

              {/* Lines from Enterprise Demand → three partner types */}
              <line x1="120" y1="46" x2="68" y2="118" stroke="url(#pg_isv)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
              <line x1="170" y1="46" x2="170" y2="118" stroke="url(#pg_sp)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
              <line x1="220" y1="46" x2="272" y2="118" stroke="url(#pg_ca)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />

              {/* ISVs / SaaS — left */}
              <rect x="18" y="118" width="100" height="54" rx="8" fill="rgba(249,115,22,0.07)" stroke="rgba(249,115,22,0.28)" strokeWidth="1" />
              <text x="68" y="136" textAnchor="middle" fill="#f97316" fontSize="6.5" fontWeight="700" letterSpacing="1.5">ISVs / SAAS</text>
              <text x="68" y="148" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="5.5">Bring technology</text>
              <text x="68" y="160" textAnchor="middle" fill="rgba(249,115,22,0.55)" fontSize="5">📦 PRODUCT</text>

              {/* Solution Partners — center */}
              <rect x="120" y="118" width="100" height="54" rx="8" fill="rgba(251,191,36,0.07)" stroke="rgba(251,191,36,0.28)" strokeWidth="1" />
              <text x="170" y="136" textAnchor="middle" fill="#fbbf24" fontSize="6.5" fontWeight="700" letterSpacing="1">SOLUTION</text>
              <text x="170" y="147" textAnchor="middle" fill="#fbbf24" fontSize="6.5" fontWeight="700" letterSpacing="1">PARTNERS</text>
              <text x="170" y="159" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="5.5">Bring delivery</text>
              <text x="170" y="165" textAnchor="middle" fill="rgba(251,191,36,0.55)" fontSize="5">⚡ CAPABILITY</text>

              {/* Consulting Advisors — right */}
              <rect x="222" y="118" width="100" height="54" rx="8" fill="rgba(253,186,116,0.07)" stroke="rgba(253,186,116,0.28)" strokeWidth="1" />
              <text x="272" y="136" textAnchor="middle" fill="#fdba74" fontSize="6.5" fontWeight="700" letterSpacing="1">CONSULTING</text>
              <text x="272" y="147" textAnchor="middle" fill="#fdba74" fontSize="6.5" fontWeight="700" letterSpacing="1">ADVISORS</text>
              <text x="272" y="159" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="5.5">Bring relationships</text>
              <text x="272" y="165" textAnchor="middle" fill="rgba(253,186,116,0.55)" fontSize="5">🤝 EXPERTISE</text>

              {/* Lines converging → NeoZaar */}
              <line x1="68" y1="172" x2="148" y2="242" stroke="url(#pg_isv)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
              <line x1="170" y1="172" x2="170" y2="242" stroke="url(#pg_sp)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
              <line x1="272" y1="172" x2="192" y2="242" stroke="url(#pg_ca)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />

              {/* NeoZaar hub */}
              <rect x="100" y="242" width="140" height="52" rx="10" fill="rgba(249,115,22,0.09)" stroke="rgba(249,115,22,0.35)" strokeWidth="1.5" />
              <circle cx="170" cy="268" r="10" fill="rgba(249,115,22,0.15)" stroke="rgba(249,115,22,0.4)" strokeWidth="1" />
              <text x="170" y="262" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="800" letterSpacing="2">NEOZAAR</text>
              <text x="170" y="274" textAnchor="middle" fill="rgba(249,115,22,0.85)" fontSize="6" fontWeight="600" letterSpacing="1.5">PLATFORM</text>
              <text x="170" y="285" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="5">Matching · GTM · Commercial</text>

              {/* NeoZaar → Business Outcomes */}
              <line x1="170" y1="294" x2="170" y2="330" stroke="rgba(249,115,22,0.4)" strokeWidth="1.5" />
              <polygon points="165,326 175,326 170,332" fill="rgba(249,115,22,0.5)" />

              {/* Business Outcomes */}
              <rect x="90" y="334" width="160" height="36" rx="8" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <text x="170" y="350" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="7" fontWeight="700" letterSpacing="2">BUSINESS OUTCOMES</text>
              <text x="170" y="362" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="5.5">Revenue · Partnerships · Growth</text>
            </svg>
          </div>

          {/* Right: four approved statements */}
          <div className="space-y-6">
            {[
              { who: 'ISVs',                 what: 'bring technology.',                           color: '#f97316', icon: '📦' },
              { who: 'Solution Partners',    what: 'bring delivery capability.',                  color: '#fbbf24', icon: '⚡' },
              { who: 'Consulting Advisors',  what: 'bring relationships and expertise.',           color: '#fdba74', icon: '🤝' },
              { who: 'NeoZaar',              what: 'brings them together around enterprise demand.', color: '#fb923c', icon: '🔮' },
            ].map(({ who, what, color, icon }) => (
              <div
                key={who}
                className="flex items-start gap-4 p-5 rounded-xl border"
                style={{
                  borderColor: `${color}20`,
                  backgroundColor: `${color}05`,
                }}
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
                <p className="text-base sm:text-lg font-light leading-snug">
                  <span className="font-semibold" style={{ color }}>{who}</span>{' '}
                  <span className="text-gray-400">{what}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
