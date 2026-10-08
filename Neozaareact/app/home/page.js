"use client";

import Image from "next/image";
import Header from '../layouts/Header';
import Footer from "../layouts/Footer";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";


export default function Page() {
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [trendingServices, setTrendingServices] = useState([]);
  const [topVendors, setTopVendors] = useState([]);
  const [segments, setSegments] = useState([]);
  const [featuredSolutions, setFeaturedSolutions] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingSegments, setLoadingSegments] = useState(true);
  const [loadingSolutions, setLoadingSolutions] = useState(true);
  const [showAllSegments, setShowAllSegments] = useState(false);

  // Navigation handlers
  const handleServiceClick = (service) => {
    router.push(`/services/${service.id}`);
  };

  const handleVendorClick = (vendor) => {
    const slug = encodeURIComponent(vendor.name.toLowerCase().replace(/\s+/g, '-'));
    router.push(`/vendordetails/${slug}`);
  };

  const handleSegmentClick = (segment) => {
    const segmentName = segment.name || segment.target_segment || segment.title || "";
    const slug = encodeURIComponent(segmentName.toLowerCase().replace(/\s+/g, '-'));
    router.push(`/category/${slug}`);
  };

  const handleSolutionClick = (solution) => {
    const slug = encodeURIComponent(solution.name.toLowerCase().replace(/\s+/g, '-'));
    router.push(`/solution/${slug}`);
  };

  // Fetch Trending Services API
