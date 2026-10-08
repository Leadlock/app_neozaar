"use client";
import * as React from "react";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Header from "../layouts/Header";
import Footer from "../layouts/Footer";

// Icons (using simple SVG paths)
const Icons = {
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Reset: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  Sparkle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Prev: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Next: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Empty: () => (
    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  Product: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  Service: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Solution: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

const ACTION_TYPES = {
  ALL: 'all',
  PRODUCT: 'product',
  SERVICE: 'service',
  SOLUTION: 'solution'
};

const ACTION_TYPE_LABELS = {
  [ACTION_TYPES.ALL]: 'All',
  [ACTION_TYPES.PRODUCT]: 'Products',
  [ACTION_TYPES.SERVICE]: 'Services',
  [ACTION_TYPES.SOLUTION]: 'Solutions'
};

const ACTION_TYPE_COLORS = {
  [ACTION_TYPES.ALL]: 'gray',
  [ACTION_TYPES.PRODUCT]: 'blue',
  [ACTION_TYPES.SERVICE]: 'green',
  [ACTION_TYPES.SOLUTION]: 'purple'
};

// Static categories based on the image
const CATEGORY_OPTIONS = [
  'SMB',
  'Mid-market',
  'Enterprise',
  'Government',
  'Retail',
  'Healthcare',
  'ITIES',
  'BFSI',
  'Logistics'
];

// Memoized FilterSidebar component
const FilterSidebar = React.memo(({ 
  search, 
  categoriesSelect,
  industries,
  onSearchChange, 
  onSearchSubmit, 
  onSearchClear, 
  onCategoryChange,
  onIndustryChange,
  onClearCategory, 
  onClearIndustry,
  onResetFilters 
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        {(search || categoriesSelect.length > 0 || industries.length > 0) && (
          <button
            onClick={onResetFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <Icons.Reset />
            Reset All
          </button>
        )}
      </div>

      {/* Search Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
            <Icons.Search />
          </div>
          <input
            type="search"
            placeholder="Type at least 3 characters..."
            value={search}
            onChange={onSearchChange}
            onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
            className="w-full h-10 pl-10 pr-8 text-black bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none focus:bg-white transition-all text-sm"
          />
          {search && (
            <button
              onClick={onSearchClear}
              className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600"
            >
              <Icons.Close />
            </button>
          )}
        </div>
        {search.length > 0 && search.length < 3 && (
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Please type at least 3 characters to search
          </p>
        )}
      </div>

      {/* Categories Section - Using static CATEGORY_OPTIONS */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Categories</h4>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {CATEGORY_OPTIONS.map((category) => (
            <label
              key={category}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                categoriesSelect.includes(category) ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                value={category}
                checked={categoriesSelect.includes(category)}
                onChange={() => onCategoryChange(category)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className={`text-sm ${
                categoriesSelect.includes(category) ? 'text-blue-700 font-medium' : 'text-gray-700'
              }`}>
                {category}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Industries Section */}
      <div className="mb-6 hidden">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Industries</h4>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {['Government', 'Retail', 'Healthcare', 'ITIES', 'BFSI', 'Logistics'].map((industry) => (
            <label
              key={industry}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                industries.includes(industry) ? 'bg-green-50' : 'hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                value={industry}
                checked={industries.includes(industry)}
                onChange={() => onIndustryChange(industry)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className={`text-sm ${
                industries.includes(industry) ? 'text-green-700 font-medium' : 'text-gray-700'
              }`}>
                {industry}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Active Filters Summary */}
      {(search || categoriesSelect.length > 0 || industries.length > 0) && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Active Filters</h4>
          <div className="flex flex-wrap gap-2">
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                Search: {search}
                <button onClick={onSearchClear} className="hover:text-blue-900">
                  <Icons.Close />
                </button>
              </span>
            )}
            {industries.map(industry => (
              <span key={industry} className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                {industry}
                <button onClick={() => onClearIndustry(industry)} className="hover:text-green-900">
                  <Icons.Close />
                </button>
              </span>
            ))}
            {categoriesSelect.map(category => (
              <span key={category} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                {category}
                <button onClick={() => onClearCategory(category)} className="hover:text-purple-900">
                  <Icons.Close />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

FilterSidebar.displayName = 'FilterSidebar';

export default function Home() {
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    total: 0
  });
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(ACTION_TYPES.ALL);
  const [marketplace, setMarketplace] = useState([]);
  const router = useRouter();
  const [categoriesSelect, setCategoriesSelect] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState({
    products: true,
    services: true,
    solutions: true,
    solutionsSlider: true,
    marketplace: false,
    initialData: true
  });
  const [solutions, setSolutions] = useState([]);
  const [products, setProducts] = useState([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  const searchDebounceTimerRef = useRef(null);
  const isInitialMount = useRef(true);

  // ==================== DATA FETCHING FUNCTIONS ====================
  const containsHTML = (str) => {
    if (!str) return false;
    return /<\/?[a-z][\s\S]*>/i.test(str);
  };
  
  const fetchWithAuth = async (url, options = {}) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    
    const defaultHeaders = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: defaultHeaders
      });

      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        return { data: [], pagination: { page: 1, pages: 0, total: 0 } };
      }

      return await response.json();
    } catch (error) {
      console.error("Fetch error:", error);
      return { data: [], pagination: { page: 1, pages: 0, total: 0 } };
    }
  };

  // Fetch initial products for grid
  const fetchInitialProducts = async () => {
    try {
      const data = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE}catalog/marketplace/products?page=1&limit=8&action_type=product`
      );
      
      if (data.data) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Error fetching initial products:', error);
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  const fetchBundles = async () => {
    // temporarily disabled
  };

  const fetchSolutions = async () => {
    try {
      const data = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE}catalog/marketplace/products?page=1&limit=8&action_type=service&action_for=both`
      );
      
      if (data.data) {
        setSolutions(data.data);
      }
    } catch (error) {
      console.error('Error fetching solutions:', error);
    } finally {
      setLoading(prev => ({ ...prev, solutionsSlider: false }));
    }
  };

  // Main fetch function for marketplace items based on active tab
  const fetchMarketplace = useCallback(async (page = 1) => {
    if (!activeTab) return;

    try {
      setLoading(prev => ({ ...prev, marketplace: true }));

      let queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "20"
      });

      // Set action_type based on active tab
      if (activeTab === ACTION_TYPES.ALL) {
        queryParams.append("action_type", "all");
        queryParams.append("action_for", "both");
      } else {
        queryParams.append("action_type", activeTab);
      }

      // Add action_for for service and solution tabs (if your API supports it)
      if (activeTab === ACTION_TYPES.SERVICE || activeTab === ACTION_TYPES.SOLUTION) {
        queryParams.append("action_for", "both");
      }

      // Add search if valid
      if (search?.trim() && search.length >= 3) {
        queryParams.append("search", search.trim());
      }

      // Add categories if selected
      if (categoriesSelect?.length > 0) {
        queryParams.append("category", categoriesSelect.join(','));
      }

      // Add industries if selected
      if (industries?.length > 0) {
        queryParams.append("industry", industries.join(','));
      }

      const query = `?${queryParams.toString()}`;
      console.log('Fetching with query:', query); // Debug log
      
      const data = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE}catalog/marketplace/products${query}`
      );

      console.log('API Response:', data); // Debug log

      setMarketplace(data?.data || []);
      setPagination({
        page: data?.pagination?.page || 1,
        totalPages: data?.pagination?.totalPages || 0,
        total: data?.pagination?.total || 0
      });

    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(prev => ({ ...prev, marketplace: false, initialData: false }));
    }
  }, [search, categoriesSelect, industries, activeTab]);

  // ==================== DEBOUNCE EFFECT ====================
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }

    if (search.length >= 3 || search === '') {
      searchDebounceTimerRef.current = setTimeout(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchMarketplace(1);
      }, 500);
    }

    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
    };
  }, [search, fetchMarketplace]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch initial data for default sections
        await Promise.all([
          fetchInitialProducts(),
          fetchBundles(),
          fetchSolutions()
        ]);
        
        // Fetch marketplace data with 'all' tab
        await fetchMarketplace(1);
        
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    fetchInitialData();
  }, []); // Empty dependency array for initial load

  // Fetch when filters change (categories/industries)
  useEffect(() => {
    if (!isInitialMount.current) {
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchMarketplace(1);
    }
  }, [categoriesSelect, industries, fetchMarketplace]);

  // Fetch when page changes
  useEffect(() => {
    if (pagination.page > 1) {
      fetchMarketplace(pagination.page);
    }
  }, [pagination.page, fetchMarketplace]);

  // ==================== HANDLERS ====================
  const handleCategoryChange = useCallback((categoryName) => {
    setCategoriesSelect(prev => 
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  }, []);

  const handleIndustryChange = useCallback((industry) => {
    setIndustries(prev => 
      prev.includes(industry)
        ? prev.filter(i => i !== industry)
        : [...prev, industry]
    );
  }, []);

  const handleClearCategory = useCallback((category) => {
    setCategoriesSelect(prev => prev.filter(c => c !== category));
  }, []);

  const handleClearIndustry = useCallback((industry) => {
    setIndustries(prev => prev.filter(i => i !== industry));
  }, []);

  const handleProductClick = useCallback((product) => {
    const query = product.slug ? `/product/${product.slug}` : `/product/${product.id}`;
    router.push(query);
  }, [router]);
  
  const handleServiceClick = useCallback((product) => {
    const query = product.slug ? `/service/${product.slug}` : `/service/${product.id}`;
    router.push(query);
  }, [router]);
  
  const handleSolutionClick = useCallback((product) => {
    const query = product.slug ? `/solution/${product.slug}` : `/solution/${product.id}`;
    router.push(query);
  }, [router]);

  const handleTabClick = useCallback((tab) => {
    setActiveTab(tab);
    setPagination(prev => ({ ...prev, page: 1 }));
    // Reset marketplace data while loading new tab
    setMarketplace([]);
    // Fetch new tab data
    setTimeout(() => {
      fetchMarketplace(1);
    }, 0);
  }, [fetchMarketplace]);

  const handleResetFilters = useCallback(() => {
    setSearch('');
    setCategoriesSelect([]);
    setIndustries([]);
    setPagination(prev => ({ ...prev, page: 1 }));
    // Fetch after reset
    setTimeout(() => {
      fetchMarketplace(1);
    }, 0);
  }, [fetchMarketplace]);

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearch('');
  }, []);

  const handleSearchSubmit = useCallback(() => {
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }
    if (search.length >= 3 || search === '') {
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchMarketplace(1);
    }
  }, [fetchMarketplace, search]);

  // ==================== RENDER LOGIC ====================
  const getTypeBadge = useCallback((type) => {
    switch(type) {
      case 'product':
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <Icons.Product />, label: 'Product' };
      case 'service':
        return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: <Icons.Service />, label: 'Service' };
      case 'solution':
        return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: <Icons.Solution />, label: 'Solution' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: null, label: 'Item' };
    }
  }, []);

  const getActionTypeColor = useCallback((type) => {
    const colors = {
      [ACTION_TYPES.ALL]: 'gray',
      [ACTION_TYPES.PRODUCT]: 'blue',
      [ACTION_TYPES.SERVICE]: 'green',
      [ACTION_TYPES.SOLUTION]: 'purple'
    };
    return colors[type] || 'gray';
  }, []);

  // Memoized values
  const showSearchTooShort = useMemo(() => search.length > 0 && search.length < 3, [search]);
  const showDebounceIndicator = useMemo(() => search.length >= 3 && loading.marketplace, [search.length, loading.marketplace]);
  const showDefaultSections = useMemo(() => {
    // Show default sections only on initial load with no filters and 'all' tab
    return activeTab === ACTION_TYPES.ALL && 
           !search && 
           categoriesSelect.length === 0 && 
           industries.length === 0 && 
           marketplace.length === 0 && 
           !loading.marketplace;
  }, [activeTab, search, categoriesSelect, industries, marketplace.length, loading.marketplace]);

  // Render product card
  const renderItemCard = (item, type, onClick, index = 0) => {
    const badge = getTypeBadge(type);

    const uniqueKey = `${type}-${item.id || item._id || "no-id"}-${index}`;

    return (
      <div
        key={uniqueKey}
        onClick={onClick}
        className="group cursor-pointer"
      >
        <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-300">

          {/* Image */}
          <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-lg border">
            <Image
              fill
              alt={item.title || item.name || "Item"}
              className="object-cover"
              src={
                item.product_logo ||
                item.image_url ||
                item.vendor_logo ||
                "/brand-log/neozaardefault.jpg"
              }
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
              {item?.brand_name || "Neozaar"}
            </p>

            <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
              {item.title || item.name}
            </h3>

            {containsHTML(item.description) ? (
              <div
                className="text-gray-500 text-xs line-clamp-2 mt-1"
                dangerouslySetInnerHTML={{ __html: item.description }}
              />
            ) : (
              <p className="text-gray-500 text-xs line-clamp-2 mt-1">
                {item.description || "No description available"}
              </p>
            )}
          </div>

          {/* Right Section */}
          <div className="flex flex-col items-end gap-2">

            {/* Product Type or Badge */}
            {badge.label === "Item" ? (
              item.product_type && (
                <span
                  className={`text-xs font-medium capitalize px-2 py-1 rounded-md
                    ${item.product_type?.toLowerCase() === "product" ? "bg-blue-50 text-blue-700" : ""}
                    ${item.product_type?.toLowerCase() === "service" ? "bg-green-50 text-green-700" : ""}
                    ${item.product_type?.toLowerCase() === "solution" ? "bg-purple-50 text-purple-700" : ""}
                  `}
                >
                  {item.product_type}
                </span>
              )
            ) : (
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md ${badge.bg} ${badge.text}`}
              >
                {badge.icon}
                {badge.label}
              </span>
            )}

            {/* Price */}
         {item.starting_price && Number(item.starting_price) > 1 ? (
  <p className="text-base font-semibold text-blue-600">
    ₹{Number(item.starting_price).toLocaleString()}
  </p>
) : (
  <p className="text-xs text-gray-400">Price on request</p>
)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <Image
            src="/brand-log/maketplacebanner.jpg"
            alt="Background"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 mix-blend-overlay"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-5xl lg:text-[55px] font-bold text-white mb-6 leading-tight">
              Power Your Enterprise with
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Trusted Infrastructure and Elite Solutions.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl">
              NeoZaar brings together global cloud platforms, enterprise-grade solutions, 
              and expert services to accelerate deployment and maximize the value of your cloud investments.
            </p>
          </div>
        </div>
      </section>

      {/* Mobile Filter Toggle Button */}
      <div className="lg:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <button
          onClick={() => setIsMobileFilterOpen(prev => !prev)}
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between text-gray-700"
        >
          <span className="flex items-center gap-2">
            <Icons.Filter />
            Filters
            {(search || categoriesSelect.length > 0 || industries.length > 0) && (
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            )}
          </span>
          <Icons.ChevronDown />
        </button>
      </div>

      {/* Main Content with Sidebar Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className={`
            lg:block lg:w-80 flex-shrink-0
            ${isMobileFilterOpen ? 'block' : 'hidden lg:block'}
          `}>
            <FilterSidebar
              search={search}
              categoriesSelect={categoriesSelect}
              industries={industries}
              onSearchChange={handleSearchChange}
              onSearchSubmit={handleSearchSubmit}
              onSearchClear={handleSearchClear}
              onCategoryChange={handleCategoryChange}
              onIndustryChange={handleIndustryChange}
              onClearCategory={handleClearCategory}
              onClearIndustry={handleClearIndustry}
              onResetFilters={handleResetFilters}
            />
          </aside>

          {/* Main Content Area */}
          <main className="flex-1">
            {/* Tabs Section */}
            <section className="mb-8">
              <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-2xl inline-block">
                {Object.entries(ACTION_TYPE_LABELS).map(([key, label]) => {
                  const color = getActionTypeColor(key);
                  return (
                    <button
                      key={key}
                      onClick={() => handleTabClick(key)}
                      className={`relative px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${
                        activeTab === key
                          ? `bg-white text-${color}-600 shadow-md`
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                      }`}
                    >
                      {label}
                      {activeTab === key && marketplace.length > 0 && (
                        <span className={`absolute -top-2 -right-2 w-7 h-7 bg-${color}-600 text-white text-xs rounded-full flex items-center justify-center`}>
                          {pagination.total}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Search Too Short Message */}
            {showSearchTooShort && (
              <section className="mb-8">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                  <div className="text-amber-600 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">Type at least 3 characters</h3>
                  <p className="text-amber-700">
                    Please type at least 3 characters to search. You&apos;ve typed {search.length} character{search.length !== 1 ? 's' : ''}.
                  </p>
                </div>
              </section>
            )}

            {/* Debounce Indicator */}
            {showDebounceIndicator && (
              <section className="mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-sm text-blue-700 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Searching...
                  </p>
                </div>
              </section>
            )}

            {/* Default Sections - Only show on initial load with no filters */}
            {showDefaultSections && (
              <>
                {/* Latest Products Section */}
                <section className="mb-16">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Latest Products</h2>
                      <p className="text-gray-600 text-sm mt-1">Enterprise-grade SaaS, ready to deploy</p>
                    </div>
                    <button
                      onClick={() => handleTabClick(ACTION_TYPES.PRODUCT)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                    >
                      View All
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {loading.products ? (
                    <div className="text-center py-10">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
                    </div>
                  ) : products.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                      {products.map((item, index) => renderItemCard(item, 'product', () => handleProductClick(item), index))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-10">No products available</p>
                  )}
                </section>

                {/* Latest Services Section */}
                <section className="mb-16">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Latest Services</h2>
                      <p className="text-gray-600 text-sm mt-1">Certified experts to design, deploy, and manage</p>
                    </div>
                    <button
                      onClick={() => handleTabClick(ACTION_TYPES.SERVICE)}
                      className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center gap-1"
                    >
                      View All
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {loading.solutionsSlider ? (
                    <div className="text-center py-10">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-200 border-t-green-600"></div>
                    </div>
                  ) : solutions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                      {solutions.map((item, index) => renderItemCard(item, 'service', () => handleServiceClick(item), index))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-10">No services available</p>
                  )}
                </section>

                {/* Latest Solutions Section */}
                <section className="mb-16">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Latest Solutions</h2>
                      <p className="text-gray-600 text-sm mt-1">Bundles built to achieve real outcomes</p>
                    </div>
                    <button
                      onClick={() => handleTabClick(ACTION_TYPES.SOLUTION)}
                      className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1"
                    >
                      View All
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {loading.solutions ? (
                    <div className="text-center py-10">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-200 border-t-purple-600"></div>
                    </div>
                  ) : bundles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                      {bundles.map((item, index) => renderItemCard(item, 'solution', () => handleSolutionClick(item), index))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-10">No solutions available</p>
                  )}
                </section>

                {/* AI Assistant Section */}
                <section className="mb-16">
                  <div className="relative bg-gray-100 rounded-lg w-full h-40 md:h-52 lg:h-72 overflow-hidden">
                    <Image
                      fill
                      alt="home banner"
                      className="object-content w-full"
                      src='/assests/maketimage.jpeg'
                    />
                  </div>
                </section>
              </>
            )}

            {/* Marketplace Items Section - Shows for all tabs when there are results */}
            {!showDefaultSections && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {search && search.length >= 3 ? `Results for "${search}"` : ACTION_TYPE_LABELS[activeTab]}
                      {(categoriesSelect.length > 0 || industries.length > 0) && (
                        <span className="text-lg font-normal text-gray-600 ml-2">
                          (Filtered)
                        </span>
                      )}
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                      Showing {marketplace.length} of {pagination.total} items
                    </p>
                  </div>
                </div>

                {loading.marketplace ? (
                  <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading items...</p>
                  </div>
                ) : marketplace.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                      {marketplace.map((product, index) => {
                        // Determine the type for the badge
                        const itemType = product.action_type || activeTab;
                        
                        const handleClick = () => {
                          if (itemType === ACTION_TYPES.SERVICE) handleServiceClick(product);
                          else if (itemType === ACTION_TYPES.SOLUTION) handleSolutionClick(product);
                          else handleProductClick(product);
                        };
                        
                        return renderItemCard(product, itemType, handleClick, index);
                      })}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                      <div className="flex justify-center items-center mt-12 gap-2">
                        <button
                          disabled={pagination.page === 1}
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                          className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Icons.Prev />
                        </button>

                        <div className="flex gap-2">
                          {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                            let pageNum;
                            if (pagination.totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (pagination.page <= 3) {
                              pageNum = i + 1;
                            } else if (pagination.page >= pagination.totalPages - 2) {
                              pageNum = pagination.totalPages - 4 + i;
                            } else {
                              pageNum = pagination.page - 2 + i;
                            }

                            return (
                              <button
                                key={`page-${pageNum}-${i}`}
                                onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                                className={`min-w-[2.5rem] h-10 px-3 rounded-lg font-medium transition-colors ${
                                  pagination.page === pageNum
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-500 hover:text-blue-600'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          disabled={pagination.page === pagination.totalPages}
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                          className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Icons.Next />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-20 bg-gray-50 rounded-2xl">
                    <Icons.Empty />
                    <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">No Items Found</h3>
                    <p className="text-gray-600 mb-6">
                      {search && search.length >= 3
                        ? `We couldn&apos;t find any items matching "${search}"`
                        : `No items available with the selected filters`
                      }
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </>
  );
}