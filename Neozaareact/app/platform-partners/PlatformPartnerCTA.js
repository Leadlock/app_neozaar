'use client';

export default function PlatformPartnerCTA({ onBecomePartner }) {
  return (
    <section className="w-full bg-[#060608] py-24 px-4 sm:px-6 border-t border-white/[0.05] overflow-hidden">
      <div className="max-w-4xl mx-auto text-center">

        {/* Journey visual — Product → Ecosystem → Market */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-10 flex-wrap">
          {[
            { label: 'ISVs', color: '#f97316' },
            { label: '+', color: 'rgba(255,255,255,0.2)', plain: true },
            { label: 'Solution Partners', color: '#fbbf24' },
            { label: '+', color: 'rgba(255,255,255,0.2)', plain: true },
            { label: 'Consulting Advisors', color: '#fdba74' },
          ].map(({ label, color, plain }, i) => (
            <span
              key={i}
              className={plain ? 'text-base' : 'text-xs font-bold tracking-wider uppercase px-3 py-1.5 rounded-lg border'}
              style={
                plain
                  ? { color }
                  : {
                      color,
                      borderColor: `${color}30`,
                      backgroundColor: `${color}08`,
                    }
              }
            >
              {label}
            </span>
          ))}
        </div>

        {/* Connector */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-px h-8 bg-gradient-to-b from-orange-500/30 via-amber-500/30 to-amber-400/30" />
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500/50 mt-0" />
        </div>

        {/* NeoZaar platform badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-orange-500/30 bg-orange-500/[0.07] mb-4">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-sm font-bold tracking-wider uppercase text-orange-400">NeoZaar Partner Ecosystem</span>
        </div>

        {/* Connector */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-px h-8 bg-gradient-to-b from-orange-500/30 to-white/10" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-0" />
        </div>

        {/* Heading */}
        <h2 className="text-white font-light text-3xl sm:text-4xl lg:text-5xl leading-tight mb-5">
          Join the NeoZaar{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
            Partner Ecosystem
          </span>
        </h2>

        <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Build new routes to market, access more opportunities and create value together.
        </p>

        {/* CTA — scrolls back to selector */}
        <button
          onClick={onBecomePartner}
          className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-black font-bold text-sm tracking-wide hover:bg-orange-500 hover:text-white transition-colors duration-200 mb-6"
        >
          Become a Platform Partner
          <svg
            className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        <p className="text-xs text-gray-700 mt-2">
          Clicking will take you to the partner selector — choose your path and register.
        </p>
      </div>
    </section>
  );
}
