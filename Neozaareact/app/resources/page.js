"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation"; // ✅ App Router
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import Image from "next/image";
import Link from 'next/link';
// import { useState } from 'react';
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";


import Header from "../layouts/Header";
import Footer from "../layouts/Footer";
import PaginationForPages from "../layouts/PaginationForPages";

export default function Home() {
  const [search, setSearch] = useState('');
  const [marketplace, setMarketplace] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);
  const sliderRef = useRef(null);
  const router = useRouter();
  const [menu, setMenu] = useState(false)
  const [categories, setCategories] = useState(null)
  const [categoriesSelect, setCategoriesSelect] = useState('')
  const [paginations, setPagination] = useState({
    page: 1,
    limit: 20,
    pages: 0, // suppose 68 pages total
    total: 0,
  });


  useEffect(() => {
    let position = 0;
    let slider = sliderRef.current;
    let requestId;

    const scroll = () => {
      if (!slider) return;
      position -= 0.5;
      if (Math.abs(position) >= slider.scrollWidth / 2) {
        position = 0;
      }
      slider.style.transform = `translateX(${position}px)`;
      requestId = requestAnimationFrame(scroll);
    };
    const catalog = async () => {
      try {
        const res = await fetch(`https://www.neozaar.com/api/catalog/categories`)

        const data = await res.json()

        console.log(data.data)
        setCategories(data.data)

      } catch (error) {
        console.log(error)
      }


    }
    catalog()
    requestId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(requestId);
  }, []);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const [filter, setFilter] = useState("All");

  const insights = [
    {
      tag: "Case Study",
      category: "Case Studies",
      color: "text-blue-600 bg-blue-100",
      title: "How Acme Inc. Increased Revenue by 300%",
      text: "Discover the strategies and tools that fueled a massive growth spurt for one of our key partners.",
      image: "/assests/resources/case-study.png",
    },
    {
      tag: "Blog",
      category: "Blogs",
      color: "text-green-600 bg-green-100",
      title: "10 Content Marketing Tips for Early-Stage Startups",
      text: "Learn how to build a powerful content engine without breaking the bank in your start-up’s early phase.",
      image: "/assests/resources/blog.png",
    },
    {
      tag: "Videos",
      category: "Videos",
      color: "text-purple-600 bg-purple-100",
      title: "The Ultimate Guide to B2B Sales Funnels",
      text: "A deep dive into creating and optimizing sales funnels that convert leads into loyal customers.",
      image: "/assests/resources/video.png",
    },
    {
      tag: "Case Study",
      category: "Case Studies",
      color: "text-blue-600 bg-blue-100",
      title: "How NeoZaar Helped Startups Grow by 200%",
      text: "A closer look at the SaaS automation journey and ROI improvements from our partners.",
      image: "/assests/resources/case-study.png",
    },
    {
      tag: "Blog",
      category: "Blogs",
      color: "text-green-600 bg-green-100",
      title: "Mastering Content Strategy for SaaS Brands",
      text: "Explore powerful methods for content scaling and increasing engagement across platforms.",
      image: "/assests/resources/blog.png",
    },
  ];

  const filteredInsights = filter === "All" ? insights : insights.filter((i) => i.category === filter);

  const webinars = [
    {
      video: "https://www.youtube.com/embed/e3FOFu79M3U",
      title: "Scaling Your SaaS: From $1M to $10M ARR",
      speaker: "with Sarah Chen, Growth Expert",
    },
    {
      video: "https://www.youtube.com/embed/3fumBcKC6RE",
      title: "The Future of AI in Marketing Automation",
      speaker: "with Dr. Alan Grant, AI Researcher",
    },
    {
      video: "https://www.youtube.com/embed/ysz5S6PUM-U",
      title: "Building a Resilient Company Culture",
      speaker: "with Maria Rodriguez, Culture Chief",
    },
    {
      video: "https://www.youtube.com/embed/jNQXAC9IVRw",
      title: "Mastering Customer Retention in SaaS",
      speaker: "with Kevin Zhou, CX Specialist",
    },
    {
      video: "https://www.youtube.com/embed/e3FOFu79M3U",
      title: "Scaling Your SaaS: From $1M to $10M ARR",
      speaker: "with Sarah Chen, Growth Expert",
    },
    {
      video: "https://www.youtube.com/embed/3fumBcKC6RE",
      title: "The Future of AI in Marketing Automation",
      speaker: "with Dr. Alan Grant, AI Researcher",
    },
  ];



  return (
    <>
      {/* Hero Section */}
      <section className="relative w-full flex flex-col items-center justify-start pt-0 px-2 sm:px-6 pb-15 min-h-[70vh] lg:min-h-screen 2xl:min-h-auto">
        {/* Background Video */}
        <div className='w-full h-full absolute z-1 bg-black'></div>
        <video
          className="absolute inset-0 w-full h-full object-cover z-0 "
          autoPlay
          loop
          muted
          playsInline
          style={{ opacity: 0.7, pointerEvents: 'none' }}
        >
          <source src="/assests/homepagevideo.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="text-white z-5 m-auto my-0 w-full h-full">
          <Header />
        </div>
        {/* Hero Content */}
        <div className="relative mx-auto md:my-35 lg:my-25 my-24 w-full max-w-full sm:max-w-[800px] flex flex-col items-center justify-center rounded-lg text-center px-2">
          <h1 className="text-white font-light font-['CreatoDisplay',_sans-serif] text-3xl sm:text-4xl md:text-5xl mb-4 leading-snug">
            Resources & Insights
          </h1>
          <p className="text-gray-200 mb-6 px-2 sm:px-6 text-sm sm:text-base font-['Inter',_sans-serif] mt-5  ">
            {/* Discover enterprise-ready solutions across Security, AI, Modernization, and FinOps — powered by global ISVs like Zscaler, Databricks, Acronis, Commvault, and Snowflake, and tailored for your AWS MACC or Azure EDP strategy. */}
            Explore our collection of articles, success stories, and playbooks designed to help you grow and succeed.
          </p>
          <div className="relative w-full max-w-lg mt-5">
            <input
              type="search"
              placeholder="Search for articles, playbooks, and more..."
              className="w-full h-14 pl-6 pr-16 rounded-full  bg-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#ffffff] placeholder:text-gray-900 text-gray-900"
            />
            <button className="absolute inset-y-0 right-0 flex items-center justify-center w-14 h-14 text-black bg-white rounded-full transition">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m2.35-5.15a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
              </svg>
            </button>
          </div>
        </div>
      </section>


      {/* Latest Insights Section */}
      <section className="latest-insights-section w-full py-20 px-6 sm:px-10 lg:px-16 bg-black max-w-[1920px] mx-auto relative overflow-hidden ">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white bg-clip-text text-transparent mb-3">
            Latest <span className="text-[#4db5ff]">Insights</span>
          </h2>
          <p className="text-white/70 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Stay updated with our newest articles, blogs, and case studies.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center items-center gap-4 mb-12">
          {["All", "Blogs", "Videos", "Case Studies"].map((f, i) => (
            <button
              key={i}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 ${filter === f
                ? "bg-[#FFA348] text-black"
                : "bg-neutral-900 text-white/60 hover:text-white hover:bg-[#222]"
                }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Swiper Carousel */}
        <Swiper
          modules={[Pagination, Autoplay]}
          spaceBetween={30}
          slidesPerView={1}
          centeredSlides={true}
          pagination={{
            clickable: true,
            el: ".latest-insights-pagination",
          }}
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
          }}
          loop={true}
          breakpoints={{
            640: { slidesPerView: 1, centeredSlides: true },
            768: { slidesPerView: 2, centeredSlides: true },
            1024: { slidesPerView: 3, centeredSlides: false },
          }}
          className="pb-16 max-w-7xl mx-auto"
        >
          {filteredInsights.map((a, i) => (
            <SwiperSlide key={i} className="flex justify-center">
              <div className="w-[300px] sm:w-[300px] h-[450px] m-auto bg-black rounded-2xl border border-[#FFA348]/60 hover:border-[#FFA348] hover:shadow-[0_0_25px_rgba(255,163,72,0.3)] overflow-hidden transition-all duration-300 group">
                <div className="relative w-full h-56 ">

                <Image
                  src={a.image}
                  alt={a.title}
                  fill
                  className="object-cover"
                />
                </div>
                <div className="p-6 flex flex-col justify-between h-[calc(100%-14rem)]">
                  <div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${a.color}`}
                    >
                      {a.tag}
                    </span>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mt-3 leading-snug line-clamp-2">
                      {a.title}
                    </h3>
                    <p className="text-white/60 text-sm mt-2 leading-relaxed line-clamp-2">
                      {a.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[#FFA348] font-semibold text-sm mt-4 group-hover:translate-x-1 transition-transform cursor-pointer">
                    Read More
                    <svg
                      width="14"
                      height="12"
                      viewBox="0 0 14 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M13.7063 6.70859C14.0969 6.31797 14.0969 5.68359 13.7063 5.29297L8.70625 0.292969C8.31563 -0.0976562 7.68125 -0.0976562 7.29063 0.292969C6.9 0.683594 6.9 1.31797 7.29063 1.70859L10.5875 5.00234H1C0.446875 5.00234 0 5.44922 0 6.00234C0 6.55547 0.446875 7.00234 1 7.00234H10.5844L7.29375 10.2961C6.90312 10.6867 6.90312 11.3211 7.29375 11.7117C7.68437 12.1023 8.31875 12.1023 8.70938 11.7117L13.7094 6.71172L13.7063 6.70859Z"
                        fill="#FFA348"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Pagination - must match `el` name */}
        <div className="latest-insights-pagination flex justify-center items-center gap-2 mt-6"></div>

      </section>


      {/* Cohort Success Stories Section */}
      <section className="w-full py-20 px-6 sm:px-10 lg:px-16 bg-black max-w-[1920px] mx-auto relative overflow-hidden">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-3">
            Cohort <span className="text-[#4db5ff]">Success Stories</span>
          </h2>
          <p className="text-white/70 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Be inspired by the journeys of our amazing community members.
          </p>
        </div>

        {/* Stories Grid */}
        <div
          className="
      grid grid-cols-1
      [@media(min-width:930px)]:grid-cols-2
      gap-8 lg:gap-12
      max-w-[1200px] mx-auto
      justify-items-center
    "
        >
          {[
            {
              image: "/assests/resources/jane-doe.png",
              quote:
                "The program completely transformed our go-to-market strategy. We found our first 100 customers in just three months!",
              name: "Jane Doe",
              title: "Founder & CEO, InnovateTech",
              link: "Read her story",
            },
            {
              image: "/assests/resources/john-smith.png",
              quote:
                "Connecting with mentors and peers in the cohort was invaluable. The network we built is our company's greatest asset.",
              name: "John Smith",
              title: "Co-Founder, DataStream",
              link: "Read his story",
            },
          ].map((person, i) => (
            <div
              key={i}
              className="
          cohort-story-card 
          w-full max-w-[550px]
          h-auto flex flex-col sm:flex-row
          items-start gap-6 p-7 rounded-xl
          border border-[#2a2a2a] bg-transparent 
          shadow-[0_4px_20px_rgba(255,255,255,0.08)] 
          hover:shadow-[0_6px_25px_rgba(255,163,72,0.25)] 
          hover:border-[#FFA348]/50 
          transition-all duration-300
        "
            >
              <img
                src={person.image}
                alt={person.name}
                className="
            w-24 h-24 rounded-full object-cover
            border border-[#FFA348]/30
            flex-shrink-0 mx-auto sm:mx-0
          "
              />

              <div className="flex flex-col justify-between text-center sm:text-left w-full">
                <h4 className="text-white font-semibold text-base">{person.name}</h4>
                <p className="text-white/50 text-sm mb-3">{person.title}</p>
                <div>
                  <p className="text-white/70 text-base sm:text-lg leading-relaxed mb-3 line-clamp-3">
                    “{person.quote}”
                  </p>
                  <a
                    href="#"
                    className="inline-flex items-center justify-center sm:justify-start gap-2 text-[#FFA348] font-semibold text-sm hover:translate-x-1 transition-transform"
                  >
                    {person.link}
                    <svg
                      width="12"
                      height="10"
                      viewBox="0 0 12 10"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2797 5.03145C10.5727 4.73848 10.5727 4.2627 10.2797 3.96973L6.52969 0.219727C6.23672 -0.0732422 5.76094 -0.0732422 5.46797 0.219727C5.175 0.512695 5.175 0.988476 5.46797 1.28145L7.94062 3.75176H0.75C0.335156 3.75176 0 4.08691 0 4.50176C0 4.9166 0.335156 5.25176 0.75 5.25176H7.93828L5.47031 7.72207C5.17734 8.01504 5.17734 8.49082 5.47031 8.78379C5.76328 9.07676 6.23906 9.07676 6.53203 8.78379L10.282 5.03379L10.2797 5.03145Z"
                        fill="#FFA348"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* Co-Sell Playbooks Section */}
      <section className="w-full py-16 px-4 sm:px-8 lg:px-16 bg-black relative overflow-hidden max-w-[1920px] mx-auto">
        {/* Heading */}
        <div className="flex flex-col justify-start items-center text-center gap-4 mb-12 px-4">
          <h2 className="text-white text-2xl sm:text-3xl lg:text-4xl font-semibold">
            Co-Sell <span className="text-[#4db5ff]">Playbooks</span>
          </h2>
          <p className="text-white/70 text-base sm:text-lg max-w-2xl leading-relaxed">
            Download our expert-crafted guides to accelerate your sales and marketing efforts.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 justify-items-center max-w-7xl mx-auto">
          {[
            {
              icon: "/assests/resources/playbook1.png",
              title: "Partnership Marketing",
              description:
                "A step-by-step guide to building and scaling your partner program.",
            },
            {
              icon: "/assests/resources/playbook2.png",
              title: "Enterprise Sales",
              description:
                "Master the art of closing high-ticket deals with enterprise clients.",
            },
            {
              icon: "/assests/resources/playbook3.png",
              title: "Social Media Growth",
              description:
                "Strategies for building an engaged audience on social platforms.",
            },
            {
              icon: "/assests/resources/playbook4.png",
              title: "SEO Optimization",
              description:
                "Rank higher on search engines and drive organic traffic.",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="relative flex flex-col justify-start items-center text-center gap-4 px-5 py-8 
        rounded-2xl border border-[#2a2a2a] 
        shadow-[0_4px_20px_rgba(255,255,255,0.08)] 
        hover:shadow-[0_6px_25px_rgba(255,163,72,0.25)] 
        hover:border-[#FFA348]/50 
        transition-all duration-300 hover:scale-[1.03] w-[260px] h-[340px] 
        overflow-hidden bg-[#0F0F0F]/80"
            >
              {/* Background mesh */}
              <div
                className="absolute inset-0 opacity-80"
                style={{
                  backgroundImage: "url('/assests/bacground.png')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  zIndex: 0,
                }}
              ></div>

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-start h-full">
                {/* Icon */}
                <div className="w-[120px] h-[120px] flex items-center justify-center mb-[30px] bg-black/30">
                  <img src={item.icon} alt={item.title} className="w-[120px] h-[120px] object-contain" />
                </div>

                {/* Text */}
                <h3 className="text-white text-lg sm:text-xl font-semibold mb-4">
                  {item.title}
                </h3>
                <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-[230px] mb-4 line-clamp-2">
                  {item.description}
                </p>

                {/* Download Button */}
                <button className="px-10 py-2.5 bg-[#FFA348] text-black font-semibold text-sm rounded-lg hover:bg-[#ffb867] transition-all duration-300 flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 1C9 0.446875 8.55313 0 8 0C7.44688 0 7 0.446875 7 1V8.58438L4.70625 6.29063C4.31563 5.9 3.68125 5.9 3.29063 6.29063C2.9 6.68125 2.9 7.31563 3.29063 7.70625L7.29063 11.7063C7.68125 12.0969 8.31563 12.0969 8.70625 11.7063L12.7063 7.70625C13.0969 7.31563 13.0969 6.68125 12.7063 6.29063C12.3156 5.9 11.6812 5.9 11.2906 6.29063L9 8.58438V1ZM2 11C0.896875 11 0 11.8969 0 13V14C0 15.1031 0.896875 16 2 16H14C15.1031 16 16 15.1031 16 14V13C16 11.8969 15.1031 11 14 11H10.8281L9.4125 12.4156C8.63125 13.1969 7.36562 13.1969 6.58437 12.4156L5.17188 11H2ZM13.5 12.75C13.6989 12.75 13.8897 12.829 14.0303 12.9697C14.171 13.1103 14.25 13.3011 14.25 13.5C14.25 13.6989 14.171 13.8897 14.0303 14.0303C13.8897 14.171 13.6989 14.25 13.5 14.25C13.3011 14.25 13.1103 14.171 12.9697 14.0303C12.829 13.8897 12.75 13.6989 12.75 13.5C12.75 13.3011 12.829 13.1103 12.9697 12.9697C13.1103 12.829 13.3011 12.75 13.5 12.75Z"
                      fill="black"
                    />
                  </svg>
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Webinar Replays Section */}
      <section className="webinar-replays-section w-full py-20 px-6 sm:px-10 lg:px-16 bg-black max-w-[1920px] mx-auto relative overflow-hidden">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-3">
            Webinar <span className="text-[#4db5ff]">Replays</span>
          </h2>
          <p className="text-white/70 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Catch up on our past webinars and expert sessions on demand.
          </p>
        </div>

        {/* Swiper Carousel */}
        <Swiper
          modules={[Pagination, Autoplay]}
          spaceBetween={30}
          slidesPerView={1}
          centeredSlides={true}
          pagination={{
            clickable: true,
            el: ".webinar-replays-pagination",
          }}
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
          }}
          loop={true}
          breakpoints={{
            640: { slidesPerView: 1, centeredSlides: true },
            768: { slidesPerView: 2, centeredSlides: true },
            1024: { slidesPerView: 3, centeredSlides: false },
          }}
          className="pb-16 max-w-7xl mx-auto"
        >
          {webinars.map((w, i) => (
            <SwiperSlide key={i} className="flex justify-center">
              <div className="w-[310px] sm:w-[320px] h-[420px] mx-auto bg-black rounded-2xl border border-[#FFA348]/60 hover:border-[#FFA348] hover:shadow-[0_0_25px_rgba(255,163,72,0.3)] overflow-hidden transition-all duration-300 group">

                {/* YouTube Video */}
                <div className="relative w-full h-56 overflow-hidden">
                  <iframe
                    src={`${w.video}?rel=0&controls=1&mute=1`}
                    className="w-full h-full rounded-t-2xl"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    title={w.title}
                  />
                </div>

                {/* Text Content */}
                <div className="p-6 flex flex-col justify-between h-[calc(100%-14rem)]">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mt-3 leading-snug line-clamp-2">
                      {w.title}
                    </h3>
                    <p className="text-white/60 text-sm mt-2 leading-relaxed line-clamp-2">
                      {w.speaker}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[#FFA348] font-semibold text-sm mt-4 group-hover:translate-x-1 transition-transform cursor-pointer">
                    Watch on YouTube
                    <svg
                      width="14"
                      height="12"
                      viewBox="0 0 14 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M13.7063 6.70859C14.0969 6.31797 14.0969 5.68359 13.7063 5.29297L8.70625 0.292969C8.31563 -0.0976562 7.68125 -0.0976562 7.29063 0.292969C6.9 0.683594 6.9 1.31797 7.29063 1.70859L10.5875 5.00234H1C0.446875 5.00234 0 5.44922 0 6.00234C0 6.55547 0.446875 7.00234 1 7.00234H10.5844L7.29375 10.2961C6.90312 10.6867 6.90312 11.3211 7.29375 11.7117C7.68437 12.1023 8.31875 12.1023 8.70938 11.7117L13.7094 6.71172L13.7063 6.70859Z"
                        fill="#FFA348"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Pagination */}
        <div className="webinar-replays-pagination flex justify-center items-center gap-2 mt-6"></div>
      </section>

      <Footer />
    </>
  );
}