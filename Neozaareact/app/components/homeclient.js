

"use client";
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import Header from '../layouts/Header';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Footer from "../layouts/Footer";
import Link from 'next/link';
import { useRouter } from "next/navigation";
// import { useEffect } from 'react'
import { useState} from 'react';
import { useEffect } from 'react';



export default function Page(){
 const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && setIsOpen(false);
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const NAV_LINKS = [
    { href: '/isv-registration', label: 'ISV Registration' },
    { href: '/partner-with-us', label: 'Partner With Us' },
    { href: '/contact-us', label: 'Contact Us' },
  ];

  const handleMarketplaceClick = () => {
    const isLoggedIn = localStorage.getItem("token"); // or cookie/session check
    if (isLoggedIn) {
      router.push("/");
    } else {
      router.push("/auth/login");
    }
  };
    return (
<>
 <main className="bg-black min-h-screen w-full mx-auto max-w-[1920px]">
        {/* Hero Section */}
    
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
          <div className="relative mx-auto md:my-35 lg:my-25 my-10 w-full max-w-full sm:max-w-[800px] flex flex-col items-center justify-center rounded-lg text-center px-2">
            <h1 className="text-white font-light font-['CreatoDisplay',_sans-serif] text-3xl sm:text-4xl md:text-5xl mb-4 leading-snug">
              Smarter Cloud Solutions. Curated Solutions. Aligned to Your Cloud Commitments.
            </h1>
            <p className="text-gray-200 mb-6 px-2 sm:px-6 text-sm sm:text-base font-['Inter',_sans-serif] mt-3">
              {/* Discover enterprise-ready solutions across Security, AI, Modernization, and FinOps — powered by global ISVs like Zscaler, Databricks, Acronis, Commvault, and Snowflake, and tailored for your AWS MACC or Azure EDP strategy. */}
              Discover enterprise-ready solutions across Security, AI, Modernization, <br className="hidden sm:inline" />and FinOps — powered by global ISVs like Zscaler,CheckPoint, CrowdStrike,<br className="hidden sm:inline" /> Commvault, and  Fortinet, and tailored for 
              <br className="hidden sm:inline" />your AWS MACC or Azure EDP strategy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
              <Link href={"/auth/register"}
              className="min-w-[220px] cursor-pointer font-['Inter',_sans-serif] sm:w-auto px-6 bg-white/20 text-white font-600 rounded-4xl hover:bg-white hover:text-black transition h-12 rounded-full py-3">
                <span className='text-6 font-600'>Explore Now</span> <span className="pl-12 inline text-8 font-extrabold">↗</span>
              </Link>
              <Link href={"/auth/register"}
               className="min-w-[290px] cursor-pointer font-['Inter',_sans-serif] py-3 border border-white text-white font-600 rounded-4xl hover:bg-white/40 hover:text-white transition rounded-full">
                <Image src="/assests/sparkle_png.png" width={24} height={24} alt="sparkle icon" className="hover:text-black w-6 h-6 inline-block mr-4" />Let AI Find Your Solution
              </Link>
            </div>
          </div>
        </section>
        {/* Brand Logos Carousel */}
        <section className="w-full px-2 sm:px-8  ">
           <h2 className="text-white font-['CreatoDisplay-Light',_sans-serif] text-3xl md:text-4xl xl:text-5xl font-normal mt-6 py-5 text-center  xl:leading-[60px] flex justify-center items-center mb-20">
            
          OUR SUPPORTING PARTNERS
          </h2>
          <Swiper
            className="w-full !p-0 [&>.swiper-wrapper]:!m-0 !mt-4 lg:h-60 h-30 "
            modules={[Autoplay]}
            loop={true}
            speed={4000}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
            }}
            grabCursor={true}
            spaceBetween={20}
            slidesPerView={1.2}
            breakpoints={{
              320: { slidesPerView: 2.5 },
              640: { slidesPerView: 2.5 },
              768: { slidesPerView: 1.5 },
              1024: { slidesPerView: 2 },
              1280: { slidesPerView: 2.5 },
              1400: { slidesPerView: 3 },
              1600: { slidesPerView: 4 },
            }}
          >
            {[
              '/brand-log/Acronis-logo.svg.png',
              '/brand-log/AWS Logo.png',
              '/brand-log/Check_Point_Logo_2022.png',
              '/brand-log/Google cloud.png',
              '/brand-log/IBM Logo.png',
              '/brand-log/Microsoft_Azure_Logo.svg.png',
              '/brand-log/O365 Logo.png',
              '/brand-log/Veeam_logo.png',
              '/brand-log/wiz-logo-png_seeklogo-455765.png',
              '/brand-log/Zscaler_logo.png',
             
            ].map((src, idx) => (
              <SwiperSlide key={idx} className="flex items-center justify-center">
                <div className='flex items-center justify-center'>
                  <Image
                    src={src}
                    alt="Brands"
                    width={300}
                    height={50}
                    className="md:h-20 w-auto h-6"
                    priority
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        {/* Features Section */}
        <section className="w-full pt-6 pb-12 sm:py-16 px-2 sm:px-10 lg:px-25 flex flex-col items-center">
          <h2 className="text-white font-['CreatoDisplay-Light',_sans-serif] text-3xl md:text-4xl xl:text-5xl font-normal mt-6 mb-10 text-center  max-w-[600px] xl:leading-[60px]">
            
          The Marketplace Built Around   Your Cloud Goals.
          </h2>
          <div className="xl:h-[427px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-[1240px] mx-auto px-2 sm:px-6 lg:px-8 xl:px-0" >
            {[
              {
                src: '/brand-log/cost_effective.png',
                title: 'Cost-Effective Solutions',
                text: 'Access budget-friendly cloud Solutions aligned to your existing cloud credits',
              },
              {
                src: '/brand-log/Diverse.png',
                title: 'Diverse Products & Solutions',
                text: 'From backup to GenAI — find everything in one place.',
              },
              {
                src: '/brand-log/profileicon.png',
                title: 'Expert Support',
                text: '3. Get deployment, migration, or support services from certified experts.',
              },
              {
                src: '/brand-log/ai.png',
                title: 'AI-Powered Recommendations',
                text: 'Our AI matches your business needs with cost-optimized, credit-aligned solutions.',
              },
            ].map((item, idx) => (

              <div
                key={idx}
                className="w-[295px] h-[427px] relative bg-black/80 border border-gray-700 rounded-[5px] p-6 mx-auto "
                style={{
                  backgroundImage: "url('/assests/bacground.png')",
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                
                }}
              >
                <div className="flex items-center justify-center my-15 h-52 ">
                  <Image
                    src={item.src}
                    alt={item.title}
                    width={100}
                    height={100}
                    style={{
                      width: '100px',
                      height: 'auto',
                      borderRadius: '20px',
                    
                    }}
                  />
                </div>
                <div className="flex flex-col items-start text-left mb-3">
                  <h3 className="font-bold font-['CreatoDisplay-Light',_sans-serif] text-xl sm:text-2xl mb-2 text-white max-w-[200px] h-15 overflow-hidden line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-[#FFFFFF80] font-['Inrai',_sans-serif] text-sm sm:text-base lg:max-w-[250px] xl:max-w-[300px] line-clamp-3">
                    {item.text}
                  </p>
                </div>
              </div>

            ))}
          </div>
        </section>

        {/* Find Exactly What You Need Section */}
        <section className="max-w-[1240px] mx-auto   flex flex-col items-center">
          <h2 className="text-white text-3xl sm:text-3xl md:text-5xl font-['CreatoDisplay-Light',_sans-serif] font-normal sm:mb-10 mb-7 text-center sm:text-left w-full leading-snug">
            Find Exactly What <br /> You Need
          </h2>

          {/* Laptop View */}
          <div className="hidden lg:grid grid-cols-3 w-full h-[650px] border-image-horizontal">
            {[
              {
                img: "/brand-log/individual_products.png",
                title: "Individual Products",
                desc: "Explore verified SaaS, cloud, AI, and security solutions. Our catalog features best-in-class tools from global Independent Software Vendors (ISVs).",
                 point1:'Feature-wise comparison',
                point2:'Transparent pricing',
                point3:'Private offer support',
                point4:'Integrated trial or demo flows',
                btn: "Explore Products",
              },
               
              {
                img: "/brand-log/curated_bundles.png",
                title: "Curated Solutions",
                desc: "Accelerate your outcomes with solution-focused Solutions. NeoZaar FastTrack FlexSolutions combine top products, cloud infrastructure, and deployment support — aligned to your goals",
                  point1:'Security, AI, Modernization, FinOps kits',
                point2:'Pre-configured and deployable in days',
                point3:'AWS/Azure credit-aligned (MACC/EDP support)',
                point4:'Add-on services available from certified partners',
                btn: "Discover Solutions",

              },
              {
                img: "/brand-log/expert_services.png",
                title: "Expert Services",
                desc: "Certified MSPs & cloud consultants at your fingertips.Whether you’re migrating, modernizing, or scaling, our service partners are here to deliver success — on time and on budget.",
                 point1:'Cloud migration & DevOps',
                point2:'Security implementation',
                point3:'Managed services & compliance',
                point4:'Optional white-label delivery',
              
                btn: "Find a Partner",
              },
            ].map((card, idx) => (
              <div
                key={idx}
                className={`bg-black/80 p-6 px-10 flex flex-col items-start text-left h-full ${idx !== 0 ? 'border-l-[1px] border-gray-700 border-image-vertical' : ''
                  }`}
              >
                <Image
                  src={card.img}
                  alt={card.title}
                  width={320}
                  height={160}
                  className="mb-4 w-full rounded-[20px]  "
                  style={{ height: "232px", objectFit: "cover" }}
                />
                <h3 className="text-white font-['CreatoDisplay-Light',_sans-serif] text-[22px] md:text-[25px] h-15 overflow-hidden line-clamp-2 font-normal mb-2 pl-2 mt-2">
                  {card.title}
                </h3>
                <p className="text-[#71717A] text-sm mb-6 pl-2 font-['Inter',_sans-serif] overflow-hidden line-clamp-4">
                  {card.desc}
                </p>
                 <ul className='ps-5 text-gray-200'>
           <li className='list-disc'>
            {card.point1}
            </li>
           <li className='list-disc'>
            {card.point2}
            </li>
           <li className='list-disc'>
            {card.point3}
            </li>
           <li className='list-disc'>
            {card.point4}
            </li>
                      </ul>
                <div className="mt-auto pl-2 w-full">
                  <button onClick={handleMarketplaceClick}
                  className="px-5 py-2 cursor-pointer bg-zinc-700 text-white rounded-[27px] hover:bg-white hover:text-black transition w-auto">
                    {card.btn}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tablet View */}
          <div className="hidden md:grid lg:hidden grid-cols-2 w-full border-image-horizontal">
            {[
              {
                img: "/brand-log/individual_products.png",
                title: "Individual Products",
                desc: "Choose from a wide catalog of 1–3rd-party cloud products. Find the best solution for storage, compute, networking, and more. Includes leading Independent Software Vendors (ISVs).",
                        point1:'Feature-wise comparison',
                point2:'Transparent pricing',
                point3:'Private offer support',
                point4:'Integrated trial or demo flows',
                btn: "Explore Products",
              },
              {
                img: "/brand-log/curated_bundles.png",
                title: "Curated Solutions",
                desc: "Get more value with pre-configured packages. Our Solutions combine storage, compute, and ISV solutions for maximum flexibility, scalability, and savings in key pipelines.",
                  point1:'Security, AI, Modernization, FinOps kits',
                point2:'Pre-configured and deployable in days',
                point3:'AWS/Azure credit-aligned (MACC/EDP support)',
                point4:'Add-on services available from certified partners',
                btn: "Discover Solutions",
                btn: "Discover Solutions",
              },
              {
                img: "/brand-log/expert_services.png",
                title: "Expert Services",
                desc: "Access integrated, knowledgeable support from certified professionals. Take advantage of consulting, migration, optimization, and ongoing support.",
                 point1:'Cloud migration & DevOps',
                point2:'Security implementation',
                point3:'Managed services & compliance',
                point4:'Optional white-label delivery',
                btn: "Find a Partner",
              },
            ].map((card, idx) => (
              <div key={idx} className="relative h-full">
                {(idx === 0 || idx === 1) && (
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] border-image-horizontal pointer-events-none" />
                )}
                {idx === 1 && (
                  <div className="absolute top-0 bottom-0 left-0 w-[1px] border-image-vertical pointer-events-none" />
                )}
                <div className="bg-black/80 p-6 md:px-10 flex flex-col items-start text-left h-full">
                  <Image
                    src={card.img}
                    alt={card.title}
                    width={320}
                    height={160}
                    className="mb-4 w-full rounded-[20px] "
                    style={{ height: "232px", objectFit: "cover" }}
                  />
                  <h3 className="text-white font-['CreatoDisplay-Light',_sans-serif] text-[22px] md:text-[25px] h-15 overflow-hidden line-clamp-2 font-normal mb-2 pl-2 mt-2">
                    {card.title}
                  </h3>
                  <p className=" text-sm mb-6 pl-2 font-['Inter',_sans-serif] overflow-hidden line-clamp-4">
                    {card.desc}
                  </p>
                   <ul className='ps-4 text-gray-200'>
                    <li className='list-disc'>
                      {card.point1}
                      </li>
                    <li className='list-disc'>
                      {card.point2}
                      </li>
                    <li className='list-disc'>
                      {card.point3}
                      </li>
                    <li className='list-disc'>
                      {card.point4}
                      </li>
             
              
                      </ul>
                  <div className="mt-auto pl-2 w-full">
                    <button onClick={handleMarketplaceClick}
                    className="px-5 py-2 cursor-pointer bg-zinc-700 text-white rounded-[27px] hover:bg-white hover:text-black transition w-auto">
                      {card.btn}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile View */}
        <div className="grid md:hidden grid-cols-1 w-full border-image-horizontal">
  {[
    {
      img: "/brand-log/individual_products.png",
      title: "Individual Products",
      desc: "Choose from a wide catalog of 1–3rd-party cloud products. Find the best solution for storage, compute, networking, and more. Includes leading Independent Software Vendors (ISVs).",
       point1:'Cloud migration & DevOps',
                point2:'Security implementation',
                point3:'Managed services & compliance',
                point4:'Optional white-label delivery',
      btn: "Explore Products",

    },
    {
      img: "/brand-log/curated_bundles.png",
      title: "Curated Solutions",
      desc: "Get more value with pre-configured packages. Our Solutions combine storage, compute, and ISV solutions for maximum flexibility, scalability, and savings in key pipelines.",
        point1:'Security, AI, Modernization, FinOps kits',
                point2:'Pre-configured and deployable in days',
                point3:'AWS/Azure credit-aligned (MACC/EDP support)',
                point4:'Add-on services available from certified partners',
                btn: "Discover Solutions",
      btn: "Discover Solutions",
    },
    {
      img: "/brand-log/expert_services.png",
      title: "Expert Services",
      desc: "Access integrated, knowledgeable support from certified professionals. Take advantage of consulting, migration, optimization, and ongoing support.",
              point1:'Feature-wise comparison',
                point2:'Transparent pricing',
                point3:'Private offer support',
                point4:'Integrated trial or demo flows',
      btn: "Find a Partner",
    },
  ].map((card, idx) => (
    <div
      key={idx}
      className="bg-black/80 p-6 flex flex-col items-start text-left h-full"
      style={{
        backgroundRepeat: "no-repeat",
        backgroundImage: "url('/assests/bacground.png')",
        backgroundSize: "contain",
        backgroundPosition: "center",
        // ✅ should be decimal (40% opacity), not 40
      }}
    >
      <Image
        src={card.img}
        alt={card.title}
        width={320}
        height={160}
        className="mb-4 w-full rounded-[20px]"
        style={{ height: "232px", objectFit: "cover" }}
      />
      <h3 className="text-white font-['CreatoDisplay-Light',_sans-serif] text-[22px] md:text-[25px] h-15 overflow-hidden line-clamp-2 font-normal mb-2 pl-2 mt-2">
        {card.title}
      </h3>
      <p className="text-[#71717A] text-sm mb-6 pl-2 font-['Inter',_sans-serif] overflow-hidden line-clamp-4">
        {card.desc}
      </p>
        <ul className='ps-4 text-gray-200'>
           <li className='list-disc'>
            {card.point1}
            </li>
           <li className='list-disc'>
            {card.point2}
            </li>
           <li className='list-disc'>
            {card.point3}
            </li>
           <li className='list-disc'>
            {card.point4}
            </li>
             
              
                      </ul>
      <div className="mt-auto pl-2 w-full">
        <button onClick={handleMarketplaceClick}
        className="px-5 py-2 cursor-pointer bg-zinc-700 text-white rounded-[27px] hover:bg-white hover:text-black transition w-auto">
          {card.btn}
        </button>
      </div>
    </div>
  ))}
</div>


          {/* Discover & Connect + Build & Manage */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full bg-black/80"
            style={{
              borderBottom: '1px solid',
              borderImageSource:
                'linear-gradient(270deg, rgba(63, 63, 70, 0) 0%, #3F3F46 20%, #3F3F46 80%, rgba(63, 63, 70, 0) 100%)',
              borderImageSlice: 1,
            }}
          >
            <div className="bg-transparent text-white p-6 sm:p-8 pt-12 flex flex-col justify-betweens md:pt-16 max-w-full xl:w-135 border-image-horizontal">
              <h4 className="text-2xl font-normal mb-4 font-['CreatoDisplay-Light',_sans-serif] overflow-hidden line-clamp-2">Discover & Connect</h4>
              <p className="text-[#71717A] mb-4 text-sm sm:text-base font-['Inter',_sans-serif] overflow-hidden line-clamp-4">
                Explore our marketplace of cloud-native products and expert services — all in one place.
NeoZaar connects you with verified ISVs and solution partners who handle demos, onboarding, support, and everything in between.
              </p>
              <div className="flex flex-row gap-4 sm:gap-8 mb-8">
                <div>
                  <h5 className="font-semibold mb-1 underline text-[16px] font-['CreatoDisplay-Light',_sans-serif] overflow-hidden line-clamp-2">Products</h5>
                  <p className="text-[#71717A] text-sm font-['Inter',_sans-serif] overflow-hidden line-clamp-4">Explore SaaS, security, AI, DevOps, and data solutions from trusted global ISVs.</p>
                </div>
                <div>
                  <h5 className="font-semibold mb-1 underline text-[16px] font-['CreatoDisplay-Light',_sans-serif] overflow-hidden line-clamp-2">Services</h5>
                  <p className="text-[#71717A] text-sm font-['Inter',_sans-serif] overflow-hidden line-clamp-4">Find the right partner for cloud migration, FinOps, compliance, or managed support.</p>
                </div>
              </div>
              <button onClick={handleMarketplaceClick}
              className="font-['Inter'] cursor-pointer self-start px-5 py-2 mb-10 bg-zinc-700 text-white rounded-[27px] hover:bg-white hover:text-black transition w-auto">
                Explore the Marketplace
              </button>
            </div>
            <div className="flex flex-col justify-between bg-transparent text-white p-6 sm:py-8 sm:pt-16 md:pl-20 max-w-full md:border-l border-gray-700 xl:w-125">
              <h4 className="text-2xl font-normal mb-4 font-['CreatoDisplay-Light',_sans-serif] overflow-hidden line-clamp-2">Build & Manage</h4>
              <p className="text-[#71717A] mb-4 text-sm sm:text-base font-['Inter',_sans-serif] overflow-hidden line-clamp-4">
                Choose NeoZaar’s pre-packaged Solutions for a fully managed experience — from day one to day 100 and beyond.
              </p>
            <ul className='text-[#71717A] ps-4'>
              {/* <li className='list-decimal'>One Point of Contact
</li>
              <li className='list-decimal'> Unified Billing & Support
Simplify procurement with one contract, one invoice, one support channel.</li> */}
            </ul>
              <div className="flex flex-row gap-4 sm:gap-8 mt-5 mb-8">
                <div>
                  <h5 className="font-semibold mb-1 text-[14px] sm:text-[16px] underline font-['CreatoDisplay-Light',_sans-serif] overflow-hidden line-clamp-2">One Point of Contact</h5>
                  <p className="text-[#71717A] text-sm font-['Inter',_sans-serif] overflow-hidden line-clamp-3">A dedicated NeoZaar project lead for end-to-end coordination.</p>
                </div>
                <div>
                  <h5 className="font-semibold mb-1 text-[16px] underline font-['CreatoDisplay-Light',_sans-serif] overflow-hidden line-clamp-2">Unified Billing & Support</h5>
                  <p className="text-[#71717A] text-sm font-['Inter',_sans-serif] overflow-hidden line-clamp-3">Simplify procurement with one contract, one invoice, one support channel.</p>
                </div>
              </div>
              <button onClick={handleMarketplaceClick}
              className="px-5 font-['Inter'] cursor-pointer py-2 mb-10 bg-zinc-700 text-white rounded-[27px] hover:bg-white hover:text-black transition w-auto self-start">
                View Our Solutions
              </button>
            </div>
          </div>
        </section>
        <div className="flex flex-col items-center justify-center relative">
          {/* Title */}

          <div className='absolute inset-0 w-full h-full z-0 hidden md:block' style={{
            backgroundRepeat: "no-repeat",
            backgroundImage: "url('/image/Rectangle 112.png')",
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            opacity: 40,
            backgroundSize: 'auto',
          }}></div>

          <h2 className="text-3xl sm:text-4xl text-white md:text-5xl py-10  md:mb-16 text-center font-['CreatoDisplay-Light',_sans-serif] w-full
                sm:w-[600px] z-50 aspect-[3/1]"
          >
            Your Journey, <br /> Simplified
          </h2>
        </div>

        {/* bg Image */}
        <div className="relative max-w-[1240px] mx-auto  h-[500px]  items-center justify-start md:py-8  hidden md:block border-image-horizontal">
          <Image
            src="/image/Group 408.png"
            fill
            style={{ objectFit: 'contain' }}
            alt="Group 408"
          />

        </div>

        <div className="max-w-screen-lg mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:hidden sm:hidden">

            {/* Card 1 */}
            <div className="rounded-2xl bg-[#2E1700]  bg-[linear-gradient(153.84deg,#361B00_0%,#000000_21.19%,#0C0C0C_100%)] text-white p-6 [border-width:1px] border-solid border-transparent [border-image-source:linear-gradient(154.42deg,#F79331_0%,#000000_33%)] [border-image-slice:1] shadow-md flex flex-col justify-between min-h-[300px]">

              <div className="mb-4">
                <div className="bg-[#2E1700] rounded-lg p-3 inline-block">
                  <Image src="/image/Vector.png" width={20} height={20} alt="Icon" className=" block" />
                </div>
              </div>

              <h2 className="text-base/semibold font-['inter'] mb-6">
                Using the Marketplace
              </h2>

              <p className="font-['Inter'] text-gray-400 font-normal text-[12px] leading-[1]  tracking-[0] align-middle mb-6">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>

              <div className="border-t border-gray-700 mb-6" />

              <div>
                <div className="text-sm font-['Inter'] leading-relaxed mb-2">Discover</div>
                <p className="text-xs text-gray-400">
                  Find the right product or service partner in our catalog.
                </p>
              </div>
              <div className="border-t border-gray-700 mb-6" />

              <div>
                <div className="text-sm font-['Inter'] leading-relaxed mb-2">Connect</div>
                <p className="text-xs text-gray-400">
                  We introduce you directly to the vetted partner.
                </p>
              </div>
              <div className="border-t border-gray-700 mb-6" />

              <div>
                <div className="text-sm font-['Inter'] leading-relaxed mb-2">Engage</div>
                <p className="text-xs text-gray-400">
                  The partner takes it from there with demos, quotes, and direct support.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl bg-[#2E1700] bg-[linear-gradient(153.84deg,#361B00_0%,#000000_21.19%,#0C0C0C_100%)] text-white p-6 [border-width:1px] border-solid border-transparent [border-image-source:linear-gradient(154.42deg,#F79331_0%,#000000_33%)] [border-image-slice:1] shadow-md flex flex-col justify-between min-h-[300px]">

              <div className="mb-4">
                <div className="bg-[#2E1700] rounded-lg p-3 inline-block">
                  <Image src="/image/Vector.png" alt="Icon" width={20} height={20} className=" block" />
                </div>
              </div>

              <h2 className="text-base/semibold font-['inter'] mb-6">
                Choosing a Managed Bundle
              </h2>

              <p className="font-['Inter'] text-gray-400 font-normal text-[12px] leading-[1] tracking-[0] align-middle mb-6">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>

              <div className="border-t border-gray-700 mb-6" />

              <div>
                <div className="text-sm font-['Inter'] leading-relaxed mb-2">Inquires</div>
                <p className="text-xs text-gray-400">
                  Submit a query for one of our Solutions.
                </p>
              </div>
              <div className="border-t border-gray-700 mb-6" />

              <div>
                <div className="text-sm font-['Inter'] leading-relaxed mb-2">Consult</div>
                <p className="text-xs text-gray-400">
                  Our architects design your perfect, configured solution.
                </p>
              </div>
              <div className="border-t border-gray-700 mb-6" />

              <div>
                <div className="text-sm leading-relaxed font-['Inter'] mb-2">Launch</div>
                <p className="text-xs text-gray-400">
                  We deploy and manage your entire stack, providing unified support.
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Key Offerings Section */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 my-16 max-w-[1240px] mx-auto">
          <div className="bg-black rounded-lg p-4">
            <h3 className="text-base font-['Inter'] text-white mb-2 line-clamp-2"> Curated, Not Crowded</h3>
            <p className="text-gray-400 text-sm line-clamp-5">
             We prioritize clarity over choice overload.
            Each product, bundle, and partner is handpicked for quality, reliability, and business impact — so you can focus on outcomes, not options.
            </p>
          </div>
          <div className="bg-black rounded-lg p-4">
            <h3 className="text-base font-['Inter'] mb-2 line-clamp-2 text-white">Your Cloud Concierge</h3>
            <p className="text-gray-400 text-sm line-clamp-5">
              Think of NeoZaar as your extended cloud team.
              We help orchestrate onboarding, optimization, partner coordination, and strategy — from plan to deployment.
            </p>
          </div>
          <div className="bg-black rounded-lg p-4">
            <h3 className="text-base font-['Inter'] mb-2 line-clamp-5 text-white">Vendor-Neutral by Design</h3>
            <p className="text-gray-400 text-sm line-clamp-5">
            No lock-in. No bias.
            Whether you select a standalone ISV, a bundled offer, or a managed solution — we recommend what fits your stack, not ours.
            </p>
          </div>
          <div className="bg-black rounded-lg p-4">
            <h3 className="text-base font-['Inter'] mb-2 line-clamp-2 text-white">One-Stop Discovery</h3>
            <p className="text-gray-400 text-sm line-clamp-5">
             No more jumping across tabs or vendor sites.
              NeoZaar brings verified SaaS products, services, and Solutions together in a single, user-friendly marketplace experience.
            </p>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="mb-16 max-w-[1240px] mx-auto  bg-black text-white">
          <h2 className="text-4xl sm:text-5xl text-center font-['CreatoDisplay-Light',_sans-serif] text-[25px] md:text-[40px] lg:text-[40px] mb-10">
         
            Designed Around <br /> What Customers Actually Need
          </h2>
          <div className='relative h-[1400px] md:h-[850px] shadow-2xl overflow-hidden'>
            <div className="space-y-10   bg-black h-[360vh] md:h-[150vh] lg:h-[130vh] overflow-hidden">
              {/* Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Card 1 & 4 */}
                <div className="w-[320px] md:w-[400px]  flex flex-col gap-6 mx-auto">
                  {/* Card 1 */}
                  <div className="bg-gradient-to-b from-[#1a1a1a] to-black border border-gray-800 rounded-2xl shadow-lg overflow-hidden p-6 relative">
                    <div className="absolute inset-0 bg-[url('/image/card.png')] bg-cover bg-center opacity-10 rounded-2xl" />
                    <div className="relative z-10 flex flex-col h-full">
                      <p className="text-sm text-gray-200 leading-relaxed font-['Inter'] mb-6">
                      Buyers want an easier way to select, compare, and procure software that actually solves their business problems — without wasting time on sales calls or deciphering hyperscaler portals.
                      </p>
                      <p className='font-medium'>NeoZaar Delivers:</p>
                      <ul className='ps-4 text-gray-200'>
                        <li className='list-disc'>
                          Curated discovery instead of marketplace chaos
                        </li>
                        <li className='list-disc'>
                          Fast-track to bundled, proven solutions
                        </li>
                        <li className='list-disc'>
                          Fast-track to bundled, proven solutions
                        </li>
                        <li className='list-disc'>
                         Built-in support for cloud credits (AWS MACC / Azure EDP)
                        </li>
                      </ul>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-700 mt-auto">
                        <div className="flex items-center gap-3">
                          {/* <div className="w-12 h-12 relative rounded-full overflow-hidden">
                            <Image src="/image/sarah.png" alt="Sarah Jenkins" fill className="object-cover" />
                          </div> */}
                          <div>
                            {/* <p className="text-sm font-semibold text-white">Sarah Jenkins</p> */}
                            <p className="text-lg text-orange-400">Why Buyers Choose NeoZaar?</p>
                          </div>
                        </div>
                        <div className="w-6 h-6 relative">
                          <Image src="/image/favicon.ico" alt="icon" fill className="object-contain opacity-40" />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Card 4 */}
                  <div className="bg-gradient-to-b from-[#1a1a1a] to-black border border-gray-800 rounded-2xl shadow-lg overflow-hidden p-6 relative min-h-[300px]">
                    <div className="absolute inset-0 bg-[url('/image/card.png')] bg-cover bg-center opacity-10 rounded-2xl" />
                     <div className="relative z-10 flex flex-col h-full">
                      <p className="text-sm text-gray-200 leading-relaxed font-['Inter'] mb-6">
                     Most buyers don’t want to build their stack from scratch — they want ready-made solutions that solve real business problems with minimal integration effort.
                      </p>
                      <p className='font-medium'>NeoZaar Delivers:</p>
                      <ul className='ps-4 text-gray-200'>
                        <li className='list-disc'>
                         Pre-configured FastTrack FlexSolutions for common use cases
                        </li>
                        <li className='list-disc'>
                         Solutions aligned to industry challenges (Security, FinOps, AI)
                        </li>
                        <li className='list-disc'>
                         Integrated deployment and support
                        </li>
                        <li className='list-disc'>
                        Immediate value with credit-aligned pricing
                        </li>
                      </ul>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-700 mt-auto">
                        <div className="flex items-center gap-3">
                          {/* <div className="w-12 h-12 relative rounded-full overflow-hidden">
                            <Image src="/image/sarah.png" alt="Sarah Jenkins" fill className="object-cover" />
                          </div> */}
                          <div>
                            {/* <p className="text-sm font-semibold text-white">Sarah Jenkins</p> */}
                            <p className="text-lg text-orange-400"> Qurater Solutions</p>
                          </div>
                        </div>
                        <div className="w-6 h-6 relative">
                          <Image src="/image/favicon.ico" alt="icon" fill className="object-contain opacity-40" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Card 2 & 5 */}
                <div className="w-[320px] md:w-[400px] flex flex-col gap-6 mx-auto">
                  {/* Card 2 */}
                  <div className="bg-gradient-to-b from-[#1a1a1a] to-black border border-gray-800 rounded-2xl shadow-lg overflow-hidden p-6 relative">
                    <div className="absolute inset-0 bg-[url('/image/card.png')] bg-cover bg-center opacity-100% rounded-2xl" />
                    <div className="relative z-10 flex flex-col h-full">
                      <p className="text-sm text-gray-200 leading-relaxed font-['Inter'] mb-6">
                    Buyers want proof that the platform and products are credible — especially in compliance-sensitive or cloud-integrated environments.
                      </p>
                      <p className='font-medium'>NeoZaar Delivers:</p>
                      <ul className='ps-4 text-gray-200'>
                        <li className='list-disc'>
                       Globally recognized ISV listings (Zscaler, Commvault, Snowflake, etc.)
                        </li>
                        <li className='list-disc'>
                       Marketplace partner alignment (AWS CPPO, Azure MCPP)
                        </li>
                        <li className='list-disc'>
                       DPDP, GDPR, and SOC2-compliant offerings
                        </li>
                        <li className='list-disc'>
                       Transparent display of trust scores, certifications, and partner tiers
                        </li>
                      </ul>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-700 mt-auto">
                        <div className="flex items-center gap-3">
                          {/* <div className="w-12 h-12 relative rounded-full overflow-hidden">
                            <Image src="/image/sarah.png" alt="Sarah Jenkins" fill className="object-cover" />
                          </div> */}
                          <div>
                            {/* <p className="text-sm font-semibold text-white">Sarah Jenkins</p> */}
                            <p className="text-lg text-orange-400"> Partner Trust Logos & Ecosystem Badging</p>
                          </div>
                        </div>
                        <div className="w-6 h-6 relative">
                          <Image src="/image/favicon.ico" alt="icon" fill className="object-contain opacity-40" />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Card 5 */}
                  <div className="bg-gradient-to-b from-[#1a1a1a] to-black border border-gray-800 rounded-2xl shadow-lg overflow-hidden p-6 relative">
                    <div className="absolute inset-0 bg-[url('/image/card.png')] bg-cover bg-center opacity-10 rounded-2xl" />
                   <div className="relative z-10 flex flex-col h-full">
                      <p className="text-sm text-gray-200 leading-relaxed font-['Inter'] mb-6">
                    Buyers want deployment support — but don’t want to Google and vet 5 different MSPs.
                      </p>
                      <p className='font-medium'>NeoZaar Delivers:</p>
                      <ul className='ps-4 text-gray-200'>
                        <li className='list-disc'>
                        Certified expert services alongside every product
                        </li>
                        <li className='list-disc'>
                         Service partner matchmaking engine
                        </li>
                        <li className='list-disc'>
                        Option for fully managed delivery (white-labeled or direct)
                        </li>
                        <li className='list-disc'>
                       One point of contact via NeoZaar

                        </li>
                      </ul>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-700 mt-auto">
                        <div className="flex items-center gap-3">
                          {/* <div className="w-12 h-12 relative rounded-full overflow-hidden">
                            <Image src="/image/sarah.png" alt="Sarah Jenkins" fill className="object-cover" />
                          </div> */}
                          <div>
                            {/* <p className="text-sm font-semibold text-white">Sarah Jenkins</p> */}
                            <p className="text-lg text-orange-400">NeoZaar Concierge Promise</p>
                          </div>
                        </div>
                        <div className="w-6 h-6 relative">
                          <Image src="/image/favicon.ico" alt="icon" fill className="object-contain opacity-40" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Card 3 & 6 */}
                <div className="w-[320px] md:w-[400px]  flex flex-col gap-6 mx-auto">
                  {/* Card 3 */}
                  <div className="bg-gradient-to-b from-[#1a1a1a] to-black border border-gray-800 rounded-2xl shadow-lg overflow-hidden p-6 relative">
                    <div className="absolute inset-0 bg-[url('/image/card.png')] bg-cover bg-center opacity-10 rounded-2xl" />
                   <div className="relative z-10 flex flex-col h-full">
                      <p className="text-sm text-gray-200 leading-relaxed font-['Inter'] mb-6">
                    Buyers want to see impact, not just features. They care about outcomes, cost savings, and time-to-value — even if they’re early in the buying cycle.
                      </p>
                      <p className='font-medium'>NeoZaar Delivers:</p>
                      <ul className='ps-4 text-gray-200'>
                        <li className='list-disc'>
                       30–50% savings vs standalone procurement or hyperscaler rates
                        </li>
                        <li className='list-disc'>
                       Deployments in under 10 days for most Solutions
                        </li>
                        <li className='list-disc'>
                        100+ curated ISV offerings, all transactable
                        </li>
                        <li className='list-disc'>
                       70% of users use Nova to get a recommendation before buying
                        </li>
                      </ul>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-700 mt-auto">
                        <div className="flex items-center gap-3">
                          {/* <div className="w-12 h-12 relative rounded-full overflow-hidden">
                            <Image src="/image/sarah.png" alt="Sarah Jenkins" fill className="object-cover" />
                          </div> */}
                          <div>
                            {/* <p className="text-sm font-semibold text-white">Sarah Jenkins</p> */}
                            <p className="text-lg text-orange-400">  Results-Oriented Metrics</p>
                          </div>
                        </div>
                        <div className="w-6 h-6 relative">
                          <Image src="/image/favicon.ico" alt="icon" fill className="object-contain opacity-40" />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Card 6 */}
                  <div className="bg-gradient-to-b from-[#1a1a1a] to-black border border-gray-800 rounded-2xl shadow-lg overflow-hidden p-6 relative">
                    <div className="absolute inset-0 bg-[url('/image/card.png')] bg-cover bg-center opacity-10 rounded-2xl" />
                    <div className="relative z-10 flex flex-col h-full">
                      <p className="text-sm text-gray-200 leading-relaxed font-['Inter'] mb-6">
                    New platforms without testimonials still need to build buyer trust through positioning and messaging — without faking quotes.
                      </p>
                      <p className='font-medium'>NeoZaar Delivers:</p>
                      <ul className='ps-4 text-gray-200'>
                        <li className='list-disc'>
                        “Why Buyers Choose NeoZaar” section to highlight benefits
                        </li>
                        <li className='list-disc'>
                        Bundle highlights and real-world use cases instead of quotes
                        </li>
                        <li className='list-disc'>
                       Display of global ISV partners and compliance badges
                        </li>
                        <li className='list-disc'>
                       Results-driven messaging supported by Nova insights and delivery 
                        </li>
                      </ul>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-700 mt-auto">
                        <div className="flex items-center gap-3">
                          {/* <div className="w-12 h-12 relative rounded-full overflow-hidden">
                            <Image src="/image/sarah.png" alt="Sarah Jenkins" fill className="object-cover" />
                          </div> */}
                          <div>
                            {/* <p className="text-sm font-semibold text-white">Sarah Jenkins</p> */}
                            <p className="text-lg text-orange-400"> Section Title Alternatives (Strategic Messaging)</p>
                          </div>
                        </div>
                        <div className="w-6 h-6 relative">
                          <Image src="/image/favicon.ico" alt="icon" fill className="object-contain opacity-40" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-75 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />
            </div>
          </div>
          <div className="text-center mt-6 sm:mt-8 md:mt-10 lg:mt-12 mb-16">
            <button onClick={handleMarketplaceClick}
              className="group inline-flex items-center justify-center bg-black text-white border border-white/20 rounded-full px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base transition-all duration-200"
            >
              <Image src="/image/writing-sign.png" alt="Write" width={20} height={20} />
              <span className="mx-2">Write Review</span>
              <Image src="/image/arrow-up.png" alt="arrow" width={20} height={20} className=" transform transition-transform duration-300" />
            </button>
          </div>
        </section>

        {/* Final Section */}
        <section className="relative w-full flex flex-col items-center justify-start pt-8 px-4 sm:px-6 min-h-[300px] sm:min-h-[500px] mb-0">
          <div
            className="absolute inset-0 w-full h-full z-0"
            style={{
              backgroundImage: "url('/image/Desktop - 14.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.5,
            }}
          />
          <div className="relative mx-auto w-full max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-[#F79331] via-[#39C6FF] to-white font-['CreatoDisplay-Light',_sans-serif] text-[20px] font-300 mb-4">
              Start Your Smart Cloud<br />  Journey with NeoZaar
             
            </h2>
            <p className="text-gray-200 text-sm sm:text-base mb-4">
              Whether you’re buying a SaaS tool or launching a bundled solution, 

            <br className="hidden sm:inline" /> we’re built to guide you every step of the way.
            </p>
            <button onClick={handleMarketplaceClick} className="inline-flex items-center justify-center bg-gray-700 bg-opacity-20 hover:bg-opacity-30 text-white rounded-full cursor-pointer px-6 py-2 sm:py-3 text-sm sm:text-base">
              <span className="mr-2">Let’s Get Started</span>
              <Image src="/image/arrow-up.png" alt="arrow" width={20} height={20} />
            </button>
          </div>
        </section>
      </main>
      <Footer />
</>
    );
}