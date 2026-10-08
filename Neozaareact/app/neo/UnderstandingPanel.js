'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecoImages, imageFor } from './brandLogos';

const EASE = [0.22, 1, 0.36, 1];

const trunc = (s, n) => {
  s = String(s || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
};

// Internal backend values (solution_project/product_only/service_project) are
// technical shorthand — customers see the plain-language version instead.
const CLASS_LABEL = {
  solution_project: 'Complete Solution',
  product_only: 'Product Purchase',
  service_project: 'Service Engagement',
  unknown: 'Still Assessing…',
};
const CONF_STYLES = {
  high: { chip: 'bg-orange-500/10 text-orange-400 border-orange-500/30', fill: 'bg-gradient-to-r from-orange-500 to-amber-300', width: '95%' },
  medium: { chip: 'bg-orange-500/[0.08] text-orange-300/90 border-orange-500/20', fill: 'bg-gradient-to-r from-orange-500/70 to-orange-500/45', width: '60%' },
  low: { chip: 'bg-orange-500/5 text-orange-400/65 border-orange-500/15', fill: 'bg-orange-500/30', width: '25%' },
  none: { chip: 'bg-white/[0.03] text-gray-500 border-white/[0.08]', fill: 'bg-white/[0.08]', width: '5%' },
};

function PanelSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/[0.05]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-400 hover:text-gray-200 transition-colors"
      >
        <span>{title}</span>
        <span className={`text-[9px] transition-transform ${open ? '' : '-rotate-90'}`}>▼</span>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function FactRow({ label, value }) {
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="flex items-start justify-between gap-3 py-1.5"
    >
      <div className="text-[11px] text-gray-500 shrink-0">{label}</div>
      <div className="text-[11px] text-gray-200 font-medium text-right">{trunc(value, 80)}</div>
    </motion.div>
  );
}

function MiniImg({ src }) {
  const [ok, setOk] = useState(true);
  if (!src || !ok) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" onError={() => setOk(false)} className="shrink-0 w-5 h-5 rounded object-contain bg-white p-px" />
  );
}

