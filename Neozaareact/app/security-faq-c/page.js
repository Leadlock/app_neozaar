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
    question: "Where is customer data hosted?",
    answer: "NeoZaar hosts customer data on secure VPS infrastructure located in India. The hosting environment follows industry-standard security controls, including encryption, network isolation, and continuous monitoring. Data hosting location does not impact customer ownership or control of data."
  },
  {
    question: "Can NeoZaar be accessed globally?",
    answer: "Yes. NeoZaar is designed for global access. Users can access the platform from any country. All access is protected using encrypted connections. User location does not change where data is stored."
  },
  {
    question: "Who owns the data?",
    answer: "Customers always retain ownership of their data. NeoZaar processes data only on customer instructions. Data is never sold or used for NeoZaar's independent purposes. NeoZaar acts as a Data Processor, not a data owner."
  },
  {
    question: "Who can access customer data within NeoZaar?",
    answer: "Access is strictly controlled using a least-privilege model: Role-Based Access Control (RBAC) limits access by function. Multi-Factor Authentication (MFA) is mandatory for administrative access. Access is reviewed periodically. Only authorised personnel with a legitimate business need can access data."
  },
  {
    question: "Does NeoZaar support teams view customer data?",
    answer: "No access is granted by default. Support access requires explicit customer approval. Access is time-bound and purpose-specific. All support access is logged and auditable. This ensures transparency and accountability."
  },
  {
    question: "Are data access activities logged?",
    answer: "Yes. NeoZaar maintains comprehensive audit logs, including: User identity, Timestamp of access, Type of action (view, update, export). Logs are retained for security monitoring, compliance, and investigations."
  },
  {
    question: "How is data protected technically?",
    answer: "NeoZaar applies multiple layers of security, including: Encryption in transit (TLS), Encryption at rest, Secure authentication mechanisms, Network-level protections and firewalls, Continuous monitoring and alerting."
  },
  {
    question: "Is cross-border data access allowed?",
    answer: "While customer data is hosted in India, limited cross-border access may occur strictly for: Customer support, System maintenance, Security operations. Such access is governed by contractual, technical, and organisational safeguards aligned with global data protection standards."
  },
  {
    question: "Which data protection laws does NeoZaar align with?",
    answer: "NeoZaar's security and privacy practices are designed to align with: Digital Personal Data Protection Act, UAE Personal Data Protection Law, General Data Protection Regulation. NeoZaar supports customers through documented policies, DPAs, and operational controls."
  },
  {
    question: "What happens if there is a security incident?",
    answer: "NeoZaar operates defined incident response procedures. In the event of a confirmed personal data breach: Customers are notified without undue delay, Incident details and remediation steps are shared, Customers remain responsible for regulatory notifications unless otherwise agreed."
  },
  {
    question: "How long does NeoZaar retain data?",
    answer: "Data is retained only for the duration of the service relationship or as required by law. Upon termination: Data is deleted or returned as per contract, Backups expire within defined retention periods."
  },
  {
    question: "Can customers request data deletion or export?",
    answer: "Yes. Customers may request: Data access, Data correction, Data deletion, Data export (where applicable). Requests relating to end-user data are typically handled by the customer as the Data Controller."
  },
  {
    question: "Does NeoZaar use third-party vendors?",
    answer: "Yes. NeoZaar uses vetted sub-processors such as: Cloud infrastructure providers, Security and monitoring tools, Operational support systems. All sub-processors are contractually bound by confidentiality and data protection obligations."
  },
  {
    question: "Can enterprises conduct security reviews?",
    answer: "Yes. NeoZaar supports: Security questionnaires, Reasonable audit requests, Procurement and compliance reviews. All reviews are subject to scope, notice, and confidentiality requirements."
  },
  {
    question: "How can I report a security concern?",
    answer: "Security issues or questions can be reported to: Email: info@neozaar.com. Response SLA: Acknowledgement within one business day. NeoZaar is built with security-by-design principles — combining strong access controls, full auditability, and global compliance safeguards to support SaaS, marketplace, and MSP-led delivery models."
  }
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
               NeoZaar Security FAQ
              </div>
              <div className="text-gray-500 text-center text-sm sm:text-base md:text-lg leading-relaxed max-w-xl">
               At NeoZaar, security and data protection are built into how our marketplace, SaaS enablement, and service orchestration platform operates.
This page answers the most common security and compliance questions from customers, ISVs, MSPs, and enterprise buyers.
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