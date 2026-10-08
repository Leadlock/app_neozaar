'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import Header from '../layouts/Header';
import Footer from '../layouts/Footer';
import PrivateOfferHero from './PrivateOfferHero';
import PrivateOfferBenefits from './PrivateOfferBenefits';
import PrivateOfferProcess from './PrivateOfferProcess';
import ProductPickerModal from './ProductPickerModal';

const FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'protonmail.com'];

const PROCUREMENT_STAGES = ['Budgeting', 'Active Evaluation', 'Upcoming Renewal'];

const CLOUD_ENV_OPTIONS = [
  { value: 'AWS', label: 'AWS Marketplace (CPPO)' },
  { value: 'Azure', label: 'Azure Marketplace (MPO)' },
  { value: 'NeoZaar', label: 'NeoZaar' },
];

const CLOUD_ENV_DISCLAIMER =
  'Available through Microsoft Marketplace and/or AWS Marketplace where applicable. NeoZaar can validate the right offer and confirm whether the purchase may contribute toward your applicable MACC or AWS commitment. Eligibility depends on the specific offer, purchasing route, customer agreement, and marketplace terms.';

const selectChevronStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23999'%3E%3Cpath strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 1rem center',
  backgroundSize: '1.5rem',
};

// Local cookie helper (this codebase has no shared version — every protected
// page defines its own). Values are always pre-serialized JSON strings.
const cookieUtils = {
  set: (name, value, days = 1) => {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Lax`;
  },
  get: (name) => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.split(';').find((c) => c.trim().startsWith(`${name}=`));
    return match ? match.trim().substring(name.length + 1) : null;
  },
  remove: (name) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  },
};

const storeRedirectAfterLogin = (url) => {
  const data = JSON.stringify({ url, timestamp: Date.now() });
  cookieUtils.set('redirect_after_login', data, 1);
  try { sessionStorage.setItem('redirect_after_login', data); } catch {}
};

function PrivateOfferPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productid');

  const [authReady, setAuthReady] = useState(false);

  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyNameLocked, setCompanyNameLocked] = useState(false);
  const [cloudEnv, setCloudEnv] = useState([]); // ['AWS', 'Azure', 'NeoZaar']
  const [accountId, setAccountId] = useState('');
  const [procurementStage, setProcurementStage] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null); // { id, name, action_type }
  const [itemContextLoading, setItemContextLoading] = useState(!!productId);
  const [pickerOpen, setPickerOpen] = useState(false);

  const requiresAccountId = cloudEnv.includes('AWS') || cloudEnv.includes('Azure');

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || token.trim() === '') {
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      storeRedirectAfterLogin(currentUrl);
      router.push('/auth/login');
      return;
    }
    setAuthReady(true);
  }, [router]);

  // ── Autofill Work Email / Company Name from the account ────────────────
  useEffect(() => {
    if (!authReady) return;
    const token = localStorage.getItem('token');
    fetch(`${process.env.NEXT_PUBLIC_API_BASE}get_token-user`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        const user = res?.data;
        if (user?.name) setFullName(user.name);
        if (user?.email) setWorkEmail(user.email);
        if (user?.company_name) {
          setCompanyName(user.company_name);
          setCompanyNameLocked(true);
        }
      })
      .catch(() => {});
  }, [authReady]);

  // ── Product/service/solution context from ?productid= ──────────────────
  useEffect(() => {
    if (!authReady || !productId) {
      setItemContextLoading(false);
      return;
    }
    setItemContextLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_BASE}catalog/marketplace/products/${productId}`)
      .then((r) => r.json())
      .then((res) => {
        const product = res?.data?.product;
        if (product?.id) {
          setSelectedItem({ id: product.id, name: product.name, action_type: product.action_type });
        }
      })
      .catch(() => {})
      .finally(() => setItemContextLoading(false));
  }, [authReady, productId]);

  const toggleCloudEnv = (value) => {
    setCloudEnv((prev) => {
      const next = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      if (!next.includes('AWS') && !next.includes('Azure')) setAccountId('');
      return next;
    });
  };

  const scrollToForm = () => {
    document.getElementById('quote-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Arriving with a product/service/solution already in context (from that
  // page's "Get Private Offer" button) means the intent is to fill the form,
  // not read the marketing sections — jump straight there.
  useEffect(() => {
    if (!authReady || !productId) return;
    const timer = setTimeout(scrollToForm, 200);
    return () => clearTimeout(timer);
  }, [authReady, productId]);

  const validate = () => {
    const errs = {};
    if (!workEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) {
      errs.workEmail = 'A valid work email is required';
    } else if (FREE_EMAIL_DOMAINS.includes(workEmail.split('@')[1]?.toLowerCase())) {
      errs.workEmail = 'Please use your corporate email domain';
    }
    if (!companyName.trim()) errs.companyName = 'Company name is required';
    if (cloudEnv.length === 0) errs.cloudEnv = 'Select at least one option';
    if (!selectedItem) errs.vendorName = 'Select a product, service or solution';
    if (requiresAccountId && !accountId.trim()) errs.accountId = 'AWS Account ID or Azure Billing ID is required';
    if (!procurementStage) errs.procurementStage = 'Select your current procurement stage';
    if (!consent) errs.consent = 'Please confirm consent to be contacted';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const cloudEnvLabel = cloudEnv
        .map((v) => CLOUD_ENV_OPTIONS.find((opt) => opt.value === v)?.label || v)
        .join(' + ');

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}public/leads/cta-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email: workEmail,
          company: companyName,
          product_name: selectedItem?.name,
          product_id: selectedItem?.id,
          source: 'Private Offer Request',
          consent_status: consent,
          cloud_environment: cloudEnvLabel,
          cloud_account_id: requiresAccountId ? accountId : null,
          procurement_stage: procurementStage,
          requirement: `Get private offer from: ${cloudEnvLabel} | Vendor/Solution: ${selectedItem?.name} | ${requiresAccountId ? `AWS Account ID / Azure Billing ID: ${accountId} | ` : ''}Procurement Stage: ${procurementStage}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.status === 'success') {
        toast.success('Request received — our team will be in touch shortly.');
        setSubmitted(true);
      } else {
        toast.error(data?.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-orange-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="max-w-[1920px] m-auto bg-[#050505] min-h-screen">
      <Header />
      <PrivateOfferHero onQuoteClick={scrollToForm} />
      <PrivateOfferBenefits />
      <PrivateOfferProcess />

      <section id="quote-form" className="w-full bg-[#080808] py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-white font-light text-3xl sm:text-4xl leading-tight mb-3">
              Request a{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                Private Offer Quote
              </span>
            </h2>
            <p className="text-gray-500 text-sm">Fields marked with an asterisk (*) are required.</p>
          </div>

          {submitted ? (
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-8 text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-white text-xl font-semibold mb-2">Request received</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto">
                Thanks — our marketplace team is reviewing your request and will reach out shortly to
                build your private offer.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Work Email *</label>
                <input
                  type="email"
                  value={workEmail}
                  readOnly
                  className="w-full px-4 py-3.5 bg-zinc-900/30 text-gray-400 border border-zinc-800 rounded-xl cursor-not-allowed"
                />
                <p className="text-gray-500 text-xs mt-2 ml-1">Tied to your NeoZaar account</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Company Name *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  readOnly={companyNameLocked}
                  className={
                    companyNameLocked
                      ? 'w-full px-4 py-3.5 bg-zinc-900/30 text-gray-400 border border-zinc-800 rounded-xl cursor-not-allowed'
                      : `w-full px-4 py-3.5 bg-zinc-900/50 text-white placeholder-gray-500 border rounded-xl focus:outline-none transition-all ${errors.companyName ? 'border-red-500 focus:border-red-500 bg-red-500/5' : 'border-zinc-800 focus:border-orange-500 hover:border-zinc-700'}`
                  }
                />
                {companyNameLocked && <p className="text-gray-500 text-xs mt-2 ml-1">Tied to your NeoZaar account</p>}
                {errors.companyName && <p className="text-red-500 text-xs mt-2 ml-1">{errors.companyName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Get private offer from *</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  {CLOUD_ENV_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all ${cloudEnv.includes(opt.value) ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-800 hover:border-zinc-700'}`}
                    >
                      <input
                        type="checkbox"
                        checked={cloudEnv.includes(opt.value)}
                        onChange={() => toggleCloudEnv(opt.value)}
                        className="accent-orange-500 w-4 h-4"
                      />
                      <span className="text-sm text-gray-200">{opt.label}</span>
                    </label>
                  ))}
                </div>
                {errors.cloudEnv && <p className="text-red-500 text-xs mt-2 ml-1">{errors.cloudEnv}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Software Solution/Vendor Name *</label>
                {itemContextLoading ? (
                  <div className="w-full h-[54px] bg-zinc-900/30 border border-zinc-800 rounded-xl animate-pulse" />
                ) : selectedItem ? (
                  <div className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-zinc-900/50 border rounded-xl ${errors.vendorName ? 'border-red-500' : 'border-zinc-800'}`}>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{selectedItem.name}</p>
                      <p className="text-gray-500 text-xs capitalize">{selectedItem.action_type}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="shrink-0 text-orange-400 text-sm font-medium hover:text-orange-300 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 bg-zinc-900/50 border rounded-xl text-left transition-all ${errors.vendorName ? 'border-red-500' : 'border-zinc-800 hover:border-orange-500/50'}`}
                  >
                    <span className="text-gray-500 text-sm">Select a product, service or solution</span>
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                {errors.vendorName && <p className="text-red-500 text-xs mt-2 ml-1">{errors.vendorName}</p>}
              </div>

              {requiresAccountId && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">AWS Account ID or Azure Billing ID *</label>
                  <input
                    type="text"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="Required to generate your secure private link"
                    className={`w-full px-4 py-3.5 bg-zinc-900/50 text-white placeholder-gray-500 border rounded-xl focus:outline-none transition-all ${errors.accountId ? 'border-red-500 focus:border-red-500 bg-red-500/5' : 'border-zinc-800 focus:border-orange-500 hover:border-zinc-700'}`}
                  />
                  {errors.accountId && <p className="text-red-500 text-xs mt-2 ml-1">{errors.accountId}</p>}
                  <p className="text-gray-500 text-xs mt-3 leading-relaxed">{CLOUD_ENV_DISCLAIMER}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Current Procurement Stage *</label>
                <select
                  value={procurementStage}
                  onChange={(e) => setProcurementStage(e.target.value)}
                  className={`w-full px-4 py-3.5 bg-zinc-900/50 text-white border rounded-xl focus:outline-none transition-all appearance-none cursor-pointer ${errors.procurementStage ? 'border-red-500 focus:border-red-500 bg-red-500/5' : 'border-zinc-800 focus:border-orange-500 hover:border-zinc-700'}`}
                  style={selectChevronStyle}
                >
                  <option value="" disabled hidden>Select...</option>
                  {PROCUREMENT_STAGES.map((stage) => (
                    <option key={stage} value={stage} className="bg-zinc-900">{stage}</option>
                  ))}
                </select>
                {errors.procurementStage && <p className="text-red-500 text-xs mt-2 ml-1">{errors.procurementStage}</p>}
              </div>

              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="accent-orange-500 w-4 h-4 mt-0.5"
                  />
                  <span className="text-sm text-gray-400">
                    I agree to be contacted by NeoZaar regarding this private offer request.
                  </span>
                </label>
                {errors.consent && <p className="text-red-500 text-xs mt-2 ml-1">{errors.consent}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-700 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-orange-800 transition-all duration-300 shadow-lg shadow-orange-900/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Build My Private Offer'
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer />

      {pickerOpen && (
        <ProductPickerModal
          onSelect={(item) => {
            setSelectedItem(item);
            setErrors((prev) => ({ ...prev, vendorName: undefined }));
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

export default function PrivateOfferPage() {
  return (
    <Suspense fallback={null}>
      <PrivateOfferPageContent />
    </Suspense>
  );
}
