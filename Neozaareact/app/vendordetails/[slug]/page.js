// app/category/[slug]/page.js
'use client';

import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { use } from "react";
import Header from '@/app/layouts/Header';
import Footer from '@/app/layouts/Footer';

export default function CategoryPage({ params }) {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filters, setFilters] = useState({
    brands: [],
    subcategories: [],
    segments: [],
    cta_model: [],
    target_audience: [],
    cloud_provider_support: [],
    regions_supported: [],
    action_type: []
  });
  const [selectedFilters, setSelectedFilters] = useState({
    brand: "",
    subcategory: "",
    segment: "",
    cta_model: "",
    target_audience: "",
    cloud_provider_support: "",
    regions_supported: "",
    action_type: ""
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Use ref for debounce timer
  const debounceTimerRef = useRef(null);

  // Separate state for debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Unwrap params using use()
  const { slug } = use(params);

  // Fetch products based on category
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        // Convert slug to category name (e.g., "security" -> "Security")
        const categoryName = slug.charAt(0).toUpperCase() + slug.slice(1);

        // Build the API URL
        let apiUrl = `${process.env.NEXT_PUBLIC_API_BASE}catalog/marketplace/published?category=${encodeURIComponent(categoryName)}`;

        // Add search parameter if debounced search term exists
        if (debouncedSearchTerm.trim()) {
          apiUrl += `&search=${encodeURIComponent(debouncedSearchTerm)}`;
        }

        // Add selected filters
        if (selectedFilters.brand) {
          apiUrl += `&brand=${encodeURIComponent(selectedFilters.brand)}`;
        }
        if (selectedFilters.subcategory) {
          apiUrl += `&subcategory=${encodeURIComponent(selectedFilters.subcategory)}`;
        }
        if (selectedFilters.segment) {
          apiUrl += `&segment=${encodeURIComponent(selectedFilters.segment)}`;
        }
        if (selectedFilters.cta_model) {
          apiUrl += `&cta_model=${encodeURIComponent(selectedFilters.cta_model)}`;
        }
        if (selectedFilters.target_audience) {
          apiUrl += `&target_audience=${encodeURIComponent(selectedFilters.target_audience)}`;
        }
        if (selectedFilters.cloud_provider_support) {
          apiUrl += `&cloud_provider=${encodeURIComponent(selectedFilters.cloud_provider_support)}`;
        }
        if (selectedFilters.regions_supported) {
          apiUrl += `&region=${encodeURIComponent(selectedFilters.regions_supported)}`;
        }
        if (selectedFilters.action_type) {
          apiUrl += `&action_type=${encodeURIComponent(selectedFilters.action_type)}`;
        }

        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const result = await response.json();

        if (result.success) {
          const fetchedProducts = result.data || [];
          setProducts(fetchedProducts);
          setFilteredProducts(fetchedProducts);

          // Set filters from API response
          if (result.filters) {
            setFilters({
              brands: result.filters.brands || [],
              subcategories: result.filters.subcategories || [],
              segments: result.filters.segments || [],
              cta_model: result.filters.cta_model || [],
              target_audience: result.filters.target_audience || [],
              cloud_provider_support: result.filters.cloud_provider_support || [],
              regions_supported: result.filters.regions_supported || [],
              action_type: result.filters.action_type || []
            });
          }
        } else {
          throw new Error(result.message || 'Failed to fetch data');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchProducts();
    }
  }, [slug, debouncedSearchTerm, selectedFilters]);

  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedFilters({
      brand: "",
      subcategory: "",
      segment: "",
      cta_model: "",
      target_audience: "",
      cloud_provider_support: "",
      regions_supported: "",
      action_type: ""
    });
    setSearchTerm("");
    setDebouncedSearchTerm("");
  };

  // Handle search input with debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer to update debounced search term after 500ms
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchTerm(value);
    }, 500);
  };

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setDebouncedSearchTerm(searchTerm);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  };

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Get active filters count
  const activeFiltersCount = Object.values(selectedFilters).filter(v => v).length;

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#FBFBFC] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-slate-600">Loading products...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#FBFBFC] flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-lg mb-4">⚠️ Error loading products</div>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const categoryName = slug.charAt(0).toUpperCase() + slug.slice(1);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#FBFBFC] flex flex-col">

        {/* Navigation Breadcrumbs */}
        <nav className="bg-white border-b border-slate-100 py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest">
            <Link href="/" className="text-slate-400 hover:text-blue-600 transition-colors">
              Home
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-blue-600">
              {categoryName}
            </span>
          </div>
        </nav>

        {/* Hero Section with Search */}
        <header className="relative bg-white border-b border-slate-200 py-12 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-50/50 via-transparent to-transparent opacity-70"></div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 flex flex-col items-center">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                {categoryName} Products
              </h1>
              <p className="text-slate-500 mt-2">
                Browse and search products in the {categoryName} category
              </p>
            </div>

            {/* Search Bar */}
            <div className="w-full max-w-2xl mx-auto">
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="relative">
                  <input
                    type="search"
                    placeholder={`Search products in ${categoryName}...`}
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full px-5 py-3 pl-12 pr-12 text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <svg
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {debouncedSearchTerm && (
                  <div className="mt-2 text-right">
                    <span className="text-xs text-slate-500">
                      Found {filteredProducts.length} results for `{debouncedSearchTerm}`
                    </span>
                  </div>
                )}
              </form>
            </div>
          </div>
        </header>

        {/* Main Content with Sidebar Filters */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
          {/* Mobile Filter Button */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className="font-medium text-slate-700">Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <svg className={`w-5 h-5 text-slate-400 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar - Right Side */}
            <div className={`lg:w-80 order-1 lg:order-2 ${isFilterOpen ? 'block' : 'hidden lg:block'}`}>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sticky top-24">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Filters
                  </h3>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={handleClearFilters}
                      className="text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="space-y-5">
                  {/* Brand Filter */}
                  {filters.brands.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Brand
                      </label>
                      <select
                        value={selectedFilters.brand}
                        onChange={(e) => handleFilterChange('brand', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">All Brands</option>
                        {filters.brands.map((brand, idx) => (
                          <option key={idx} value={brand.name}>
                            {brand.name} ({brand.count})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Subcategory Filter */}
                  {filters.subcategories.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Subcategory
                      </label>
                      <select
                        value={selectedFilters.subcategory}
                        onChange={(e) => handleFilterChange('subcategory', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">All Subcategories</option>
                        {filters.subcategories.map((sub, idx) => (
                          <option key={idx} value={sub.name}>
                            {sub.name} ({sub.count})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Segment Filter */}
                  {filters.segments.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Segment
                      </label>
                      <select
                        value={selectedFilters.segment}
                        onChange={(e) => handleFilterChange('segment', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">All Segments</option>
                        {filters.segments.map((segment, idx) => (
                          <option key={idx} value={segment.name}>
                            {segment.name} ({segment.count})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* CTA Model Filter */}
                  {filters.cta_model.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        CTA Model
                      </label>
                      <select
                        value={selectedFilters.cta_model}
                        onChange={(e) => handleFilterChange('cta_model', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">All CTAs</option>
                        {filters.cta_model.map((cta, idx) => (
                          <option key={idx} value={cta.name}>
                            {cta.name} ({cta.count})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Target Audience Filter */}
                  {filters.target_audience.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Audience
                      </label>
                      <select
                        value={selectedFilters.target_audience}
                        onChange={(e) => handleFilterChange('target_audience', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">All Audiences</option>
                        {filters.target_audience.map((audience, idx) => (
                          <option key={idx} value={audience.name}>
                            {audience.name} ({audience.count})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Cloud Provider Filter */}
                  {filters.cloud_provider_support.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Cloud Provider
                      </label>
                      <select
                        value={selectedFilters.cloud_provider_support}
                        onChange={(e) => handleFilterChange('cloud_provider_support', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">All Providers</option>
                        {filters.cloud_provider_support.map((provider, idx) => (
                          <option key={idx} value={provider.name}>
                            {provider.name} ({provider.count})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Region Filter */}
                  {filters.regions_supported.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Region
                      </label>
                      <select
                        value={selectedFilters.regions_supported}
                        onChange={(e) => handleFilterChange('regions_supported', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">All Regions</option>
                        {filters.regions_supported.map((region, idx) => (
                          <option key={idx} value={region.name}>
                            {region.name} ({region.count})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Action Type Filter */}
                  {filters.action_type.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Action Type
                      </label>
                      <select
                        value={selectedFilters.action_type}
                        onChange={(e) => handleFilterChange('action_type', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">All Types</option>
                        {filters.action_type.map((type, idx) => (
                          <option key={idx} value={type.name}>
                            {type.name} ({type.count})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Active Filters Display */}
                {activeFiltersCount > 0 && (
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2">
                      {selectedFilters.brand && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md">
                          Brand: {selectedFilters.brand}
                          <button onClick={() => handleFilterChange('brand', '')} className="hover:text-blue-900">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      )}
                      {selectedFilters.subcategory && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-md">
                          Sub: {selectedFilters.subcategory}
                          <button onClick={() => handleFilterChange('subcategory', '')} className="hover:text-purple-900">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      )}
                      {selectedFilters.segment && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded-md">
                          Segment: {selectedFilters.segment}
                          <button onClick={() => handleFilterChange('segment', '')} className="hover:text-green-900">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Products Grid - Left Side */}
            <div className="flex-1 order-2 lg:order-1">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                  <div className="text-slate-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 text-lg">
                    {debouncedSearchTerm || activeFiltersCount > 0
                      ? `No products found matching your criteria`
                      : `No products available in ${categoryName}`
                    }
                  </p>
                  {(debouncedSearchTerm || activeFiltersCount > 0) && (
                    <button
                      onClick={handleClearFilters}
                      className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredProducts.map((product, idx) => {
                    const productSlug = product.name?.toLowerCase().replace(/\s+/g, '-') || `product-${idx}`;

                    const stripHtml = (html) => {
                      if (!html) return '';
                      if (typeof window !== 'undefined') {
                        const temp = document.createElement('div');
                        temp.innerHTML = html;
                        return temp.textContent || temp.innerText || '';
                      }
                      return html.replace(/<[^>]*>/g, '');
                    };

                    const renderDescription = () => {
                      const description = product.short_description || product.long_description;
                      if (!description) return null;
                      const isHTML = /<[a-z][\s\S]*>/i.test(description);
                      const plainText = isHTML ? stripHtml(description) : description;
                      return (
                        <p className="text-slate-500 text-[12px] line-clamp-2 mt-1 leading-relaxed">
                          {plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText}
                        </p>
                      );
                    };

                    const handleProductClick = () => {
                      router.push(`/product/${productSlug}`);
                    };

                    const getBadgeColor = (type) => {
                      switch (type?.toLowerCase()) {
                        case 'product': return 'bg-blue-100 text-blue-700';
                        case 'service': return 'bg-green-100 text-green-700';
                        case 'solution': return 'bg-purple-100 text-purple-700';
                        default: return 'bg-gray-100 text-gray-700';
                      }
                    };

                    return (
                      <div
                        key={product.id || idx}
                        className="group bg-white border border-slate-200 rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] hover:border-blue-400/30 cursor-pointer"
                        onClick={handleProductClick}
                      >
                        <div className="flex items-start gap-5">
                          {/* Product Image */}
                          <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 group-hover:border-blue-100 transition-colors">
                            <Image
                              fill
                              alt={product.name}
                              className="object-cover group-hover:scale-110 transition-transform duration-700"
                              src={product.product_logo || "/brand-log/neozaardefault.jpg"}
                              onError={(e) => {
                                e.target.src = "/brand-log/neozaardefault.jpg";
                              }}
                            />
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            {/* Product Type Badge */}
                            {product.action_type && (
                              <div className="flex items-center mb-1">
                                <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${getBadgeColor(product.action_type)}`}>
                                  {product.action_type.toUpperCase()}
                                </span>
                              </div>
                            )}

                            {/* Product Title */}
                            <h3 className="font-bold text-slate-900 text-[15px] transition-colors line-clamp-1 group-hover:text-blue-600">
                              {product.name}
                            </h3>

                            {/* Product Description */}
                            {renderDescription()}

                            {/* Starting Price */}
                            {product.starting_price && (
                              <div className="mt-2">
                                <span className="text-xs font-semibold text-blue-600">
                                  Starting from ${product.starting_price}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Arrow Indicator */}
                          <div className="flex flex-col items-end justify-center self-stretch shrink-0 pl-2">
                            <svg
                              className="w-4 h-4 text-blue-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}