useEffect(() => {
  const fetchTrendingServices = async () => {
    try {
      setLoadingServices(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/catalog/top-featured-services`);
      const data = await response.json();
      
      if (data.status === 'success' && data.data.segments) {
        // Transform the API data with unique IDs and slug
        const transformedServices = data.data.segments.map((segment, index) => ({
          // Ensure unique ID - use segment.id if available, otherwise create one
          id: segment.id || `segment-${index}-${Date.now()}-${Math.random()}`,
          // Create slug from target_segment
          slug: segment.target_segment 
            ? segment.target_segment.toLowerCase().replace(/\s+/g, '-')
            : `segment-${index}`,
          title: segment.target_segment || "Untitled Collection",
          creator: `${segment.products?.length || 0} products`,
          mainImage: segment.products?.[0]?.product_logo || "/assets/placeholder.png",
          thumbnails: (segment.products || []).slice(0, 2).map(product => 
            product.product_logo || "/assets/placeholder.png"
          ),
          count: `${segment.products?.length || 0}+`,
          originalData: segment 
        }));
        setTrendingServices(transformedServices);
      }
    } catch (error) {
      console.error('Error fetching trending services:', error);
      // Fallback to sample data if API fails
      setTrendingServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  fetchTrendingServices();
}, []);

  // Fetch Top Vendors API
  useEffect(() => {
    const fetchTopVendors = async () => {
      try {
        setLoadingVendors(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/catalog/get-vendors`);
        const data = await response.json();
        
        if (data.status === 'success' && data.data.vendors) {
          // Transform the API data with unique IDs
          const transformedVendors = data.data.vendors.map((vendor, index) => ({
            id: vendor.id || `vendor-${index}-${Date.now()}-${Math.random()}`,
            name: vendor.name,
            sales: vendor.brand_name || "0 ETH",
            image: vendor.product_logo || "https://via.placeholder.com/100",
            originalData: vendor
          }));
          setTopVendors(transformedVendors);
        }
      } catch (error) {
        console.error('Error fetching top vendors:', error);
        // Fallback to sample data if API fails
        setTopVendors([]);
      } finally {
        setLoadingVendors(false);
      }
    };

    fetchTopVendors();
  }, []);

  // Fetch Browse Segments API
  useEffect(() => {
    const fetchSegments = async () => {
      try {
        setLoadingSegments(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}catalog/get-target-segments`);
        const data = await response.json();
        const segmentsData = data?.data?.segments || data?.data?.target_segments || data?.data?.targetSegments || [];
        
        if (data.status === 'success' && Array.isArray(segmentsData) && segmentsData.length > 0) {
          // Transform the API data with unique IDs and fallback names
          const transformedSegments = segmentsData.map((segment, index) => ({
            id: segment.id || `segment-${index}-${Date.now()}-${Math.random()}`,
            name: segment.name || segment.target_segment || segment.title || `Segment ${index + 1}`,
            // icon: segment.icon,
            logo: segment.logo,
            gradient: segment.gradient || "from-orange-600/40 to-orange-600/10",
            target_segment: segment.target_segment,
            originalData: segment
          }));
          setSegments(transformedSegments);
        } else {
          throw new Error('No segments available');
        }
      } catch (error) {
        console.error('Error fetching segments:', error);
        // Fallback to default segments if API fails
        setSegments([
          { id: 1, name: "BFSI", icon: "brush", logo: "", gradient: "from-primary/40 to-primary/10" },
          { id: 2, name: "ITES", icon: "auto_awesome", logo: "", gradient: "from-purple-500/40 to-purple-500/10" },
          { id: 3, name: "Music", icon: "music_note", logo: "", gradient: "from-blue-500/40 to-blue-500/10" },
          { id: 4, name: "Photography", icon: "photo_camera", logo: "", gradient: "from-emerald-500/40 to-emerald-500/10" }
        ]);
      } finally {
        setLoadingSegments(false);
      }
    };

    fetchSegments();
  }, []);

  // Fetch Featured Solutions API
  useEffect(() => {
    const fetchFeaturedSolutions = async () => {
      try {
        setLoadingSolutions(true);
        const response = await fetch('${process.env.NEXT_PUBLIC_API_BASE}/catalog/get-featured-soutions');
        const data = await response.json();
        
        if (data.status === 'success' && data.data.solutions) {
          // Transform the API data with unique IDs
          const transformedSolutions = data.data.solutions.map((solution, index) => ({
            id: solution.id || `solution-${index}-${Date.now()}-${Math.random()}`,
            title: solution.name,
            artist: solution.brand_name || "Solution Provider",
            price: "Contact for Pricing",
            bid: "Request Demo",
            image: solution.product_logo || solution.image_url || "/assests/cyberprotect.png",
            avatar: solution.product_logo || "https://via.placeholder.com/100",
            categories: solution.category_subcategory || [],
            originalData: solution
          }));
          setFeaturedSolutions(transformedSolutions);
        } else {
          // If no solutions from API, use fallback
          setFeaturedSolutions([]);
        }
      } catch (error) {
        console.error('Error fetching featured solutions:', error);
        // Fallback to sample data if API fails
        setFeaturedSolutions([]);
      } finally {
        setLoadingSolutions(false);
      }
    };

    fetchFeaturedSolutions();
  }, []);

  return (
    <>
      <main className="bg-black min-h-screen w-full mx-auto max-w-[1920px] overflow-hidden">
        {/* Hero Section */}
        <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center pt-20 px-4 sm:px-6 lg:px-8 border-b border-white/5 overflow-hidden bg-[#030303]">
          {/* Background Image */}
          <div className="absolute inset-0 w-full h-full">
            <Image
              src="/image/Icon/Slider_Accelerate.jpeg"
              alt="SaaS Growth Background"
              fill
              className="object-cover opacity-100"
              priority
              sizes="100vw"
              quality={90}
            />
          </div>

          {/* Background Ambient Effects */}
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-orange-600/10 rounded-full blur-[120px] mix-blend-screen"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[100px] mix-blend-screen"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 brightness-100 contrast-150 mix-blend-overlay bg-repeat"></div>
          </div>

          {/* Header */}
          <div className="z-20 absolute top-0 left-0 right-0 w-full">
            <Header />
          </div>

          {/* Hero Content */}
          <div className="relative z-10 text-center max-w-4xl mx-auto mt-20">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Accelerate Your
              <span className="text-orange-500"> Business Growth</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Innovative solutions for modern enterprises
            </p>
          </div>
        </section>

        {/* Trending services Api */}
   <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-screen-xl m-auto">
  <div className="mb-12">
    <h2 className="text-3xl font-bold text-white mb-2">Service Collection</h2>
    <p className="text-slate-400">Checkout our weekly updated trending collection.</p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
    {loadingServices ? (
      // --- LOADING SKELETON ---
      [...Array(3)].map((_, i) => (
        <div key={`skeleton-service-${i}`} className="space-y-4 animate-pulse">
          <div className="aspect-square rounded-2xl bg-white/10"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="aspect-square rounded-2xl bg-white/10"></div>
            <div className="aspect-square rounded-2xl bg-white/10"></div>
            <div className="aspect-square rounded-2xl bg-white/10"></div>
          </div>
          <div className="h-6 bg-white/10 rounded w-3/4"></div>
          <div className="h-4 bg-white/10 rounded w-1/2"></div>
        </div>
      ))
    ) : (
      // --- RENDER SERVICES ---
      trendingServices.map((collection) => (
        <div 
          key={`service-${collection.id}`} 
          className="space-y-4 cursor-pointer group"
          onClick={() => router.push('/service/' + collection.id)}
        >
          {/* Main Image */}
          <div className="aspect-square rounded-2xl relative overflow-hidden">
            <Image
              src={collection.mainImage || "/assets/placeholder.png"}
              alt={collection.title}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
          </div>

          {/* Thumbnails Grid */}
          <div className="grid grid-cols-3 gap-4">
            {collection.thumbnails && collection.thumbnails.map((thumb, idx) => {
              // Access product safely to avoid "undefined" errors
              const product = collection.originalData?.products?.[idx];
              
              return (
                <div 
                  key={`thumb-${collection.id}-${idx}`} 
                  className="aspect-square rounded-2xl relative overflow-hidden hover:ring-2 hover:ring-orange-500 transition-all"
                  onClick={(e) => {
                    e.stopPropagation(); // Stops the parent '/services/' redirect
                    if (product?.slug) {
                      router.push('/service/' + product.slug);
                    } else if (product?.id) {
                      // Fallback if slug isn't available but ID is
                      router.push('/service/' + product.id);
                    } else {
                      console.warn("No valid identifier found for redirect");
                    }
                  }}
                >
                  <Image
                    src={thumb || "/assets/placeholder.png"}
                    alt={`${collection.title} thumb ${idx}`}
                    fill
                    className="object-cover"
                  />
                </div>
              );
            })}

            {/* Count Badge - Redirects to category page using slug */}
            <div 
              key={`count-badge-${collection.id}`}
              onClick={(e) => {
                e.stopPropagation(); // Prevents the parent card click
                if (collection.slug) {
                  router.push(`/category/${collection.slug}`);
                } else {
                  console.warn("No slug available for category redirect");
                }
              }} 
              className="aspect-square rounded-2xl bg-orange-600 flex items-center justify-center font-bold text-xl text-white cursor-pointer hover:bg-orange-700 transition-colors"
            >
              {collection.count}
            </div>
          </div>

          {/* Text Info */}
          <div key={`info-${collection.id}`}>
            <h4 className="text-lg font-bold text-white group-hover:text-orange-500 transition-colors">
              {collection.title}
            </h4>
            <p className="text-sm text-slate-400">{collection.creator}</p>
          </div>
        </div>
      ))
    )}
  </div>
</section>

        {/* Top vendor Api here */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-screen-xl m-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Top Vendor</h2>
              <p className="text-slate-400">Checkout Top Rated Creators on the NFT Marketplace</p>
            </div>
            <button 
              className="border-2 border-orange-600 text-orange-600 hover:bg-orange-600/10 px-8 py-3 rounded-xl flex items-center gap-3 font-bold transition-all"
              onClick={() => router.push('/vendor')}
            >
              View More
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {loadingVendors ? (
              // Loading skeleton
              [...Array(4)].map((_, i) => (
                <div key={`vendor-skeleton-${i}`} className="bg-white/5 p-6 rounded-2xl text-center animate-pulse">
                  <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-white/10"></div>
                  <div className="h-5 bg-white/10 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-4 bg-white/10 rounded w-1/2 mx-auto"></div>
                </div>
              ))
            ) : (
              topVendors.map((vendor) => (
                <div
                  key={`vendor-${vendor.id}`}
                  className="bg-white/5 p-6 rounded-2xl text-center relative hover:scale-105 transition-transform cursor-pointer"
                  onMouseEnter={() => setHoveredCard(vendor.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => handleVendorClick(vendor)}
                >
                  <span className="absolute top-4 left-4 w-6 h-6 bg-black/60 text-white rounded-full text-xs flex items-center justify-center font-bold">
                    {topVendors.findIndex(v => v.id === vendor.id) + 1}
                  </span>
                  <div className="w-24 h-24 rounded-full mx-auto mb-4 relative overflow-hidden">
                    <Image
                      src={vendor.image}
                      alt={vendor.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <h4 className="text-lg font-bold text-white">{vendor.name}</h4>
                  <p className="text-sm text-slate-400 mt-2">
                    Total Sales: <span className="text-white font-medium">{vendor.sales}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Browse Categories Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-screen-xl m-auto">
          <h2 className="text-3xl font-bold text-white mb-2">Browse Segment</h2>
          <p className="text-slate-400 mb-12">Explore our curated industry segments</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {loadingSegments ? (
              // Loading skeleton
              [...Array(8)].map((_, i) => (
                <div key={`segment-skeleton-${i}`} className="animate-pulse">
                  <div className="h-48 bg-white/10 rounded-2xl"></div>
                  <div className="h-6 bg-white/10 rounded w-3/4 mt-4 mx-auto"></div>
                </div>
              ))
            ) : (
              (showAllSegments ? segments : segments.slice(-6)).map((segment) => (
                <div
                  key={`segment-${segment.id}`}
                  className="group cursor-pointer rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-orange-600/50 transition-all duration-300"
                  onClick={() => handleSegmentClick(segment)}
                >
                  {/* Image Area */}

                  <div
                    className={`h-48 relative overflow-hidden flex items-center justify-center bg-gradient-to-br ${segment.gradient}`}
                  >
                    {/* Background (segment logo) - fallback to default when missing */}
                    <img
                      src={segment.logo || '/brand-log/neozaardefault.jpg'}
                      alt={segment.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-90 transition-all duration-500 group-hover:scale-110 group-hover:opacity-20"
                    />

                    {/* HOVER ICON (The SVG/File) - stays above the bg */}
                    {segment.icon && (
                      <img
                        src={segment.icon}
                        alt={`${segment.name} icon`}
                        className="absolute z-30 w-20 h-20 md:w-24 md:h-24 object-contain
                                   opacity-0 scale-75 blur-sm
                                   transition-all duration-300 ease-out
                                   group-hover:opacity-100 group-hover:scale-100 group-hover:blur-0
                                   filter brightness-0 invert
                                   drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                      />
                    )}

                    {/* Glass Effect Overlay */}
                    <div
                      className="absolute inset-0 opacity-0
                                 backdrop-blur-sm bg-black/20
                                 transition-all duration-300
                                 group-hover:opacity-100"
                    ></div>
                  </div>

                  {/* Text Area */}
                  <div className="p-4 text-center bg-black/20">
                    <span className="font-bold text-white text-lg group-hover:text-orange-500 transition-colors">
                      {segment.name}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* View More Button */}
          {!loadingSegments && segments.length > 6 && !showAllSegments && (
            <div className="text-center mt-12">
              <button
                onClick={() => setShowAllSegments(true)}
                className="border-2 border-orange-600 text-orange-600 hover:bg-orange-600/10 px-8 py-3 rounded-xl flex items-center gap-3 font-bold transition-all mx-auto"
              >
                View More Segments
              </button>
            </div>
          )}
        </section>

        {/* Discover More NFTs Section - Featured Solutions API */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-screen-xl m-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Discover Solutions</h2>
              <p className="text-slate-400">Explore new trending solutions</p>
            </div>
            <button 
              className="border-2 border-orange-600 text-orange-600 hover:bg-orange-600/10 px-8 py-3 rounded-xl flex items-center gap-3 font-bold transition-all"
              onClick={() => router.push('/allsolution')}
            >
              See All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {loadingSolutions ? (
              // Loading skeleton for solutions
              [...Array(3)].map((_, i) => (
                <div key={`solution-skeleton-${i}`} className="rounded-2xl overflow-hidden bg-white/5 animate-pulse">
                  <div className="aspect-[4/3] bg-white/10"></div>
                  <div className="p-6 space-y-4">
                    <div className="h-6 bg-white/10 rounded w-3/4"></div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/10"></div>
                      <div className="h-4 bg-white/10 rounded w-1/3"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="space-y-1">
                        <div className="h-4 bg-white/10 rounded w-16"></div>
                        <div className="h-5 bg-white/10 rounded w-20"></div>
                      </div>
                      <div className="space-y-1 text-right">
                        <div className="h-4 bg-white/10 rounded w-16"></div>
                        <div className="h-5 bg-white/10 rounded w-20"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              featuredSolutions.map((solution) => (
                <div
                  key={`solution-${solution.id}`}
                  className="rounded-2xl overflow-hidden bg-white/5 hover:scale-105 transition-transform border border-white/10 hover:border-orange-600/50 cursor-pointer"
                  onClick={() => handleSolutionClick(solution.title)}
                >
                  <div className="aspect-[4/3] relative">
                    <Image
                      src={solution.image}
                      alt={solution.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6 space-y-4">
                    <h4 className="text-xl font-bold text-white">{solution.title}</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full relative overflow-hidden" onClick={() => handleSolutionClick(solution.title)}>
                        <Image
                          src={solution.avatar}
                          alt={solution.artist}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="text-xs text-slate-400">{solution.artist}</span>
                    </div>
                    {solution.categories && solution.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {solution.categories.slice(0, 2).map((category, idx) => (
                          <span key={`${solution.id}-category-${idx}`} className="text-xs px-2 py-1 bg-orange-600/20 text-orange-400 rounded-full">
                            {category}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <div className="space-y-1">
                        <div className="text-slate-400">Solution Type</div>
                        <div className="font-bold text-white">{solution.price}</div>
                      </div>
                      <div className="space-y-1 text-right">
                        <div className="text-slate-400">Action</div>
                        <div className="font-bold text-orange-500">{solution.bid}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Magic Mushrooms Hero Section */}
        <section className="relative w-full h-[640px] flex items-end mt-16 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{
              backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDc9ZvXMDx2OGKmm_L3QWIKOqaXjK4vvO2Q3jeN3YMlSxrjebYDTuukOOuJ22EBS8litDV09TP04VqZcU0q18sf3NHl9JteLsBhy4EzncWQSbUeTHzlZDsIkPj4zifhZv6vFH5d4T5XSBTAtWkLI6zyDHDguXmzZAIU8aVWKRKTUNOPInt3ejSJSf8K4K_U7NvbI1z9qovrr9C8Dxgodg21iFRCWgX6qLozQy-OcLZ-wJjfKnd6xZAb9m7b38iqWoe6_NjUm3A3Tcs')"
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
          <div className="relative max-w-7xl mx-auto px-6 pb-20 w-full grid md:grid-cols-2 items-end gap-12">
            <div className="space-y-8">
              <div className="flex items-center gap-3 bg-orange-600/20 backdrop-blur-md px-4 py-2 rounded-full w-fit">
                <div 
                  className="w-6 h-6 rounded-full bg-cover"
                  style={{
                    backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDtUYEOr-BWXmHwbtvVWeECyjDv93VeHaadrUZsfPHcteuEWhXG9A1EmabMbCXpwsyOgIXnsCUA5Eg0XzzcLGT0nC42IUMGX42RlVW1qva96VjZ_hoY0Uf7ZzqPdcpUfSO7hGWTWO-ReZTK0qrg8wVZjF6wcUvcdq6dq86WnVGwgCA9VHqp1EXvKKdlB-3iz1h2BGETXByOq3NniNr041gS3eLmcaJqwNUka6WXhLuuL9J9Uip2oLrOtQBFc7VjlGhMA1GxQzE-2e8')"
                  }}
                ></div>
                <span className="text-sm font-medium text-white">Shroomie</span>
              </div>
              <h2 className="text-5xl font-black text-white">Magic Mushrooms</h2>
              <button className="bg-white text-black px-12 py-4 rounded-xl flex items-center gap-4 font-bold text-lg hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined">visibility</span>
                See NFT
              </button>
            </div>
            <div className="bg-black/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 max-w-sm ml-auto text-white">
              <div className="text-xs font-mono mb-4 text-slate-300">Auction ends in:</div>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-4xl font-bold">59</div>
                  <div className="text-[10px] text-slate-300 uppercase mt-1">Hours</div>
                </div>
                <div>
                  <div className="text-4xl font-bold">59</div>
                  <div className="text-[10px] text-slate-300 uppercase mt-1">Minutes</div>
                </div>
                <div>
                  <div className="text-4xl font-bold">59</div>
                  <div className="text-[10px] text-slate-300 uppercase mt-1">Seconds</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold text-white mb-12">CTA</h2>
           <p className="text-slate-400">Explore new trending solutions</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div
              className="bg-white/5 p-8 rounded-2xl text-center space-y-4 cursor-pointer hover:bg-white/10 hover:border-orange-500 border border-white/10 transition-all"
              onClick={() => router.push('/marketplace/product/cta_model/Request%20Assessment')}
            >
              <div className="w-[100px] h-[100px] rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-[100px] h-[100px] rounded-full bg-cover">
                  <Image
                    src="/assests/requestassessment.png"
                    alt="Wallet Icon"
                    width={100}
                    height={100}
                    className="object-cover"
                  />              
                </div>
              </div>
              <h3 className="text-xl font-bold text-white">Request Assessment</h3>
              <p className="text-slate-400 text-sm">Set up your wallet of choice. Connect it to the Animarket by clicking the wallet icon in the top right corner.</p>
            </div>
            <div
              className="bg-white/5 p-8 rounded-2xl text-center space-y-4 cursor-pointer hover:bg-white/10 hover:border-orange-500 border border-white/10 transition-all"
              onClick={() => router.push('/marketplace/product/cta_model/Request%20for%20Demo')}
            >
              <div className="w-[100px] h-[100px] rounded-full flex items-center justify-center mx-auto mb-6">
                 <div className="w-[100px] h-[100px] rounded-full bg-cover">
                  <Image
                    src="/assests/free_demo.png"
                    alt="Wallet Icon"
                    width={100}
                    height={100}
                    className="object-cover"
                  />              
                </div>
              </div>
              <h3 className="text-xl font-bold text-white">Free Demo</h3>
              <p className="text-slate-400 text-sm">Upload your work and setup your collection. Add a description, social links and floor price.</p>
            </div>
            <div
              className="bg-white/5 p-8 rounded-2xl text-center space-y-4 cursor-pointer hover:bg-white/10 hover:border-orange-500 border border-white/10 transition-all"
              onClick={() => router.push('/marketplace/product/cta_model/Private%20Offer')}
            >
              <div className="w-[100px] h-[100px] rounded-full flex items-center justify-center mx-auto mb-6">
                 <div className="w-[100px] h-[100px] rounded-full bg-cover">
                  <Image
                    src="/assests/private_offer.png"
                    alt="Wallet Icon"
                    width={100}
                    height={100}
                    className="object-cover"
                  />              
                </div>
              </div>
              <h3 className="text-xl font-bold text-white">private Offer</h3>
              <p className="text-slate-400 text-sm">Choose between auctions and fixed-price listings. Start earning by selling your NFTs or trading others.</p>
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-white/5 rounded-[40px] p-8 md:p-16 flex flex-col lg:flex-row gap-12 items-center">
            <div 
              className="w-full lg:w-1/2 aspect-video bg-cover bg-center rounded-2xl"
              style={{
                backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCIDvDq62OLMonBDlzdWXUceNyMZugO5sYcLA8h9F-91XkQMwCmpgqX9a4D7ka4neW9qAUFTPvxtVSJLryghcJACcJ6aXm5Vh6UHk9jhZW_n6SRM6slyeaLCOTYSnM7IUNLoUOW203IseRrFa6uXPWaQcfXbUWutaiRNnR18IgOcjbGPqmZXSoaqprhinkgaCgOoktzLb5WFVfkkmkhElgTxl6zrRHw26UIBws63w7vMu5fBfDVRx8t01BfeJoZ1rh1eqz0MWpvdX8')"
              }}
            ></div>
            <div className="w-full lg:w-1/2 space-y-8">
              <h2 className="text-4xl md:text-5xl font-black text-white">Join Our Weekly Digest</h2>
              <p className="text-lg text-slate-400">Get exclusive promotions & updates straight to your inbox.</p>
              <form className="flex flex-col sm:flex-row gap-4">
                <input 
                  className="flex-1 px-6 py-4 rounded-xl border-none bg-white/10 focus:ring-2 focus:ring-orange-600 outline-none text-white placeholder:text-slate-400" 
                  placeholder="Enter your email here" 
                  type="email"
                />
                <button className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors">
                  <span className="material-symbols-outlined">mail</span>
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}