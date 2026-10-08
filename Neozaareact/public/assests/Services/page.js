"use client";
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import Header from '../layouts/Header';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import CookieConsent from "../components/CookieConsent";
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Footer from "../layouts/Footer";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { useState, useEffect } from 'react';

// ✅ Processes data array
const processes = [
  {
    title: "Discovery",
    description: "Understanding your requirements and technical needs",
    image: "/assests/Services/no 1.png",
  },
  {
    title: "Planning",
    description: "Creating detailed architecture and implementation roadmap",
    image: "/assests/Services/no 2.png",
  },
  {
    title: "Development",
    description: "Agile development with continuous integration and testing",
    image: "/assests/Services/no 3.png",
  },
  {
    title: "Deployment",
    description: "Seamless deployment with ongoing support and maintenance",
    image: "/assests/Services/no 4.png",
  },
];

// ✅ Process Card Component
const ProcessCard = ({ process }) => (
  <div className="relative group flex flex-col items-center text-center">
    <div className="relative mb-6">
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
        <img
          src={process.image}
          alt={process.title}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
    <h3 className="text-xl sm:text-2xl font-bold mb-3 group-hover:text-orange-400 transition-colors duration-300">
      {process.title}
    </h3>
    <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-xs group-hover:text-gray-300 transition-colors duration-300">
      {process.description}
    </p>
  </div>
);

