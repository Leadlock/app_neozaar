"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { X } from "lucide-react";
// import { Swiper, SwiperSlide } from "swiper/react";
// import { Navigation } from "swiper/modules";
// import { Autoplay } from 'swiper/modules';
import Header from './../layouts/Header';
import Footer from './../layouts/Footer';
import { useSearchParams } from 'next/navigation';
// import "swiper/css";
// import "swiper/css/navigation";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/autoplay";
import { set } from "react-hook-form";


export default function CustomSlider() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('productid');
  const router = useRouter();

  const prevRef = useRef(null);
  const [activeTab, setActiveTab] = useState("info");
  const [products, setProducts] = useState([]);
  const [productDetails, setProductDetails] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errors, setErrors] = useState({});


  useEffect(() => {
    async function fetchProducts() {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch('https://www.neozaar.com/api/products/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data?.data?.products)) {
          setProducts(data.data.products);
        } else {
          console.error('Invalid product response format');
        }
      } catch (err) {
        console.error('Failed to fetch products:', err);
      }
    }

    // fetch product details 
    async function producDetail() {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch(`https://www.neozaar.com/api/catalog/marketplace/products/${userId}`, {
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

  const [roleTitle, setRoleTitle] = useState("");
  const [useCase, setUseCase] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    let newErrors = {};
    if (!roleTitle.trim()) newErrors.roleTitle = "Role Title is required";
    if (!useCase.trim()) newErrors.useCase = "Use Case is required";
    if (!message.trim()) newErrors.message = "Message cannot be empty";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; // ❌ stop API call
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://www.neozaar.com/api/lead/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          "action_id": 13,
          "action_type": "product", //"product", "bundle"
          "status": "new",
          "leadType": "demo",
          "message": message,
          "demoData": {
            "role_title": roleTitle,
            "use_case": useCase
          }
        }),
      });

      if (res.ok) {
        setShowSuccessModal(true);
        setIsModalOpen(false);
        setRoleTitle("");
        setUseCase("");
        setMessage("");
        setErrors({});
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 5000);
      } else {
        alert("Failed to submit enquiry.");
      }
    } catch (err) {
      console.error("Error submitting enquiry:", err);
    }
  };

  const [AWSID, setAWSID] = useState("");
  const [messageB, setMessageB] = useState("");

  const handleSubmitB = async (e) => {
    e.preventDefault();

    let newErrors = {};
    if (!AWSID.trim()) {
      newErrors.AWSID = "AWS Account ID is required";
    } else if (!/^\d{12}$/.test(AWSID.trim())) {
      newErrors.AWSID = "Invalid AWS Account ID format";
    }
    if (!messageB.trim()) { newErrors.messageB = "Message cannot be empty"; }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("https://www.neozaar.com/api/lead/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action_id: 64,   // ✅ must be action_id
          action_type: "product",                   // or "bundle"
          status: "new",
          leadType: "buy_now",                 // ✅ important
          message: messageB,                        // comments
          "purchaseData": {                       // ✅ nested object
            "aws_account_id": AWSID,
            "product_id": 3,
            "entitlement_status": "entitlement_status",
          },
        }),
      });

      const data = await res.json();
      console.log("API Response:", data);

      if (data.status === "status") {
        setShowSuccessModal(true);
        setIsPriceModalOpen(false);
        setAWSID("");
        setMessageB("");
        setErrors({});
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 5000);
      } else {
        alert(data.message || "Failed to submit price enquiry.");
      }
    } catch (err) {
      console.error("Error submitting price enquiry:", err);
    }
  };
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
                className="btn mt-2 lg:mt-4 text-black bg-gray-200 hover:bg-black hover:text-white px-4 py-2 rounded" onClick={() => setIsModalOpen(true)}>
                <i className="fa-solid fa-headphones"></i>
                Request Demo
              </button>
            </div>
            <div className="flex flex-col sm:flex-row mt-8 mb-2  md:mb-0">
              <button className="bg-black text-white px-6 py-4 text-center w-full sm:w-1/2  " onClick={() => setIsPriceModalOpen(true)} >
                <span className="text-lg text-gray-300">Starting From &nbsp;&nbsp; </span><span
                  className="text-2xl font-semibold">$599</span>
              </button>
              <button className="border px-6 py-4 w-full sm:w-1/2 text-2xl font-medium hover:bg-gray-100 ">
                Get Private Price
              </button>
            </div>
          </section>

          <section
            className="w-full  lg:border-t-0 lg:border lg:border-l-0 lg:px-0 py-6 lg:min-h-[95vh] h-full px-2 ">
            <nav className="flex flex-wrap gap-4 border-b pl-10 pb-2 mb-4 text-sm font-medium">
              <button
                onClick={() => setActiveTab("info")}
                className={`${activeTab === "info" ? "text-black" : "text-gray-400"
                  } hover:text-black`}
              >
                INFO
              </button>
              <button
                onClick={() => setActiveTab("tech_info")}
                className={`${activeTab === "tech_info" ? "text-black" : "text-gray-400"
                  } hover:text-black`}
              >
                Technical INFO
              </button>
              <button
                onClick={() => setActiveTab("pricing")}
                className={`${activeTab === "pricing" ? "text-black" : "text-gray-400"
                  } hover:text-black`}
              >
                Pricing & Licensing
              </button>
              <button
                onClick={() => setActiveTab("support_info")}
                className={`${activeTab === "support_info" ? "text-black" : "text-gray-400"
                  } hover:text-black`}
              >
                Support INFO
              </button>
              <button
                onClick={() => setActiveTab("media_assets")}
                className={`${activeTab === "media_assets" ? "text-black" : "text-gray-400"
                  } hover:text-black`}
              >
                Media & Assets
              </button>
            </nav>

            <div className="space-y-4 text-sm max-w-2xl mxl:max-w-3xl lg:px-[5rem] mxl:pl-[8rem] mxl:pr-0 lg:pt-[3rem] ">
              {activeTab === "info" && (
                <div className="flex flex-col space-y-1 ">
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Short Description</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {
                        productDetails?.product?.short_description
                      }
                    </p>
                  </div>

                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Key Features</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">{productDetails?.product?.key_features}</p>
                  </div>
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Audience</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">{productDetails?.product?.target_audience}</p>
                  </div>
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Category & Subcategory</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">{productDetails?.product?.category_subcategory}</p>
                  </div>
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Regions Supported</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">{productDetails?.product?.regions_supported}</p>
                  </div>
                </div>

              )}

              {activeTab === "tech_info" && (
                <div className="flex flex-col space-y-1">
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Cloud Provider Support</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {productDetails?.product?.cloud_provider_support}
                    </p>
                  </div>
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Supported AWS Services</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {productDetails?.product?.supported_aws_services}
                    </p>
                  </div>
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Support Azure Services</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {productDetails?.product?.supported_azure_services}
                    </p>
                  </div>
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Deployment Model</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {productDetails?.product?.deployment_model}
                    </p>
                  </div>
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Technical Prerequisites</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {productDetails?.product?.technical_prerequisites}
                    </p>
                  </div>
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">API/ Metering Endpoint</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {productDetails?.product?.api_metering_endpoint}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "pricing" && (
                <div className="flex flex-col space-y-1">
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Pricing Model</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {productDetails?.product?.pricing_model}
                    </p>
                  </div>
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Billing Dimension</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {productDetails?.product?.billing_dimension}
                    </p>
                  </div>
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">License Model</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {productDetails?.product?.license_model}
                    </p>
                  </div>
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Free Trial Available</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {productDetails?.product?.free_trial_available ? "Yes" : "No"}
                    </p>
                  </div>
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">SKU ID</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {productDetails?.product?.sku_id}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "support_info" && (
                <div className="flex flex-col space-y-1">
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Support Contact Person</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {productDetails?.product?.support_contact_name}
                    </p>
                  </div>
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Support Contact Email</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {productDetails?.product?.support_email}
                    </p>
                  </div>
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Support Phone Number</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {productDetails?.product?.support_phone}
                    </p>
                  </div>
                  <div className="mb-5">
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Support Availability</p>
                    <p className="text-gray-600 text-lg font-normal font-[inter]">
                      {productDetails?.product?.support_hours}
                    </p>
                  </div>
                  <div className="mb-5">

                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Service Level Agreement (SLA)</p>
                    {productDetails?.product?.sla_documents?.length > 0 ? (
                      <ul className="list-none pl-5 space-y-2 flex flex-col md:flex-row">
                        {productDetails.product.sla_documents.map((url, index) => (
                          <li key={index} className="md:mr-4">

                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block px-4 py-2 rounded-2xl bg-white text-gray-500 font-[inter] underline border-gray-300 border font-medium hover:text-blue-700 transition"
                            >
                              SLA Document {index + 1}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-600 lg:text-md">No SLA documents available</p>
                    )}
                  </div>

                </div>
              )}
              {activeTab === "media_assets" && (
                <div className="flex flex-col space-y-1">
                  <div>
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Screenshots</p>
                    {productDetails?.product?.screenshots?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {productDetails.product.screenshots.map((imgUrl, index) => (
                          <img
                            key={index}
                            src={imgUrl}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-50"
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 lg:text-md">No Screenshot available</p>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Brochure</p>
                    {productDetails?.product?.brochures?.length > 0 ? (
                      <ul className="list-none pl-5 space-y-2 flex flex-col md:flex-row">
                        {productDetails.product.brochures.map((url, index) => (
                          <li key={index} className="md:mr-4">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block px-4 py-2 rounded-2xl bg-white text-gray-500 font-[inter] underline border-gray-300 border font-medium hover:text-blue-700 transition"
                            >
                              Brochure {index + 1}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-600 lg:text-md">No Brochures available</p>
                    )}
                  </div>

                  <div>
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Customer Case Study</p>
                    {productDetails?.product?.customer_case_studies?.length > 0 ? (
                      <ul className="list-none pl-5 space-y-2 flex flex-col md:flex-row">
                        {productDetails.product.customer_case_studies.map((url, index) => (
                          <li key={index} className="md:mr-4">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block px-4 py-2 rounded-2xl bg-white text-gray-500 font-[inter] underline border-gray-300 border font-medium hover:text-blue-700 transition"
                            >
                              Case Study {index + 1}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-600 lg:text-md">No Customer Case Studies available</p>
                    )}
                  </div>

                  <div>
                    <p className="font-semibold mb-1 text-sm font-[inter] underline">Demo Video Link</p>
                    {productDetails?.product?.demo_video_link ? (
                      <a
                        href={productDetails.product.demo_video_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 rounded-2xl md:ml-4 bg-white text-gray-500 font-[inter] underline border-gray-300 border font-medium hover:text-blue-700 transition"
                      >
                        View Demo Video
                      </a>
                    ) : (
                      <p className="text-gray-600 lg:text-md">No Demo video available</p>
                    )}
                  </div>
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
            modules={[Navigation, Autoplay]}
            spaceBetween={20}
            loop={true}
            navigation={true}
            pagination={{ clickable: true }}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
            }}
            // default hai (horizontal slide)
            // direction="horizontal"  // (optional) explicitly add
            breakpoints={{
              0: { slidesPerView: 1 },
              640: { slidesPerView: 2 },
              900: { slidesPerView: 3 },
              1024: { slidesPerView: 4 },
            }}
          >
            {products.map((product) => (
              <SwiperSlide key={product.id}>
                <div className="bg-zinc-50 border border-zinc-200 h-[400px] cursor-pointer w-[295px]">
                  <div className="w-full h-[258px] relative">
                    <Image
                      fill
                      alt={product.title || 'Product Image'}
                      className="w-full h-[256px] object-cover rounded-t"
                      src="/image/acronis.png"
                    />
                  </div>
                  <div className="p-2">
                    <p className="uppercase text-xs text-zinc-400 tracking-wider">
                      {product.name}
                    </p>
                    <p className="text-black text-left text-lg font-normal w-[90%] leading-snug h-12 overflow-hidden line-clamp-2">
                      {product.short_description}
                    </p>
                    <p className="text-blue-600 text-sm pt-3">
                      Starting From {product.starting_price}
                    </p>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 ">
            <div className="bg-black text-zinc-600 w-full max-w-lg shadow-lg p-10 relative my-auto flex flex-col ">
              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-xl font-semibold mb-4 text-white ">Request Demo</h2>
              <form
                onSubmit={handleSubmit}>
                {/* Role Title */}
                <input
                  type="text"
                  placeholder="Your Role (e.g. CTO)"
                  className={`w-full border bg-zinc-800 p-2 mb-4 placeholder:text-zinc-600 text-white ${errors.roleTitle ? "border-red-500" : "border-none"
                    }`}
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                />
                {errors.roleTitle && (
                  <p className="text-red-500 text-sm mb-1">{errors.roleTitle}</p>
                )}

                {/* Use Case */}
                <input
                  type="text"
                  placeholder="Use Case (e.g. Evaluate new system)"
                  className={`w-full border bg-zinc-800 p-2 mb-4 placeholder:text-zinc-600 text-white ${errors.useCase ? "border-red-500" : "border-none"
                    }`}
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                />
                {errors.useCase && (
                  <p className="text-red-500 text-sm mb-1">{errors.useCase}</p>
                )}
                {/* Message */}
                <textarea
                  rows={6}
                  placeholder="Comments"
                  className={`w-full border bg-zinc-800 p-2 mb-4 placeholder:text-zinc-600 text-white ${errors.message ? "border-red-500" : "border-none"
                    }`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                {errors.message && (
                  <p className="text-red-500 text-sm mb-1">{errors.message}</p>
                )}
                <button
                  type="submit"
                  className="bg-gradient-to-bl from-orange-400 to-orange-700 text-white px-4 py-2 w-full"
                >
                  Submit
                </button>
              </form>
            </div>
          </div>
        )}
        {isPriceModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-black text-zinc-600 w-full max-w-lg shadow-lg p-10 relative my-auto flex flex-col">
              {/* Close Button */}
              <button
                onClick={() => setIsPriceModalOpen(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-xl font-semibold mb-4 text-white ">Enquiry Form</h2>
              <form onSubmit={handleSubmitB}>

                <input
                  type="text"
                  placeholder="enter AWS id"
                  className={`w-full border bg-zinc-800 p-2 mb-4 placeholder:text-zinc-600 text-white ${errors.AWSID ? "border-red-500" : "border-none"
                    }`}
                  value={AWSID}
                  onChange={(e) => setAWSID(e.target.value)}
                />
                {errors.AWSID && (
                  <p className="text-red-500 text-sm mb-1">{errors.AWSID}</p>
                )}

                {/* Message */}
                <textarea
                  rows={6}
                  placeholder="Comments"
                  className={`w-full border bg-zinc-800 p-2 mb-4 placeholder:text-zinc-600 text-white ${errors.messageB ? "border-red-500" : "border-none"
                    }`}
                  value={messageB}
                  onChange={(e) => setMessageB(e.target.value)}
                />
                {errors.messageB && (
                  <p className="text-red-500 text-sm mb-1">{errors.messageB}</p>
                )}

                <button
                  type="submit"
                  className="bg-gradient-to-bl from-orange-400 to-orange-700 text-white px-4 py-2 w-full"
                >
                  Submit
                </button>
              </form>
            </div>
          </div>
        )}
        {showSuccessModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-white shadow-lg p-6 w-96 text-center">
              <h2 className="text-xl font-bold text-green-600">Success!</h2>
              <p className="mt-2 text-gray-600">
                Thank you for reaching out to us.
                Our team has received your request and will contact you shortly.
              </p>
            </div>
          </div>
        )}
      </main>
      <Footer></Footer>
    </div>

  );
}