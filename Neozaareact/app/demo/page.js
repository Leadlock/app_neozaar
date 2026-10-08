'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Header from '../layouts/Header';
import Footer from '../layouts/Footer';
import Image from 'next/image';

export default function Page() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [productid, setProductName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [preferredContact, setPreferredContact] = useState('');
  const [consent, setConsent] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
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

  const handleInputChange = (field, value) => {
    setErrors((prev) => ({ ...prev, [field]: '' }));

    switch (field) {
      case 'companyName': setCompanyName(value); break;
      case 'fullName': setFullName(value); break;
      case 'mobile': setMobile(value); break;
      case 'email': setEmail(value); break;
      case 'productid': setProductName(value); break;
      case 'companyWebsite': setCompanyWebsite(value); break;
      case 'timezone': setSelectedTimezone(value); break;
      case 'preferredContact': setPreferredContact(value); break;
      default: break;
    }
  };

  const validateForm = () => {
    const errs = {};

    if (!companyName.trim()) errs.companyName = 'Company Name is required';
    if (!fullName.trim()) errs.fullName = 'Full Name is required';
    if (!mobile.trim()) errs.mobile = 'Phone Number is required';
    if (!email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Invalid email format';
    }
    if (!productid.trim()) errs.productid = 'Product Name is required';
    if (!companyWebsite.trim()) {
      errs.companyWebsite = 'Company Website is required';
    } else if (!/^https?:\/\/[^\s]+\.[^\s]+$/.test(companyWebsite)) {
      errs.companyWebsite = 'Invalid Website URL';
    }
    if (!preferredContact) errs.preferredContact = 'Preferred contact method is required';
    if (!consent) errs.consent = 'You must agree to receive communications';
    if (!selectedTimezone) errs.timezone = 'Timezone selection is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleEnquirySubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);

    const payload = {
      basic_info: {
        companyName,
        fullName,
        mobile,
        email,
        productid,
        preferredContact,
        consent,
        companyWebsite,
        selectedTimezone
      },
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}enquiry/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Also push to CRM leads (fire-and-forget)
      fetch(`${process.env.NEXT_PUBLIC_API_BASE}public/leads/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email: email,
          phone: mobile,
          company: companyName,
          requirement: `Demo request for product: ${productid || 'N/A'}`,
          consent_status: consent,
        }),
      }).catch(() => {});

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        toast.success('Enquiry Submitted!');
        router.push('/thank-you');
      } else {
        toast.error(data.message || 'Submission failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1920px] m-auto bg-black">
      <Header />
      <div className="p-6 grid grid-cols-7 gap-6 text-white">
        <div className="col-span-5">
          <a href="#" className="inline-block px-6 py-2 bg-red-500 text-white font-medium">Back</a>
        </div>

        <div className="px-6 py-6 w-full col-span-7 lg:col-span-4 bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
          <h2 className="text-xl font-medium mb-4">Demo Form</h2>

          <div className="space-y-4 grid grid-cols-2 gap-4">
            <input value={companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} placeholder="Company Name" className={`px-3 py-3 border bg-transparent ${errors.companyName ? 'border-red-500' : 'border-zinc-700'}`} />
            {errors.companyName && <p className="text-red-500 text-sm col-span-2">{errors.companyName}</p>}

            <input value={fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} placeholder="Full Name" className={`px-3 py-3 border bg-transparent ${errors.fullName ? 'border-red-500' : 'border-zinc-700'}`} />
            {errors.fullName && <p className="text-red-500 text-sm col-span-2">{errors.fullName}</p>}

            <input value={mobile} onChange={(e) => handleInputChange('mobile', e.target.value)} placeholder="Phone Number" className={`px-3 py-3 border bg-transparent ${errors.mobile ? 'border-red-500' : 'border-zinc-700'}`} />
            {errors.mobile && <p className="text-red-500 text-sm col-span-2">{errors.mobile}</p>}

            <input value={email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="Business Email" className={`px-3 py-3 border bg-transparent ${errors.email ? 'border-red-500' : 'border-zinc-700'}`} />
            {errors.email && <p className="text-red-500 text-sm col-span-2">{errors.email}</p>}

            <input value={companyWebsite} onChange={(e) => handleInputChange('companyWebsite', e.target.value)} placeholder="Company Website" className={`px-3 py-3 border bg-transparent ${errors.companyWebsite ? 'border-red-500' : 'border-zinc-700'}`} />
            {errors.companyWebsite && <p className="text-red-500 text-sm col-span-2">{errors.companyWebsite}</p>}

            <input value={productid} onChange={(e) => handleInputChange('productid', e.target.value)} type="hidden" />

            <select value={selectedTimezone} onChange={(e) => handleInputChange('timezone', e.target.value)} className={`px-4 py-2 border bg-zinc-900 ${errors.timezone ? 'border-red-500' : 'border-zinc-700'}`}>
              <option value="">-- Select Country & Timezone --</option>
              <option value="Asia/Kolkata">India (Asia/Kolkata)</option>
              <option value="America/New_York">USA (America/New_York)</option>
              <option value="Europe/London">UK (Europe/London)</option>
              <option value="Australia/Sydney">Australia (Australia/Sydney)</option>
              <option value="Asia/Tokyo">Japan (Asia/Tokyo)</option>
              <option value="Europe/Berlin">Germany (Europe/Berlin)</option>
              <option value="America/Sao_Paulo">Brazil (America/Sao_Paulo)</option>
              <option value="America/Toronto">Canada (America/Toronto)</option>
            </select>
            {errors.timezone && <p className="text-red-500 text-sm col-span-2">{errors.timezone}</p>}

            <div className="col-span-2">
              <label className="block mb-1">Preferred Contact</label>
              <div className="flex space-x-4">
                {['call', 'email', 'whatsapp'].map((method) => (
                  <label key={method} className="flex items-center space-x-2">
                    <input type="radio" value={method} checked={preferredContact === method} onChange={(e) => handleInputChange('preferredContact', e.target.value)} />
                    <span>{method}</span>
                  </label>
                ))}
              </div>
              {errors.preferredContact && <p className="text-red-500 text-sm">{errors.preferredContact}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-white mb-1">Your Use Case / What would you Like to see in the Demo?</label>
              <textarea rows="4" className="w-full p-2 text-sm text-white bg-zinc-800 border border-zinc-700" placeholder="Tell us more..." />
            </div>

            <label className="flex items-center space-x-2 col-span-2">
              <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErrors((prev) => ({ ...prev, consent: '' })); }} />
              <span>I agree to receive communications regarding my demo booking</span>
            </label>
            {errors.consent && <p className="text-red-500 text-sm col-span-2">{errors.consent}</p>}
          </div>

          <div className="col-span-2 text-right mt-6">
            <button onClick={handleEnquirySubmit} className="bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700">
              {loading ? 'Submitting...' : 'Submit Enquiry'}
            </button>
          </div>
        </div>

        <div className="col-span-7 lg:col-span-3">
          <div className="px-7 py-8 bg-white/10 backdrop-blur-md border border-white/20 shadow-lg mb-6">
            <div className="flex gap-6">
              <Image src="/image/acronis.png" alt="Logo" width={120} height={120} />
              <div>
                <h2 className="text-xl font-semibold mb-3">Product Name</h2>
                <p className="text-sm line-clamp-4">Lorem Ipsum is simply dummy text...</p>
              </div>
            </div>
          </div>

          <div className="px-7 py-8 bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
            <h5 className="text-lg font-semibold mb-3">Company Information</h5>
            <p className="text-sm mb-4">Lorem Ipsum is simply dummy text...</p>
            <div className="space-y-1 text-sm">
              <p><strong>Contact Number:</strong> +1 (234) 567-8901</p>
              <p><strong>Email:</strong> contact@company.com</p>
              <p><strong>Address:</strong> 123 Street, NY 10001</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
