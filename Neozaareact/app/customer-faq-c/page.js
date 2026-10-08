"use client";
import { trackEvent } from "../lib/track";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Image from "next/image";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import Header from "../layouts/Header";
import Footer from "../layouts/Footer";

const faqs = [
  {
    question: "What is NeoZaar?",
    answer:
      "NeoZaar is a cloud-aligned marketplace that helps businesses discover, evaluate, and deploy SaaS products, solution bundles, and managed services — aligned to AWS MACC or Azure EDP commitments.",
  },
  {
    question: "What are Solution Bundles?",
    answer:
      "Solution Bundles are curated packages that combine SaaS tools, cloud services, and certified deployment support, tailored to achieve outcomes such as security, cost optimization, migration, or AI enablement.",
  },
  {
    question: "Can I use my AWS MACC or Azure EDP credits on NeoZaar?",
    answer:
      "Yes. Most bundles on NeoZaar are structured as private offers, allowing them to be applied toward your existing AWS MACC or Azure EDP enterprise commitments.",
  },
  {
    question: "How do I request a private offer or custom quote?",
    answer:
      "Every bundle includes a “Request a Custom Offer” option. Once submitted, our team or an authorized partner will contact you to finalize pricing, scope, and cloud alignment.",
  },
  {
    question: "Who delivers the services in the bundle?",
    answer:
      "All services are delivered by certified solution partners, including managed service providers (MSPs), security experts, cloud consultants, or NeoZaar’s delivery ecosystem.",
  },
  {
    question: "How is billing handled?",
    answer:
      "NeoZaar enables unified billing for software and services wherever applicable. You receive a single invoice, while NeoZaar manages partner coordination behind the scenes.",
  },
  {
    question: "Is there a free trial or POC option available?",
    answer:
      "Some bundles include trial-ready options or Proof of Concept (POC) engagements. Look for “Try & Deploy” tags on bundles where trials or POCs are supported.",
  },
  {
    question: "What if I need post-deployment support?",
    answer:
      "You can choose add-on managed services or opt for fully managed bundles that include ongoing operations, optimization, and 24×7 support.",
  },
  {
    question: "How do I get started?",
    answer:
      "Click “Explore Bundles” to browse curated solutions, or select “Request a Recommendation” to get guided assistance from the NeoZaar team.",
  },
];


const ACTION_TYPES = {
  PRODUCT: 'product',
  SERVICE: 'service',
  SOLUTION: 'solutions'
};

const ACTION_TYPE_LABELS = {
  [ACTION_TYPES.PRODUCT]: 'Products',
  [ACTION_TYPES.SERVICE]: 'Services',
  [ACTION_TYPES.SOLUTION]: 'Solutions'
};

export default function Home() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(ACTION_TYPES.PRODUCT);
  const [marketplace, setMarketplace] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);
  const sliderRef = useRef(null);
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesSelect, setCategoriesSelect] = useState('');
  const [paginations, setPagination] = useState({
    page: 1,
    limit: 20,
    pages: 0,
    total: 0,
  });
  const [loading, setLoading] = useState({
    products: true,
    services: true,
    solutions: true,
    bundles: true
  });
  const [bundles, setBundles] = useState([]);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window === "undefined") return;
      
      const token = localStorage.getItem("token");

      if (!token || token.trim() === "") {
        router.push('/auth/login');
        return;
      }
    };

    checkAuth();
  }, [router]);





  useEffect(() => {
  
    let position = 0;
    const slider = sliderRef.current;
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

    requestId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(requestId);
  }, []);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleCategoryClick = (categoryName) => {
    setMenu(false);
    setCategoriesSelect(categoryName);
  };

  const handleProductClick = (product) => {
    trackEvent({
      eventType: "PRODUCT_CLICK",
      entityType: "product",
      entityId: product.id,
      pageUrl: typeof window !== "undefined" ? window.location.pathname : "/",
    });

    router.push(`/bundle?productid=${product.id}`);
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const handlePageChange = (newPage) => {
    fetchMarketplace(newPage, categoriesSelect, activeTab);
  };

  // Check if we should show the special sections
  const showSpecialSections = categoriesSelect.length === 0 && search.length === 0 && activeTab === ACTION_TYPES.PRODUCT;

  return (
    <>
      <Header />
      <div className="max-w-[1920px] m-auto">
 





        {/* FAQ Section - Only show when no search/filter and on Products tab */}
        {showSpecialSections && (
          <section id="faq_section" className="px-4 sm:px-6 lg:px-20 my-28">
            <div className="flex flex-col items-center gap-4">
              <div className="text-gray-900 font-['CreatoDisplay-Medium',_sans-serif] text-2xl sm:text-3xl md:text-4xl font-medium leading-snug tracking-tight">
                Frequently asked questions
              </div>
              <div className="text-gray-500 text-center text-sm sm:text-base md:text-lg leading-relaxed max-w-xl">
                Not sure what fits best? Share your goals — our team and AI assistant will guide you to the ideal solution.
              </div>
              <div className="mt-8 w-full max-w-full sm:max-w-lg md:max-w-2xl">
                {faqs.map((faq, index) => (
                  <div key={index} className="border-b-2 border-gray-200">
                    <div
                      className="text-gray-900 font-semibold flex justify-between items-center py-6 text-sm sm:text-base md:text-lg cursor-pointer"
                      onClick={() => toggle(index)}
                    >
                      {faq.question}
                      <Image
                        src={openIndex === index ? "/assests/minus-icon.png" : "/assests/plus-icon.png"}
                        alt="Toggle Icon"
                        width={24}
                        height={24}
                        className="w-6 h-6 transition-transform duration-300"
                      />
                    </div>
                    {openIndex === index && (
                      <div className="text-gray-600 text-sm sm:text-base pb-6">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}