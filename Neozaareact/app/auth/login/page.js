'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { FaGoogle, FaLinkedinIn } from 'react-icons/fa';

// Cookie utility functions (client-side only)
const cookieUtils = {
  set: (name, value, days = 1) => {
    if (typeof document === 'undefined') return;
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
  },

  get: (name) => {
    if (typeof document === 'undefined') return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  },

  remove: (name) => {
    if (typeof document === 'undefined') return;
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

};

// Where to send the user after login, if they were redirected here from a
// protected page (e.g. /private-offer). Written by that page as a JSON string
// via cookie + sessionStorage; only same-origin paths are honored.
const REDIRECT_AFTER_LOGIN_KEY = 'redirect_after_login';
const getRedirectAfterLogin = () => {
  let raw = null;
  if (typeof window !== 'undefined') {
    try { raw = sessionStorage.getItem(REDIRECT_AFTER_LOGIN_KEY); } catch {}
  }
  if (!raw) raw = cookieUtils.get(REDIRECT_AFTER_LOGIN_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data?.url && typeof data.url === 'string' && data.url.startsWith('/')) return data.url;
  } catch {}
  return null;
};
const clearRedirectAfterLogin = () => {
  cookieUtils.remove(REDIRECT_AFTER_LOGIN_KEY);
  if (typeof window !== 'undefined') {
    try { sessionStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY); } catch {}
  }
};
  // const login = () => {
  //   const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;

  //   // Use env override if set, otherwise derive from the current host.
  //   const redirectUri =
  //     process.env.NEXT_PUBLIC_LINKEDIN_REDIRECT_URI ||
  //     (typeof window !== 'undefined'
  //       ? `${window.location.origin}/api/auth/linkedin/callback`
  //       : 'http://localhost:3000/api/auth/linkedin/callback');

  //   const state = Math.random().toString(36).slice(2);
  //   if (typeof window !== 'undefined') {
  //     sessionStorage.setItem('linkedin_oauth_state', state);
  //   }

  //   const scope =
  //     process.env.NEXT_PUBLIC_LINKEDIN_SCOPE ||
  //     "r_liteprofile r_emailaddress";

  //   const url =
  //     "https://www.linkedin.com/oauth/v2/authorization" +
  //     `?response_type=code` +
  //     `&client_id=${clientId}` +
  //     `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  //     `&scope=${encodeURIComponent(scope)}` +
  //     `&state=${state}`;

  //   console.log('LinkedIn OAuth redirectUri:', redirectUri);
  //   console.log('LinkedIn OAuth URL:', url);

  //   window.location.href = url;
  // }
export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const handleSocialLogin = (provider) => {
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api/').replace(/\/+$/, '');
    window.location.href = `${apiBase}/oauth/${provider}/start?intent=login`;
  };

  // Set isClient to true when component mounts on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check for existing login on component mount (client-side only)
  useEffect(() => {
    if (!isClient) return;

    const existingToken = cookieUtils.get("token");
    const existingUser = cookieUtils.get("user");
    
    if (existingToken && existingUser) {
      try {
        const user = JSON.parse(existingUser);
        redirectUser(user.role_id, existingToken);
      } catch (error) {
        // If user data is corrupted, clear cookies
        cookieUtils.remove("token");
        cookieUtils.remove("user");
      }
    }
  }, [isClient]);

