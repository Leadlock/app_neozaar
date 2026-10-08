'use client';

// Branded "Neo is thinking" loader — the animated NeoZaar mark (APNG, transparent).
export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2.5 w-fit">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assests/neo-loader.png"
        alt="Neo is thinking"
        width={72}
        height={72}
        className="w-[72px] h-[72px] object-contain select-none pointer-events-none [filter:drop-shadow(0_0_10px_rgba(249,115,22,0.35))]"
      />
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Thinking…</span>
    </div>
  );
}
