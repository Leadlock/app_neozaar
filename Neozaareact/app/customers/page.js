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

  return (
    <>
      <section className="relative w-full flex flex-col items-center justify-start pt-8 px-2 sm:px-6 pb-15 min-h-screen lg:min-h-screen 2xl:min-h-auto">
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
        <div className="relative mx-auto md:my-35 lg:my-25 my-40 w-full max-w-full sm:max-w-[800px] flex flex-col items-center justify-center rounded-lg text-center px-2">
          <h1 className="text-white font-light font-['CreatoDisplay',_sans-serif] text-3xl sm:text-4xl md:text-5xl mb-4 leading-snug">
            Your Journey to Smart Software Solutions.
          </h1>
          <p className="text-gray-200 mb-6 px-2 sm:px-6 text-sm sm:text-base font-['Inter',_sans-serif] mt-5  ">
            {/* Discover enterprise-ready solutions across Security, AI, Modernization, and FinOps — powered by global ISVs like Zscaler, Databricks, Acronis, Commvault, and Snowflake, and tailored for your AWS MACC or Azure EDP strategy. */}
            Discover curated software bundles, enjoy risk-free trials, and transform your business with NeoZaar{"'"}s customer-first approach.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto mt-5">
            <Link href={"/auth/register"}
              className="min-w-[220px] cursor-pointer font-['Inter',_sans-serif] sm:w-auto px-6 font-600 rounded-4xl bg-white/20 hover:bg-[#FFA348] hover:text-black text-white transition h-12 rounded-full py-3">
              <span className='text-6 font-600'>Start Your Journay</span>
            </Link>
            <Link href={"/auth/register"}
              className="min-w-[290px] cursor-pointer font-['Inter',_sans-serif] py-3 border font-600 rounded-4x border-white text-white hover:bg-white hover:text-black transition rounded-full">
              Book Consultation
            </Link>
          </div>
        </div>
      </section>

      <div className="SectionBuyerJourney py-16 bg-black relative overflow-hidden max-w-[1920px] mx-auto">
        <div className="container mx-auto px-6 flex flex-col justify-center items-center gap-12">
          {/* Heading Section */}
          <div className="flex flex-col justify-start items-center gap-5 text-center px-4 sm:px-8 lg:px-56">
            <h2 className="text-white text-2xl sm:text-3xl lg:text-4xl font-semibold">
              Your Buyer <span className="text-[#4db5ff]">Journey on NeoZaar</span>
            </h2>
            <p className="text-white/60 text-base sm:text-lg leading-relaxed max-w-3xl">
              From discovery to deployment, we guide you through every step of finding
              the perfect software solutions for your business needs.
            </p>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-6xl justify-items-center mx-auto">
            {[
              {
                img: "/assests/customer/Discovery.png",
                title: "1. Discovery",
                text: "Browse curated software bundles tailored to your industry and business size.",
              },
              {
                img: "/assests/customer/trial.png",
                title: "2. Trial",
                text: "Experience risk-free trials with full support and guidance from our experts.",
              },
              {
                img: "/assests/customer/consultation.png",
                title: "3. Consultation",
                text: "Book personalized consultations to optimize your software selection.",
              },
              {
                img: "/assests/customer/deploy.png",
                title: "4. Deploy",
                text: "Seamless deployment with ongoing support and exclusive private deals.",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center gap-4 px-4 py-6 rounded-2xl shadow-md w-[220px] h-[220px] transition-transform hover:scale-105 duration-300"
              >
                {/* Icon */}
                <div className="w-16 h-16 flex items-center justify-center bg-orange-200 rounded-full shadow-lg">
                  <div className="relative w-6 h-6 ">


                  <Image
                  fill
                    src={step.img}
                    alt={step.title}
                    className="object-contain"
                  />
                  </div>
                </div>

                {/* Text */}
                <h3 className="text-white text-lg sm:text-xl font-medium">
                  {step.title}
                </h3>
                <p className="text-white/60 text-sm sm:text-base leading-6 max-w-[200px] text-center line-clamp-2">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why Choose NeoZaar Section */}
      <section className="w-full py-16 px-4 sm:px-8 lg:px-16 bg-black relative overflow-hidden max-w-[1920px] mx-auto">
        {/* Heading */}
        <div className="flex flex-col justify-start items-center text-center gap-4 mb-12 px-4">
          <h2 className="text-white text-2xl sm:text-3xl lg:text-4xl font-semibold">
            Why Choose <span className="text-[#8e4dff]">NeoZaar?</span>
          </h2>
          <p className="text-white/70 text-base sm:text-lg max-w-2xl leading-relaxed">
            We{"'"}re committed to making your software procurement journey as smooth and
            risk-free as possible.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center max-w-7xl mx-auto">
          {[
            {
              icon: '/assests/customer/riskfree.png',
              title: 'Risk-Free Trials',
              description:
                'Try before you buy with comprehensive trial periods and full money-back guarantees on all software solutions.',
              points: ['30-day free trials', 'No setup fees'],
            },
            {
              icon: '/assests/customer/bundles.png',
              title: 'Curated Bundles',
              description:
                'Access carefully selected software combinations that work seamlessly together for maximum efficiency.',
              points: [
                'Industry-specific bundles',
                'Pre-integrated solutions',
                'Bundle discounts',
              ],
            },
            {
              icon: '/assests/customer/support.png',
              title: 'Expert Support',
              description:
                'Get personalized guidance from our software experts throughout your entire journey.',
              points: ['24/7 support', 'Personal consultants', 'Implementation help'],
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-start items-center text-center gap-5 px-6 py-10 bg-[#0F0F0F]/90 rounded-2xl border border-[#1E1E1E] shadow-md transition-transform duration-300 hover:scale-[1.03] hover:shadow-lg w-[320px] h-[360px]"
              style={{
                backgroundImage: "url('/assests/bacground.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Icon Box */}
              <div className="w-20 h-20 rounded-lg border border-orange-200 flex items-center justify-center mb-2">
              <div className="relative w-7 h-7">

                <img
                fill
                  src={item.icon}
                  alt={item.title}
                  className=" object-contain"
                />
              </div>
              </div>

              {/* Text Centered */}
              <div className="flex flex-col items-center justify-center text-center">
                <h3 className="text-white text-xl sm:text-2xl font-semibold mb-2">
                  {item.title}
                </h3>
                <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-3 max-w-[280px]">
                  {item.description}
                </p>
              </div>

              {/* Points (Left Aligned but within center-aligned card) */}
              <ul className="text-white/70 text-sm sm:text-base space-y-1 mt-2 text-left w-full max-w-[250px]">
                {item.points.map((point, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Software Bundles Section */}
      <section className="w-full py-16 px-4 sm:px-8 lg:px-16 bg-black relative overflow-hidden max-w-[1920px] mx-auto">
        {/* Heading */}
        <div className="flex flex-col justify-start items-center text-center gap-4 mb-12 px-4">
          <h2 className="text-white text-2xl sm:text-3xl lg:text-4xl font-semibold">
            Featured <span className="text-[#4db5ff]">Software Bundles</span>
          </h2>
          <p className="text-white/70 text-base sm:text-lg max-w-2xl leading-relaxed">
            Discover our most popular curated bundles designed for different business needs and industries.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 justify-items-center max-w-7xl mx-auto w-full">
          {[
            {
              icon: '/assests/customer/ecommerce.png',
              titleTop: 'E-commerce Bundle',
              title: 'E-commerce Starter',
              description:
                'Complete solution for online retail including CRM, inventory management, and payment processing.',
              price: '$299/mo',
              oldPrice: '$450/mo',
            },
            {
              icon: '/assests/customer/marketing.png',
              titleTop: 'Marketing Bundle',
              title: 'E-Marketing Proommerce Starter',
              description:
                'Comprehensive marketing automation, analytics, and customer engagement tools.',
              price: '$199/mo',
              oldPrice: '$320/mo',
            },
            {
              icon: '/assests/customer/hr.png',
              titleTop: 'HR Bundle',
              title: 'HR Complete',
              description:
                'Full HR suite including payroll, recruitment, performance management, and compliance.',
              price: '$149/mo',
              oldPrice: '$240/mo',
            },
          ].map((bundle, i) => (
            <div
              key={i}
              className="flex flex-col justify-between border border-orange-200 rounded-2xl w-[340px] h-[430px] overflow-hidden shadow-lg hover:scale-[1.03] transition-transform duration-300"
            >
              {/* Top Section */}
              <div className="bg-orange-200 flex flex-col items-center justify-center h-[180px] gap-3">
                <img
                  src={bundle.icon}
                  alt={bundle.titleTop}
                  className="w-10 h-10 object-contain"
                />
                <h4 className="text-black text-base font-medium">{bundle.titleTop}</h4>
              </div>

              {/* Content */}
              <div className="flex flex-col justify-between px-6 py-6 text-left h-[240px]">
                <div>
                  <h3 className="text-white text-xl sm:text-2xl mb-2 line-clamp-1">
                    {bundle.title}
                  </h3>
                  <p className="text-white/70 text-sm sm:text-base leading-6 mb-2 line-clamp-2">
                    {bundle.description}
                  </p>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-2xl ">
                    {bundle.price}
                  </span>
                  <span className="text-white/50 text-base line-through">
                    {bundle.oldPrice}
                  </span>
                </div>

                {/* Button */}
                <button className="w-full bg-orange-400 text-black py-2.5 rounded-full text-base font-medium hover:bg-orange-300 transition-colors">
                  Try Now
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="flex justify-center mt-12">
          <button className="px-6 py-2.5 bg-white/20 rounded-full backdrop-blur-sm text-white font-semibold hover:bg-white/30 transition">
            View All Bundles
          </button>
        </div>
      </section>

      {/* Private Deal Section */}
      <section className="private-deal-section w-full py-16 px-6 sm:px-10 lg:px-16 bg-black max-w-[1920px] mx-auto relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center max-w-7xl mx-auto relative z-10">

          {/* Left Content */}
          <div className="flex flex-col items-start justify-center gap-8">
            {/* Heading */}
            <div>
              <h2 className="text-white text-2xl sm:text-3xl lg:text-4xl font-semibold mb-3">
                Exclusive <span className="text-[#4db5ff]">Private Deal Workflow</span>
              </h2>
              <p className="text-white/70 text-base sm:text-lg leading-relaxed max-w-[600px]">
                Get access to exclusive pricing and custom packages through our private deal process, designed for enterprise customers.
              </p>
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-6 w-full">
              {[
                {
                  num: "1",
                  title: "Submit Requirements",
                  desc: "Tell us about your specific needs and budget requirements",
                },
                {
                  num: "2",
                  title: "Custom Proposal",
                  desc: "Receive a tailored proposal with exclusive pricing",
                },
                {
                  num: "3",
                  title: "Negotiation",
                  desc: "Work with our team to finalize terms and pricing",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4"
                >
                  {/* Step Number */}
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-orange-200 text-black font-semibold shadow-md">
                    {item.num}
                  </div>

                  {/* Step Content */}
                  <div className="flex flex-col">
                    <h4 className="text-white text-base sm:text-lg font-semibold">
                      {item.title}
                    </h4>
                    <p className="text-white/60 text-sm sm:text-base max-w-[420px] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button className="px-6 py-2.5 mt-4 bg-white/20 text-white rounded-full backdrop-blur-sm font-semibold hover:bg-white/30 transition">
              Request Private Deal
            </button>
          </div>

          {/* Right Image + Animated Glow */}
          <div className="relative flex justify-center md:justify-end">
            {/* Animated Nebula Glow */}
            <div className="absolute inset-0 w-[550px] h-[420px] md:w-[600px] md:h-[460px] bg-gradient-to-r from-[#4db5ff40] via-[#ffa34830] to-[#4db5ff40] rounded-[40px] blur-[100px] animate-pulse-glow"></div>

            {/* Image */}
            <div className="relative w-full max-w-[550px]">

            <Image
              fill
              src="/assests/customer/private-deal.png" // your actual image
              alt="Private Deal Workflow"
              className="relative z-10 h-auto rounded-[30px] md:rounded-[40px] shadow-xl object-cover border border-[#1e1e1e]"
            />
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials Section */}
      <section className="w-full py-14 px-6 sm:px-10 lg:px-16 bg-black max-w-[1920px] mx-auto relative overflow-hidden testimonial-section">
        {/* Section Header */}
        <div className="flex flex-col justify-start items-center text-center gap-2 mb-10 px-4">
          <h2 className="text-white text-2xl sm:text-3xl lg:text-4xl font-semibold">
            What Our <span className="text-[#4db5ff]">Customers Say</span>
          </h2>
          <p className="text-white/70 text-base sm:text-lg max-w-2xl leading-relaxed mt-1">
            Hear from businesses that have transformed their operations with NeoZaar.
          </p>
        </div>

        {/* Navigation Arrows (Desktop Only) */}
        <div className="swiper-button-prev-custom hidden lg:flex absolute -left-14 top-[55%] -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-[#FFA348]  items-center justify-center text-[#FFA348] hover:bg-[#FFA348] hover:text-black shadow-md transition cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        <div className="swiper-button-next-custom hidden lg:flex absolute -right-14 top-[55%] -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-[#FFA348]  items-center justify-center text-[#FFA348] hover:bg-[#FFA348] hover:text-black shadow-md transition cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Swiper Carousel */}
        <div className="relative !py-4 sm:!py-2">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={30}
            slidesPerView={1}
            centeredSlides={true}
            navigation={{
              nextEl: ".swiper-button-next-custom",
              prevEl: ".swiper-button-prev-custom",
            }}
            pagination={{
              clickable: true,
              el: ".swiper-pagination-custom",
            }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            loop={true}
            breakpoints={{
              640: { slidesPerView: 1, centeredSlides: true },
              768: { slidesPerView: 2, centeredSlides: true },
              1024: { slidesPerView: 3, centeredSlides: false },
            }}
            className="!mt-0 !pt-0 pb-20 max-w-7xl mx-auto"
          >
            {[
              {
                name: "Sarah Johnson",
                role: "CEO, TechStart Inc.",
                text: "NeoZaar’s curated bundles saved us months of research. The risk-free trial gave us confidence to make the right choice.",
                stars: 5,
              },
              {
                name: "Michael Chen",
                role: "CTO, GrowthCorp",
                text: "The private deal workflow helped us negotiate enterprise pricing that fit our budget perfectly. Exceptional service!",
                stars: 5,
              },
              {
                name: "Lisa Rodriguez",
                role: "Operations Director, RetailPro",
                text: "From consultation to deployment, NeoZaar’s team supported us every step of the way. Our productivity increased by 40%.",
                stars: 5,
              },
              {
                name: "David Patel",
                role: "Founder, CloudWorks",
                text: "The support team went above and beyond to customize our tools. NeoZaar made digital transformation simple and effective.",
                stars: 5,
              },
            ].map((t, i) => (
              <SwiperSlide key={i} className="flex justify-center">
                <div className="relative w-96 h-60 bg-black rounded-lg p-6 shadow-[0px_0px_10px_0px_rgba(255,168,76,0.25)] border border-transparent hover:border-[#FFA348]/60 transition-all duration-300 hover:shadow-[0px_0px_25px_3px_rgba(255,168,76,0.45)] flex flex-col justify-between group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#1a1a1a] border border-[#FFA348]/40">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="12" cy="8" r="4" stroke="#FFA348" strokeWidth="1.5" />
                        <path d="M4 20c0-3.333 2.667-6 8-6s8 2.667 8 6" stroke="#FFA348" strokeWidth="1.5" />
                      </svg>
                    </div>

                    <div className="flex flex-col justify-start items-start">
                      <h4 className="text-white text-base font-medium">{t.name}</h4>
                      <p className="text-white/50 text-sm">{t.role}</p>
                    </div>
                  </div>

                  <p className="text-white/70 text-sm leading-6 mt-2">“{t.text}”</p>

                  <div className="flex items-center gap-1 mt-3">
                    {[...Array(t.stars)].map((_, idx) => (
                      <svg
                        key={idx}
                        width="18"
                        height="16"
                        viewBox="0 0 18 16"
                        fill="#FFA348"
                        xmlns="http://www.w3.org/2000/svg"
                        className="opacity-70"
                      >
                        <path d="M9.90254 0.5625C9.73692 0.21875 9.38692 0 9.00255 0C8.61817 0 8.27129 0.21875 8.10254 0.5625L6.09317 4.69688L1.60567 5.35938C1.23067 5.41563 0.91817 5.67812 0.802545 6.0375C0.68692 6.39687 0.78067 6.79375 1.04942 7.05937L4.30567 10.2812L3.53692 14.8344C3.47442 15.2094 3.63067 15.5906 3.94005 15.8125C4.24942 16.0344 4.65879 16.0625 4.99629 15.8844L9.00567 13.7437L13.015 15.8844C13.3525 16.0625 13.7619 16.0375 14.0713 15.8125C14.3807 15.5875 14.5369 15.2094 14.4744 14.8344L13.7025 10.2812L16.9588 7.05937C17.2275 6.79375 17.3244 6.39687 17.2057 6.0375C17.0869 5.67812 16.7775 5.41563 16.4025 5.35938L11.9119 4.69688L9.90254 0.5625Z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Pagination */}
        <div className="swiper-pagination-custom flex justify-center items-center gap-2 mt-8 relative z-10"></div>
      </section>

      {/* Call to Action Section */}
      <section className="w-full py-20 px-6 sm:px-10 lg:px-16 bg-black max-w-[1920px] mx-auto text-center flex flex-col items-center justify-center gap-10">
        {/* Heading */}
        <div className="flex flex-col items-center justify-center gap-3">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold bg-gradient-to-r from-[#FFA348] to-[#4db5ff] bg-clip-text text-transparent">
            Ready to Transform Your Business?
          </h2>

          <p className="text-white/70 text-base sm:text-lg max-w-2xl leading-relaxed">
            Book a consultation with our software experts and discover the perfect
            solutions for your unique business needs.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap justify-center items-center gap-5">
          <button className="px-8 py-3 rounded-full bg-white/20 hover:bg-[#FFA348] hover:text-black text-white font-semibold backdrop-blur-[2px] transition duration-300">
            Book Consultant
          </button>
          <button className="px-8 py-3 rounded-full border border-white text-white hover:bg-white hover:text-black font-semibold transition duration-300">
            Contact Sales
          </button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-20 text-center mt-12 max-w-[1000px] w-full">
          <div className="flex flex-col items-center justify-center">
            <h3 className="text-3xl sm:text-4xl font-semibold text-white">500+</h3>
            <p className="text-gray-300 text-base mt-1">Software Solutions</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <h3 className="text-3xl sm:text-4xl font-semibold text-white">10,000+</h3>
            <p className="text-gray-300 text-base mt-1">Happy Customers</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <h3 className="text-3xl sm:text-4xl font-semibold text-white">99.9%</h3>
            <p className="text-gray-300 text-base mt-1">Uptime Guarantee</p>
          </div>
        </div>
      </section>


      <Footer />
    </>
  );
}