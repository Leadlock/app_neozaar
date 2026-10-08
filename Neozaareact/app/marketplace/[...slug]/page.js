'use client';

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import Header from '@/app/layouts/Header';
import Footer from '@/app/layouts/Footer';
import BottomNav from "@/app/layouts/BottomNav";

// Parse URL like: /marketplace/brand/Cloudflare or /marketplace/product/brand/Cloudflare
function parsePagePath(pathname) {
  const pathParts = pathname.split('/').filter(part => part !== '');

  let actionType = null;
  let pageType = null;
  let pageValue = "";

  if (pathParts[0] === 'marketplace') {
    let currentIndex = 1;

    const actionTypes = ['product', 'service', 'solution'];
    if (actionTypes.includes(pathParts[currentIndex]?.toLowerCase())) {
      actionType = pathParts[currentIndex].toLowerCase();
      currentIndex++;
    }

    if (pathParts[currentIndex] && pathParts[currentIndex + 1]) {
      pageType = pathParts[currentIndex].toLowerCase();
      pageValue = decodeURIComponent(pathParts[currentIndex + 1]);
    }
  }

  return { actionType, pageType, pageValue };
}

export default function MarketplacePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialParsedPath = parsePagePath(pathname);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [sortBy, setSortBy] = useState("newest");
  const [filters, setFilters] = useState({
    brands: [],
    categories: [],
    subcategories: [],
    target_segments: [],
    industry: [],
    cta_model: [],
    target_audience: [],
    cloud_provider_support: [],
    regions_supported: [],
    action_type: []
  });
  const [selectedFilters, setSelectedFilters] = useState({
    brand: "",
    category: "",
    subcategory: "",
    segment: "",
    cta_model: "",
    target_audience: "",
    cloud_provider_support: "",
    regions_supported: "",
    action_type: ""
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [pageType, setPageType] = useState(initialParsedPath.pageType);
  const [pageValue, setPageValue] = useState(initialParsedPath.pageValue);
  const [actionTypeFilter, setActionTypeFilter] = useState(initialParsedPath.actionType);
  const [openAccordions, setOpenAccordions] = useState({
    category: false,
    subcategory: false,
    brand: false,
    target_segments: false,
    target_audience: false,
    industry: false,
    cloud_provider_support: false,
    regions_supported: false
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20,
    hasNext: false,
    hasPrev: false
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Refs for infinite scroll
  const loaderRef = useRef(null);
  const observerRef = useRef(null);
  const isFirstLoad = useRef(true);
  const isInitialMount = useRef(true);

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [urlParsed, setUrlParsed] = useState(false);

  // --- Catalog Hero Banner (right ~70% of the plain catalog hero — product/
  //     service/solution only, managed from Master Data › Catalog Hero Banner).
  //     Not used on the brand/category/segment/cta_model hero variants. ---
  const [catalogBannerItems, setCatalogBannerItems] = useState([]);
  const [loadingCatalogBanner, setLoadingCatalogBanner] = useState(true);
  const [catalogBannerSlide, setCatalogBannerSlide] = useState(0);

  // Parse URL path to get filters
  useEffect(() => {
    const { actionType: newActionType, pageType: newPageType, pageValue: newPageValue } = parsePagePath(pathname);

    // Set all parsed state at once
    setActionTypeFilter(newActionType);
    setPageType(newPageType);
    setPageValue(newPageValue);

    // Reset all filters to only include the URL-derived filter
    setSelectedFilters({
      brand: newPageType === 'brand' ? newPageValue : "",
      category: newPageType === 'category' ? newPageValue : "",
      subcategory: "",
      target_segments: newPageType === 'target_segments' ? newPageValue : "",
      industry: newPageType === 'industry' ? newPageValue : "",
      cta_model: newPageType === 'cta_model' ? newPageValue : "",
      target_audience: newPageType === 'target_audience' ? newPageValue : "",
      cloud_provider_support: newPageType === 'cloud_provider_support' ? newPageValue : "",
      regions_supported: newPageType === 'regions_supported' ? newPageValue : "",
      action_type: ""
    });

    // Reset products and pagination on navigation
    setProducts([]);
    setFilteredProducts([]);
    // Seed the search term from the URL (?search=...) so links like
    // /marketplace?search=foo (e.g. the home page search bar) land pre-searched.
    const urlSearch = (searchParams.get('search') || "").trim();
    setSearchTerm(urlSearch);
    setDebouncedSearchTerm(urlSearch);
    setPagination({
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      limit: 20,
      hasNext: false,
      hasPrev: false
    });
    isFirstLoad.current = true;
    setUrlParsed(true);
  }, [pathname, searchParams]);

  // Fetch the Catalog Hero Banner for the current catalog (product/service/
  // solution). Only relevant on the plain catalog page (no brand/category/
  // segment/cta_model drill-down), but harmless to fetch regardless — the hero
  // simply doesn't render it outside that view.
  useEffect(() => {
    if (!actionTypeFilter) {
      setCatalogBannerItems([]);
      setLoadingCatalogBanner(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingCatalogBanner(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}catalog-hero-banner/marketplace/${actionTypeFilter}`);
        const data = await response.json();

        let items = [];
        if (data.status === 'success' && Array.isArray(data.data)) {
          items = data.data;
        } else if (Array.isArray(data)) {
          items = data;
        }

        if (!cancelled) setCatalogBannerItems(items);
      } catch (error) {
        console.error('Error fetching Catalog Hero Banner:', error);
        if (!cancelled) setCatalogBannerItems([]);
      } finally {
        if (!cancelled) setLoadingCatalogBanner(false);
      }
    })();

    return () => { cancelled = true; };
  }, [actionTypeFilter]);

  useEffect(() => {
    if (catalogBannerItems.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setCatalogBannerSlide((current) => (current + 1) % catalogBannerItems.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [catalogBannerItems.length]);

  useEffect(() => {
    if (catalogBannerItems.length > 0 && catalogBannerSlide >= catalogBannerItems.length) setCatalogBannerSlide(0);
  }, [catalogBannerItems.length, catalogBannerSlide]);

  // ========== RESPONSIVE BACKGROUND FOR CATALOG HERO BANNER ==========
  const getCatalogBannerBg = (item) => {
    if (!item) return '/brand-log/neozaardefault.jpg';
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return item.mobile_banner || item.banner || '/brand-log/neozaardefault.jpg';
    }
    return item.banner || item.mobile_banner || '/brand-log/neozaardefault.jpg';
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedFilters.brand && selectedFilters.brand.trim() !== "" && pageType !== 'brand') count++;
    if (selectedFilters.category && selectedFilters.category.trim() !== "" && pageType !== 'category') count++;
    if (selectedFilters.subcategory && selectedFilters.subcategory.trim() !== "") count++;
    if (selectedFilters.target_segments && selectedFilters.target_segments.trim() !== "" && pageType !== 'target_segments') count++;
    if (selectedFilters.cta_model && selectedFilters.cta_model.trim() !== "" && pageType !== 'cta_model') count++;
    if (selectedFilters.industry && selectedFilters.industry.trim() !== "" && pageType !== 'industry') count++;
    if (selectedFilters.target_audience && selectedFilters.target_audience.trim() !== "" && pageType !== 'target_audience') count++;
    if (selectedFilters.cloud_provider_support && selectedFilters.cloud_provider_support.trim() !== "" && pageType !== 'cloud_provider_support') count++;
    if (selectedFilters.regions_supported && selectedFilters.regions_supported.trim() !== "" && pageType !== 'regions_supported') count++;
    if (selectedFilters.action_type && selectedFilters.action_type.trim() !== "") count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const toggleAccordion = (key) => {
    setOpenAccordions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleFilterChange = (filterType, value) => {
    // Don't allow changing the current page's filter type
    if ((filterType === 'category' && pageType === 'category') ||
      (filterType === 'target_segments' && pageType === 'target_segments') ||
      (filterType === 'industry' && pageType === 'industry') ||
      (filterType === 'brand' && pageType === 'brand') ||
      (filterType === 'cta_model' && pageType === 'cta_model') ||
      (filterType === 'target_audience' && pageType === 'target_audience') ||
      (filterType === 'cloud_provider_support' && pageType === 'cloud_provider_support') ||
      (filterType === 'regions_supported' && pageType === 'regions_supported')) {
      return;
    }

    // Reset everything when filters change
    setProducts([]);
    setFilteredProducts([]);
    setPagination({
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      limit: 20,
      hasNext: false,
      hasPrev: false
    });
    isFirstLoad.current = true;

    setSelectedFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      if (filterType === 'category') {
        newFilters.subcategory = "";
        // Auto-open subcategory accordion when a category is selected
        if (value) {
          setOpenAccordions(prev => ({ ...prev, subcategory: true }));
        }
      }
      return newFilters;
    });
  };

  const handleClearFilters = () => {
    const newFilters = {
      brand: pageType === 'brand' ? pageValue : "",
      category: pageType === 'category' ? pageValue : "",
      subcategory: "",
      target_segments: pageType === 'target_segments' ? pageValue : "",
      industry: pageType === 'industry' ? pageValue : "",
      cta_model: pageType === 'cta_model' ? pageValue : "",
      target_audience: pageType === 'target_audience' ? pageValue : "",
      cloud_provider_support: pageType === 'cloud_provider_support' ? pageValue : "",
      regions_supported: pageType === 'regions_supported' ? pageValue : "",
      action_type: ""
    };

    setSelectedFilters(newFilters);
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSortBy("newest");
    setProducts([]);
    setFilteredProducts([]);
    setPagination({
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      limit: 20,
      hasNext: false,
      hasPrev: false
    });
    isFirstLoad.current = true;
  };

  const handleSortChange = (e) => {
    const value = e.target.value;
    setSortBy(value);

    let sorted = [...filteredProducts];

    switch (value) {
      case 'a-z':
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'z-a':
        sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
        break;
      default:
        break;
    }

    setFilteredProducts(sorted);
  };

  // Function to load next page
  const loadNextPage = useCallback(() => {
    if (pagination.hasNext && !isLoadingMore && !loading) {
      console.log("Loading next page:", pagination.currentPage + 1);
      setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
    }
  }, [pagination.hasNext, isLoadingMore, loading, pagination.currentPage]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return;

    // Disconnect existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        console.log("Intersection observed:", firstEntry.isIntersecting, "hasNext:", pagination.hasNext);

        if (firstEntry.isIntersecting && pagination.hasNext && !isLoadingMore && !loading) {
          console.log("Triggering load more...");
          loadNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    // Observe the loader element
    observerRef.current.observe(loaderRef.current);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [pagination.hasNext, isLoadingMore, loading, loadNextPage]);

  // Fetch products
  useEffect(() => {
    if (!urlParsed) return;

    const fetchProducts = async () => {
      try {
        if (pagination.currentPage === 1 && isInitialMount.current) {
          setLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        let apiUrl = `${process.env.NEXT_PUBLIC_API_BASE}catalog/marketplace/published`;
        const params = new URLSearchParams();

        console.log("=== FETCHING PRODUCTS ===");
        console.log("Current Page:", pagination.currentPage);
        console.log("Has Next:", pagination.hasNext);
        console.log("Action Type Filter:", actionTypeFilter);

        // Add pagination parameters
        params.append('page', pagination.currentPage);
        params.append('limit', pagination.limit);

        // Add action type filter - derive from pathname as fallback
        const currentActionType = actionTypeFilter || (() => {
          const parts = pathname.split('/').filter(p => p !== '');
          if (parts[0] === 'marketplace' && ['product','service','solution'].includes(parts[1]?.toLowerCase())) {
            return parts[1].toLowerCase();
          }
          return null;
        })();
        
        if (currentActionType) {
          params.append('action_type', currentActionType);
        }

        // CRITICAL: Add page-specific filters from URL
        if (pageType === 'brand' && pageValue) {
          params.append('brand', pageValue);
        }
        else if (pageType === 'cta_model' && pageValue === 'Request Private Offer') {
          // Private offers apply to every product/service/solution, so no filter — full catalog.
        }
        else if (pageType === 'cta_model' && pageValue) {
          pageValue.split(',').forEach(v => params.append('cta_model', v.trim()));
        }
        else if (pageType === 'category' && pageValue) {
          params.append('category', pageValue);
        }
        else if (pageType === 'subcategory' && pageValue) {
          params.append('subcategory', pageValue);
        }
        else if (pageType === 'target_segments' && pageValue) {
          params.append('target_segments', pageValue);
        }
        else if (pageType === 'industry' && pageValue) {
          params.append('industry', pageValue);
        }
        else if (pageType === 'target_audience' && pageValue) {
          params.append('target_audience', pageValue);
        }
        else if (pageType === 'cloud_provider_support' && pageValue) {
          params.append('cloud_provider', pageValue);
        }
        else if (pageType === 'regions_supported' && pageValue) {
          params.append('region', pageValue);
        }

        // Add other selected filters
        if (selectedFilters.brand && selectedFilters.brand.trim() !== "" && pageType !== 'brand') {
          params.append('brand', selectedFilters.brand);
        }

        if (selectedFilters.category && selectedFilters.category.trim() !== "" && pageType !== 'category') {
          params.append('category', selectedFilters.category);
        }

        if (selectedFilters.subcategory && selectedFilters.subcategory.trim() !== "" && pageType !== 'subcategory') {
          params.append('subcategory', selectedFilters.subcategory);
        }

        if (selectedFilters.target_segments && selectedFilters.target_segments.trim() !== "" && pageType !== 'target_segments') {
          params.append('target_segments', selectedFilters.target_segments);
        }

        if (selectedFilters.industry && selectedFilters.industry.trim() !== "" && pageType !== 'industry') {
          params.append('industry', selectedFilters.industry);
        }

        if (selectedFilters.cta_model && selectedFilters.cta_model.trim() !== "" && pageType !== 'cta_model') {
          params.append('cta_model', selectedFilters.cta_model);
        }

        if (selectedFilters.target_audience && selectedFilters.target_audience.trim() !== "" && pageType !== 'target_audience') {
          params.append('target_audience', selectedFilters.target_audience);
        }

        if (selectedFilters.cloud_provider_support && selectedFilters.cloud_provider_support.trim() !== "" && pageType !== 'cloud_provider_support') {
          params.append('cloud_provider_support', selectedFilters.cloud_provider_support);
        }

        if (selectedFilters.regions_supported && selectedFilters.regions_supported.trim() !== "" && pageType !== 'regions_supported') {
          params.append('region', selectedFilters.regions_supported);
        }

        if (selectedFilters.action_type && selectedFilters.action_type.trim() !== "" && !actionTypeFilter) {
          params.append('action_type', selectedFilters.action_type);
        }

        if (debouncedSearchTerm.trim()) {
          params.append('search', debouncedSearchTerm);
        }

        const queryString = params.toString();
        if (queryString) {
          apiUrl += `?${queryString}`;
        }

        console.log('🚀 FINAL API URL:', apiUrl);

        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const result = await response.json();

        // Fetch bundles in parallel only on solution pages, page 1
        let fetchedBundles = [];
        if (currentActionType === 'solution' && pagination.currentPage === 1) {
          try {
            const bundleSearch = debouncedSearchTerm.trim() ? `&search=${encodeURIComponent(debouncedSearchTerm)}` : '';
            const bundleRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}catalog/marketplace/bundles?page=1&limit=50${bundleSearch}`);
            if (bundleRes.ok) {
              const bundleData = await bundleRes.json();
              fetchedBundles = (bundleData?.data || []).map(b => ({
                ...b,
                name: b.title || b.name,
                short_description: b.description || b.short_description,
                product_logo: b.image_url || b.bundle_logo,
                action_type: 'bundle',
                is_bundle: true
              }));
            }
          } catch (e) { /* ignore bundle fetch errors */ }
        }

        if (result.success) {
          const fetchedProducts = [...(result.data || []), ...fetchedBundles];
          console.log(`📦 Fetched ${fetchedProducts.length} products for page ${pagination.currentPage}`);

          // Update pagination info from API response
          if (result.pagination) {
            const newPaginationState = {
              currentPage: pagination.currentPage,
              totalPages: result.pagination.total_pages || 1,
              totalItems: result.pagination.total || 0,
              limit: pagination.limit,
              hasNext: result.pagination.has_next || false,
              hasPrev: result.pagination.has_prev || false
            };
            setPagination(newPaginationState);
            console.log("Updated pagination:", newPaginationState);
          }

          // Handle products: replace or append based on page
          // Use a Map to ensure unique products by ID
          let updatedProducts;
          if (pagination.currentPage === 1) {
            updatedProducts = fetchedProducts;
          } else {
            // Create a Map to deduplicate products by ID
            const productMap = new Map();
            // Add existing products
            products.forEach(product => {
              if (product.id) {
                productMap.set(product.id, product);
              }
            });
            // Add new products (will overwrite duplicates with same ID)
            fetchedProducts.forEach(product => {
              if (product.id) {
                productMap.set(product.id, product);
              }
            });
            // Convert back to array
            updatedProducts = Array.from(productMap.values());
          }

          setProducts(updatedProducts);

          // Apply sorting
          let sorted = [...updatedProducts];
          switch (sortBy) {
            case 'a-z': sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
            case 'z-a': sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '')); break;
            case 'newest': sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)); break;
            case 'oldest': sorted.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)); break;
            default: break;
          }
          setFilteredProducts(sorted);

          // Only update filters on first page load
          if (pagination.currentPage === 1 && result.filters) {
            setFilters({
              brands: result.filters.brands || [],
              categories: result.filters.categories || [],
              subcategories: result.filters.subcategories || [],
              target_segments: result.filters.target_segments || [],
              industry: result.filters.industry || [],
              cta_model: result.filters.cta_model || [],
              target_audience: result.filters.target_audience || [],
              cloud_provider_support: result.filters.cloud_provider_support || [],
              regions_supported: result.filters.regions_supported || [],
              action_type: result.filters.action_type || []
            });
          }

          isFirstLoad.current = false;
          isInitialMount.current = false;
        } else {
          throw new Error(result.message || 'Failed to fetch data');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    };

    fetchProducts();
  }, [urlParsed, actionTypeFilter, debouncedSearchTerm, sortBy, selectedFilters, pageType, pageValue, pagination.currentPage]);

  const handleProductClick = (product) => {
    if (product.is_bundle) {
      router.push(`/solution/bundle/${product.id}`);
      return;
    }
    const productType = product.action_type?.toLowerCase() || 'product';
    switch (productType) {
      case 'service': router.push(`/service/${product.id}`); break;
      case 'solution': router.push(`/solution/${product.id}`); break;
      default: router.push(`/product/${product.id}`); break;
    }
  };

  const AccordionFilterSection = ({ title, icon, items, filterKey, selectedValue, isOpen }) => {
    if (!items || items.length === 0) return null;

    const hasSelectedValue = selectedValue && selectedValue.trim() !== "";
    const isDisabled = (filterKey === 'category' && pageType === 'category') ||
      (filterKey === 'target_segments' && pageType === 'target_segments') ||
      (filterKey === 'industry' && pageType === 'industry') ||
      (filterKey === 'brand' && pageType === 'brand') ||
      (filterKey === 'cta_model' && pageType === 'cta_model') ||
      (filterKey === 'target_audience' && pageType === 'target_audience') ||
      (filterKey === 'cloud_provider_support' && pageType === 'cloud_provider_support') ||
      (filterKey === 'regions_supported' && pageType === 'regions_supported');

    // When a category is selected, only show that selected item in the list
    // (user can click it again to deselect). Show full list when nothing selected.
    const displayItems = (filterKey === 'category' && hasSelectedValue)
      ? items.filter(item => item.name === selectedValue)
      : items;

    return (
      <div className={`border-b border-gray-800 transition-all duration-300 ${hasSelectedValue ? 'bg-orange-400/5' : ''}`}>
        <button
          onClick={() => toggleAccordion(filterKey)}
          className={`w-full flex items-center justify-between py-4 px-2 transition-all duration-200 rounded-lg ${isDisabled
              ? 'text-gray-500 cursor-pointer hover:bg-gray-800/30'
              : hasSelectedValue
                ? 'text-orange-400 hover:bg-orange-400/10'
                : 'text-gray-300 hover:bg-gray-800/50'
            }`}
        >
          <div className="flex items-center gap-2">
            <div className={`transition-colors duration-200 ${hasSelectedValue ? 'text-orange-400' : 'text-gray-500'}`}>
              {icon}
            </div>
            <h4 className={`text-sm font-semibold transition-colors duration-200 ${hasSelectedValue ? 'text-orange-400' : 'text-gray-300'
              }`}>
              {title}
              {isDisabled && ` (Current ${pageType?.replace('_', ' ')})`}
            </h4>
            <span className={`text-xs px-1.5 py-0.5 rounded-full transition-colors duration-200 ${hasSelectedValue
                ? 'bg-orange-400/20 text-orange-400'
                : 'bg-gray-800 text-gray-500'
              }`}>
              {items.length}
            </span>
            {hasSelectedValue && (
              <span className="text-xs text-orange-400 animate-pulse">●</span>
            )}
          </div>
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${hasSelectedValue ? 'text-orange-400' : 'text-gray-500'
              } ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          className={`overflow-y-auto custom-scrollbar transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0'
            }`}
        >
          <div className="space-y-2 px-2 pb-4">
            {displayItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (!isDisabled) {
                    // Clicking the selected category again deselects it
                    handleFilterChange(filterKey, selectedValue === item.name ? '' : item.name);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-200 ${selectedValue === item.name
                    ? "bg-orange-400 text-white font-medium shadow-lg shadow-orange-400/20"
                    : isDisabled
                      ? "text-gray-500 cursor-not-allowed hover:bg-gray-800/30"
                      : "text-gray-300 hover:bg-gray-800 hover:translate-x-1"
                  }`}
                disabled={isDisabled}
              >
                <span className="truncate">{item.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full transition-all duration-200 ${selectedValue === item.name
                    ? "bg-orange-500 text-white"
                    : "bg-gray-700 text-gray-400"
                  }`}>
                  {item.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Header/Footer are rendered once here, OUTSIDE the loading/error/main
  // conditional trees. Previously each branch had its own <Header/>, so when
  // `loading` toggled React swapped between differently-shaped trees and
  // remounted the header — wiping whatever was typed in the header search.
  // `innerContent` chooses only the middle section per state.
  let innerContent;
  if (loading && pagination.currentPage === 1) {
    innerContent = (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-orange-900 border-t-orange-400"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-4 text-gray-400 font-medium">Loading {actionTypeFilter ? `${actionTypeFilter}s` : 'products'}...</p>
        </div>
      </div>
    );
  } else if (error) {
    innerContent = (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Oops! Something went wrong</h3>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-orange-400 text-white rounded-xl hover:bg-orange-700 transition-all shadow-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  } else {
    const hasCatalogBanner = !loadingCatalogBanner && catalogBannerItems.length > 0;
    innerContent = (
      <>
      <div className="min-h-screen bg-black">
        {/* Breadcrumbs */}
        <nav className="bg-black/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-xs font-medium flex-wrap">
              <Link href="/" className="text-gray-500 hover:text-orange-400 transition-colors flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </Link>
              {actionTypeFilter && (
                <>
                  <span className="text-gray-600">/</span>
                  <span className="text-gray-400 capitalize">{actionTypeFilter}</span>
                </>
              )}
              {pageType && (
                <>
                  <span className="text-gray-600">/</span>
                  <span className="text-gray-400 capitalize">{pageType.replace('_', ' ')}</span>
                </>
              )}
              {pageValue && (
                <>
                  <span className="text-gray-600">/</span>
                  <span className="text-orange-400">{pageValue}</span>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        {!pageType ? (
          /* Plain catalog page (/marketplace/product|service|solution). The
             heading+description card is ALWAYS this same box (same padding,
             same font sizes) whether or not a banner is featured — that's what
             guarantees the hero is the same height either way, rather than
             matching two independently-styled blocks by coincidence. The
             banner column is simply added alongside it (30/70) when there's
             something featured to show; otherwise the box just goes full width. */
          <div className="relative bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-transparent"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-400/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-400/5 rounded-full blur-3xl"></div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
                {/* LEFT — always rendered, 30% next to a banner or full width alone.
                    Eyebrow badge + gradient-accented "CATALOG" + underline give it
                    the same visual language as the rest of the site's section
                    headers (border-l accent, orange gradient word) instead of
                    reading as plain, empty text. */}
                <div
                  className={`relative flex w-full flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-6 text-center ring-1 ring-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.45)] lg:p-8 lg:min-h-[288px] ${
                    hasCatalogBanner ? 'lg:w-[30%] lg:items-start lg:text-left' : 'lg:items-center lg:text-center'
                  }`}
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-orange-500/10 blur-3xl" />

                  <h1 className="relative mb-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
                    {`${actionTypeFilter || ''}`.toUpperCase()}{' '}
                    <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">CATALOG</span>
                  </h1>
                  <div className="relative mb-4 h-0.5 w-12 bg-orange-500" />
                  <p className="relative text-base text-gray-400 lg:text-lg">
                    {`Discover ${actionTypeFilter || ''}, a reliable solution delivering quality, efficiency, and value`}
                  </p>
                </div>

                {/* RIGHT — 70%, admin-managed rotating banner. Only rendered
                    once catalogBannerItems is confirmed non-empty, so there's
                    no loading/empty state to handle here. No fixed aspect ratio
                    at lg — the parent row is `items-stretch`, so this panel's
                    height just matches the LEFT box's height. Mobile keeps a
                    fixed 2:1 strip since the columns stack instead of stretching. */}
                {hasCatalogBanner && (
                  <div className="relative aspect-[2/1] w-full shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.45)] lg:aspect-auto lg:w-[70%]">
                    <div className="group relative h-full w-full bg-black">
                      {catalogBannerItems.map((item, index) => {
                        const active = index === catalogBannerSlide;
                        return (
                          <a
                            key={item.id ?? index}
                            href={item.link || '#'}
                            target={item.link ? '_blank' : undefined}
                            rel="noopener noreferrer"
                            aria-label={item.title || 'Catalog banner'}
                            aria-hidden={!active}
                            tabIndex={active ? 0 : -1}
                            className={`absolute inset-0 block transition-opacity duration-[900ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                          >
                            <img
                              src={getCatalogBannerBg(item)}
                              alt={item.title || 'Catalog banner'}
                              className="h-full w-full object-cover object-center"
                              onError={(event) => { event.currentTarget.src = '/brand-log/neozaardefault.jpg'; }}
                            />
                          </a>
                        );
                      })}

                      {catalogBannerItems.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setCatalogBannerSlide((current) => (current - 1 + catalogBannerItems.length) % catalogBannerItems.length)}
                            aria-label="Previous slide"
                            className="absolute left-3 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition duration-200 hover:bg-black/70 hover:ring-white/40 active:scale-95 lg:grid lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 18l-6-6 6-6" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCatalogBannerSlide((current) => (current + 1) % catalogBannerItems.length)}
                            aria-label="Next slide"
                            className="absolute right-3 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition duration-200 hover:bg-black/70 hover:ring-white/40 active:scale-95 lg:grid lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </button>
                          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/65 px-3 py-2 backdrop-blur-md">
                            {catalogBannerItems.map((item, index) => (
                              <button
                                key={item.id ?? index}
                                type="button"
                                onClick={() => setCatalogBannerSlide(index)}
                                aria-label={`Show slide ${index + 1}`}
                                className={`h-1.5 rounded-full transition-all duration-500 ease-out ${index === catalogBannerSlide ? 'w-5 bg-orange-500' : 'w-1.5 bg-white/60 hover:bg-white'}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Brand / category / segment / cta_model drill-downs keep the original
             centered hero — no Catalog Hero Banner here. */
          <div className="relative bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-transparent"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-400/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-400/5 rounded-full blur-3xl"></div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
              <div className="text-center max-w-3xl mx-auto">
                <h1 className="text-4xl lg:text-5xl font-bold mb-4 tracking-tight text-white">
                  {pageType === 'brand' ? pageValue :
                    pageType === 'cta_model' ? (pageValue.includes(',') ? 'Demo / Free Trial' : pageValue) :
                      pageType === 'category' ? pageValue.toUpperCase() :
                        pageType === 'segment' ? `${pageValue} Segment` :
                          `${actionTypeFilter || ''}`.toUpperCase() + ' CATALOG'}
                </h1>
                <p className="text-gray-400 text-lg mb-8">
                  {pageType === 'brand'
                    ? `Explore offerings from ${pageValue} — products, services, and solutions for your business`
                    : pageType === 'cta_model' && pageValue === 'Request Private Offer'
                      ? `Browse our full catalog and request a tailored private offer on any product, service or solution`
                      : pageType === 'cta_model'
                        ? `Discover ${pageValue.includes(',') ? 'Demo & Free Trial' : pageValue} solutions designed to meet your specific business needs`
                        : pageType === 'category'
                          ? `Browse ${actionTypeFilter || ''}  in ${pageValue} category`
                          : `Discover ${actionTypeFilter || ''}, a reliable solution delivering quality, efficiency, and value`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

          {/* Mobile Sort and Filter Row - Same row opposite sides */}
          <div className="lg:hidden mb-6">
            <div className="flex items-center justify-between gap-3">
              {/* Filter Button */}
              <div className="w-24">

                <button
                  onClick={() => setIsFilterModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl shadow-lg hover:bg-gray-800 transition-all duration-200"
                >
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span className="font-medium text-white">Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-orange-400 text-white rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="w-44">

                <div className="flex-1">
                  <select
                    value={sortBy}
                    onChange={handleSortChange}
                    className="w-full bg-gray-900 text-white text-sm rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all cursor-pointer hover:border-orange-400/50 appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f97316'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '20px'
                    }}
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="a-z">A to Z</option>
                    <option value="z-a">Z to A</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">

            {/* Filters Sidebar - Desktop */}
            <div className="hidden lg:block lg:w-80 flex-shrink-0">
              <div className="sticky top-24">
                <div className="bg-gray-900 rounded-2xl shadow-xl border border-gray-800 overflow-hidden">
                  <div className="p-5 bg-gradient-to-r from-gray-900 to-gray-900 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-orange-400/10 rounded-lg">
                          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          </svg>
                        </div>
                        <h3 className="font-bold text-white capitalize">Filters {actionTypeFilter || ''}</h3>
                      </div>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={handleClearFilters}
                          className="text-xs text-orange-400 hover:text-orange-500 font-medium flex items-center gap-1 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Clear all
                        </button>
                      )}
                    </div>
                    {activeFiltersCount > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {Object.entries(selectedFilters).map(([key, value]) => {
                          if ((key === 'brand' && pageType === 'brand') ||
                            (key === 'category' && pageType === 'category') ||
                            (key === 'segment' && pageType === 'segment') ||
                            (key === 'cta_model' && pageType === 'cta_model') ||
                            (key === 'target_audience' && pageType === 'target_audience') ||
                            (key === 'cloud_provider_support' && pageType === 'cloud_provider_support') ||
                            (key === 'regions_supported' && pageType === 'regions_supported')) {
                            return null;
                          }
                          return value && value.trim() !== "" && (
                            <span key={key} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-400/10 text-orange-400 rounded-lg border border-orange-400/20">
                              {value}
                              <button onClick={() => handleFilterChange(key, '')} className="hover:text-orange-500 transition-colors">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                    <AccordionFilterSection
                      title="Category"
                      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>}
                      items={filters.categories}
                      filterKey="category"
                      selectedValue={selectedFilters.category}
                      isOpen={openAccordions.category}
                    />

                    <AccordionFilterSection
                      title="Sub-category"
                      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l5 5a2 2 0 01.586 1.414V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                      </svg>}
                      items={filters.subcategories}
                      filterKey="subcategory"
                      selectedValue={selectedFilters.subcategory}
                      isOpen={openAccordions.subcategory}
                    />

                    <AccordionFilterSection
                      title="Vendor"
                      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>}
                      items={filters.brands}
                      filterKey="brand"
                      selectedValue={selectedFilters.brand}
                      isOpen={openAccordions.brand}
                    />

                    <AccordionFilterSection
                      title="Audience"
                      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>}
                      items={filters.target_audience}
                      filterKey="target_audience"
                      selectedValue={selectedFilters.target_audience}
                      isOpen={openAccordions.target_audience}
                    />
                    <AccordionFilterSection
                      title="Segment"
                      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>}
                      items={filters.target_segments}
                      filterKey="target_segments"
                      selectedValue={selectedFilters.target_segments}
                      isOpen={openAccordions.target_segments}
                    />

                    <AccordionFilterSection
                      title="Industry"
                      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>}
                      items={filters.industry}
                      filterKey="industry"
                      selectedValue={selectedFilters.industry}
                      isOpen={openAccordions.industry}
                    />

                    <AccordionFilterSection
                      title="Cloud Provider"
                      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>}
                      items={filters.cloud_provider_support}
                      filterKey="cloud_provider_support"
                      selectedValue={selectedFilters.cloud_provider_support}
                      isOpen={openAccordions.cloud_provider_support}
                    />

                    <AccordionFilterSection
                      title="Region"
                      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>}
                      items={filters.regions_supported}
                      filterKey="regions_supported"
                      selectedValue={selectedFilters.regions_supported}
                      isOpen={openAccordions.regions_supported}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1">
              {/* Results Header with Sort Options - Desktop */}
              <div className="hidden lg:flex mb-6 flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="text-gray-400 text-sm flex flex-wrap items-center gap-2">
                  <span>Showing</span>
                  <span className="font-semibold text-white">{filteredProducts.length}</span>
                  <span>
                    <span className="capitalize">{actionTypeFilter || ''}</span>&nbsp;Result
                  </span>
                  {pagination.totalItems > 0 && (
                    <span className="text-gray-500">
                      (of {pagination.totalItems} total)
                    </span>
                  )}
                  {pageType === 'brand' && pageValue && (
                    <span className="flex items-center gap-1">
                      <span>from</span>
                      <span className="text-orange-400 font-medium">{pageValue}</span>
                    </span>
                  )}
                  {pageType === 'cta_model' && pageValue && (
                    <span className="flex items-center gap-1">
                      <span>with</span>
                      <span className="text-orange-400 font-medium">{pageValue}</span>
                    </span>
                  )}
                  {selectedFilters.category && pageType !== 'category' && (
                    <span className="flex items-center gap-1">
                      <span>in</span>
                      <span className="text-orange-400 font-medium">{selectedFilters.category}</span>
                    </span>
                  )}
                  {debouncedSearchTerm && (
                    <span className="flex items-center gap-1">
                      <span>matching</span>
                      <span className="text-orange-400 font-medium">{debouncedSearchTerm}</span>
                    </span>
                  )}
                </div>

                {/* Sort Dropdown - Desktop */}
                <div className="flex justify-end items-center gap-2 w-full sm:w-auto">
                  <select
                    value={sortBy}
                    onChange={handleSortChange}
                    className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all cursor-pointer hover:border-orange-400/50"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="a-z">A to Z</option>
                    <option value="z-a">Z to A</option>
                  </select>
                </div>
              </div>

              {/* Results Info - Mobile (below filter/sort row) */}
              <div className="lg:hidden mb-4">
                <div className="text-gray-400 text-xs flex flex-wrap  gap-2 ">
                  <span>Showing</span>
                  <span className="font-semibold text-white">{filteredProducts.length}</span>
                  <span>
                    <span className="capitalize">{actionTypeFilter || ''}</span>s
                  </span>
                  {pagination.totalItems > 0 && (
                    <span className="text-gray-500">
                      of {pagination.totalItems}
                    </span>
                  )}
                </div>
              </div>

              {/* Products Display */}
              {filteredProducts.length === 0 && !isLoadingMore ? (
                <div className="text-center py-16 bg-gray-900 rounded-2xl shadow-xl border border-gray-800">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-300 text-lg font-medium mb-2">No products found</p>
                  <p className="text-gray-500 text-sm mb-6">
                    {debouncedSearchTerm || activeFiltersCount > 0
                      ? "Try adjusting your filters or search term"
                      : `No products available ${pageType === 'brand' ? `from ${pageValue}` : pageType === 'cta_model' ? `with ${pageValue}` : 'in this category yet'}`}
                  </p>
                  {(debouncedSearchTerm || activeFiltersCount > 0) && (
                    <button
                      onClick={handleClearFilters}
                      className="px-5 py-2.5 bg-orange-400 text-white rounded-xl hover:bg-orange-700 transition-colors shadow-md"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredProducts.map((product, idx) => {
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
                          <p className="text-gray-400 text-sm line-clamp-2 mt-2 leading-relaxed">
                            {plainText.length > 120 ? plainText.substring(0, 120) + '...' : plainText}
                          </p>
                        );
                      };

                      // Use a combination of id and index to ensure unique key
                      const uniqueKey = product.id ? `${product.id}` : `product-${idx}-${Date.now()}`;

                      return (
                        <div
                          key={uniqueKey}
                          className="group bg-gray-900 rounded-2xl shadow-xl border border-gray-800 hover:border-orange-400/50 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-2xl"
                          onClick={() => handleProductClick(product)}
                        >
                          <div className="p-6">
                            <div className="flex items-start gap-4">
                              <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 group-hover:border-orange-400/50 transition-all">
                                <Image
                                  fill
                                  alt={product.name}
                                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                                  src={product.product_logo || "/brand-log/neozaardefault.jpg"}
                                  onError={(e) => {
                                    e.target.src = "/brand-log/neozaardefault.jpg";
                                  }}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                {product.action_type !== 'service' && product.action_type !== 'solution' && product.brand_name && (
                                  <div className="mb-1.5 text-[11px] font-semibold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                                    {product.brand_name}
                                  </div>
                                )}

                                {(product.action_type === 'service' || product.action_type === 'solution') && product.category_subcategory?.[0] && (
                                  <div className="mb-1.5 text-[11px] font-semibold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                                    {product.category_subcategory[0]}
                                  </div>
                                )}

                                <h3 className="font-bold text-white text-base transition-colors line-clamp-1 group-hover:text-orange-400">
                                  {product.name}
                                </h3>

                                {/* {product.brand_name && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    by {product.brand_name}
                                  </p>
                                )} */}

                                {renderDescription()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Infinite Scroll Loader */}
                  <div ref={loaderRef} className="flex justify-center py-8">
                    {isLoadingMore && (
                      <div className="flex items-center gap-3 text-gray-400">
                        <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm">Loading more products...</span>
                      </div>
                    )}
                    {!pagination.hasNext && filteredProducts.length > 0 && filteredProducts.length === pagination.totalItems && (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">✨ You{`'`}ve reached the end! ✨</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsFilterModalOpen(false)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-400/10 rounded-lg">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="font-bold text-white text-lg">Filters</h3>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-orange-400 text-white rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="text-sm text-orange-400 hover:text-orange-500 font-medium"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-5 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 70px)' }}>
              <AccordionFilterSection
                title="Category"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>}
                items={filters.categories}
                filterKey="category"
                selectedValue={selectedFilters.category}
                isOpen={openAccordions.category}
              />

              <AccordionFilterSection
                title="Subcategory"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l5 5a2 2 0 01.586 1.414V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                </svg>}
                items={filters.subcategories}
                filterKey="subcategory"
                selectedValue={selectedFilters.subcategory}
                isOpen={openAccordions.subcategory}
              />

              <AccordionFilterSection
                title="Vendor"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>}
                items={filters.brands}
                filterKey="brand"
                selectedValue={selectedFilters.brand}
                isOpen={openAccordions.brand}
              />

              <AccordionFilterSection
                title="Segment"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>}
                items={filters.target_segments}
                filterKey="segment"
                selectedValue={selectedFilters.target_segments}
                isOpen={openAccordions.target_segments}
              />

              <AccordionFilterSection
                title="Industry"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>}
                items={filters.industry}
                filterKey="industry"
                selectedValue={selectedFilters.industry}
                isOpen={openAccordions.industry}
              />
              <AccordionFilterSection
                title="Audience"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>}
                items={filters.target_audience}
                filterKey="target_audience"
                selectedValue={selectedFilters.target_audience}
                isOpen={openAccordions.target_audience}
              />

              <AccordionFilterSection
                title="Cloud Provider"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>}
                items={filters.cloud_provider_support}
                filterKey="cloud_provider_support"
                selectedValue={selectedFilters.cloud_provider_support}
                isOpen={openAccordions.cloud_provider_support}
              />

              <AccordionFilterSection
                title="Region"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>}
                items={filters.regions_supported}
                filterKey="regions_supported"
                selectedValue={selectedFilters.regions_supported}
                isOpen={openAccordions.regions_supported}
              />
            </div>
            <div className="p-5 border-t border-gray-800">
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="w-full py-3 bg-orange-400 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors"
              >
                Apply Filters ({activeFiltersCount})
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
      <Footer />

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f97316;
          border-radius: 10px;
          transition: all 0.2s ease;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ea580c;
          cursor: pointer;
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #f97316 #1f2937;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
    );
  }

  return (
    <>
      {/* Header rendered once, above the loading/error/main state swap, so it
          (and the header search input) never remounts. */}
      <div className="bg-black relative z-50">
        <div className="relative z-50 w-full">
          <Header />
        </div>
      </div>
      {innerContent}
    </>
  );
}
