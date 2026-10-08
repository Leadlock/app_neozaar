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
import { useState, useEffect } from 'react';
import {
  Rocket,
  TrendingUp,
  Zap,
  Globe,
  Layers, 
  CheckCircle2,
  ArrowRight,
  Search, 
  Users, 
  Plus,
  Minus,
  ShieldCheck,
  Terminal,
  MessageSquare,
  PieChart,
  Brain,
  CreditCard
} from 'lucide-react';

export default function Page() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(1);

  const categories = [
    { title: "Security & Compliance", content: "Cloud security, identity, data protection, audit, governance, and regulatory compliance SaaS built for enterprise and regulated environments." },
    { title: "AI, Data & Intelligent Automation", content: "AI-native platforms powering analytics, automation, decision intelligence, and next-generation enterprise use cases." },
    { title: "HR Tech & Workforce Solutions", content: "Enterprise SaaS for hiring, HR operations, payroll, compliance, learning, and workforce intelligence." },
    { title: "CRM, Helpdesk & Collaboration", content: "Customer engagement, service management, internal collaboration, and productivity platforms for modern enterprises." },
    { title: "HealthTech & Regulated Industry SaaS", content: "Vertical SaaS for healthcare, life sciences, and regulated industries requiring strong compliance, data security, and workflow controls." },
    { title: "RetailTech & Commerce Platforms", content: "Digital commerce and omnichannel platforms supporting payments, inventory, analytics, and customer experience." },
  ];

  const toggleCategory = (index) => {
    setActiveCategory(activeCategory === index ? null : index);
  };

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

  // Handle ISV Registration with auth check
  const handleISVRegistration = () => {
    const isLoggedIn = localStorage.getItem("token");
    if (isLoggedIn) {
      router.push("/isv-registration");
    } else {
      // Redirect to login with return URL
      router.push(`/auth/login?redirect=${encodeURIComponent("/isv-registration")}`);
    }
  };

  // Handle Marketplace click with auth check
  const handleMarketplaceClick = () => {
    const isLoggedIn = localStorage.getItem("token");
    if (isLoggedIn) {
      router.push("/");
    } else {
      router.push(`/auth/login?redirect=${encodeURIComponent("/")}`);
    }
  };

  // Check auth when component mounts (optional, for direct access)
  useEffect(() => {
    const token = localStorage.getItem("token");
    // If user tries to access ISV registration page directly without login
    if (pathname === "/auth/login" && !token) {
      router.push(`/isv-registration?redirect=${encodeURIComponent("/auth/login")}`);
    }
  }, [pathname, router]);

  return (
    <>
      <main className="bg-black min-h-screen w-full mx-auto max-w-[1920px] overflow-hidden">
        {/* Hero Section - Split Layout Design */}
     <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center pt-20 px-4 sm:px-6 lg:px-8 border-b border-white/5 overflow-hidden bg-[#030303]">

  {/* Background Image */}
  <div className="absolute inset-1 w-full h-full">
    <Image
      src="/image/Icon/Slider_Accelerate.jpeg"
      alt="SaaS Growth Background"
      fill
      className="object-cover opacity-100"
      priority
    />
  </div>

  {/* Background Ambient Effects */}
  <div className="absolute inset-0 w-full h-full pointer-events-none">
    <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-orange-600/10 rounded-full blur-[120px] mix-blend-screen"></div>
    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[100px] mix-blend-screen"></div>
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 brightness-100 contrast-150 mix-blend-overlay"></div>
  </div>

  <div className="text-white  px-4 sm:px-6 lg:px-10 py-3 z-20 absolute top-0 w-full">
    <Header />
  </div>

  <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center mt-10">

    {/* Left Content */}
    <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 mb-8 backdrop-blur-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
        <span className="text-xs font-semibold text-orange-400 tracking-wider uppercase font-['Inter']">NeoZaar Partner Program</span>
      </div>

      <h1 className="text-white font-normal font-['CreatoDisplay-Light',_sans-serif] text-2xl sm:text-6xl lg:text-[72px] mb-6 leading-[1.1] tracking-tight">
        Accelerate Your SaaS Growth <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-200 to-white">Across AWS, Azure, and GCP</span>
      </h1>

      <p className="text-gray-400 mb-10 text-sm sm:text-lg max-w-xl font-['Inter'] font-light leading-relaxed">
       NeoZaar simplifies listing, packages your SaaS for co-sell success, and connects you to enterprise-ready buyers across cloud ecosystems.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <button
          onClick={handleISVRegistration}
          className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-100 transition-all duration-300 flex items-center justify-center gap-2 font-['Inter'] shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)] cursor-pointer"
        >
         Register Now!
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Right Visual - Abstract Network/Ecosystem Visualization */}
    <div className="relative h-[400px] lg:h-[600px] w-full flex items-center justify-center lg:justify-end perspective-1000">
      {/* Central Hub */}
   
    {/* <Image src="/image/Icon/grow_withuspartner_with.png" alt="partern with us image" fill /> */}
      {/* Connecting Lines */}
  
    </div>
  </div>
