'use client';

import { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import toast, { Toaster } from 'react-hot-toast';
import Header from '../layouts/Header';
import Footer from '../layouts/Footer';

// Icons for better visual appeal
const Icons = {
  User: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Email: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Phone: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  Company: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Location: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Message: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  ),
  Success: () => (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  ),
};

export default function Page() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    companyName: '',
    country: '',
    message: '',
    inquiryType: '',
    referralSource: '',
    consent: false
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [progressWidth, setProgressWidth] = useState(100);

  // List of restricted public email domains
  const restrictedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com'];

  // Auto-close success message after 30 seconds
  useEffect(() => {
    let timer;
    let interval;
    
    if (submissionSuccess) {
      setProgressWidth(100);
      
      // Animate progress bar
      interval = setInterval(() => {
        setProgressWidth(prev => Math.max(0, prev - (100/30) * 0.1)); // Update every 100ms
      }, 100);
      
      timer = setTimeout(() => {
        setSubmissionSuccess(false);
        setProgressWidth(100);
      }, 30000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [submissionSuccess]);

  const validateForm = () => {
    const errs = {};
    
    if (!formData.fullName.trim()) errs.fullName = 'Full name is required';
    
    if (!formData.email) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please enter a valid email address';
    } else {
      const domain = formData.email.split('@')[1].toLowerCase();
      if (restrictedDomains.includes(domain)) {
        errs.email = 'Please use your business email address';
      }
    }
    
    if (!formData.mobile) {
      errs.mobile = 'Phone number is required';
    } else if (formData.mobile.length < 10) {
      errs.mobile = 'Please enter a valid phone number';
    }
    
    if (!formData.message.trim()) errs.message = 'Message is required';
    if (!formData.inquiryType) errs.inquiryType = 'Please select an inquiry type';
    if (!formData.consent) errs.consent = 'You must agree to the terms';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName,
          business_email: formData.email,
          phone_number: formData.mobile.startsWith('+') ? formData.mobile : `+${formData.mobile}`,
          company_name: formData.companyName,
          country: formData.country || 'India',
          message: formData.message,
          help_type: formData.inquiryType,
          heard_about: formData.referralSource || 'Other',
          consent_given: formData.consent,
        }),
      });

      // Also push to CRM leads (fire-and-forget)
      fetch(`${process.env.NEXT_PUBLIC_API_BASE}public/leads/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          phone: formData.mobile.startsWith('+') ? formData.mobile : `+${formData.mobile}`,
          company: formData.companyName,
          country: formData.country || 'India',
          requirement: formData.message,
          consent_status: formData.consent,
        }),
      }).catch(() => {});

      const data = await res.json();

      if (res.ok) {
        toast.success('Form submitted successfully!', {
          icon: '🎉',
          duration: 5000,
        });
        
        setSubmissionSuccess(true);
        
        // Reset form
        setFormData({
          fullName: '',
          email: '',
          mobile: '',
          companyName: '',
          country: '',
          message: '',
          inquiryType: '',
          referralSource: '',
          consent: false
        });
        setErrors({});
      } else {
        toast.error(data.error || 'Submission failed. Please try again.');
      }
    } catch (err) {
      toast.error('An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const successMessage = "We've received your inquiry and have routed it to the right specialist. Whether you're looking to deploy a new solution or discuss a strategic partnership, a member of the Neozaar team will contact you within 2 Business Days.";

  return (
    <>
    <div className="w-full bg-black">
      <Header />
    </div>
    <div className="w-full m-auto bg-black">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333',
          },
          success: {
            iconTheme: {
              primary: '#f97316',
              secondary: '#fff',
            },
          },
        }}
      />
      
      {/* Success Modal */}
      {submissionSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-zinc-900 to-black border border-orange-500/30 rounded-2xl p-8 max-w-md w-full relative shadow-2xl animate-fadeIn">
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-t-2xl transition-all duration-100 ease-linear"
                 style={{ width: `${progressWidth}%` }} />
            
            <div className="text-center">
              <div className="mb-6 animate-scaleIn">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <Icons.Success />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-4 animate-slideUp">
                Thank You!
              </h3>
              
              <p className="text-gray-300 mb-6 leading-relaxed animate-slideUp delay-100">
                {successMessage}
              </p>
              
              <div className="space-y-4 animate-slideUp delay-200">
                <div className="text-sm text-gray-400">
                  <p>This message will close automatically in <span className="text-orange-400 font-bold">{Math.ceil(progressWidth / (100/30))} seconds</span></p>
                </div>
                
                <button
                  onClick={() => setSubmissionSuccess(false)}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all transform hover:scale-105 duration-200 shadow-lg shadow-orange-500/25"
                >
                  Close Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="flex flex-col lg:flex-row w-full min-h-screen lg:px-20">
        {/* Form Section */}
        <div className="bg-black flex flex-col items-center lg:items-start px-4 sm:px-6 py-10 w-full lg:w-1/2 lg:h-screen lg:overflow-y-auto hide-scrollbar">
          <div className="w-full max-w-lg animate-fadeInUp">
            <div className="text-center lg:text-left mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                  Get in Touch
                </span>
              </h1>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                Please fill out the form below for inquiries regarding our products, solutions, and services, 
                or to explore a partnership with us.
              </p>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed">
               Our team will review your request and get in touch as soon as possible.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div className="animate-slideInLeft" style={{ animationDelay: '0.1s' }}>
                <div className={`relative group ${focusedField === 'fullName' ? 'z-10' : ''}`}>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-orange-500 transition-colors">
                    <Icons.User />
                  </div>
                  <input
                    type="text"
                    placeholder="Full Name *"
                    value={formData.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    onFocus={() => setFocusedField('fullName')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full pl-10 pr-4 py-3.5 bg-zinc-900/50 text-white placeholder-gray-500 border rounded-xl focus:outline-none transition-all ${
                      errors.fullName 
                        ? 'border-red-500 focus:border-red-500 bg-red-500/5' 
                        : 'border-zinc-800 focus:border-orange-500 hover:border-zinc-700'
                    }`}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-red-500 text-xs mt-2 ml-2 animate-fadeIn">
                    {errors.fullName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="animate-slideInLeft" style={{ animationDelay: '0.15s' }}>
                <div className={`relative group ${focusedField === 'email' ? 'z-10' : ''}`}>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-orange-500 transition-colors">
                    <Icons.Email />
                  </div>
                  <input
                    type="email"
                    placeholder="Business Email *"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full pl-10 pr-4 py-3.5 bg-zinc-900/50 text-white placeholder-gray-500 border rounded-xl focus:outline-none transition-all ${
                      errors.email 
                        ? 'border-red-500 focus:border-red-500 bg-red-500/5' 
                        : 'border-zinc-800 focus:border-orange-500 hover:border-zinc-700'
                    }`}
                  />
                </div>
                {errors.email ? (
                  <p className="text-red-500 text-xs mt-2 ml-2 animate-fadeIn">
                    {errors.email}
                  </p>
                ) : (
                  <p className="text-gray-500 text-xs mt-2 ml-2">
                    Please use your company email address
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className={`animate-slideInLeft relative ${focusedField === 'mobile' ? 'z-30' : 'z-20'}`} style={{ animationDelay: '0.2s' }}>
                <div className={`relative group ${focusedField === 'mobile' ? 'z-30' : 'z-20'}`}>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-orange-500 transition-colors z-10">
                    <Icons.Phone />
                  </div>
                  <PhoneInput
                    country={'in'}
                    value={formData.mobile}
                    onChange={(phone) => updateField('mobile', phone)}
                    onFocus={() => setFocusedField('mobile')}
                    onBlur={() => setFocusedField(null)}
                    inputClass="!w-full !pl-20 !pr-4 !py-3.5 !bg-zinc-900/50 !text-white !border !rounded-xl !focus:outline-none !transition-all"
                    containerClass={`!w-full dark-phone ${errors.mobile ? '!border-red-500' : '!border-zinc-800'}`}
                    buttonClass="!bg-transparent !border-0 !hover:bg-transparent"
                    dropdownClass="!bg-zinc-900 !text-white"
                    searchClass="!bg-zinc-800 !text-white"
                    enableSearch={true}
                    disableSearchIcon={true}
                  />
                </div>
                {errors.mobile && (
                  <p className="text-red-500 text-xs mt-2 ml-2 animate-fadeIn">
                    {errors.mobile}
                  </p>
                )}
              </div>

              {/* Company Name & Country Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="animate-slideInLeft" style={{ animationDelay: '0.25s' }}>
                  <div className={`relative group ${focusedField === 'companyName' ? 'z-10' : ''}`}>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-orange-500 transition-colors">
                      <Icons.Company />
                    </div>
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={formData.companyName}
                      onChange={(e) => updateField('companyName', e.target.value)}
                      onFocus={() => setFocusedField('companyName')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-10 pr-4 py-3.5 bg-zinc-900/50 text-white placeholder-gray-500 border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 hover:border-zinc-700 transition-all"
                    />
                  </div>
                </div>

                <div className="animate-slideInLeft" style={{ animationDelay: '0.3s' }}>
                  <div className={`relative group ${focusedField === 'country' ? 'z-10' : ''}`}>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-orange-500 transition-colors">
                      <Icons.Location />
                    </div>
                    <input
                      type="text"
                      placeholder="Country / Location"
                      value={formData.country}
                      onChange={(e) => updateField('country', e.target.value)}
                      onFocus={() => setFocusedField('country')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-10 pr-4 py-3.5 bg-zinc-900/50 text-white placeholder-gray-500 border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 hover:border-zinc-700 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Inquiry Type */}
              <div className="animate-slideInLeft" style={{ animationDelay: '0.35s' }}>
                <label className="block text-sm font-medium text-gray-300 mb-2 ml-2">
                  How may I assist you? *
                </label>
                <select
                  value={formData.inquiryType}
                  onChange={(e) => updateField('inquiryType', e.target.value)}
                  onFocus={() => setFocusedField('inquiryType')}
                  onBlur={() => setFocusedField(null)}
                  className={`w-full px-4 py-3.5 bg-zinc-900/50 text-white border rounded-xl focus:outline-none transition-all appearance-none cursor-pointer ${
                    errors.inquiryType 
                      ? 'border-red-500 focus:border-red-500 bg-red-500/5' 
                      : 'border-zinc-800 focus:border-orange-500 hover:border-zinc-700'
                  }`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23999'%3E%3Cpath strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1rem center',
                    backgroundSize: '1.5rem',
                  }}
                >
                  <option value="" disabled hidden>-- Select Type --</option>
                  <option value="Product Enquiry" className="bg-zinc-900">Product Enquiry</option>
                  <option value="Partnership" className="bg-zinc-900">Partnership</option>
                  <option value="Billing Enquiry" className="bg-zinc-900">Billing Enquiry</option>
                  <option value="Technical Support" className="bg-zinc-900">Technical Support</option>
                  <option value="Other" className="bg-zinc-900">Other</option>
                </select>
                {errors.inquiryType && (
                  <p className="text-red-500 text-xs mt-2 ml-2 animate-fadeIn">
                    {errors.inquiryType}
                  </p>
                )}
              </div>

              {/* Message */}
              <div className="animate-slideInLeft" style={{ animationDelay: '0.4s' }}>
                <label className="block text-sm font-medium text-gray-300 mb-2 ml-2">
                  Your Message *
                </label>
                <div className={`relative group ${focusedField === 'message' ? 'z-10' : ''}`}>
                  <div className="absolute top-3 left-3 pointer-events-none text-gray-500 group-focus-within:text-orange-500 transition-colors">
                    <Icons.Message />
                  </div>
                  <textarea
                    placeholder="Please describe your requirement in detail..."
                    value={formData.message}
                    onChange={(e) => updateField('message', e.target.value)}
                    onFocus={() => setFocusedField('message')}
                    onBlur={() => setFocusedField(null)}
                    rows={5}
                    className={`w-full pl-10 pr-4 py-3.5 bg-zinc-900/50 text-white placeholder-gray-500 border rounded-xl focus:outline-none transition-all resize-none ${
                      errors.message 
                        ? 'border-red-500 focus:border-red-500 bg-red-500/5' 
                        : 'border-zinc-800 focus:border-orange-500 hover:border-zinc-700'
                    }`}
                  />
                </div>
                {errors.message && (
                  <p className="text-red-500 text-xs mt-2 ml-2 animate-fadeIn">
                    {errors.message}
                  </p>
                )}
              </div>

              {/* Referral Source */}
              <div className="animate-slideInLeft" style={{ animationDelay: '0.45s' }}>
                <label className="block text-sm font-medium text-gray-300 mb-2 ml-2">
                  How Did You Hear About Us?
                </label>
                <select
                  value={formData.referralSource}
                  onChange={(e) => updateField('referralSource', e.target.value)}
                  onFocus={() => setFocusedField('referralSource')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full px-4 py-3.5 bg-zinc-900/50 text-white border border-zinc-800 rounded-xl focus:outline-none focus:border-orange-500 hover:border-zinc-700 transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23999'%3E%3Cpath strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1rem center',
                    backgroundSize: '1.5rem',
                  }}
                >
                  <option value="" className="bg-zinc-900">-- Select Source --</option>
                  <option value="Google" className="bg-zinc-900">Google</option>
                  <option value="LinkedIn" className="bg-zinc-900">LinkedIn</option>
                  <option value="Facebook" className="bg-zinc-900">Facebook</option>
                  <option value="Referral" className="bg-zinc-900">Referral</option>
                  <option value="Other" className="bg-zinc-900">Other</option>
                </select>
              </div>

              {/* Consent */}
              <div className="animate-slideInLeft" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-start space-x-3">
                  <div className="relative flex items-center h-5">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={formData.consent}
                      onChange={(e) => updateField('consent', e.target.checked)}
                      className="w-4 h-4 accent-orange-500 rounded border-zinc-700 bg-zinc-900 focus:ring-orange-500 focus:ring-offset-0"
                    />
                  </div>
                  <label htmlFor="consent" className="text-sm text-gray-300 cursor-pointer select-none">
                    I agree to receive communications regarding my enquiry *
                  </label>
                </div>
                {errors.consent && (
                  <p className="text-red-500 text-xs mt-2 ml-2 animate-fadeIn">
                    {errors.consent}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="animate-slideInLeft" style={{ animationDelay: '0.55s' }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium py-4 px-6 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all transform hover:scale-[1.02] duration-200 shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit
                        <Icons.ArrowRight />
                      </>
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Map Section */}
        <div className="w-full lg:w-1/2 relative h-[30rem] lg:h-screen bg-black animate-fadeInRight">
          <div className="lg:absolute w-full  inset-0 p-4 lg:p-10">
            <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
              <iframe
                title="Neozaar Location"
                className="w-full h-full"
                src="https://www.google.com/maps?q=Neozaar,+G+Square+Business+Park,+opp.+Sanpada+Railway+Station+Road,+Sector+30,+Sanpada,+Navi+Mumbai,+Maharashtra+400705&z=17&output=embed"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              
              {/* Map Overlay Info */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-center">
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=Neozaar,+G+Square+Business+Park,+opp.+Sanpada+Railway+Station+Road,+Sector+30,+Sanpada,+Navi+Mumbai,+Maharashtra+400705"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-black/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl border border-orange-500/30 hover:border-orange-500 transition-all shadow-lg hover:shadow-orange-500/20"
                >
                  <Icons.Location />
                  <span>Get Directions</span>
                  <Icons.ArrowRight />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />

      {/* Add animation styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .animate-fadeInRight {
          animation: fadeInRight 0.6s ease-out forwards;
        }
        
        .animate-slideInLeft {
          opacity: 0;
          animation: slideInLeft 0.5s ease-out forwards;
        }
        
        .animate-scaleIn {
          opacity: 0;
          animation: scaleIn 0.4s ease-out forwards;
        }
        
        .animate-slideUp {
          opacity: 0;
          animation: slideUp 0.4s ease-out forwards;
        }
        
        .delay-100 {
          animation-delay: 0.1s;
        }
        
        .delay-200 {
          animation-delay: 0.2s;
        }
        
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
    </>
  );
}