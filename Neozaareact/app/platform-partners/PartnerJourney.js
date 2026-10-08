'use client';

const STAGES = [
  {
    label: 'Discover Opportunities',
    icon: '🔍',
    sub: 'Connect to active enterprise requirements',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.25)',
  },
  {
    label: 'Build Solutions',
    icon: '🧩',
    sub: 'Combine products, services and capabilities',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.25)',
  },
  {
    label: 'Collaborate',
    icon: '🤝',
    sub: 'Work across ISVs, partners and advisors',
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.08)',
    border: 'rgba(251,146,60,0.25)',
  },
  {
    label: 'Transact',
    icon: '💳',
    sub: 'Marketplace, co-sell and private offers',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.25)',
  },
  {
    label: 'Deliver',
    icon: '🚀',
    sub: 'Implementation and managed services',
    color: '#fdba74',
    bg: 'rgba(253,186,116,0.08)',
    border: 'rgba(253,186,116,0.25)',
  },
  {
    label: 'Grow',
    icon: '📈',
    sub: 'Recurring revenue and expanded pipeline',
    color: '#fde68a',
    bg: 'rgba(253,230,138,0.08)',
    border: 'rgba(253,230,138,0.25)',
  },
];

export default function PartnerJourney() {
  return (
    <section className="w-full bg-[#020202] py-24 px-4 sm:px-6 border-t border-white/[0.05] overflow-hidden">
      <div className="max-w-7xl mx-auto">

        {/* Heading */}
        <div className="text-center mb-16">
          <p className="text-xs font-bold tracking-widest uppercase text-orange-500 mb-3">
            The Journey
          </p>
          <h2 className="text-white font-light text-3xl sm:text-4xl lg:text-5xl leading-tight">
            Discover Opportunities →{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              Build Solutions
            </span>{' '}
            → Collaborate → Transact → Deliver →{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-200">
              Grow
            </span>
          </h2>
        </div>

        {/* Desktop: horizontal flowing path */}
        <div className="hidden lg:flex items-start gap-0 relative">
          {/* Background connector line */}
          <div
            className="absolute top-10 left-10 right-10 h-px"
            style={{
              background: 'linear-gradient(90deg, rgba(249,115,22,0.3), rgba(251,191,36,0.3), rgba(251,146,60,0.3), rgba(251,191,36,0.3), rgba(253,186,116,0.3), rgba(253,230,138,0.3))',
            }}
          />

          {STAGES.map((stage, i) => (
            <div key={stage.label} className="flex-1 flex flex-col items-center text-center relative group">
              {/* Stage node */}
              <div
                className="relative w-20 h-20 rounded-2xl flex flex-col items-center justify-center mb-4 border transition-transform duration-200 group-hover:scale-105 z-10"
                style={{
                  backgroundColor: stage.bg,
                  borderColor: stage.border,
                  boxShadow: `0 0 20px -8px ${stage.color}40`,
                }}
              >
                <span className="text-2xl mb-0.5">{stage.icon}</span>
                <span
                  className="text-[8px] font-bold tracking-wider uppercase"
                  style={{ color: stage.color }}
                >
                  {i + 1}
                </span>
                {/* Step number badge */}
                <div
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center border text-[9px] font-bold"
                  style={{
                    backgroundColor: stage.bg,
                    borderColor: stage.border,
                    color: stage.color,
                  }}
                >
                  {i + 1}
                </div>
              </div>

              {/* Arrow between nodes */}
              {i < STAGES.length - 1 && (
                <div
                  className="absolute top-10 -right-1 z-10 w-2 h-2 rotate-45 border-t border-r"
                  style={{ borderColor: STAGES[i + 1].color, opacity: 0.5 }}
                />
              )}

              <p
                className="text-xs font-semibold leading-snug mb-1.5 px-2"
                style={{ color: stage.color }}
              >
                {stage.label}
              </p>
              <p className="text-[10px] text-gray-600 leading-relaxed px-1">
                {stage.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile: vertical stack */}
        <div className="flex flex-col gap-0 lg:hidden relative">
          {/* Vertical connector */}
          <div className="absolute top-10 bottom-10 left-10 w-px bg-gradient-to-b from-orange-500/30 via-amber-500/30 to-amber-300/30" />

          {STAGES.map((stage, i) => (
            <div key={stage.label} className="flex items-start gap-5 relative py-3 pl-2">
              {/* Node */}
              <div
                className="w-16 h-16 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border z-10"
                style={{
                  backgroundColor: stage.bg,
                  borderColor: stage.border,
                }}
              >
                <span className="text-xl">{stage.icon}</span>
                <span className="text-[7px] font-bold tracking-wider uppercase mt-0.5" style={{ color: stage.color }}>
                  {i + 1}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 pt-3">
                <p className="text-sm font-semibold" style={{ color: stage.color }}>{stage.label}</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{stage.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center text-xs text-gray-700 mt-14 italic">
          NeoZaar connects all three partner types at every stage of this journey.
        </p>
      </div>
    </section>
  );
}