</section>

        {/* Key Benefits Grid (The NeoZaar Partner Advantage) */}
        <section className="w-full py-10 lg:py-32 px-4 sm:px-6 lg:px-8 bg-black relative overflow-hidden">
          {/* Background Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-24">
              <h2 className="text-2xl md:text-7xl font-light text-white mb-6 font-['CreatoDisplay-Light',_sans-serif]">
                The NeoZaar <span className="italic font-normal text-white/50">Advantage</span>
              </h2>
              <p className="text-gray-400 text-xl md:text-2xl max-w-2xl mx-auto font-['Inter'] font-light">
                We don{"'"}t just list you. <span className="text-orange-400 font-medium">We accelerate you.</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <Image src="/image/Icon/Icon_neozaar\Icon_accelerated_gtm.png" alt="Accelerated GTM" fill />,
                  title: "Accelerated GTM",
                  desc: "Skip the steep marketplace learning curve. NeoZaar handles listing complexity, pricing alignment, and private-offer readiness, so you can start selling in weeks — not months.",
                  gradient: "from-orange-500/20 to-red-500/20",
                  border: "group-hover:border-orange-500/30"
                },
                {
                  icon: <Image src="/image/Icon/Icon_neozaar/Icon_Productization.png" alt="Productization" fill />,
                  title: "Productization",
                  desc: "We help structure your SaaS into enterprise-ready bundles and offers that align with how buyers actually purchase — solutions, not standalone tools.",
                  gradient: "from-blue-500ab/20 to-cyan-500/20",
                  border: "group-hover:border-blue-500/30"
                },
                {
                  icon: <Image src="/image/Icon/Icon_neozaar/Icon_Nova_Visibility.png" alt='Nova Visibility' fill />,
                  title: "Nova Visibility",
                  desc: "Your solution is showcased to an active ecosystem of enterprise buyers, resellers, and managed service partners — not lost in crowded marketplaces.",

                  gradient: "from-purple-500/20 to-pink-500/20",
                  border: "group-hover:border-purple-500/30"
                },
                {
                  icon: <Image src="/image/Icon/Icon_neozaar/Icon_Co-Sell_Support.png"  alt='Co-Sell Support'  fill />,
                  title: "Co-Sell Support",
                  desc: "We actively co-sell alongside you through NeoZaar's GTM engine, delivery partners, and hyperscaler-aligned motions to improve deal velocity and closure rates.",
                  gradient: "from-emerald-500/20 to-teal-500/20",
                  border: "group-hover:border-emerald-500/30"
                }
              ].map((card, idx) => (
                <div key={idx} className={`group relative bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[32px] p-8 transition-all duration-500 hover:bg-white/[0.04] hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/50 ${card.border}`}>
                  {/* Internal Glow */}
                  <div className={`absolute inset-0 rounded-[32px] bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}></div>

                  <div className={`relative z-10 mb-8 w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                    {card.icon}
                  </div>

                  <h3 className="relative z-10 text-2xl font-normal text-white mb-4 font-['CreatoDisplay-Light',_sans-serif]">{card.title}</h3>
                  <p className="relative z-10 text-gray-400 leading-relaxed text-sm font-['Inter'] font-light group-hover:text-gray-300 transition-colors">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div> 
        </section>

        {/* FastTrack FlexBundles (Split Section) */}
        <section className="w-full py-10 lg:py-32 bg-black relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-20">
              <div className="lg:w-1/2 flex flex-col justify-center">
                <div className="inline-block px-4 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-bold tracking-widest uppercase mb-6 font-['Inter']">
                  Value Multiplier
                </div>
                <h2 className="text-3xl md:text-6xl font-light text-white mb-8 font-['CreatoDisplay-Light',_sans-serif] leading-[1.1]">
                  FastTrack <span className="font-normal text-white">FlexBundles</span>
                </h2>
                <p className="text-gray-400 mb-10 font-['Inter'] text-md lg:text-lg font-light leading-relaxed">
                  Give customers what they really want—complete solutions, not just software licenses. Bundle your SaaS product with necessary implementation services or complementary tools seamlessly.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      title: "Higher Deal Value",
                      desc: "Increase average order value by offering complete solutions."
                    },
                    {
                      title: "Reduced Churn",
                      desc: "Better initial implementation leads to higher retention."
                    },
                    {
                      title: "Simplified Buying",
                      desc: "One-click purchasing for complex multi-vendor solutions."
                    },
                    {
                      title: "Faster Time-to-Value",
                      desc: "Customers get everything they need to start immediately."
                    }
                  ].map((item, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors">
                      <CheckCircle2 className="w-5 h-5 text-orange-400 mb-3" />
                      <h4 className="text-white font-medium mb-1 font-['Inter']">{item.title}</h4>
                      <p className="text-xs text-gray-500 font-['Inter']">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:w-1/2 w-full">
                <div className="relative w-full aspect-square max-w-[600px] mx-auto">
                  {/* Abstract circular glow behind image */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/20 to-blue-500/20 rounded-full blur-[80px] animate-pulse-slow"></div>

                  <div className="relative w-full h-full rounded-[40px] overflow-hidden border border-white/10 shadow-2xl bg-zinc-900/50 backdrop-blur-sm group transform transition-transform duration-700 hover:scale-[1.02]">
                    <Image
                      src="/brand-log/flex_bundle_visual.png"
                      alt="FastTrack FlexBundles"
                      fill
                      className="object-cover opacity-90 transition-opacity duration-500 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>

                    {/* Floating Badge */}
                    <div className="absolute bottom-8 left-8 right-8 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                          <Layers className="text-white w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Ready to Deploy</p>
                          <p className="text-white/60 text-xs">Pre-configured bundles</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Marketplace Categories Section */}
        <section className="w-full py-10 lg:py-32 bg-black text-white relative z-10 font-sans border-t border-white/5">
          {/* Background Atmosphere */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="mb-20 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm">
                <span className="text-xs font-semibold text-gray-300 tracking-wider uppercase font-['Inter']">Ecosystems</span>
              </div>
              <h2 className="text-3xl md:text-6xl font-light font-['CreatoDisplay-Light',_sans-serif] tracking-tight mb-6">
                Marketplace <span className="text-gray-600">Categories</span>
              </h2>
              <p className="text-gray-400 font-['Inter'] max-w-2xl mx-auto text-lg font-light">
                Explore our specialized domains designed to accelerate your growth across every vertical.
              </p>
            </div>

            {/* The Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat, idx) => {
                // Color Accents
                const theme = [
                  { color: "text-orange-400", border: "group-hover:border-orange-500/50", bg: "group-hover:bg-orange-500/10", shadow: "group-hover:shadow-[0_0_30px_rgba(249,115,22,0.1)]" },
                  { color: "text-blue-400", border: "group-hover:border-blue-500/50", bg: "group-hover:bg-blue-500/10", shadow: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]" },
                  { color: "text-purple-400", border: "group-hover:border-purple-500/50", bg: "group-hover:bg-purple-500/10", shadow: "group-hover:shadow-[0_0_30px_rgba(168,85,247,0.1)]" },
                  { color: "text-emerald-400", border: "group-hover:border-emerald-500/50", bg: "group-hover:bg-emerald-500/10", shadow: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]" },
                  { color: "text-rose-400", border: "group-hover:border-rose-500/50", bg: "group-hover:bg-rose-500/10", shadow: "group-hover:shadow-[0_0_30px_rgba(244,63,94,0.1)]" },
                  { color: "text-amber-400", border: "group-hover:border-amber-500/50", bg: "group-hover:bg-amber-500/10", shadow: "group-hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]" },
                ][idx];

                return (
                  <div
                    onClick={handleISVRegistration}
                    key={idx}
                    className={`group relative flex flex-col p-8 bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-[32px] transition-all duration-500 hover:-translate-y-2 ${theme.border} ${theme.shadow} cursor-pointer`}
                  >
                    {/* Hover Gradient Background */}
                    <div className={`absolute inset-0 rounded-[32px] opacity-0 transition-opacity duration-500 ${theme.bg}`}></div>

                    {/* Header */}
                    <div className="relative z-10 flex items-start justify-between mb-8">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        {idx === 0 && <Image src="/image/Icon/Icon_Marketplace/Icon_Marketplace/Icon_Security_Compliance.png" alt="Security Compliance" width={60} height={60} />}
                        {idx === 1 && <Image src="/image/Icon/Icon_Marketplace/Icon_Marketplace/Icon_automation.png" alt="AI, Data & Intelligent Automation" width={60} height={60} />}
                        {idx === 2 && <Image src="/image/Icon/Icon_Marketplace/Icon_Marketplace/Icon_HR.png" alt="HR Tech & Workforce Solutions" width={60} height={60} />}
                        {idx === 3 && <Image src="/image/Icon/Icon_Marketplace/Icon_Marketplace/Icon_crm.png" alt="CRM, Helpdesk & Collaboration" width={60} height={60} />}
                        {idx === 4 && <Image src="/image/Icon/Icon_Marketplace/Icon_Marketplace/Icon_Healttech_saas.png" alt="HealthTech & Regulated Industry SaaS" width={60} height={60} />}
                        {idx === 5 && <Image src="/image/Icon/Icon_Marketplace/Icon_Marketplace/RetailTech_ecomeer.png" alt="RetailTech & Commerce Platforms" width={60} height={60} />}
                      </div>
                      <span className="text-white/20 font-mono text-sm font-medium">0{idx + 1}</span>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex-1">
                      <h3 className="text-2xl text-white font-light font-['CreatoDisplay-Light',_sans-serif] mb-4 group-hover:translate-x-1 transition-transform duration-300">
                        {cat.title}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed font-['Inter'] font-light mb-8 group-hover:text-gray-300 transition-colors">
                        {cat.content}
                      </p>
                    </div>

                    {/* Footer Action */}
                    <div className="relative z-10 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                      <span>Explore</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative w-full flex flex-col items-center justify-center py-10  lg:py-32 px-4 sm:px-6 mb-0 bg-black overflow-hidden border-t border-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-500/10 via-black to-black"></div>

          <div className="relative mx-auto w-full max-w-4xl text-center z-10">
            <h2 className="text-3xl sm:text-6xl md:text-7xl text-white mb-8 font-light leading-tight font-['CreatoDisplay-Light',_sans-serif]">
              Grow Smarter. <span className="text-orange-500">Sell Faster.</span>
            </h2>
            <p className="text-gray-400 text-lg sm:text-xl mb-10 font-['Inter'] font-light">
             NeoZaar supports both horizontal and vertical SaaS, positioning ISVs through outcome-driven solutions rather than standalone listings.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center w-full sm:w-auto">
              <button
                onClick={handleISVRegistration}
                className="group min-w-[220px] px-8 py-5 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all duration-300 flex items-center justify-center gap-2 font-['Inter'] text-sm lg:text-lg cursor-pointer"
              >
               Start your Journey
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}