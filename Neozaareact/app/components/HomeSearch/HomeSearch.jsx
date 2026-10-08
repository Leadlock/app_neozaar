'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import './HomeSearch.css';

const TYPE_LABEL = { product: 'Product', service: 'Service', solution: 'Solution' };
const TYPE_BADGE = { product: 'badge-product', service: 'badge-service', solution: 'badge-solution' };

export default function HomeSearch({
  compact = false,
  placeholder = 'Search products, services and solutions...',
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const shellRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const goToResults = useCallback((term) => {
    const t = (term ?? query).trim();
    setOpen(false);
    if (t) {
      router.push(`/marketplace/search/all?search=${encodeURIComponent(t)}`);
    } else {
      router.push('/marketplace/search/all');
    }
  }, [query, router]);

  const goToItem = useCallback((item) => {
    setOpen(false);
    const type = (item.action_type || 'product').toLowerCase();
    router.push(`/${type}/${item.id}`);
  }, [router]);

  // Debounced live suggestions across products / services / solutions.
  useEffect(() => {
    const term = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      // Cancel any in-flight request so results always match the latest query.
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const url = `${process.env.NEXT_PUBLIC_API_BASE}catalog/marketplace/published?page=1&limit=6&search=${encodeURIComponent(term)}`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        const rows = Array.isArray(data?.data) ? data.data : [];
        setResults(rows.map((r) => ({
          id: r.id,
          name: r.name,
          action_type: (r.action_type || 'product').toLowerCase(),
          brand_name: r.brand_name || '',
          image: r.product_logo || r.image_url || '',
        })));
        setActiveIndex(-1);
      } catch (err) {
        if (err.name !== 'AbortError') setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (shellRef.current && !shellRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        goToItem(results[activeIndex]);
      } else {
        goToResults();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showPanel = open && focused && query.trim().length >= 2;

  return (
    <div
      ref={shellRef}
      className={`home-search-shell${focused ? ' is-focused' : ''}${compact ? ' is-compact' : ''}`}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); goToResults(); }}
        role="search"
      >
        <div className="home-search-glow">
          <div className="home-search-field">
            <svg className="home-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>

            <input
              type="text"
              className="home-search-input"
              value={query}
              placeholder={placeholder}
              aria-label="Search products, services and solutions"
              autoComplete="off"
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => { setFocused(true); setOpen(true); }}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKeyDown}
            />

            {loading && <div className="home-search-spinner" aria-hidden="true" />}

            {query && (
              <button
                type="button"
                className="home-search-clear"
                aria-label="Clear search"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setQuery(''); setResults([]); }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            <button type="submit" className="home-search-submit">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="home-search-submit-label">Search</span>
            </button>
          </div>
        </div>
      </form>

      {showPanel && (
        <div className="home-search-panel">
          {loading && results.length === 0 ? (
            <div className="home-search-empty">Searching…</div>
          ) : results.length > 0 ? (
            <>
              <div className="home-search-panel-head">Products, Services &amp; Solutions</div>
              <div className="home-search-list">
                {results.map((item, i) => {
                  const type = item.action_type;
                  return (
                    <button
                      key={`${type}-${item.id}`}
                      type="button"
                      className={`home-search-option${i === activeIndex ? ' is-active' : ''}`}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goToItem(item)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="home-search-thumb"
                        src={item.image || '/image/Logo.png'}
                        alt=""
                        onError={(e) => { e.currentTarget.src = '/image/Logo.png'; }}
                      />
                      <span className="home-search-option-body">
                        <span className="home-search-option-name">{item.name}</span>
                        {item.brand_name && (
                          <span className="home-search-option-sub">{item.brand_name}</span>
                        )}
                      </span>
                      <span className={`home-search-badge ${TYPE_BADGE[type] || 'badge-product'}`}>
                        {TYPE_LABEL[type] || 'Product'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="home-search-footer">
                <button
                  type="button"
                  className="home-search-viewall"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goToResults()}
                >
                  View all results for &ldquo;{query.trim()}&rdquo; →
                </button>
              </div>
            </>
          ) : (
            <div className="home-search-empty">
              No matches for &ldquo;{query.trim()}&rdquo;. Press Enter to browse everything.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
