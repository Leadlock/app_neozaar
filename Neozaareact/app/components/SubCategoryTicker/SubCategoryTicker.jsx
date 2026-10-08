'use client';
import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import './SubCategoryTicker.css';

const COPIES = 4;

export default function SubCategoryTicker() {
  const trackRef = useRef(null);
  const frameRef = useRef(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);

  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pull the subcategory list from the public marketplace filters endpoint.
  // limit=1 keeps the product payload tiny — we only need `filters.subcategories`.
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE}catalog/marketplace/published?page=1&limit=1`)
      .then((r) => r.json())
      .then((result) => {
        const list = result?.filters?.subcategories;
        if (Array.isArray(list)) {
          // de-duplicate by name (case-insensitive) and drop empties
          const seen = new Set();
          const cleaned = [];
          list.forEach((s, i) => {
            const name = (s?.name || '').trim();
            if (!name) return;
            const key = name.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            cleaned.push({ id: s.id ?? i, name });
          });
          setSubcategories(cleaned);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 4 copies — one set width = scrollWidth / COPIES; reset by one set for a seamless loop.
  const items = Array.from({ length: COPIES }, () => subcategories).flat();

  useEffect(() => {
    const track = trackRef.current;
    if (!track || subcategories.length === 0) return;
    const speed = 0.5; // px/frame — comfortable, readable pace

    const tick = () => {
      if (!pausedRef.current) {
        posRef.current -= speed;
        const oneSet = track.scrollWidth / COPIES;
        if (posRef.current <= -oneSet) {
          posRef.current += oneSet;
        }
        track.style.transform = `translateX(${posRef.current}px)`;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [subcategories]);

  if (loading) {
    return (
      <div className="subcat-ticker-section">
        <div className="subcat-ticker-loading">
          <div className="subcat-ticker-pulse"></div>
        </div>
      </div>
    );
  }

  if (subcategories.length === 0) return null;

  return (
    <div className="subcat-ticker-section">
      <div
        className="subcat-ticker-wrap"
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        <div className="subcat-ticker-track" ref={trackRef}>
          {items.map((sub, i) => (
            <Link
              key={`${sub.id}-${i}`}
              href={`/marketplace/subcategory/${encodeURIComponent(sub.name)}`}
              className="subcat-ticker-item"
            >
              <span className="subcat-ticker-dot" aria-hidden="true"></span>
              <span className="subcat-ticker-name">{sub.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