export default function Page() {
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
    { href: '/isv-registration', label: 'ISV Registration' },
    { href: '/partner-with-us', label: 'Partner With Us' },
    { href: '/contact-us', label: 'Contact Us' },
  ];

  const handleMarketplaceClick = () => {
    const isLoggedIn = localStorage.getItem("token");
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
          <div className='w-full h-full absolute z-0 bg-black'></div>
          <video
            className="absolute inset-0 w-full h-full object-cover z-0"
            autoPlay
            loop
            muted
            playsInline
            style={{ opacity: 0.7, pointerEvents: 'none' }}
          >
            <source src="/assests/homepagevideo.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="text-white px-4 sm:px-6 lg:px-10 py-3 z-10 m-auto my-0 w-full h-full">
            <Header />
          </div>
          {/* Hero Content */}
          <div className="relative mx-auto md:my-35 lg:my-25 my-40 w-full max-w-full sm:max-w-[800px] flex flex-col items-center justify-center rounded-lg text-center px-2">
            <h1 className="text-white font-light font-['serif'] text-3xl sm:text-4xl md:text-5xl mb-4 leading-snug">
              Comprehensive Development <br /> Services
            </h1>
            <p className="text-gray-200 mb-6 px-2 sm:px-6 text-sm sm:text-base font-['Inter',_sans-serif] mt-3">
              From application development to cloud integration and managed services,<br className="hidden sm:inline" />
              we deliver scalable solutions that drive your business forward<br className="hidden sm:inline" />
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
              <Link
                href="/auth/register"
                className="min-w-[180px] cursor-pointer font-['Inter',_sans-serif] sm:w-auto px-6 bg-white/20 text-white font-semibold rounded-full hover:bg-white hover:text-black transition h-12 flex items-center justify-center"
              >
                <span className='text-base font-semibold'>Explore Services</span>
              </Link>
              <Link
                href="/auth/register"
                className="min-w-[200px] cursor-pointer font-['Inter',_sans-serif] py-3 border border-white text-white font-semibold rounded-full hover:bg-white/40 hover:text-white transition flex items-center justify-center"
              >
                Request Support
              </Link>
            </div>
          </div>
        </section>

        {/* Core Services Section */}
        <div className="relative w-full bg-black text-white py-16 px-4 sm:px-6 md:px-10 lg:px-16 overflow-hidden">
          {/* Section Title */}
          <div className="max-w-5xl mx-auto text-center mb-12 md:mb-16">
            <h2 className="text-center text-3xl md:text-4xl font-['inter'] mb-1">
              Our Core Services
            </h2>
            <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto">
              We specialize in three key areas to accelerate your digital transformation
            </p>
          </div>

          {/* Navigation Arrows */}
          <button className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-gray-800 hover:bg-gray-700 p-3 rounded-full transition hidden sm:flex">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 19l-7-7 7-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-gray-800 hover:bg-gray-700 p-3 rounded-full transition hidden sm:flex">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-transform duration-700 ease-in-out">
            {/* Card 1 */}
            <div className="bg-gradient-to-b from-[#0b0b0b] to-[#111] border border-gray-800 hover:border-orange-400/50 hover:shadow-[0_0_20px_rgba(255,153,0,0.2)] rounded-2xl p-6 flex flex-col justify-between transition-all duration-300">
              <div>
                <div className="w-14 h-14 flex items-center justify-center rounded-lg border border-orange-300/40 bg-[#111] mb-5">
                  <img src="/assests/Services/icon 1.png" alt="Application Development" className="w-8 h-8 object-contain" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Application Development</h3>
                <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                  Build robust, scalable applications with modern frameworks and technologies.
                </p>
                <ul className="space-y-2 text-gray-300 text-sm mb-6">
                  <li className="flex items-center gap-2"><img src="/assests/Services/react icon.png" alt="check" className="w-4 h-4" /> React & Next.js</li>
                  <li className="flex items-center gap-2"><img src="/assests/Services/angular icon.png" alt="check" className="w-4 h-4" /> Angular</li>
                  <li className="flex items-center gap-2"><img src="/assests/Services/Java Spring Boot icon.png" alt="check" className="w-4 h-4" /> Spring Boot</li>
                  <li className="flex items-center gap-2"><img src="/assests/Services/python icon.png" alt="check" className="w-4 h-4" /> Django / Flask</li>
                  <li className="flex items-center gap-2"><img src="/assests/Services/node js icon.png" alt="check" className="w-4 h-4" /> Node.js & Express</li>
                </ul>
              </div>
              <a href="#" className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition">
                <span>Learn More</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>

            {/* Card 2 */}
            <div className="bg-gradient-to-b from-[#0b0b0b] to-[#111] border border-gray-800 hover:border-orange-400/50 hover:shadow-[0_0_20px_rgba(255,153,0,0.2)] rounded-2xl p-6 flex flex-col justify-between transition-all duration-300">
              <div>
                <div className="w-14 h-14 flex items-center justify-center rounded-lg border border-orange-300/40 bg-[#111] mb-5">
                  <img src="/assests/Services/icon 2.png" alt="Cloud Integration" className="w-8 h-8 object-contain" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Cloud Integration</h3>
                <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                  Integrate with AWS, Azure, and GCP for scalable cloud infrastructure solutions.
                </p>
                <ul className="space-y-2 text-gray-300 text-sm mb-6">
                  <li className="flex items-center gap-2"><img src="/assests/Services/Amozon web service icon.png" alt="check" className="w-4 h-4" /> Amozon web service</li>
                  <li className="flex items-center gap-2"><img src="/assests/Services/Microsoft Azure icon.png" alt="check" className="w-4 h-4" /> Microsoft Azure</li>
                  <li className="flex items-center gap-2"><img src="/assests/Services/Google Cloud Platform icon.png" alt="check" className="w-4 h-4" /> Google Cloud Platform</li>
                  <li className="flex items-center gap-2"><img src="/assests/Services/Kubernetes & Docker icon.png" alt="check" className="w-4 h-4" /> Kubernetes & Docker</li>
                  <li className="flex items-center gap-2"><img src="/assests/Services/Database Migration icon.png" alt="check" className="w-4 h-4" /> Database Migration</li>
                </ul>
              </div>
              <a href="#" className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition">
                <span>Learn More</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>

            {/* Card 3 */}
            <div className="bg-gradient-to-b from-[#0b0b0b] to-[#111] border border-gray-800 hover:border-orange-400/50 hover:shadow-[0_0_20px_rgba(255,153,0,0.2)] rounded-2xl p-6 flex flex-col justify-between transition-all duration-300">
              <div>
                <div className="w-14 h-14 flex items-center justify-center rounded-lg border border-orange-300/40 bg-[#111] mb-5">
                  <img src="/assests/Services/icon 3.png" alt="Managed Services" className="w-8 h-8 object-contain" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Managed Services</h3>
                <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                  24/7 monitoring, maintenance and support for your critical applications.
                </p>
                <ul className="space-y-2 text-gray-300 text-sm mb-6">
                  <li className="flex items-center gap-2"><img src="/assests/Services/Security Monitoring icon.png" alt="check" className="w-4 h-4" /> Security Monitoring</li>
                  <li className="flex items-center gap-2"><img src="/assests/Services/Performance Optimization icon.png" alt="check" className="w-4 h-4" /> Performance Optimization</li>
                  <li className="flex items-center gap-2"><img src="/assests/Services/Automated Backups icon.png" alt="check" className="w-4 h-4" /> Automated Backups</li>
                  <li className="flex items-center gap-2"><img src="/assests/Services/Support icon.png" alt="check" className="w-4 h-4" /> 24/7 Support</li>
                  <li className="flex items-center gap-2"><img src="/assests/Services/Maintenance & Updates icon.png" alt="check" className="w-4 h-4" /> Maintenance & Updates</li>
                </ul>
              </div>
              <a href="#" className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition">
                <span>Learn More</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            <button className="w-3 h-3 rounded-full bg-orange-400 scale-110 transition-all duration-300"></button>
            <button className="w-3 h-3 rounded-full bg-gray-600 hover:bg-gray-500 transition-all duration-300"></button>
            <button className="w-3 h-3 rounded-full bg-gray-600 hover:bg-gray-500 transition-all duration-300"></button>
          </div>
        </div>

        {/* Development Process Section */}
        <section className="w-full py-16 bg-black text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16 lg:mb-20">
              <h2 className="text-center text-3xl md:text-4xl font-['inter'] mb-1">
                Our Development Process
              </h2>
              <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto">
                A proven methodology that ensures successful project delivery
              </p>
            </div>

            <div className="relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 lg:gap-8">
                {processes.map((process, index) => (
                  <ProcessCard key={index} process={process} />
                ))}
              </div>
            </div>
          </div>
        </section>

             {/* Request Form */}

         <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-900 text-white rounded-xl shadow-lg p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-2">
          Request Deployment Support
        </h2>
        <p className="text-gray-400 text-center mb-8">
          Get expert assistance for your next project. Our team is ready to help you succeed.
        </p>

        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700 focus:border-blue-500 focus:ring focus:ring-blue-500/40 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700 focus:border-blue-500 focus:ring focus:ring-blue-500/40 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email Address *</label>
              <input
                type="email"
                className="w-full px-4 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700 focus:border-blue-500 focus:ring focus:ring-blue-500/40 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700 focus:border-blue-500 focus:ring focus:ring-blue-500/40 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Service Type *</label>
            <select
              className="w-full px-4 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700 focus:border-blue-500 focus:ring focus:ring-blue-500/40 outline-none"
            >
              <option value="">Select a service</option>
              <option value="deployment">Deployment</option>
              <option value="integration">Integration</option>
              <option value="support">Support</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Project Details *</label>
            <textarea
              rows="4"
              placeholder="Please describe your project requirements, timeline, and any specific technologies you'd like to use..."
              className="w-full px-4 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700 focus:border-blue-500 focus:ring focus:ring-blue-500/40 outline-none resize-none"
            ></textarea>
          </div>

          <div className="flex justify-center">
            <button
              type="submit"
              className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-6 py-2 rounded-md shadow-md transition"
            >
              Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>

    <div className="bg-black text-white py-16 px-6 md:px-10 lg:px-20 text-center">
      {/* Title Section */}
      <h2 className="text-3xl md:text-4xl font-semibold mb-4">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-400 to-blue-400">
          See Our Work in Action
        </span>
      </h2>

      <p className="text-gray-400 max-w-2xl mx-auto mb-8 text-sm md:text-base">
        Explore real-world case studies showcasing how we’ve helped businesses transform
        their operations with cutting-edge technology solutions.
      </p>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
        <button className="bg-gray-700 hover:bg-gray-600 text-white font-medium px-6 py-2 rounded-full shadow-md transition">
          View Case Studies
        </button>
        <button className="border border-gray-500 hover:border-white text-white font-medium px-6 py-2 rounded-full transition">
          Schedule Consultation
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center max-w-3xl mx-auto">
        <div>
          <h3 className="text-2xl md:text-3xl font-semibold text-blue-400">500+</h3>
          <p className="text-gray-400 text-sm md:text-base">Projects Delivered</p>
        </div>
        <div>
          <h3 className="text-2xl md:text-3xl font-semibold text-purple-400">99.9%</h3>
          <p className="text-gray-400 text-sm md:text-base">Uptime Guarantee</p>
        </div>
        <div>
          <h3 className="text-2xl md:text-3xl font-semibold text-green-400">24/7</h3>
          <p className="text-gray-400 text-sm md:text-base">Support Available</p>
        </div>
        <div>
          <h3 className="text-2xl md:text-3xl font-semibold text-orange-400">150+</h3>
          <p className="text-gray-400 text-sm md:text-base">Happy Clients</p>
        </div>
      </div>
    </div>

      </main>

      <div className='w-1/3 m-auto'>
        <CookieConsent />
      </div>
      <Footer />
    </>
  );
}