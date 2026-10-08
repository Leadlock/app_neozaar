"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import { Autoplay } from 'swiper/modules';
import Header from './../layouts/Header';
import Footer from './../layouts/Footer';
import { useSearchParams } from 'next/navigation';
import "swiper/css";
import "swiper/css/navigation";
import Image from "next/image";
import { useRouter } from "next/navigation";


export default function CustomSlider() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('productid');
  const router = useRouter();

  const prevRef = useRef(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [products, setProducts] = useState([]);
  const [productDetails, setProductDetails] = useState(null)

  useEffect(() => {
    // async function fetchProducts() {
    //   const token = localStorage.getItem('token');
    //   if (!token) return;

    //   try {
    //     const res = await fetch('http://20.83.163.38:5000/api/products/', {
    //       headers: { Authorization: `Bearer ${token}` },
    //     });
    //     const data = await res.json();
    //     if (res.ok && Array.isArray(data?.data?.products)) {
    //       setProducts(data.data.products);
    //     } else {
    //       console.error('Invalid product response format');
    //     }
    //   } catch (err) {
    //     console.error('Failed to fetch products:', err);
    //   }
    // }

    // fetch product details 
    async function producDetail() {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}catalog/marketplace/products/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setProductDetails(data.data)
        setProducts(data.data.recommendations)
      } catch (err) {
        console.error('Failed to fetch products:', err);
      }
    }

    producDetail();

    fetchProducts();
  }, []);
  useEffect(() => {
    const checkAuth = () => {
      console.log("🔐 Checking authentication from localStorage...");
      const token = localStorage.getItem("token");

      if (!token || token.trim() === "") {
        console.warn("🚫 No valid token in localStorage. Redirecting to login.");
        router.push('/auth/login');
        return;
      }

      console.log("✅ Token found in localStorage:", token);
    };

    checkAuth();
  }, []);


  return (
    <div>
      <Header></Header>
      <main className="text-gray-800 font-sans max-w-screen-[1920px]  m-auto">
        <div
          className="breadcrumb flex flex-wrap items-center gap-2 text-sm lg:px-[6.25rem] py-3 border-b max-w-[1920px] m-auto">
          <button className="back-btn flex items-center gap-1 text-black font-medium hover:underline hover:font-bold text-xs md:text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="icon-left w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" className="" />
            </svg>
            Back
          </button>
          <span className="text-gray-300 text-xs md:text-sm hidden md:block hover:underline ">/</span>
          <Link href="/" className="nav-link text-xs md:text-sm hidden md:block hover:underline hover:font-bold">Home</Link>
          <span className="text-gray-300 text-xs md:text-sm hidden md:block ">/</span>
          <Link href="/" className="nav-link text-xs md:text-sm hidden md:block hover:underline hover:font-bold">Marketplace</Link>
          <span className="text-gray-300 text-xs md:text-sm hidden md:block ">/</span>
          <Link href="/" className="nav-link text-xs md:text-sm hidden md:block hover:underline hover:font-bold">Acronis Cyber Protect Cloud</Link>
        </div>

        <div className="grid grid-cols-1  lg:grid-cols-2 max-w-[1920px] m-auto">
          <section
            className="flex flex-col justify-between w-full text-black pt-6 pb-0 space-y-6 lg:border lg:border-y-0">
            <div className="flex flex-col items-start lg:items-start p-2 py-2 xl:px-[7rem] pt-6">
              <img src="/image/acronis.png" alt="Acronis" className="w-40 h-40 xl:w-52 xl:h-52 object-cover mb-4" />
              <p className="uppercase text-xs tracking-widest text-gray-400 mb-2">{productDetails?.bundle_type}</p>
              <h1 className="text-2xl lg:text-4xl mxl:text-5xl font-normal leading-snug mb-4 max-w-xl text-left lg:text-left">
                {productDetails?.product?.name}
              </h1>
              <p className="text-base text-gray-600 mxl:text-2xl leading-relaxed mb-6 text-left lg:text-left max-w-xl">
                {productDetails?.product?.long_description}
              </p>
              <button
                className="btn mt-2 lg:mt-4 text-black bg-gray-200 hover:bg-black hover:text-white px-4 py-2 rounded" onClick={() => router.push(`/demo?productid=${userId}`)}>
                <i className="fa-solid fa-headphones"></i>
                Request Demo
              </button>
            </div>

            <div className="flex flex-col sm:flex-row mt-8 mb-2  md:mb-0">
              <button className="bg-black text-white px-6 py-4 text-center w-full sm:w-1/2  " onClick={() => router.push(`/private-offer?productid=${userId}`)} >
                <span className="text-lg text-gray-300">Starting From &nbsp;&nbsp; </span><span
                  className="text-2xl font-semibold">$599</span>
              </button>
              <button className="border px-6 py-4 w-full sm:w-1/2 text-2xl font-medium hover:bg-gray-100 " onClick={() => router.push(`/enquiry?productid=${userId}`)}>
                Get Private Price
              </button>
            </div>
          </section>

          <section
            className="w-full  lg:border-t-0 lg:border lg:border-l-0 lg:px-0 py-6 lg:min-h-[95vh] h-full px-2 ">
            <nav className="flex flex-wrap gap-4 border-b pl-10 pb-2 mb-4 text-sm font-medium">
              <button
                onClick={() => setActiveTab("overview")}
                className={`${activeTab === "overview" ? "text-black" : "text-gray-400"
                  } hover:text-black`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("details")}
                className={`${activeTab === "details" ? "text-black" : "text-gray-400"
                  } hover:text-black`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab("moreInfo")}
                className={`${activeTab === "moreInfo" ? "text-black" : "text-gray-400"
                  } hover:text-black`}
              >
                More Info
              </button>
              <button
                onClick={() => setActiveTab("pricing")}
                className={`${activeTab === "pricing" ? "text-black" : "text-gray-400"
                  } hover:text-black`}
              >
                Pricing
              </button>
            </nav>

            <div className="space-y-4 text-sm max-w-2xl mxl:max-w-3xl lg:px-[5rem] mxl:pl-[8rem] mxl:pr-0 lg:pt-[3rem]">
              {activeTab === "overview" && (
                <div>
                  <p className="font-semibold mb-1 lg:text-xl">Pain Points Solved:</p>
                  <p className="text-gray-600 lg:text-md my-2">
                    {
                      productDetails?.product?.short_description
                    }
                  </p>

                  <div>
                    <p className="font-semibold mb-1 lg:text-xl">Deployment Type:</p>
                    <p className="text-gray-600 lg:text-md">{productDetails?.product?.deployment_model}</p>
                  </div>

                  <p className="font-semibold mb-1 lg:text-xl">Industry:</p>
                  <p className="text-gray-600 lg:text-md">IT Services, Healthcare, Legal, Financial Services</p>
                </div>

              )}

              {activeTab === "details" && (
                <div>
                  <p className="font-semibold mb-1 lg:text-xl">CRM Details</p>
                  <p className="text-gray-600 lg:text-md">
                    Here you can describe features, modules, and integration options in detail.
                  </p>
                </div>
              )}

              {activeTab === "moreInfo" && (
                <div>
                  <p className="font-semibold mb-1 lg:text-xl">More Info</p>
                  <p className="text-gray-600 lg:text-md">
                    Additional information about the CRM, use cases, and technical requirements.
                  </p>
                </div>
              )}

              {activeTab === "pricing" && (
                <div>
                  <p className="font-semibold mb-1 lg:text-xl">Pricing</p>
                  <p className="text-gray-600 lg:text-md">
                    Pricing plans for different user types, including monthly and yearly options.
                  </p>
                </div>
              )}
            </div>


          </section>
        </div>
        <section className="relative px-4 py-10 max-w-[1920px] mx-auto">
          <div className="flex justify-between items-center absolute md:top-[70px] mb-40">
            <h2 className="text-xl font-semibold">More Similar Products</h2>
          </div>

          <Swiper
            key={products.length}
            modules={[Navigation, Autoplay]}
            spaceBetween={50}
            navigation
            pagination={{ clickable: true }}
            autoplay={{ delay: 2500, disableOnInteraction: false }}
            loop={products.length > 4}
            observer
            observeParents
            observeSlideChildren
            breakpoints={{
              0: { slidesPerView: 1 },
              640: { slidesPerView: 2 },
              900: { slidesPerView: 3 },
              1024: { slidesPerView: 4 },
            }}
            onSwiper={(swiper) => {
              setTimeout(() => swiper.update(), 0);
            }}
          >
            {products.map((product, index) => (
              <SwiperSlide key={product.id ?? index} onClick={() => router.push(`/bundle?productid=${product.id}`)}>
                <div className="bg-zinc-50 border border-zinc-200 m-auto h-[400px] cursor-pointer w-[295px]">
                  <div className="w-full h-[258px] relative">
                    <Image
                      fill
                      unoptimized
                      alt={product.name || "Product"}
                      className="object-cover rounded-t"
                      src={product.image || "/image/acronis.png"}
                      onError={(e) => (e.target.src = '/assests/trending_bg.png')}
                    />
                  </div>
                  <div className="p-2">
                    <p className="uppercase text-xs text-zinc-400 tracking-wider">
                      {product.name || "Category"}
                    </p>
                    <p className="text-black text-left font-['CreatoDisplay-Regular',_sans-serif] text-lg font-normal w-[90%] leading-snug h-12 overflow-hidden line-clamp-2">
                      {product.short_description}
                    </p>
                    <p className="text-blue-600 text-sm pt-3">
                      Starting From ₹{product.starting_price}
                    </p>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>


        </section>
      </main>
      <Footer></Footer>
    </div>

  );
}