'use client';

import { useState } from 'react';

function Section({ label, children }) {
  if (!children) return null;
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-wide text-orange-400/60">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function TagList({ items }) {
  if (!items || items.length === 0) return null;
  const arr = Array.isArray(items) ? items : [items];
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {arr.map((t, i) => (
        <span key={i} className="text-[11px] px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] rounded-full text-gray-300">
          {t}
        </span>
      ))}
    </div>
  );
}

export default function HandoffCard({ handoff: h, onProceed, onNewChat }) {
  // Proceed → CRM opportunity flow: idle → confirm → loading → done | error
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runProceed = async () => {
    setPhase('loading');
    setError('');
    try {
      const data = await onProceed();
      setResult(data || {});
      setPhase('done');
    } catch (e) {
      setError(e?.message || 'Could not create the opportunity. Please try again.');
      setPhase('error');
    }
  };

  const selProducts = h.selectedProducts || [];
  const selServices = h.selectedServices || [];
  // "Curated" = the customer explicitly picked a bundle on the recommendation card.
  const curated =
    selProducts.length > 0 || selServices.length > 0 || !!h.selectedSolution;

  const selProdSet = new Set(selProducts);
  const selSvcSet = new Set(selServices);
  const alsoProducts = (h.recommendedProducts || []).filter((p) => !selProdSet.has(p));
  const alsoServices = (h.recommendedServices || []).filter((s) => !selSvcSet.has(s));

  // Fallback (no curation): behave as before.
  const allProducts = [...new Set([...(h.selectedProducts || []), ...(h.recommendedProducts || [])])];

  const primarySolution = curated
    ? (h.selectedSolution || 'Custom bundle — no single solution')
    : h.primarySolution;

  const contextFields = [
    ['Current Environment', h.currentEnvironment],
    ['Cloud Platform', h.cloudPlatform],
    ['Scope / Quantity', h.scopeOrQuantity],
    ['Existing Technology', h.existingTechnology],
    ['Migration Required', h.migrationRequired != null ? (h.migrationRequired ? 'Yes' : 'No') : null],
    ['Timeline', h.timeline],
  ].filter(([, v]) => v);

  return (
    <div className="max-w-full sm:max-w-[86%] rounded-xl border border-orange-500/25 border-t-2 border-t-orange-500 bg-white/[0.03] backdrop-blur-md overflow-hidden shadow-lg">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06] bg-orange-500/[0.06]">
        <div className="w-7 h-7 rounded-full bg-orange-500/10 border border-orange-500/25 flex items-center justify-center shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF7A00" strokeWidth="2.2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-bold text-white">Opportunity Handed to Pre-Sales</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-orange-400/85">{h.handoffStatus || 'Qualified — Sales Consultant Review'}</div>
        </div>
      </div>

      <div className="px-5 py-3.5 space-y-3">
        <Section label="Desired Outcome">
          <div className="text-sm text-white font-semibold">{h.desiredOutcome || '—'}</div>
        </Section>

        {primarySolution && (
          <Section label={curated ? 'Your Solution' : 'Primary Solution'}>
            <div className="text-sm text-white font-semibold">{primarySolution}</div>
          </Section>
        )}

        {curated ? (
          <>
            {(selProducts.length > 0 || selServices.length > 0) && (
              <Section label="Your Selection">
                <TagList items={[...selProducts, ...selServices]} />
              </Section>
            )}
            {(alsoProducts.length > 0 || alsoServices.length > 0) && (
              <div className="opacity-60">
                <Section label="Also Recommended">
                  <TagList items={[...alsoProducts, ...alsoServices]} />
                </Section>
              </div>
            )}
          </>
        ) : (
          <>
            {allProducts.length > 0 && (
              <Section label="Indicative Products">
                <TagList items={allProducts} />
              </Section>
            )}
            {(h.recommendedServices || []).length > 0 && (
              <Section label="Indicative Services">
                <TagList items={h.recommendedServices} />
              </Section>
            )}
          </>
        )}

        {contextFields.map(([label, v]) => (
          <Section key={label} label={label}>
            <div className="text-[13px] text-gray-300">{v}</div>
          </Section>
        ))}

        {(h.assumptions || []).length > 0 && (
          <Section label="Assumptions">
            <TagList items={h.assumptions} />
          </Section>
        )}
      </div>

      {/* Proceed → create a CRM opportunity */}
      {onProceed && (
        <div className="px-5 py-3.5 border-t border-white/[0.08] bg-black/25">
          {phase === 'idle' && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[11px] text-gray-400">
                Hand your selected products &amp; services to the NeoZaar team to take this forward.
              </div>
              <button
                type="button"
                onClick={() => setPhase('confirm')}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-700 hover:-translate-y-px transition-transform"
              >
                Proceed
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {phase === 'confirm' && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[11px] text-gray-300">Send this to the NeoZaar team now?</div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => setPhase('idle')} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-gray-400 border border-white/[0.12] hover:text-white">
                  Cancel
                </button>
                <button type="button" onClick={runProceed} className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-700">
                  Yes, send it
                </button>
              </div>
            </div>
          )}

          {phase === 'loading' && (
            <div className="flex items-center gap-2 text-[12px] text-gray-300">
              <svg className="animate-spin h-3.5 w-3.5 text-orange-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Sending…
            </div>
          )}

          {phase === 'done' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[12px] text-orange-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {result?.already_existed
                  ? 'Selection updated with the NeoZaar team'
                  : 'Sent to the NeoZaar team — a consultant will be in touch'}
                {result?.opportunity_id ? ` · Ref #${result.opportunity_id}` : ''}
              </div>
              {onNewChat && (
                <div className="flex items-center justify-between gap-3 flex-wrap pt-2.5 border-t border-white/[0.08]">
                  <div className="text-[11px] text-gray-400">
                    This request is complete. Start a new chat to explore another requirement.
                  </div>
                  <button
                    type="button"
                    onClick={onNewChat}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-700 hover:-translate-y-px transition-transform"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    Start a new chat
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === 'error' && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[12px] text-red-300">⚠ {error}</div>
              <button type="button" onClick={runProceed} className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-700">
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
