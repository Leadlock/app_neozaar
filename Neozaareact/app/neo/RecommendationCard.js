'use client';

import { useMemo, useState } from 'react';
import { useRecoImages, imageFor } from './brandLogos';

const trunc = (s, n) => {
  s = String(s || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
};

// Fallback: pull "Label — value" sections out of the plain-text message, for
// when structured discovery data is thin. Same heuristic as the original.
function parseSections(msg) {
  const sections = {};
  const lines = String(msg || '').split('\n').map((l) => l.trim()).filter(Boolean);
  let curKey = null;
  lines.forEach((line) => {
    const m = line.match(/^([^—-]{3,40})\s*[—-]{1,2}\s*(.+)$/);
    if (m) {
      curKey = m[1].trim();
      sections[curKey] = sections[curKey] ? sections[curKey] + '\n' + m[2].trim() : m[2].trim();
    } else if (/^[-•]/.test(line)) {
      const item = line.replace(/^[-•]\s*/, '');
      if (curKey) sections[curKey] = (sections[curKey] || '') + '\n- ' + item;
    } else if (!curKey) {
      sections.__intro__ = (sections.__intro__ || '') + ' ' + line;
    }
  });
  return sections;
}

// An item is pre-checked when it's part of the solution's own bundle or the
// LLM classified it as a core pick. Alternatives / optional items start off.
const isDefaultChecked = (it) =>
  it.solution_mapped === true ||
  it.classification === 'selected' ||
  it.classification === 'recommended';

const idOf = (it, i) => String(it.source_id ?? `idx-${i}`);

function Check({ checked }) {
  return (
    <span
      className={`shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors ${
        checked ? 'bg-orange-500 border-orange-500' : 'border-white/25'
      }`}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}

function SolImg({ src }) {
  const [ok, setOk] = useState(true);
  if (!src || !ok) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setOk(false)}
      className="shrink-0 w-9 h-9 rounded-lg object-contain bg-white p-1"
    />
  );
}

