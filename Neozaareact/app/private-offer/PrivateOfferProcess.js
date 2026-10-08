'use client';

const STAGES = [
  {
    id: 'stack',
    label: 'Tell Us Your Stack',
    sub: 'Share your target software solution and cloud account identifier.',
    icon: '📋',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    glow: 'shadow-orange-900/40',
  },
  {
    id: 'engineering',
    label: 'Custom Engineering',
    sub: 'We negotiate wholesale pricing and build your private offer.',
    icon: '⚙️',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-900/40',
  },
  {
    id: 'execution',
    label: '1-Click Execution',
    sub: 'Your team accepts the secure link to trigger deployment.',
    icon: '✅',
    color: 'text-amber-300',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30',
    glow: 'shadow-amber-900/30',
  },
];

export default function PrivateOfferProcess() {
  return (
    <section className="w-full bg-[#050505] py-20 px-4 sm:px-6 border-t border-white/5 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold tracking-widest uppercase text-orange-500 mb-3">
            The Process
          </p>
          <h2 className="text-white font-light text-3xl sm:text-4xl lg:text-5xl leading-tight">
            Our Seamless{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              3-Step Process
            </span>
          </h2>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-[48px] left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-orange-500/30 via-amber-500/30 to-amber-400/30" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
            {STAGES.map((stage, i) => (
              <div key={stage.id} className="flex flex-col items-center text-center">
                <div
                  className={`relative w-24 h-24 rounded-2xl ${stage.bg} border ${stage.border} flex flex-col items-center justify-center shadow-xl ${stage.glow} mb-5`}
                >
                  <span className="text-3xl">{stage.icon}</span>
                  <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${stage.bg} border ${stage.border} flex items-center justify-center`}>
                    <span className={`text-xs font-bold ${stage.color}`}>{i + 1}</span>
                  </div>
                </div>

                <h3 className="text-white font-semibold text-base mb-2">{stage.label}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-[220px]">{stage.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
