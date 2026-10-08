'use client';
import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import './VendorTicker.css';

const COPIES = 4;

export default function VendorTicker() {
  const trackRef = useRef(null);
  const frameRef = useRef(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE}brands/get-all-brand?page_type=vendor`)
      .then((r) => r.json())
      .then((result) => {
        if (result.status === 'success' && Array.isArray(result.data)) {
          setVendors(result.data.map((v, i) => ({
            id: v.id || i,
            name: v.name,
            icon: v.icon || '',
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 4 copies — one set width = scrollWidth / COPIES; reset by one set for seamless loop
  const items = Array.from({ length: COPIES }, () => vendors).flat();

  useEffect(() => {
    const track = trackRef.current;
    if (!track || vendors.length === 0) return;
    const speed = 0.6;

    const tick = () => {
      if (!pausedRef.current) {
        posRef.current -= speed;
        // one copy's width — re-read every frame so image-load changes are caught
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
  }, [vendors]);

  if (loading) {
    return (
      <div className="vendor-ticker-section">
        <div className="vendor-ticker-loading">
          <div className="vendor-ticker-pulse"></div>
        </div>
      </div>
    );
  }

  if (vendors.length === 0) return null;

  return (
    <div className="vendor-ticker-section">
      <div
        className="vendor-ticker-wrap"
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        <div className="vendor-ticker-track" ref={trackRef}>
          {items.map((vendor, i) => (
            <Link
              key={`${vendor.id}-${i}`}
              href={`/marketplace/brand/${encodeURIComponent(vendor.name)}`}
              className="vendor-ticker-item"
            >
              {vendor.icon && (
                <div className="vendor-ticker-logo">
                  <Image
                    src={vendor.icon}
                    alt={vendor.name}
                    fill
                    className="object-contain p-1"
                    unoptimized={true}
                  />
                </div>
              )}
              <span className="vendor-ticker-name">{vendor.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