const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    // const res = await fetch('http://192.168.1.3:3000/api/login', {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const contentType = res.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      toast.error(`Unexpected server response: ${text}`);
      return;
    }

    if (res.ok && data.status === 'success') {
      const { token, user } = data.data;

      // Store in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Store in cookies (1 day expiry)
      cookieUtils.set('token', token, 1);
      cookieUtils.set('user', JSON.stringify(user), 1);
      cookieUtils.set('user_email', user.email, 1);
      cookieUtils.set('user_role', user.role_id.toString(), 1);
      cookieUtils.set('user_name', user.name || user.email.split('@')[0], 1);

      toast.success('Login successful!');

      // 🔹 Redirect logic directly here
      if (user.role_id === 1) {
        const redirectTo = getRedirectAfterLogin();
        clearRedirectAfterLogin();
        router.push(redirectTo || '/');
      } else {
        // window.location.href = `https://neozaar.com/app/auth/login-token?token=${token}`;
        // The Angular portal is served under a base href of /app. Build the
        // handoff URL defensively so it always includes that segment even when
        // NEXT_PUBLIC_ADMIN_URL is set without it (otherwise the portal dev
        // server rejects /auth/login-token and asks for /app/auth/login-token).
        const rawAdminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:4200/app';
        let adminBase = rawAdminUrl.replace(/\/+$/, '');
        if (!/\/app$/.test(adminBase)) {
          adminBase = `${adminBase}/app`;
        }
        const requested = new URLSearchParams(window.location.search).get('returnUrl');
        const returnUrl = requested && requested.startsWith('/') && !requested.startsWith('//')
          ? requested
          : '/dashboard';
        window.location.href = `${adminBase}/auth/login-token?token=${encodeURIComponent(token)}&returnUrl=${encodeURIComponent(returnUrl)}`;
      }
    } else {
      toast.error(data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    toast.error('Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
};


  // Function to check login status (useful for other components)
  const checkLoginStatus = () => {
    if (!isClient) return { isLoggedIn: false };
    
    const token = cookieUtils.get("token");
    const user = cookieUtils.get("user");
    
    if (token && user) {
      try {
        return {
          isLoggedIn: true,
          user: JSON.parse(user),
          token: token
        };
      } catch (error) {
        return { isLoggedIn: false };
      }
    }
    return { isLoggedIn: false };
  };

  // Function to logout (clear both localStorage and cookies)
  const handleLogout = () => {
    if (!isClient) return;
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    cookieUtils.remove('token');
    cookieUtils.remove('user');
    cookieUtils.remove('user_email');
    cookieUtils.remove('user_role');
    cookieUtils.remove('user_name');
    
    router.push('/auth/login');
  };

  return (
    <div className="max-w-[1920px] m-auto">
      {/* ✅ Include Toaster here */}
      {/* <Toaster position="top-center" reverseOrder={false} /> */}

      <section className="grid grid-cols-1 md:grid-cols-2 w-full min-h-screen">
        <div className="bg-black flex flex-col items-center justify-center px-6 py-10">
          <div className="relative h-12 w-50 mb-6">
            <Image src="/image/logo-s.png" alt="Logo" width={192} height={48} className="object-contain" />
          </div>

          <p className="mb-8 text-center text-gray-300 text-sm md:text-base">
            Log in to explore the power of <br />
            integrated cloud solutions.
          </p>

          <form onSubmit={handleLogin} className="w-full max-w-sm space-y-5">
            <div className="bg-zinc-900 border border-zinc-800 py-4 flex items-center justify-start h-[52px]">
              <Image src="/image/RiMailFill.png" alt="Email Icon" width={24} height={24} className=" mx-4" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="bg-zinc-900 px-4 py-3 h-[52px] text-sm text-zinc-300 w-full outline-none"
                required
              />
            </div>

            <div className="bg-zinc-900 border border-zinc-800 py-4 flex items-center justify-start h-[52px]">
  <Image
    src="/image/RiKey2Fill.png"
    alt="Key Icon"
    width={24}
    height={24}
    className="mx-4"
  />

  <input
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="Password"
    className="bg-zinc-900 px-4 py-3 h-[52px] text-sm text-zinc-300 w-full outline-none"
    required
  />

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="mr-4 text-white"
  >
    {showPassword ? (
      <i className="ri-eye-line ml-2"></i>
    ) : (
      <i className="ri-eye-off-line ml-2"></i>
    )}
  </button>
</div>


            <div className="text-right text-sm text-gray-400">
              <Link href="/auth/forget-password">Forget Password?</Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-400 to-orange-700 text-white font-medium"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <div className="flex items-center gap-3 py-1" aria-hidden="true">
              <span className="h-px flex-1 bg-zinc-800" />
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">or continue with</span>
              <span className="h-px flex-1 bg-zinc-800" />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="group flex h-[50px] w-full items-center justify-center gap-3 border border-zinc-700 bg-white text-sm font-semibold text-zinc-900 transition hover:border-zinc-500 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-black"
              >
                <FaGoogle className="text-lg text-[#4285F4]" aria-hidden="true" />
                Continue with Google
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin('linkedin')}
                className="group flex h-[50px] w-full items-center justify-center gap-3 border border-[#0A66C2] bg-[#0A66C2] text-sm font-semibold text-white transition hover:bg-[#004182] focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:ring-offset-2 focus:ring-offset-black"
              >
                <FaLinkedinIn className="text-lg" aria-hidden="true" />
                Continue with LinkedIn
              </button>
            </div>

            <p className="text-sm text-center text-gray-400">
              Don{`'`}t Have an Account?{' '}
              <Link href="/auth/register" className="text-white underline font-bold">
                Sign Up
              </Link>
            </p>

          </form>
 {/*<button onClick={login}>
      Login with LinkedIn
    </button>*/}
          <div className="mt-10 text-sm text-gray-500">
            Need Help?{' '}
            <a href="/contact-us" className="text-white font-bold underline">
              Contact Us
            </a>
          </div>

          {/* Debug button to check cookies - remove in production */}
       
        </div>

        <div className="w-full h-[400px] md:h-auto hidden md:block">
          <div className="h-full w-full bg-cover bg-center relative bg-[url('/assests/loginbg.png')]">
            <div className="flex items-center justify-center h-full px-6 py-10 md:py-0">
              <p className="text-white font-light text-[26px] md:text-[35px] leading-snug text-center md:text-left font-['CreatoDisplay-Light',_sans-serif] max-w-[90%] md:max-w-[366px]">
                Sign in to unlock<br />
               curated cloud solutions, <br />
               ask for private offers,<br />
                and manage every step<br />
               from selection to deployment<br />
                services.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
