"use client"
import { trackEvent } from "../lib/track";
import Header from "../layouts/Header";
import Footer from "../layouts/Footer";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesSelect, setCategoriesSelect] = useState('');
  const [marketplace, setMarketplace] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    limit: 12,
    total: 0
  });

  // Search debouncing
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleCategoryClick = (categoryName) => {
    setMenu(false);
    setCategoriesSelect(categoryName);
    // Reset to page 1 when category changes
    fetchMarketplace(1, categoryName);
  };

  const fetchMarketplace = async (page = 1, category = categoriesSelect) => {
    if (typeof window === "undefined") return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found');
      return;
    }

    setLoading(true);

    try {
      let query = `?action_type=product&action_for=customer&page=${page}&limit=${pagination.limit}`;

      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }

      if (category) {
        query += `&category=${encodeURIComponent(category)}`;
      }

      console.log('Fetching marketplace with query:', query);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}catalog/marketplace/products${query}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      console.log('Marketplace API response:', data);

      if (res.ok) {
        setMarketplace(data.data || []);
        setPagination(prev => ({
          ...prev,
          ...(data.pagination || { page: 1, pages: 1, total: 0 })
        }));
        
        // Scroll to top for better UX
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        console.log('API error:', data.message);
        setMarketplace([]);
        setPagination({
          page: 1,
          pages: 1,
          limit: 12,
          total: 0
        });
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setMarketplace([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}catalog/categories`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );

      const data = await res.json();
      if (data.data) {
        setCategories(data.data);
      }
    } catch (error) {
      console.log('Error fetching categories:', error);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages || loading) return;
    fetchMarketplace(newPage, categoriesSelect);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      fetchMarketplace(1, categoriesSelect);
    }, 500);
    
    setSearchTimeout(timeout);
  };

  const handleProductClick = (product) => {
    trackEvent({
      eventType: "PRODUCT_CLICK",
      entityType: "product",
      entityId: product.id,
      pageUrl: typeof window !== "undefined" ? window.location.pathname : "/",
    });

    router.push(`/bundle?productid=${product.id}`);
  };

  // Reset all filters function
  const handleResetFilters = () => {
    setSearch('');
    setCategoriesSelect('');
    setMenu(false);
    fetchMarketplace(1, '');
  };

  // Fetch data on initial load
  useEffect(() => {
    fetchCategories();
    fetchMarketplace();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const showSpecialSections = categoriesSelect.length === 0 && search.length === 0;

  return (
    <>
      <Header />
      <div className="max-w-[1920px] m-auto">
        <section id="hero-section">
          <div className="relative bg-black overflow-hidden w-full min-h-[400px] md:h-[553px]">
            <Image
              src="/brand-log/maketplacebanner.jpg"
              alt="Background"
              fill
              className="absolute inset-0 w-full h-full object-cover"
              priority
            />
            <div className="absolute text-white font-['CreatoDisplay-LightItalic',_sans-serif] italic font-light text-lg sm:text-2xl md:text-4xl lg:text-[50px] md:leading-[50px] top-12 sm:top-[118px] left-4 sm:left-[104px] max-w-[90%] sm:max-w-none">
              Curated Cloud <br />
              Bundles to Accelerate
              <br />
              Transformation & Maximize ROI
            </div>
            <div className="absolute text-neutral-400 font-text-sm-regular-font-family font-text-sm-regular-font-weight text-xs sm:text-sm md:text-base lg:text-[16px] mt-4 top-[180px] sm:top-[309px] left-4 sm:left-[100px] w-[90%] sm:w-[440px]">
              Combine trusted cloud infrastructure from AWS, Azure, and Google Cloud with ready-to-deploy solutions from global ISVs like Zscaler, Acronis, Databricks, and Rubrik — all in one seamless experience.
            </div>
          </div>
        </section>

        <section id="search-section">
          <div className="w-full bg-white">
            <div className="flex items-center gap-2 px-4 py-3 max-w-[1400px] mx-auto">
              {/* AI Assistant Button */}
              <div className="relative bg-white shrink-0 w-[100px] h-[68px] rounded-[20px] overflow-hidden flex items-center justify-center">
                <Image
                  src="/assests/unsureaibg.png"
                  alt="AI Background"
                  fill
                  className="absolute w-full h-full object-cover"
                />
                <div className="relative flex items-center justify-center gap-2 cursor-pointer">
                  <Image
                    src="/assests/sparkle_png.png"
                    alt="Sparkle"
                    width={30}
                    height={30}
                    className="w-6 h-6 sm:w-[30px] sm:h-[30px]"
                  />
                </div>
              </div>

              {/* Search Input Container */}
              <div className="flex-1 relative">
                <div className="relative flex items-center h-[68px] px-6 bg-white border-2 border-gray-200 rounded-[20px] hover:border-gray-300 focus-within:border-blue-500 transition-colors">
                  <input
                    type="search"
                    placeholder="Search Products"
                    value={search}
                    onChange={handleSearch}
                    className="flex-1 text-gray-600 text-base placeholder:text-gray-400 outline-none bg-transparent"
                  />
                  
                  <button 
                    onClick={() => fetchMarketplace(1, categoriesSelect)}
                    className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-600"
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Categories Button */}
              <div className="relative">
                <button
                  onClick={() => setMenu(!menu)}
                  className="flex items-center gap-3 h-[68px] px-8 bg-white border-2 border-gray-200 rounded-[20px] hover:border-gray-300 hover:bg-gray-50 transition-all group"
                >
                  <div className="flex flex-col gap-[5px]">
                    <span className="w-5 h-[2px] bg-gray-800 rounded-full transition-all group-hover:w-6"></span>
                    <span className="w-5 h-[2px] bg-gray-800 rounded-full"></span>
                    <span className="w-5 h-[2px] bg-gray-800 rounded-full transition-all group-hover:w-6"></span>
                  </div>
                  <span className="text-gray-800 text-base font-semibold whitespace-nowrap">
                    {categoriesSelect || "Categories"}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {menu && (
                  <div className="absolute top-[85px] -left-5 w-[200px] bg-white text-black shadow-lg border border-zinc-200 rounded-lg z-50 transition-all">
                    <ul className="flex flex-col">
                      <li
                        className="px-4 py-2 hover:bg-zinc-100 cursor-pointer text-sm"
                        onClick={() => handleCategoryClick('')}
                      >
                        All Categories
                      </li>
                      {categories && categories.map((cat) => (
                        <li
                          key={cat.id}
                          className="px-4 py-2 hover:bg-zinc-100 cursor-pointer text-sm"
                          onClick={() => handleCategoryClick(cat.name)}
                        >
                          {cat.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* RESET FILTERS BUTTON */}
              {(search || categoriesSelect) && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-2 h-[68px] px-6 bg-white border-2 border-gray-200 rounded-[20px] hover:border-gray-300 hover:bg-gray-50 transition-all text-gray-600 font-medium whitespace-nowrap"
                >
                  <svg 
                    width="18" 
                    height="18" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    className="text-gray-500"
                  >
                    <path d="M3 6h18M7 12h10M10 18h4" />
                    <circle cx="18" cy="6" r="2" />
                    <circle cx="6" cy="12" r="2" />
                    <circle cx="14" cy="18" r="2" />
                  </svg>
                  Reset Filters
                </button>
              )}
            </div>

            {/* Search info text */}
            {search && (
              <div className="max-w-[1400px] mx-auto px-4 mt-2">
                <p className="text-sm text-gray-500">
                  Searching for <span className="font-medium text-gray-700">{search}</span> in Products
                </p>
              </div>
            )}
          </div>
        </section>
        
        <section id="trending_bundle_section" className={`${search.length > 0 || categoriesSelect.length > 0 ? "my-30" : ""}`}>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {showSpecialSections && (
                <div className="w-11/12 m-auto mt-20">
                  <div className="max-w-[400px]">
                    <div className="text-black font-['CreatoDisplay-Regular',_sans-serif] text-left text-xl sm:text-2xl mb-5 md:text-[25px] font-normal">
                      Popular & Trending Products
                    </div>
                    <div className="text-neutral-500 text-left text-sm sm:text-base">
                      Enterprise-grade SaaS products — fully private offer aligned to your AWS MACC or Azure EDP commitments.
                    </div>
                  </div>
                </div>
              )}

              {/* Show search results header when filtering */}
              {!showSpecialSections && (
                <div className="w-11/12 m-auto mt-20">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">
                        {search ? `Search Results for "${search}"` : `Filtered Products`}
                      </h2>
                      <p className="text-gray-600 mt-2">
                        Showing {marketplace.length} products
                        {categoriesSelect && ` in "${categoriesSelect}"`}
                      </p>
                    </div>
                    
                    {/* Reset button in results section too */}
                    {(search || categoriesSelect) && (
                      <button
                        onClick={handleResetFilters}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M7 12h10M10 18h4" />
                          <circle cx="18" cy="6" r="2" />
                          <circle cx="6" cy="12" r="2" />
                          <circle cx="14" cy="18" r="2" />
                        </svg>
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="w-11/12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 m-auto xl:grid-cols-4 gap-5 my-10">
                {Array.isArray(marketplace) && marketplace.length > 0 ? (
                  marketplace.map((product, index) => (
                    <div
                      key={product.id || index}
                      onClick={() => handleProductClick(product)}
                      className="cursor-pointer"
                    >
                      <div className="bg-zinc-50 border border-zinc-200 m-auto h-[420px] w-full max-w-[295px] hover:shadow-lg transition-shadow">
                        <div className="w-full h-[250px] relative">
                          <Image
                            fill
                            alt={product.title || "Product Image"}
                            className="w-full h-[256px] object-cover rounded-t"
                            src={product.image_url || "/brand-log/neozaardefault.jpg"}
                          />
                        </div>
                        <div className="p-4">
                          <p className="uppercase text-lg text-black tracking-wider mb-2 line-clamp-2">
                            {product.title}
                          </p>
                          <p className="text-gray-500 leading-snug h-12 overflow-hidden line-clamp-2 mb-3">
                            {product.description}
                          </p>
                          <p className="text-blue-600 text-sm font-semibold">
                            Starting From &#x20b9;{product.starting_price}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-16">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No Products Found</h3>
                    <p className="text-gray-500 mb-6">
                      {search 
                        ? `We couldn't find any products matching "${search}"`
                        : `No products available${categoriesSelect ? ` in "${categoriesSelect}"` : ''}`
                      }
                    </p>
                    {(search || categoriesSelect) && (
                      <button
                        onClick={handleResetFilters}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Pagination Component */}
              {marketplace.length > 0 && pagination.pages > 1 && (
                <div className="flex flex-col items-center justify-center mt-10 space-y-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1 || loading}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {(() => {
                        const pages = [];
                        const totalPages = pagination.pages;
                        const currentPage = pagination.page;
                        
                        // Always show first page
                        pages.push(
                          <button
                            key={1}
                            onClick={() => handlePageChange(1)}
                            disabled={loading}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                              currentPage === 1
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            1
                          </button>
                        );

                        // Show ellipsis if needed
                        if (currentPage > 3) {
                          pages.push(
                            <span key="left-ellipsis" className="px-2">
                              ...
                            </span>
                          );
                        }

                        // Show pages around current page
                        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                          if (i > 1 && i < totalPages) {
                            pages.push(
                              <button
                                key={i}
                                onClick={() => handlePageChange(i)}
                                disabled={loading}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                                  currentPage === i
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {i}
                              </button>
                            );
                          }
                        }

                        // Show ellipsis if needed
                        if (currentPage < totalPages - 2) {
                          pages.push(
                            <span key="right-ellipsis" className="px-2">
                              ...
                            </span>
                          );
                        }

                        // Always show last page if there is more than 1 page
                        if (totalPages > 1) {
                          pages.push(
                            <button
                              key={totalPages}
                              onClick={() => handlePageChange(totalPages)}
                              disabled={loading}
                              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                                currentPage === totalPages
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {totalPages}
                            </button>
                          );
                        }

                        return pages;
                      })()}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages || loading}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      Next
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="text-gray-600 text-sm">
                    Showing page {pagination.page} of {pagination.pages} 
                    {pagination.total > 0 && ` (${pagination.total} total products)`}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <Footer />
    </>
  );
}