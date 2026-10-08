'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const TABS = [
  { key: 'product', label: 'Products' },
  { key: 'service', label: 'Services' },
  { key: 'solution', label: 'Solutions' },
];

export default function ProductPickerModal({ onSelect, onClose }) {
  const [activeTab, setActiveTab] = useState('product');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  const search = (type, term) => {
    setLoading(true);
    const params = new URLSearchParams({ page: '1', limit: '10', action_type: type });
    if (term.trim()) params.append('search', term.trim());
    fetch(`${process.env.NEXT_PUBLIC_API_BASE}catalog/marketplace/published?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setResults(data?.data || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    search(activeTab, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleQueryChange = (value) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(activeTab, value), 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-[#0c0c0c] border border-white/[0.08] rounded-2xl mt-16 sm:mt-0 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
          <div>
            <h3 className="text-white font-semibold text-lg">Select a Product, Service or Solution</h3>
            <p className="text-gray-500 text-xs mt-0.5">Browse the NeoZaar catalog to attach it to your private offer</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                activeTab === t.key ? 'bg-orange-500/10 text-orange-400 border border-orange-500/25' : 'text-gray-500 border border-transparent hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-3">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <path strokeLinecap="round" strokeWidth="2" d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={`Search ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-3 bg-zinc-900/60 text-white placeholder-gray-500 border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500/50 transition-all"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto scrollbar-hide px-6 pb-6 space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[68px] bg-zinc-900/40 border border-white/[0.05] rounded-xl animate-pulse" />
            ))
          ) : results.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm">No matches found</div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect({ id: item.id, name: item.name, action_type: item.action_type })}
                className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl border border-white/[0.06] hover:border-orange-500/40 hover:bg-orange-500/5 transition-all text-left group"
              >
                <div className="relative w-11 h-11 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 group-hover:border-orange-400/40 transition-colors">
                  <Image
                    fill
                    alt={item.name}
                    className="object-cover"
                    src={item.product_logo || '/brand-log/neozaardefault.jpg'}
                    unoptimized
                    onError={(e) => { e.target.src = '/brand-log/neozaardefault.jpg'; }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">{item.name?.trim()}</p>
                  {item.action_type !== 'service' && item.action_type !== 'solution' && item.brand_name && (
                    <p className="text-orange-400/80 text-xs truncate">{item.brand_name}</p>
                  )}
                </div>
                <svg className="shrink-0 w-4 h-4 text-gray-600 group-hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
