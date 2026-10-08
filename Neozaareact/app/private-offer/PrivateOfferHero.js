'use client';

export default function PrivateOfferHero({ onQuoteClick }) {
  return (
    <section className="relative w-full bg-[#050505] overflow-hidden">
      {/* Background: deep grid + radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-orange-600/[0.12] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-[-10%] w-[500px] h-[500px] bg-orange-500/[0.06] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center pt-24 pb-20 px-4 sm:px-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse block" />
          <span className="text-xs font-semibold text-orange-400 tracking-widest uppercase">
            Cloud Marketplace Solutions
          </span>
        </div>

        <h1 className="text-white font-light text-4xl sm:text-5xl lg:text-[56px] leading-[1.12] mb-6 max-w-4xl">
          Custom{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-white font-normal">
            Private Offers
          </span>
          <br className="hidden sm:block" />
          for Your Cloud Marketplace Spend
        </h1>

        <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-2xl mb-3 font-light">
          Maximize your cloud investments. Streamline software procurement. Consolidate your billing.
        </p>
        <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-2xl mb-10 font-light">
          Unlock custom enterprise pricing and terms on your preferred software solutions. Leverage
          your AWS Marketplace and Azure Marketplace commitments directly through us.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={onQuoteClick}
            className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-700 text-white font-semibold rounded-full hover:from-orange-600 hover:to-orange-800 transition-all duration-300 shadow-lg shadow-orange-900/40 hover:shadow-orange-900/60 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-black text-base"
          >
            Request a Marketplace Quote
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>

          <a
            href="https://cal.com/neozaar/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-white font-semibold rounded-full hover:border-orange-500 hover:text-orange-400 transition-all duration-300 text-base"
          >
            Speak to a Marketplace Expert
          </a>
        </div>
      </div>
    </section>
  );
}
