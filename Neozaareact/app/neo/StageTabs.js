'use client';

import { motion } from 'framer-motion';

const STAGES = [
  { key: 'discovery', label: 'Discovery' },
  { key: 'requirements', label: 'Requirements' },
  { key: 'solution', label: 'Solution' },
  { key: 'products', label: 'Products' },
  { key: 'services', label: 'Services' },
  { key: 'review', label: 'Review' },
];

// Purely a visual "you are here" breadcrumb driven by the chat's own state —
// mirrors the original's advanceStage() map. Not clickable/navigable; the
// deeper persisted-workspace phases behind these labels are out of scope.
const STATE_TO_STAGE = {
  question: 'discovery',
  recommendation: 'solution',
  qualification: 'requirements',
  handoff: 'review',
};

export default function StageTabs({ state, onNewChat }) {
  const active = STATE_TO_STAGE[state] || 'discovery';

  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 border-b border-white/[0.07] bg-white/[0.02]">
      <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {STAGES.map((s) => {
          const isActive = s.key === active;
          return (
            <div
              key={s.key}
              className={`relative px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors tracking-wide ${
                isActive ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {s.label}
              {isActive && (
                <motion.span
                  layoutId="neoStageUnderline"
                  className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-orange-500"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
            </div>
          );
        })}
      </div>

      {onNewChat && (
        <button
          type="button"
          onClick={onNewChat}
          className="lg:hidden shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-orange-400 transition-colors whitespace-nowrap"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          New chat
        </button>
      )}
    </div>
  );
}
