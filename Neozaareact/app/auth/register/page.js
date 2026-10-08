'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import toast, { Toaster } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { FaGoogle, FaLinkedinIn } from 'react-icons/fa';

// Enhanced storage utilities with better debugging
const storageUtils = {
  // Cookie methods
  setCookie: (name, value, days = 1) => {
    if (typeof document === 'undefined') return;
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
    document.cookie = name + "=" + stringValue + ";" + expires + ";path=/;SameSite=Lax";
    console.log(`Cookie set: ${name} =`, value);
  },

  getCookie: (name) => {
    if (typeof document === 'undefined') return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        const value = c.substring(nameEQ.length, c.length);
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
    }
    return null;
  },

  removeCookie: (name) => {
    if (typeof document === 'undefined') return;
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    console.log(`Cookie removed: ${name}`);
  },

  // SessionStorage methods
  getSessionItem: (key) => {
    if (typeof window === 'undefined') return null;
    try {
      const item = sessionStorage.getItem(key);
      if (item) {
        console.log(`SessionStorage read: ${key} =`, item);
        return JSON.parse(item);
      }
    } catch (error) {
      console.error('Error reading from sessionStorage:', error);
    }
    return null;
  },

  removeSessionItem: (key) => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem(key);
      console.log(`SessionStorage removed: ${key}`);
    } catch (error) {
      console.error('Error removing from sessionStorage:', error);
    }
  },

  // Get redirect info from all sources
  getRedirectInfo: () => {
    console.log('Checking for redirect info...');
    
    // Check sessionStorage first
    const sessionData = storageUtils.getSessionItem('redirect_after_login');
    if (sessionData) {
      console.log('✅ Found redirect info in sessionStorage:', sessionData);
      return sessionData;
    }
    
    // Then check cookies
    const cookieData = storageUtils.getCookie('redirect_after_login');
    if (cookieData) {
      console.log('✅ Found redirect info in cookies:', cookieData);
      return cookieData;
    }
    
    console.log('❌ No redirect info found');
    return null;
  },

  // Clear all redirect info
  clearRedirectInfo: () => {
    storageUtils.removeCookie('redirect_after_login');
    storageUtils.removeSessionItem('redirect_after_login');
    storageUtils.removeCookie('stored_utm_params');
    storageUtils.removeSessionItem('stored_utm_params');
    console.log('✅ All redirect info cleared');
  }
};