function Row({ logo, badge, badgeClass, name, meta, desc, selectable, checked, onToggle }) {
  const [imgOk, setImgOk] = useState(true);
  const Wrapper = selectable ? 'button' : 'div';
  return (
    <Wrapper
      type={selectable ? 'button' : undefined}
      onClick={selectable ? onToggle : undefined}
      className={`w-full text-left flex items-start gap-3 py-2.5 border-b border-white/[0.05] last:border-0 transition-opacity ${
        selectable ? 'cursor-pointer' : ''
      } ${selectable && !checked ? 'opacity-45 hover:opacity-70' : ''}`}
    >
      {selectable && <Check checked={checked} />}
      {logo && imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          loading="lazy"
          onError={() => setImgOk(false)}
          className="shrink-0 w-6 h-6 rounded-md object-contain bg-white p-0.5"
        />
      ) : (
        <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${badgeClass}`}>
          {badge}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm text-white font-medium truncate">{name}</div>
        {meta && <div className="text-xs text-gray-500">{meta}</div>}
      </div>
      {desc && <div className="hidden sm:block text-xs text-gray-500 max-w-[45%] shrink-0">{trunc(desc, 140)}</div>}
    </Wrapper>
  );
}

export default function RecommendationCard({ data, onConfirm, onEdit, bundle, locked }) {
  const recoImages = useRecoImages();
  const d = data.discovery || {};
  const msg = data.message || '';
  const sections = parseSections(msg);

  const solutions = d.recommended_solutions || [];
  const solution = solutions[0];
  const products = (d.recommended_products || []).slice(0, 6);
  const services = (d.recommended_services || []).slice(0, 6);

  const rawSolName = solution ? solution.name : (sections['Primary Solution'] || sections['Recommended Solution'] || '').trim();
  // The backend puts a "No matching solution…" sentence (plus a bulleted item
  // list) in the Primary Solution slot when nothing matched — don't render that
  // blob as if it were a solution name.
  const solName = solution ? solution.name : (rawSolName && rawSolName.length < 70 && !/\n|catalog\./i.test(rawSolName) ? rawSolName : '');
  const solCat = solution ? solution.category || '' : '';
  const solDesc = solution ? solution.description || '' : (solName ? (sections.__intro__ || '').trim() : '');
  const noSolutionButItems = solutions.length === 0 && !solName && ((d.recommended_products || []).length > 0 || (d.recommended_services || []).length > 0);

  let svcFallback = [];
  if (services.length === 0) {
    const raw = sections['Indicative Services'] || sections['Recommended Services'] || '';
    svcFallback = raw.split('\n').map((l) => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
  }

  const nextStep = (sections['Recommended Next Step'] || sections['Next Step'] || '').trim();
  const finalVal = (sections['Final Validation'] || sections['Final Validation Note'] || '').trim();

  // Curation is only possible when we have structured items to key off.
  const canCurate = !!onConfirm && (solutions.length > 0 || products.length > 0 || services.length > 0);

  // ── Selection state ────────────────────────────────────────────────────
  const defaultSel = useMemo(() => {
    const pick = (list) => {
      const ids = list.map((it, i) => idOf(it, i));
      const defaults = list.map((it, i) => (isDefaultChecked(it) ? idOf(it, i) : null)).filter(Boolean);
      return new Set(defaults.length ? defaults : ids);
    };
    const primary = solutions.find((s) => s.is_primary) || solutions[0];
    return {
      solutionId: primary ? idOf(primary, 0) : null,
      productIds: pick(products),
      serviceIds: pick(services),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const [solutionId, setSolutionId] = useState(defaultSel.solutionId);
  const [productIds, setProductIds] = useState(defaultSel.productIds);
  const [serviceIds, setServiceIds] = useState(defaultSel.serviceIds);

  const toggle = (setter) => (id) =>
    setter((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleProduct = toggle(setProductIds);
  const toggleService = toggle(setServiceIds);

  const count =
    (solutionId ? 1 : 0) + productIds.size + serviceIds.size;
  const countLabel = [
    solutionId ? '1 solution' : null,
    `${productIds.size} product${productIds.size === 1 ? '' : 's'}`,
    `${serviceIds.size} service${serviceIds.size === 1 ? '' : 's'}`,
  ].filter(Boolean).join(' · ');

  const confirmed = !!bundle;
  const selectedSolutionObj = solutions.find((s, i) => idOf(s, i) === solutionId) || null;

  const handleConfirm = () => {
    onConfirm({
      solution_id: selectedSolutionObj ? String(selectedSolutionObj.source_id ?? '') || null : null,
      product_ids: products.filter((p, i) => productIds.has(idOf(p, i))).map((p) => String(p.source_id ?? '')).filter(Boolean),
      service_ids: services.filter((s, i) => serviceIds.has(idOf(s, i))).map((s) => String(s.source_id ?? '')).filter(Boolean),
    });
  };

  // In the confirmed (read-only) view, filter the lists to the chosen ids.
  const chosenProductIds = new Set(bundle?.product_ids || []);
  const chosenServiceIds = new Set(bundle?.service_ids || []);
  const shownProducts = confirmed ? products.filter((p) => chosenProductIds.has(String(p.source_id))) : products;
  const shownServices = confirmed ? services.filter((s) => chosenServiceIds.has(String(s.source_id))) : services;
  const showSolution = confirmed ? !!bundle?.solution_id : true;

  return (
    <div className="max-w-full sm:max-w-[86%] rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-white/[0.06] bg-orange-500/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/25 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF9F43" strokeWidth="2.2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-white">{confirmed ? 'Your Bundle' : 'Solution Recommended'}</div>
            <div className="text-[11px] text-gray-500">
              {confirmed ? 'Finalized — passed to the NeoZaar team' : 'NeoZaar AI · Based on your requirements'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-[10px] font-bold text-orange-400">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
          AI
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {canCurate && !confirmed && (
          <div className="text-[11px] text-gray-400 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">
            Tick the products and services you want in your bundle, then confirm. Bundled items are pre-selected.
          </div>
        )}

        {/* Solution(s) */}
        {solutions.length > 0 ? (
          <div className={confirmed && !showSolution ? 'hidden' : ''}>
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">
              {solutions.length > 1 ? 'Primary Solution — choose one' : 'Primary Solution'}
            </div>
            {solutions.map((s, i) => {
              const sid = idOf(s, i);
              const active = confirmed
                ? String(s.source_id) === String(bundle?.solution_id)
                : solutionId === sid;
              const selectable = canCurate && !confirmed;
              if (confirmed && !active) return null;
              return (
                <button
                  key={sid}
                  type="button"
                  onClick={selectable ? () => setSolutionId(active && solutions.length === 1 ? null : sid) : undefined}
                  className={`w-full text-left flex gap-3 py-2 ${selectable ? 'cursor-pointer' : ''} ${
                    selectable && !active ? 'opacity-45 hover:opacity-70' : ''
                  }`}
                >
                  {selectable && (
                    solutions.length > 1
                      ? <span className={`shrink-0 w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center ${active ? 'border-orange-500' : 'border-white/25'}`}>
                          {active && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                        </span>
                      : <Check checked={active} />
                  )}
                  <div className="w-1 rounded-full bg-gradient-to-b from-orange-400 to-amber-300 shrink-0" />
                  <SolImg src={imageFor(recoImages, s)} />
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-white">{s.name}</div>
                    {s.category && <div className="text-xs text-orange-400/80 mt-0.5">{s.category}</div>}
                    {i === 0 && s.description && (
                      <div className="text-xs text-gray-500 mt-1.5 leading-relaxed">{trunc(s.description, 180)}</div>
                    )}
                  </div>
                </button>
              );
            })}
            {canCurate && !confirmed && solutions.length > 1 && (
              <button
                type="button"
                onClick={() => setSolutionId(null)}
                className={`mt-1 text-[11px] ${solutionId === null ? 'text-orange-400 font-semibold' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {solutionId === null ? '• ' : ''}No single solution — bundle products &amp; services only
              </button>
            )}
          </div>
        ) : solName ? (
          <div className="flex gap-3">
            <div className="w-1 rounded-full bg-gradient-to-b from-orange-400 to-amber-300 shrink-0" />
            <SolImg src={imageFor(recoImages, { name: solName })} />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Primary Solution</div>
              <div className="text-base font-semibold text-white">{solName}</div>
              {solCat && <div className="text-xs text-orange-400/80 mt-0.5">{solCat}</div>}
              {solDesc && <div className="text-xs text-gray-500 mt-1.5 leading-relaxed">{trunc(solDesc, 180)}</div>}
            </div>
          </div>
        ) : noSolutionButItems ? (
          <div className="flex gap-3">
            <div className="w-1 rounded-full bg-white/15 shrink-0" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Primary Solution</div>
              <div className="text-sm text-gray-300">No single matching solution — pick the individual products &amp; services below.</div>
            </div>
          </div>
        ) : null}

        {/* Products */}
        <div className={confirmed && shownProducts.length === 0 ? 'hidden' : ''}>
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">
            {confirmed ? 'Products' : 'Indicative Products'}
          </div>
          {shownProducts.length > 0 ? (
            shownProducts.map((p, i) => {
              const realIdx = products.indexOf(p);
              const pid = idOf(p, realIdx);
              return (
                <Row
                  key={pid}
                  logo={imageFor(recoImages, p)}
                  badge="P"
                  badgeClass="bg-orange-500/10 text-orange-400 border border-orange-500/20"
                  name={p.name}
                  meta={p.vendor || p.category || ''}
                  desc={p.description}
                  selectable={canCurate && !confirmed}
                  checked={productIds.has(pid)}
                  onToggle={() => toggleProduct(pid)}
                />
              );
            })
          ) : (
            <div className="text-xs text-gray-600 py-1">No matching products in the current catalog.</div>
          )}
        </div>

        {/* Services */}
        <div className={confirmed && shownServices.length === 0 ? 'hidden' : ''}>
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">
            {confirmed ? 'Services' : 'Indicative Services'}
          </div>
          {shownServices.length > 0 ? (
            shownServices.map((s, i) => {
              const realIdx = services.indexOf(s);
              const sid = idOf(s, realIdx);
              return (
                <Row
                  key={sid}
                  logo={imageFor(recoImages, s)}
                  badge="S"
                  badgeClass="bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  name={s.name}
                  meta={s.type || s.vendor || ''}
                  desc={s.description}
                  selectable={canCurate && !confirmed}
                  checked={serviceIds.has(sid)}
                  onToggle={() => toggleService(sid)}
                />
              );
            })
          ) : svcFallback.length > 0 ? (
            svcFallback.map((s, i) => <Row key={i} badge="S" badgeClass="bg-amber-500/10 text-amber-400 border border-amber-500/20" name={s} />)
          ) : (
            <div className="text-xs text-gray-600 py-1">No matching services in the current catalog.</div>
          )}
        </div>
      </div>

      {/* Curate / confirm bar */}
      {canCurate && !confirmed && (
        <div className="px-5 py-3.5 border-t border-white/[0.06] bg-black/25 flex items-center justify-between gap-3">
          <div className="text-[11px] text-gray-400">{countLabel}</div>
          <button
            type="button"
            disabled={count === 0 || locked}
            onClick={handleConfirm}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-700 hover:-translate-y-px transition-transform disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Confirm bundle
          </button>
        </div>
      )}

      {confirmed && !locked && onEdit && (
        <div className="px-5 py-2.5 border-t border-white/[0.06] bg-black/20">
          <button type="button" onClick={onEdit} className="text-[11px] font-semibold text-gray-400 hover:text-orange-400">
            ← Edit bundle
          </button>
        </div>
      )}

      {/* Footer */}
      {!confirmed && (nextStep || finalVal) && (
        <div className="px-5 py-3.5 border-t border-white/[0.06] bg-black/20 space-y-2">
          {nextStep && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Next Step</div>
              <div className="text-xs text-gray-300 mt-0.5">{nextStep}</div>
            </div>
          )}
          {finalVal && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Final Validation</div>
              <div className="text-xs text-gray-400 mt-0.5">{finalVal}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
