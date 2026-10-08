"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '@/app/layouts/Header';
import Footer from '@/app/layouts/Footer';
import BottomNav from '../layouts/BottomNav';

export default function VendorsPage() {
  const router = useRouter();
  const [allVendors, setAllVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 1. Fetch Data — server handles sorting
  const isFirstFetch = useRef(true);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        if (isFirstFetch.current) setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE}brands/get-all-brand?page_type=vendor&sortBy=${sortBy}`
        );
        const result = await response.json();

        if (result.status === "success" && Array.isArray(result.data)) {
          setAllVendors(result.data.map((vendor) => ({
            id: vendor.id,
            name: vendor.name || "Unnamed Vendor",
            icon: vendor.icon || "/brand-log/neozaardefault.jpg",
          })));
        } else {
          setAllVendors([]);
        }
      } catch (error) {
        console.error("Error fetching vendors:", error);
        setAllVendors([]);
      } finally {
        setLoading(false);
        isFirstFetch.current = false;
      }
    };

    fetchVendors();
  }, [sortBy]);

  // 2. Filter client-side (search only — sorting is done by API)
  const processedVendors = useMemo(() => {
    if (!searchQuery.trim()) return allVendors;
    return allVendors.filter((v) =>
      v.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allVendors, searchQuery]);

  // 3. Pagination Logic
  const totalPages = Math.ceil(processedVendors.length / itemsPerPage);
  const currentItems = processedVendors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 4. Navigation handler
  const handleVendorClick = (vendorName) => {
    if (!vendorName) return;
    router.push(`/marketplace/brand/${encodeURIComponent(vendorName)}`);
  };

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20">
      <div className="bg-[#050505]">
        <div className="z-20 absolute top-0 left-0 right-0 w-full">
          <Header />
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 border-b border-white/5 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_#ea580c15_0%,_transparent_70%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 tracking-tight text-white">
            Explore Technology Vendors
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            View vendors and the products they offer across key technology categories.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-16">
          {/* Search */}
          <div className="relative w-full lg:w-96">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by vendor name..."
              className="w-full bg-white/5 border border-white/10 focus:border-orange-500 rounded-xl py-3 pl-11 pr-10 outline-none text-white text-sm placeholder-slate-500 transition-colors"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            className="bg-[#0f0f11] border border-white/10 hover:border-orange-500 text-sm rounded-xl py-3 px-4 outline-none cursor-pointer text-white transition-colors"
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
          >
            <option value="az" className="bg-[#0f0f11] text-white">Name (A–Z)</option>
            <option value="za" className="bg-[#0f0f11] text-white">Name (Z–A)</option>
            <option value="newest" className="bg-[#0f0f11] text-white">Recently Added</option>
            <option value="oldest" className="bg-[#0f0f11] text-white">Oldest First</option>
          </select>
        </div>

        {/* Vendor Grid */}
        {currentItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
            {currentItems.map((vendor, index) => (
              <div
                key={vendor.id}
                onClick={() => handleVendorClick(vendor.name)}
                className="group relative bg-[#0f0f11] border border-white/5 rounded-[2.5rem] p-5 md:p-8 hover:bg-[#161618] hover:border-orange-500/40 transition-all duration-500 cursor-pointer overflow-hidden"
              >
                <div className="relative w-16 h-16 md:w-24 md:h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-orange-600 rounded-2xl blur-2xl opacity-0 group-hover:opacity-20 transition-opacity" />
                  <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-white/5 group-hover:border-orange-600 transition-colors duration-500">
                    <Image
                      src={vendor.icon}
                      alt={vendor.name}
                      fill
                      className="object-cover scale-110 group-hover:scale-125 transition-transform duration-700"
                    />
                  </div>
                </div>

                <div className="text-center relative z-10">
                  <h3 className="font-bold text-sm md:text-lg mb-1 line-clamp-2 group-hover:text-orange-500 transition-colors">
                    {vendor.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-40 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
            <h2 className="text-2xl font-bold text-slate-500 italic">
              No matches for `{searchQuery}`
            </h2>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-24 flex flex-wrap justify-center items-center gap-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-12 px-6 rounded-2xl bg-white/5 hover:bg-orange-600 disabled:opacity-20 transition-all font-bold text-sm"
            >
              PREV
            </button>
            <div className="flex gap-2">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-12 h-12 rounded-2xl font-bold text-sm transition-all ${
                    currentPage === i + 1 ? 'bg-orange-600' : 'bg-white/5 text-slate-500'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-12 px-6 rounded-2xl bg-white/5 hover:bg-orange-600 disabled:opacity-20 transition-all font-bold text-sm"
            >
              NEXT
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}