function MiniItem({ logo, badge, badgeClass, name, sub, desc }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className="flex items-start gap-2.5 py-2">
      {logo && imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" loading="lazy" onError={() => setImgOk(false)} className="shrink-0 w-5 h-5 rounded object-contain bg-white p-px" />
      ) : (
        <div className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${badgeClass}`}>{badge}</div>
      )}
      <div className="min-w-0">
        <div className="text-xs text-gray-100 font-medium truncate">{name}</div>
        {sub && <div className="text-[10px] text-gray-500">{sub}</div>}
        {desc && <div className="text-[10px] text-gray-600 mt-0.5">{trunc(desc, 100)}</div>}
      </div>
    </div>
  );
}

export default function UnderstandingPanel({ data, bundle }) {
  const recoImages = useRecoImages();

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10">
        <div className="text-2xl text-orange-500/40 mb-3">◈</div>
        <div className="text-sm font-semibold text-gray-300">Building understanding…</div>
        <div className="text-xs text-gray-600 mt-1.5 max-w-[220px]">As you answer questions, Neo will structure what it learns here.</div>
      </div>
    );
  }

  const u = data.understanding || {};
  const cls = data.classification;
  const conf = data.confidence || 'none';
  const miss = data.missingFields || [];
  const d = data.discovery;
  const state = data.state || 'question';
  const confStyle = CONF_STYLES[conf] || CONF_STYLES.none;

  // Once the customer confirms a bundle on the recommendation card, mirror that
  // curated subset here instead of everything Neo originally suggested.
  const curated = !!bundle;
  const bp = new Set(bundle?.product_ids || []);
  const bs = new Set(bundle?.service_ids || []);
  const recoSolutions = d?.recommended_solutions || [];
  const recoProducts = d?.recommended_products || [];
  const recoServices = d?.recommended_services || [];
  const showSolutions = curated
    ? recoSolutions.filter((s) => String(s.source_id) === String(bundle.solution_id))
    : recoSolutions;
  const showProducts = curated ? recoProducts.filter((p) => bp.has(String(p.source_id))) : recoProducts;
  const showServices = curated ? recoServices.filter((s) => bs.has(String(s.source_id))) : recoServices;

  const facts = [];
  if (u.intent) facts.push(['Intent', u.intent]);
  if (u.environment) facts.push(['Environment', u.environment]);
  if (u.currentState) facts.push(['Current State', u.currentState]);
  if (u.scope) facts.push(['Scope', u.scope]);
  if (u.users) facts.push(['Users / Scale', u.users]);
  if (u.workloads) facts.push(['Workloads', u.workloads]);
  if (u.quantity) facts.push(['Quantity', u.quantity]);
  if (u.edition) facts.push(['Edition / SKU', u.edition]);
  if (u.term) facts.push(['Term', u.term]);
  if (u.timeline) facts.push(['Timeline', u.timeline]);
  (u.additionalFields || []).forEach((f) => facts.push([f.label, f.value]));

  const lists = [];
  if ((u.dependencies || []).length > 0) lists.push(['Dependencies', u.dependencies]);
  if ((u.constraints || []).length > 0) lists.push(['Constraints', u.constraints]);
  if ((u.assumptions || []).length > 0) lists.push(['Assumptions', u.assumptions]);

  return (
    <motion.div layout className="divide-y divide-white/[0.05]">
      {/* Classification + Confidence */}
      <div className="px-4 py-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Classification</span>
          <span className="text-xs font-semibold text-orange-400">{CLASS_LABEL[cls] || 'Unknown'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Confidence</span>
          <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${confStyle.chip}`}>{conf.toUpperCase()}</span>
        </div>
        <div className="h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${confStyle.fill}`} style={{ width: confStyle.width }} />
        </div>
      </div>

      {facts.length > 0 && (
        <PanelSection title="Known Information">
          <AnimatePresence initial={false}>
            {facts.map(([k, v]) => <FactRow key={k} label={k} value={v} />)}
          </AnimatePresence>
        </PanelSection>
      )}

      {lists.length > 0 && (
        <PanelSection title="Project Context">
          {lists.map(([k, v]) => (
            <div key={k} className="py-1.5">
              <div className="text-[11px] text-gray-500 mb-1">{k}</div>
              <div className="flex flex-wrap gap-1">
                {v.map((x, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-white/[0.04] border border-white/[0.07] rounded-full text-gray-300">{x}</span>
                ))}
              </div>
            </div>
          ))}
        </PanelSection>
      )}

      {miss.length > 0 && state === 'question' && (
        <div className="px-4 py-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Still Needed</div>
          <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/15">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-400 mb-1.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {miss.length} field{miss.length > 1 ? 's' : ''} needed
            </div>
            {miss.map((m, i) => (
              <div key={i} className="text-[11px] text-gray-400 py-0.5">· {m}</div>
            ))}
          </div>
        </div>
      )}

      {state === 'handoff' && data.sales_handoff && (
        <div className="px-4 py-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Handoff Status</div>
          <div className="flex items-center gap-2 text-orange-400 text-[11px] font-semibold mb-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Opportunity Handed Off
          </div>
          <div className="text-[11px] text-gray-500 leading-relaxed">{data.sales_handoff.handoffStatus || 'Qualified — Sales Consultant Review'}</div>
          {(() => {
            const h = data.sales_handoff;
            const picks = [
              ...(h.selectedProducts || []),
              ...(h.selectedServices || []),
            ];
            if (!h.selectedSolution && picks.length === 0) return null;
            return (
              <div className="mt-2 pt-2 border-t border-white/[0.06]">
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Confirmed bundle</div>
                {h.selectedSolution && <div className="text-[11px] text-gray-200 font-medium">{h.selectedSolution}</div>}
                {picks.map((p, i) => (
                  <div key={i} className="text-[11px] text-gray-400 py-px">· {p}</div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {curated && showSolutions.length === 0 && (showProducts.length > 0 || showServices.length > 0) && (
        <PanelSection title="Your Solution">
          <div className="text-[11px] text-gray-500 py-1">Custom bundle — no single solution</div>
        </PanelSection>
      )}

      {showSolutions.length > 0 && (
        <PanelSection title={curated ? 'Your Solution' : 'Recommended Solution'}>
          <div className="flex items-start gap-2.5 py-1">
            <MiniImg src={imageFor(recoImages, showSolutions[0])} />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white">{showSolutions[0].name}</div>
              {showSolutions[0].category && (
                <div className="text-[10px] text-gray-500 mt-0.5">{showSolutions[0].category}</div>
              )}
            </div>
          </div>
        </PanelSection>
      )}

      {showProducts.length > 0 && (
        <PanelSection title={curated ? 'Your Products' : 'Products'}>
          {showProducts.slice(0, 8).map((p, i) => (
            <MiniItem key={i} logo={imageFor(recoImages, p)} badge="P" badgeClass="bg-orange-500/10 text-orange-400" name={p.name} sub={p.vendor} desc={p.description} />
          ))}
        </PanelSection>
      )}

      {showServices.length > 0 && (
        <PanelSection title={curated ? 'Your Services' : 'Services'}>
          {showServices.slice(0, 8).map((s, i) => (
            <MiniItem key={i} logo={imageFor(recoImages, s)} badge="S" badgeClass="bg-amber-500/10 text-amber-400" name={s.name} sub={s.type} desc={s.description} />
          ))}
        </PanelSection>
      )}

      {(u.openItems || []).length > 0 && (
        <PanelSection title="Open Questions" defaultOpen={false}>
          {u.openItems.map((q, i) => (
            <div key={i} className="text-[11px] text-gray-500 py-1">· {q}</div>
          ))}
        </PanelSection>
      )}
    </motion.div>
  );
}
