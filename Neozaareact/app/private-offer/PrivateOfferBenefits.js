'use client';

const GROUPS = [
  {
    id: 'commitments',
    label: 'Fulfill Cloud Commitments',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    dot: 'bg-orange-500',
    icon: '🚀',
    benefits: [
      'Every dollar spent via our AWS Channel Partner Private Offers (CPPO) or Azure Multiparty Private Offers (MPO) counts 100% toward drawing down your AWS EDP or Microsoft MACC contracts.',
    ],
  },
  {
    id: 'pricing',
    label: 'Tailored Enterprise Pricing',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    dot: 'bg-orange-500',
    icon: '💼',
    benefits: [
      'We bypass standard, public retail marketplace rates. We negotiate directly with Independent Software Vendors (ISVs) on your behalf to bundle custom pricing, flexible payment schedules, and tailored terms.',
    ],
  },
  {
    id: 'billing',
    label: 'Unified Invoice & Vendor Management',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    dot: 'bg-amber-500',
    icon: '🧾',
    benefits: [
      'Eliminate procurement friction. Avoid onboarding dozens of individual software vendors. All solutions are integrated cleanly into a single, consolidated cloud invoice from AWS or Azure.',
    ],
  },
];

export default function PrivateOfferBenefits() {
  return (
    <section className="w-full bg-[#080808] py-20 px-4 sm:px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-bold tracking-widest uppercase text-orange-500 mb-3">
            Why Buy Through Our Private Offers
          </p>
          <h2 className="text-white font-light text-3xl sm:text-4xl lg:text-5xl leading-tight">
            Built Around{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              Your Cloud Commitments
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {GROUPS.map((group) => (
            <div
              key={group.id}
              className={`rounded-2xl border ${group.border} bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors duration-200`}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl ${group.bg} border ${group.border} flex items-center justify-center text-xl`}>
                  {group.icon}
                </div>
                <span className={`text-sm font-bold ${group.color}`}>{group.label}</span>
              </div>

              <ul className="space-y-3">
                {group.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <span className={`w-1.5 h-1.5 rounded-full ${group.dot} mt-1.5 shrink-0`} />
                    <span className="text-sm text-gray-400 leading-relaxed">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