// Separate component that uses useSearchParams
function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    company_name: '',
    business_email: '',
    gst: '',
    acceptTerms: false,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [redirectInfo, setRedirectInfo] = useState(null);
  const [utmParams, setUtmParams] = useState(null);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: '',
    color: 'text-gray-400',
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    }
  });

  const role_id = 1;

  const handleSocialRegistration = (provider) => {
    if (!formData.acceptTerms) {
      setErrors((previous) => ({ ...previous, acceptTerms: 'Please accept the Terms of Use and Privacy Policy to continue' }));
      toast.error('Please accept the Terms of Use and Privacy Policy first.');
      return;
    }
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api/').replace(/\/+$/, '');
    window.location.href = `${apiBase}/oauth/${provider}/start?intent=register`;
  };

  // Check for stored redirect and UTM data on component mount
  useEffect(() => {
    console.log('🔄 Component mounted, checking storage...');
    
    // Get redirect info from storage
    const redirectData = storageUtils.getRedirectInfo();
    
    // Get UTM params
    const storedUtm = storageUtils.getCookie('stored_utm_params') || 
                      storageUtils.getSessionItem('stored_utm_params');
    
    // Also check URL params for UTM
    const urlUtm = {
      utm_source: searchParams?.get('utm_source'),
      utm_medium: searchParams?.get('utm_medium'),
      utm_campaign: searchParams?.get('utm_campaign'),
      utm_term: searchParams?.get('utm_term'),
      utm_content: searchParams?.get('utm_content'),
    };

    // Set redirect info
    if (redirectData) {
      setRedirectInfo(redirectData);
      console.log('📌 Redirect info set in state:', redirectData);
    }

    // Set UTM params (prioritize stored over URL)
    if (storedUtm) {
      setUtmParams(storedUtm);
      console.log('📌 Stored UTM params set:', storedUtm);
    } else if (urlUtm.utm_source || urlUtm.utm_medium || urlUtm.utm_campaign) {
      setUtmParams(urlUtm);
      console.log('📌 URL UTM params set:', urlUtm);
    }
  }, [searchParams]);

  // Check password strength
  const checkPasswordStrength = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(requirements).filter(Boolean).length;
    let message = '';
    let color = '';

    switch (score) {
      case 5:
        message = 'Very Strong';
        color = 'text-green-500';
        break;
      case 4:
        message = 'Strong';
        color = 'text-green-400';
        break;
      case 3:
        message = 'Good';
        color = 'text-yellow-500';
        break;
      case 2:
        message = 'Weak';
        color = 'text-orange-500';
        break;
      case 1:
        message = 'Very Weak';
        color = 'text-red-500';
        break;
      default:
        message = '';
        color = 'text-gray-400';
    }

    setPasswordStrength({
      score,
      message,
      color,
      requirements
    });
  };

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name)) {
      newErrors.name = "Name can only contain letters and spaces";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Work email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    } else if (formData.email.includes(' ')) {
      newErrors.email = "Email cannot contain spaces";
    }

    // Password validation
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else {
      const requirements = passwordStrength.requirements;
      
      if (!requirements.length) {
        newErrors.password = "Password must be at least 8 characters long";
      } else if (!requirements.uppercase) {
        newErrors.password = "Password must contain at least one uppercase letter";
      } else if (!requirements.lowercase) {
        newErrors.password = "Password must contain at least one lowercase letter";
      } else if (!requirements.number) {
        newErrors.password = "Password must contain at least one number";
      } else if (!requirements.special) {
        newErrors.password = "Password must contain at least one special character (!@#$%^&* etc.)";
      } else if (passwordStrength.score < 4) {
        newErrors.password = "Password is not strong enough. Please make it stronger";
      }
    }

    // Mobile validation
    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else {
      const cleanedMobile = formData.mobile.replace(/\D/g, '');
      if (cleanedMobile.length < 10) {
        newErrors.mobile = "Please enter a valid 10-digit mobile number";
      } else if (cleanedMobile.length > 13) {
        newErrors.mobile = "Mobile number is too long";
      }
    }

    // Company name validation
    if (!formData.company_name.trim()) {
      newErrors.company_name = "Company name is required";
    } else if (formData.company_name.length < 2) {
      newErrors.company_name = "Company name must be at least 2 characters";
    } else if (formData.company_name.length > 100) {
      newErrors.company_name = "Company name is too long (max 100 characters)";
    }

    // Terms acceptance validation
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = "You must accept the Terms of Use and Privacy Policy to continue";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Function to perform redirect with multiple attempts
  const performRedirect = (url) => {
    if (!url) {
      console.log('❌ No URL to redirect to');
      return false;
    }

    if (redirectAttempted) {
      console.log('⏭️ Redirect already attempted, skipping');
      return false;
    }

    setRedirectAttempted(true);
    
    // Clean the URL
    let cleanUrl = url;
    
    // Fix double question marks
    cleanUrl = cleanUrl.replace('/??', '/?');
    
    // Ensure URL has proper protocol for absolute URLs
    if (cleanUrl.startsWith('http://localhost') || cleanUrl.startsWith('https://')) {
      // It's already a full URL, use as is
      console.log('🔗 Full URL detected:', cleanUrl);
    } else if (cleanUrl.startsWith('/')) {
      // It's a relative URL, keep as is
      console.log('🔗 Relative URL detected:', cleanUrl);
    } else {
      // Assume it's a path, add leading slash
      cleanUrl = '/' + cleanUrl;
      console.log('🔗 Converted to path:', cleanUrl);
    }

    console.log('🎯 Final redirect URL:', cleanUrl);
    
    // Try multiple redirect methods
    try {
      // Method 1: router.push (Next.js navigation)
      console.log('🔄 Attempting router.push...');
      router.push(cleanUrl);
      
      // Method 2: Fallback with window.location after a delay if needed
      setTimeout(() => {
        if (window.location.pathname !== cleanUrl.split('?')[0]) {
          console.log('⚠️ router.push might have failed, trying window.location...');
          window.location.href = cleanUrl;
        }
      }, 500);
      
      return true;
    } catch (error) {
      console.error('❌ Redirect error:', error);
      
      // Final fallback
      try {
        console.log('🔄 Final fallback: window.location');
        window.location.href = cleanUrl;
      } catch (finalError) {
        console.error('❌ All redirect methods failed:', finalError);
      }
      
      return false;
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      // Collect affiliate attribution data from cookies/session
      const affToken   = storageUtils.getCookie('aff_token') || storageUtils.getSessionItem('aff_token') || (searchParams?.get('aff_token'));
      const utmSource  = utmParams?.utm_source  || searchParams?.get('utm_source')  || null;
      const utmMedium  = utmParams?.utm_medium  || searchParams?.get('utm_medium')  || null;
      const utmCampaign = utmParams?.utm_campaign || searchParams?.get('utm_campaign') || null;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          mobile: formData.mobile,
          role_id,
          profile_details: {
            company_name: formData.company_name,
          },
          // Affiliate attribution — passed to backend for permanent recording.
          // Backend validates the token server-side; no client-supplied affiliate_id.
          ...(affToken   ? { aff_token:    affToken   } : {}),
          ...(utmSource  ? { utm_source:   utmSource  } : {}),
          ...(utmMedium  ? { utm_medium:   utmMedium  } : {}),
          ...(utmCampaign ? { utm_campaign: utmCampaign } : {}),
        }),
      });

      const text = await res.text();
      let data = {};

      try {
        data = JSON.parse(text);
      } catch {
        toast.error('Server error: Invalid response from server');
        setLoading(false);
        return;
      }

      if (res.ok) {
        // Show success message from response
        toast.success(data.message || 'Registration successful! Welcome aboard!');
        
        // Trigger customer scoring event
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_BASE}public/leads/scoring/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email, name: formData.name, event_type: 'customer_registration' })
          });
        } catch(e) { /* scoring is non-blocking */ }
        
        // Get the redirect URL from state
        const redirectTo = redirectInfo?.url;
        
        console.log('📦 Registration successful!');
        console.log('📦 API Response:', data);
        console.log('📦 Redirect info:', redirectInfo);
        console.log('📦 Redirect URL:', redirectTo);
        
        // Log all storage for debugging
        console.log('📦 SessionStorage contents:', {
          redirect_after_login: storageUtils.getSessionItem('redirect_after_login'),
          stored_utm_params: storageUtils.getSessionItem('stored_utm_params')
        });
        
        // Clear storage after successful registration
        storageUtils.clearRedirectInfo();
        
        // ALWAYS redirect if there's a redirect URL, regardless of response structure
        if (redirectTo) {
          console.log('🚀 Starting redirect process to:', redirectTo);
          
          // Small delay to ensure toast is shown
          setTimeout(() => {
            const redirectSuccess = performRedirect(redirectTo);
            if (!redirectSuccess) {
              console.log('❌ Redirect failed, falling back to home page');
              router.push('/');
            }
          }, 2000);
        } else {
          console.log('🚀 No redirect URL, going to home page');
          setTimeout(() => {
            router.push('/');
          }, 1500);
        }
      } else {
        // Handle specific server errors
        if (data.message?.toLowerCase().includes('email') || 
            data.message?.toLowerCase().includes('already exists') ||
            data.message?.toLowerCase().includes('already registered')) {
          
          toast.error('This email is already registered. Please use a different email or try logging in.');
          
          // Store the current URL before redirecting to login
          if (redirectInfo?.url) {
            storageUtils.setCookie('redirect_after_login', { url: redirectInfo.url }, 1);
            if (utmParams) {
              storageUtils.setCookie('stored_utm_params', utmParams, 1);
            }
          }
          
          setTimeout(() => {
            router.push('/auth/login');
          }, 2000);
        } else if (data.message?.toLowerCase().includes('phone') || data.message?.toLowerCase().includes('mobile')) {
          toast.error('This mobile number is already registered.');
        } else {
          toast.error(data.message || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Check password strength when password changes
    if (field === 'password') {
      checkPasswordStrength(value);
    }
  };

  const handleCheckboxChange = (e) => {
    setFormData((prev) => ({ ...prev, acceptTerms: e.target.checked }));
  };

  // Password requirement checklist component
  const PasswordRequirements = () => (
    <div className="mt-2 space-y-1">
      <p className="text-xs text-gray-400 mb-2">Password must contain:</p>
      <div className="grid grid-cols-2 gap-1 text-xs">
        {[
          { key: 'length', label: 'At least 8 characters' },
          { key: 'uppercase', label: 'One uppercase letter' },
          { key: 'lowercase', label: 'One lowercase letter' },
          { key: 'number', label: 'One number' },
          { key: 'special', label: 'One special character' },
        ].map((req) => (
          <div key={req.key} className="flex items-center">
            <span className={`mr-2 ${passwordStrength.requirements[req.key] ? 'text-green-500' : 'text-gray-500'}`}>
              {passwordStrength.requirements[req.key] ? '✓' : '○'}
            </span>
            <span className={passwordStrength.requirements[req.key] ? 'text-green-400' : 'text-gray-400'}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
      {formData.password && passwordStrength.message && (
        <div className={`mt-2 text-xs font-medium ${passwordStrength.color}`}>
          Password strength: {passwordStrength.message}
          <div className="w-full bg-gray-700 h-1 mt-1 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                passwordStrength.score === 1 ? 'w-1/5 bg-red-500' :
                passwordStrength.score === 2 ? 'w-2/5 bg-orange-500' :
                passwordStrength.score === 3 ? 'w-3/5 bg-yellow-500' :
                passwordStrength.score === 4 ? 'w-4/5 bg-green-400' :
                passwordStrength.score === 5 ? 'w-full bg-green-500' :
                'w-0'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Toaster 
        position="top-right" 
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
          },
          success: {
            style: {
              background: '#065f46',
              color: '#fff',
            },
          },
          error: {
            style: {
              background: '#7f1d1d',
              color: '#fff',
            },
          },
        }}
      />
      <section className="flex flex-col md:flex-row w-full min-h-screen">
        {/* Left form section */}
        <div className="bg-black flex flex-col items-center px-6 py-10 w-full md:w-1/2 h-screen overflow-y-auto hide-scrollbar">
          <div className="relative h-12 w-50 mb-6">
            <Image src="/image/logo-s.png" alt="Logo" width={192} height={48} className="object-contain mb-6" />
          </div>

          <p className="text-center text-white text-base md:text-lg mb-6 w-64 lg:w-96">
            Early registration is now open—secure your place today and be among the first to benefit.
          </p>

          <div className="w-full max-w-sm space-y-3">
            <label className="flex cursor-pointer items-start gap-3 border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={handleCheckboxChange}
                className="mt-0.5 h-5 w-5 rounded border-zinc-700 bg-zinc-900 text-orange-600 focus:ring-2 focus:ring-orange-500"
              />
              <span>
                I agree to the{' '}
                <Link href="/terms-of-use/" target="_blank" className="font-semibold text-orange-400 underline">Terms of Use</Link>
                {' '}and{' '}
                <Link href="/privacy-policy" target="_blank" className="font-semibold text-orange-400 underline">Privacy Policy</Link>.
              </span>
            </label>
            {errors.acceptTerms && <p className="text-xs text-red-400">{errors.acceptTerms}</p>}

            <button
              type="button"
              disabled={!formData.acceptTerms}
              onClick={() => handleSocialRegistration('google')}
              className="flex h-[50px] w-full items-center justify-center gap-3 border border-zinc-700 bg-white text-sm font-semibold text-zinc-900 transition hover:border-zinc-500 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FaGoogle className="text-lg text-[#4285F4]" aria-hidden="true" />
              Continue with Google
            </button>
            <button
              type="button"
              disabled={!formData.acceptTerms}
              onClick={() => handleSocialRegistration('linkedin')}
              className="flex h-[50px] w-full items-center justify-center gap-3 border border-[#0A66C2] bg-[#0A66C2] text-sm font-semibold text-white transition hover:bg-[#004182] focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FaLinkedinIn className="text-lg" aria-hidden="true" />
              Continue with LinkedIn
            </button>

            <div className="flex items-center gap-3 py-2" aria-hidden="true">
              <span className="h-px flex-1 bg-zinc-800" />
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">or register with email</span>
              <span className="h-px flex-1 bg-zinc-800" />
            </div>
          </div>

          <form onSubmit={handleRegister} className="w-full max-w-sm space-y-4">
            {[
              { 
                label: 'Full Name', 
                key: 'name',
                validationMessage: 'Enter your full name as it appears on official documents'
              },
              { 
                label: 'Work Email', 
                key: 'email', 
                type: 'email',
                validationMessage: 'Please use your company email address'
              },
              { 
                label: 'Password', 
                key: 'password', 
                type: 'password',
                validationMessage: 'Create a strong password with mix of letters, numbers, and symbols'
              },
              { 
                label: 'Company Name', 
                key: 'company_name',
                validationMessage: 'Enter your registered company name'
              },
            ].map(({ label, key, type = 'text', validationMessage }) => (
              <div key={key} className="relative">
                {key === 'password' ? (
                  <>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={label}
                      value={formData[key]}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className={`px-4 py-3 h-[52px] text-sm text-zinc-300 w-full border pr-12 ${
                        errors[key] ? 'border-red-500 bg-red-400/15' : 'border-zinc-800 bg-zinc-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-6 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </>
                ) : (
                  <input
                    type={type}
                    placeholder={label}
                    value={formData[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className={`px-4 py-3 h-[52px] text-sm text-zinc-300 w-full border ${
                      errors[key] ? 'border-red-500 bg-red-400/15' : 'border-zinc-800 bg-zinc-900'
                    }`}
                  />
                )}
                {errors[key] ? (
                  <p className="text-red-400 text-xs mt-2">{errors[key]}</p>
                ) : (
                  <p className="text-gray-500 text-xs mt-2">{validationMessage}</p>
                )}
                {key === 'password' && <PasswordRequirements />}
              </div>
            ))}

            {/* Phone Number */}
            <div>
              <div
                className={`flex items-center text-sm border ${
                  errors.mobile ? 'border-red-500 bg-red-400/15' : 'border-zinc-800 bg-zinc-900'
                }`}
              >
                <div className="text-sm w-full">
                  <PhoneInput
                    country={'in'}
                    value={formData.mobile}
                    onChange={(phone) => handleChange('mobile', phone)}
                    inputClass="!w-full !bg-transparent !text-white !px-14 !py-3 !text-sm !border-none !outline-none placeholder-gray-500"
                    containerClass="!w-full"
                    buttonClass="!bg-zinc-900 border-zinc-800 px-10"
                    inputProps={{
                      name: 'mobile',
                      required: true,
                      placeholder: 'Mobile Number'
                    }}
                  />
                </div>
              </div>
              {errors.mobile ? (
                <p className="text-red-500 text-xs mt-2">{errors.mobile}</p>
              )  : (
                <p className="text-gray-500 text-xs mt-2">Enter your 10-digit mobile number with country code</p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading || !formData.acceptTerms}
              className={`w-full py-3 text-white font-medium transition-all duration-300 text-lg ${
                loading || !formData.acceptTerms
                  ? 'bg-gray-700 cursor-not-allowed opacity-70'
                  : 'bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 hover:shadow-lg hover:shadow-orange-900/30'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                'SIGN UP NOW'
              )}
            </button>

            <p className="text-center text-xs text-gray-500 mt-4">
              By signing up, you agree to receive important updates about your account
            </p>
          </form>

          <p className="mt-8 text-sm text-zinc-500 text-center">
            Already Have an Account?{' '}
            <Link href="/auth/login" className="text-orange-400 hover:text-orange-300 font-semibold underline ml-1">
              Sign In Here
            </Link>
          </p>
        </div>

        {/* Right image section */}
        <div className="w-full md:w-1/2 h-[400px] md:h-auto">
          <div className="h-full w-full bg-cover bg-center relative bg-[url('/assests/loginbg.png')]">
            <div className="flex items-center justify-center h-full px-6 py-10 md:py-0">
              <p className="text-white dark:text-white font-light text-[26px] md:text-[35px] leading-snug text-center md:text-left font-['CreatoDisplay-Light',_sans-serif] max-w-[90%] md:max-w-[366px]">
                Access your<br />
                personalized <br />
                cloud solutions<br />
                and manage<br />
                your bundled<br />
                services.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// Loading skeleton component
function RegisterSkeleton() {
  return (
    <div className="max-w-[1920px] m-auto">
      <section className="flex flex-col md:flex-row w-full min-h-screen">
        <div className="bg-black flex flex-col items-center px-6 py-10 w-full md:w-1/2">
          <div className="h-12 w-48 bg-gray-800 animate-pulse rounded mb-6"></div>
          <div className="h-16 w-96 bg-gray-800 animate-pulse rounded mb-6"></div>
          <div className="w-full max-w-sm space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-[52px] bg-gray-800 animate-pulse rounded"></div>
                <div className="h-4 w-48 bg-gray-800 animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full md:w-1/2 h-[400px] md:h-auto bg-gray-900 animate-pulse"></div>
      </section>
    </div>
  );
}

// Main page component with Suspense
export default function Page() {
  return (
    <Suspense fallback={<RegisterSkeleton />}>
      <RegisterForm />
    </Suspense>
  );
}
