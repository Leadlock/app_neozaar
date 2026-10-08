'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import StarBorder from '@/app/components/StarBorder/StarBorder';
import HomeSearch from '@/app/components/HomeSearch/HomeSearch';

export default function Header({ compact = false }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [isHomePage, setIsHomePage] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [getStartedView, setGetStartedView] = useState('options');
  const [userId, setUserId] = useState(null);
  const [userInitials, setUserInitials] = useState('');
  const [userName, setUserName] = useState('');

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  

  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false);
  const [tabletDropdownOpen, setTabletDropdownOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  
  const desktopDropdownRef = useRef(null);
  const tabletDropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);

  // Debug: Log the current pathname
  useEffect(() => {
    console.log('Current pathname in Header:', pathname);
  }, [pathname]);

  // Determine if header should have transparent background for home page and ISV program page
  // Check for both with and without trailing slash
  const shouldBeTransparent = pathname === '/';
  
  // Determine header background class
  const headerBgClass = shouldBeTransparent 
    ? 'bg-transparent' 
    : 'bg-black';

  const isLinkActive = (href) => {
    if (href === '/') {
      return pathname === '/';
    }
 
    return pathname === href || pathname?.startsWith(href + '/');
  };

 
  const isAdminUser = useCallback(() => {
    return userRole === "admin" || userRole === "superadmin" || userRole === "ADMIN" || userRole === "SUPERADMIN";
  }, [userRole]);


  const getAppBaseUrl = () => {
    return process.env.NEXT_PUBLIC_APP_BASE_URL || "https://www.neozaar.com/";
  };

  // Best-effort client-side JWT expiry check. Decodes the payload (base64url)
  // and compares `exp` to now. Returns false for non-JWT/opaque tokens so we
  // never block a valid handoff on a token we simply can't parse — the backend
  // stays the source of truth for those.
  const isTokenExpired = (token) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      if (!payload || typeof payload.exp !== 'number') return false;
      // exp is in seconds; Date.now() is ms.
      return Date.now() >= payload.exp * 1000;
    } catch {
      // Unparseable token → let the backend decide rather than false-blocking.
      return false;
    }
  };


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (desktopDropdownRef.current && !desktopDropdownRef.current.contains(event.target)) {
        setDesktopDropdownOpen(false);
      }
      if (tabletDropdownRef.current && !tabletDropdownRef.current.contains(event.target)) {
        setTabletDropdownOpen(false);
      }
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(event.target)) {
        setMobileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Detect iOS
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    setIsIOS(isIOSDevice);

    // Detect if app is already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone;

    setIsInstalled(isStandalone);

    // Listen for install prompt (Android/Desktop)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      console.log("✅ beforeinstallprompt fired");
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // When app installed
    window.addEventListener("appinstalled", () => {
      console.log("✅ App installed");
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success("App installed successfully!");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);
  
  // PWA Installation Handler
  useEffect(() => {
    // Check if app is already installed (standalone mode)
    const checkPWAStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          window.navigator.standalone || 
                          window.location.search.includes('standalone=true');
      setIsPWAInstalled(isStandalone);
      
      // Hide install button if already installed
      if (isStandalone) {
        setShowInstall(false);
      }
    };

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt event (Chrome/Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      
      // Only show install button if not already installed
      if (!isPWAInstalled) {
        setShowInstall(true);
      }
    };

    // Check if already installed
    checkPWAStatus();
    
    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsPWAInstalled(true);
      setShowInstall(false);
      setInstallPrompt(null);
      toast.success('App installed successfully!');
    });

    // Watch for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e) => {
      setIsPWAInstalled(e.matches);
      if (e.matches) {
        setShowInstall(false);
      }
    };

    mediaQuery.addEventListener('change', handleDisplayModeChange);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', () => {});
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, [isPWAInstalled]);

  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const role = user?.role_type;
      const id = user?.id;
      const name = user?.name || user?.username || user?.email || '';

      const isAuth = !!token && token.trim() !== "";
    
      setIsAuthenticated(isAuth);
      setUserRole(role);
      setUserId(id);
      setUserName(name);
    
      // Extract initials based on role - but this is only for the avatar, not displayed publicly
      if (isAuth && name) {
        if (role === "admin" || role === "superadmin") {
          // Show "NZ" for admin/superadmin
          setUserInitials("NZ");
        } else {
          // Show first 2 letters of name for other users
          const initials = name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
          setUserInitials(initials || 'US'); // Fallback to 'US' if no name
        }
      }
    };

    syncAuth();
    window.addEventListener('pageshow', syncAuth);
    const handleAuthStorage = (event) => {
      if (event.key === 'token' || event.key === 'user' || event.key === null) syncAuth();
    };
    window.addEventListener('storage', handleAuthStorage);
    return () => {
      window.removeEventListener('pageshow', syncAuth);
      window.removeEventListener('storage', handleAuthStorage);
    };
  }, [pathname]);

  useEffect(() => {
    setIsHomePage(pathname === '/');
  }, [pathname]);

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

  // Cross-app logout listener
  useEffect(() => {
    const allowedOrigins = [
      "http://app.neozaar.skilladders.com",
      getAppBaseUrl()
    ];

    const messageHandler = (event) => {
      if (!allowedOrigins.includes(event.origin)) return;

      if (event.data?.type === "LOGOUT") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        setUserInitials('');
        setUserName('');
      }
    };

    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, []);

  useEffect(() => {
    const syncLogout = (event) => {
      if (event.key === "logout-event") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        setUserInitials('');
        setUserName('');
        router.push("/auth/login");
      }
    };
    window.addEventListener("storage", syncLogout);
    return () => window.removeEventListener("storage", syncLogout);
  }, [router]);

  // Enhanced PWA Install Handler
  const handleInstallClick = async () => {
    // ✅ Android/Desktop install
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();

        const choice = await deferredPrompt.userChoice;

        if (choice.outcome === "accepted") {
          toast.success("Installing app...");
        } else {
          toast("Installation cancelled");
        }

        setDeferredPrompt(null);
      } catch (err) {
        console.error(err);
        toast.error("Install failed");
      }

      return;
    }

    // 🍎 iOS fallback
    if (isIOS) {
      toast(
        "To install: Tap Share 📤 → 'Add to Home Screen'",
        { duration: 5000 }
      );
    } else {
      // 💻 Desktop fallback
      toast("Use browser menu → Install App 📲");
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");

      await fetch(`${process.env.NEXT_PUBLIC_API_BASE}api/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setIsAuthenticated(false);
      setUserRole(null);
      setUserId(null);
      setUserInitials('');
      setUserName('');

      localStorage.setItem("logout-event", Date.now());

      toast.success("Logout Success");
      router.push("/auth/login");

    } catch (error) {
      console.error(error);
    }
  };

  // Function to handle profile click - opens external URL (hidden for admin)
  const handleProfileClick = () => {
    if (!userId) {
      toast.error('User ID not found');
      return;
    }
    
    const baseUrl = getAppBaseUrl();
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const profileUrl = `${normalizedBaseUrl}/app/profile/view/${userId}`;
    console.log('Opening profile URL:', profileUrl); // Debug log
    window.open(profileUrl, '_blank', 'noopener,noreferrer');
  };

  // Reuse the login handoff to establish the session on the portal's origin.
  const handleDashboardClick = () => {
    const adminBaseUrl = process.env.NEXT_PUBLIC_ADMIN_URL || `${getAppBaseUrl().replace(/\/$/, '')}/app`;
    // The Angular portal is served under a base href of /app. Guarantee that
    // segment is present even when NEXT_PUBLIC_ADMIN_URL is set without it,
    // otherwise the portal dev server rejects /auth/login-token.
    let base = adminBaseUrl.replace(/\/+$/, '');
    if (!/\/app$/.test(base)) {
      base = `${base}/app`;
    }
    const token = localStorage.getItem('token');

    // No token to hand off — send the user to the portal login instead of the
    // token endpoint, which would call get_token-user with an empty/invalid
    // token and 400 → bounce back to /auth/login.
    if (!token || token.trim() === '') {
      toast.error('Your session has expired. Please log in again.');
      router.push('/auth/login');
      return;
    }

    // Catch an expired token *before* the handoff. Otherwise the portal
    // receives a dead token, get_token-user returns 401 "Token expired", and
    // the user lands on the portal's "Failed To Login" dead-end. Detecting it
    // here lets us clear the stale session and route straight to re-login.
    if (isTokenExpired(token)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setUserRole(null);
      toast.error('Your session has expired. Please log in again.');
      router.push('/auth/login');
      return;
    }

    window.location.href = `${base}/auth/login-token?token=${encodeURIComponent(token)}`;
  };

  const NAV_LINKS = [
    // { href: '/about-us', label: 'About us' },
    { href: '/marketplace/solution', label: 'Solutions' },
    { href: '/marketplace/product', label: 'Products' },
    { href: '/marketplace/service', label: 'Services' },
    { href: '/vendor', label: 'Vendors' },
    { href: '/startup-advisory', label: 'Startup Advisory' },
    {
      href: '/partner-with-us',
      label: 'Partner with Us',
      children: [
        { href: '/isv-registration', label: 'Isv Registration' },
        { href: '/solution-partner', label: 'Solution Partner' },
        { href: '/consulting-advisor', label: 'Consulting Advisor' },
      ],
    },
    { href: '/contact-us', label: 'Contact Us' },
  ];

  // Check if user is ISV and authenticated
  const isISVUser = isAuthenticated && userRole === "ISV";
  const showDashboard = isISVUser || (isAuthenticated && (isAdminUser() || userRole === 'SUPER_ADMIN'));

  // Desktop Dropdown (≥1024px) - With PWA Install Button
  // Anchored to the avatar button's own `relative` wrapper, so top-full = the
  // avatar's bottom edge. The menu drops right below the profile icon with a
  // small mt-3 gap. z-[60] clears the nav band + centred search (z-50).
  const DesktopDropdown = () => (
    <div
      className="absolute right-0 top-full mt-3 w-56 overflow-hidden rounded-md bg-gray-800 shadow-lg z-[60]"
    >
      <ul className="py-2 text-base text-white">
        {/* PWA Install Button - Show if not installed */}
        {!isInstalled && (
          <li className="px-3 py-2">
            <button
              onClick={() => {
                setDesktopDropdownOpen(false);
                handleInstallClick();
              }}
              className="w-full bg-green-600 text-sm px-4 py-2 rounded-full hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Install App
            </button>
          </li>
        )}
        
        {/* Profile - Hidden for admin users */}
        {!isAdminUser() && (
          <li>
            <button
              onClick={() => {
                setDesktopDropdownOpen(false);
                handleProfileClick();
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-700 transition"
            >
              Profile
            </button>
          </li>
        )}
        
        {/* Dashboard - ISV and admin users */}
        {showDashboard && (
          <li>
            <button
              onClick={() => {
                setDesktopDropdownOpen(false);
                handleDashboardClick();
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-700 transition"
            >
              Dashboard
            </button>
          </li>
        )}
        
        {/* Logout - Visible for all authenticated users */}
        <li>
          <button
            onClick={() => {
              setDesktopDropdownOpen(false);
              handleLogout();
            }}
            className="w-full text-left px-4 py-3 hover:bg-gray-700 transition"
          >
            Logout
          </button>
        </li>
      </ul>
    </div>
  );

  // Tablet Dropdown (≥768px to <1024px) - With PWA Install Button
  // Same approach as desktop: the parent drops its `relative` so this resolves
  // against the full-height tablet container; inline top:100% = header bottom.
  const TabletDropdown = () => (
    <div
      className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-md bg-gray-800 shadow-lg z-[60]"
    >
      <ul className="py-2 text-base text-white">
        {/* PWA Install Button - Show if not installed */}
        {showInstall && !isPWAInstalled && (
          <li className="px-3 py-2">
            <button
              onClick={() => {
                setTabletDropdownOpen(false);
                handleInstallClick();
              }}
              className="w-full bg-green-600 text-white text-sm px-4 py-2 rounded-full hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Install App
            </button>
          </li>
        )}
        
        {/* Profile - Hidden for admin users */}
        {!isAdminUser() && (
          <li>
            <button
              onClick={() => {
                setTabletDropdownOpen(false);
                handleProfileClick();
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-700 transition"
            >
              Profile
            </button>
          </li>
        )}
        
        {/* Dashboard - ISV and admin users */}
        {showDashboard && (
          <li>
            <button
              onClick={() => {
                setTabletDropdownOpen(false);
                handleDashboardClick();
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-700 transition"
            >
              Dashboard
            </button>
          </li>
        )}
        
        {/* Logout - Visible for all authenticated users */}
        <li>
          <button
            onClick={() => {
              setTabletDropdownOpen(false);
              handleLogout();
            }}
            className="w-full text-left px-4 py-3 hover:bg-gray-700 transition"
          >
            Logout
          </button>
        </li>
      </ul>
    </div>
  );

  // Mobile Dropdown (<768px) - With PWA Install Button
  const MobileDropdown = () => (
    <div className="absolute right-[52px] top-full mt-2 w-56 rounded-md bg-gray-800 shadow-lg z-50">
      <ul className="py-2 text-base text-white">
        {/* PWA Install Button - Show if not installed */}
        {showInstall && !isPWAInstalled && (
          <li className="px-3 py-2">
            <button
              onClick={() => {
                setMobileDropdownOpen(false);
                handleInstallClick();
              }}
              className="w-full bg-green-600 text-white text-sm px-4 py-2 rounded-full hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Install App
            </button>
          </li>
        )}
        
        {/* Profile - Hidden for admin users */}
        {!isAdminUser() && (
          <li>
            <button
              onClick={() => {
                setMobileDropdownOpen(false);
                handleProfileClick();
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-700 transition"
            >
              Profile
            </button>
          </li>
        )}
        
        {/* Dashboard - ISV and admin users */}
        {showDashboard && (
          <li>
            <button
              onClick={() => {
                setMobileDropdownOpen(false);
                handleDashboardClick();
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-700 transition"
            >
              Dashboard
            </button>
          </li>
        )}
        
        {/* Logout - Visible for all authenticated users */}
        <li>
          <button
            onClick={() => {
              setMobileDropdownOpen(false);
              handleLogout();
            }}
            className="w-full text-left px-4 py-3 hover:bg-gray-700 transition"
          >
            Logout
          </button>
        </li>
      </ul>
    </div>
  );

  // Profile Avatar Component with initials
  const ProfileAvatar = () => {
    const displayInitials =
      userRole === 'ADMIN' ? 'NZ' : userInitials;

    return (
      <div className="relative">
        {isAuthenticated && displayInitials ? (
          <div
            className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 
                       flex items-center justify-center text-white font-semibold text-sm 
                       cursor-pointer border border-orange-600"
          >
            {displayInitials}
          </div>
        ) : (
          <Image
            src="/image/blank-profile.webp"
            alt="User"
            width={32}
            height={32}
            className="rounded-full cursor-pointer border border-gray-600"
          />
        )}
      </div>
    );
  };

  // Renders a top-nav item. If the link has `children`, it shows a hover
  // dropdown (desktop/tablet) with the sub-items; otherwise a plain link.
  const DesktopNavItem = ({ link }) => {
    const [open, setOpen] = useState(false);
    const baseCls = (href) =>
      `hover:text-white transition ${
        isLinkActive(href) ? 'text-white font-bold' : 'text-zinc-400 font-normal'
      }`;

    if (!link.children) {
      return (
        <Link href={link.href} className={baseCls(link.href)}>
          {link.label}
        </Link>
      );
    }

    const parentActive = isLinkActive(link.href) || link.children.some((c) => isLinkActive(c.href));

    return (
      <div
        className="relative"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <span
          className={`flex cursor-default items-center gap-1 transition ${
            parentActive ? 'text-white font-bold' : 'text-zinc-400 font-normal'
          }`}
        >
          {link.label}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
        {open && (
          <div className="absolute left-1/2 top-full z-[70] -translate-x-1/2 pt-3">
            <ul className="min-w-[190px] overflow-hidden rounded-xl border border-white/10 bg-black py-2 shadow-xl shadow-black/40 backdrop-blur-sm">
              {link.children.map((child) => (
                <li key={child.label}>
                  <Link
                    href={child.href}
                    className={`group flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-white/10 ${
                      isLinkActive(child.href) ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${
                        isLinkActive(child.href) ? 'bg-orange-500' : 'bg-white/20 group-hover:bg-orange-500'
                      }`}
                    />
                    {child.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const headerNode = (
    <header
      className={`${headerBgClass} text-white border-b border-white/10 relative h-20 md:h-28 max-w-[1920px] m-auto transition-all duration-300`}
    >
      {/* XL & LG Desktop (≥1024px) */}
      <div className="absolute z-3 hidden h-full w-full items-start justify-between px-4 py-3 sm:px-6 lg:flex lg:px-10">
        {/* Centered search — absolutely positioned so it sits at the true header center.
            z-50 lifts it (and its suggestions dropdown) above the bottom nav bar;
            the -translate-x-1/2 transform makes this wrapper its own stacking context. */}
        <div className="absolute left-1/2 top-3 z-50 flex h-[50px] -translate-x-1/2 items-center">
          <div className="w-[clamp(240px,32vw,520px)]">
            <HomeSearch
              compact
              placeholder="Search products, services and solutions..."
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/">
            <Image src="/image/Logo.png" alt="Logo" width={151} height={50} priority />
          </Link>
          <div className="h-[40px] w-px bg-white/10" />
          <nav className="absolute inset-x-0 bottom-0 flex h-10 items-center justify-center gap-8 border-t border-white/[0.08] px-10 text-sm text-zinc-400">
            {NAV_LINKS.map((link) => (
              <DesktopNavItem key={link.label} link={link} />
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <div className="flex items-center gap-6" ref={desktopDropdownRef}>
            {/* PWA Install Button - Show inline on desktop if not in dropdown */}
            {showInstall && !isPWAInstalled && (
              <button
                onClick={handleInstallClick}
                className="bg-green-600 text-sm px-4 py-2 rounded-full hover:bg-green-700 transition flex items-center gap-2 whitespace-nowrap"
                title="Install App"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden xl:inline">Install App</span>
              </button>
            )}
            
            <div className="h-[40px] w-px bg-white/10" />
            
            <div className="relative">
              <button onClick={() => setDesktopDropdownOpen((prev) => !prev)} className="flex items-center gap-2">
                <ProfileAvatar />
              </button>

              {desktopDropdownOpen && <DesktopDropdown />}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {/* PWA Install Button for non-authenticated users */}
            {showInstall && !isPWAInstalled && (
              <button
                onClick={handleInstallClick}
                className="bg-green-600 text-sm px-4 py-2 rounded-full hover:bg-green-700 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Install App
              </button>
            )}
            <StarBorder
              onClick={() => { setShowGetStarted(true); setGetStartedView('options'); }}
              borderRadius="9999px"
              padding="9px 22px"
              className="cursor-pointer"
            >
              Get Started
            </StarBorder>
          </div>
        )}
        </div>
      </div>

      {/* Tablet (≥768px to <1024px) */}
      <div className="relative hidden h-full items-start justify-between px-6 py-3 md:flex lg:hidden">
        {/* Centered search — absolutely positioned so it sits at the true header center.
            z-50 lifts it (and its suggestions dropdown) above the bottom nav bar. */}
        <div className="absolute left-1/2 top-3 z-50 flex h-[38px] -translate-x-1/2 items-center">
          <div className="w-[210px]">
            <HomeSearch
              compact
              placeholder="Search marketplace..."
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/">
            <Image src="/image/Logo.png" alt="Logo" width={115} height={38} priority />
          </Link>
          <div className="h-[35px] w-px bg-white/10" />
          <nav className="absolute inset-x-0 bottom-0 flex h-10 items-center justify-center gap-5 border-t border-white/[0.08] px-6 text-sm text-zinc-400">
            {NAV_LINKS.map((link) => (
              <DesktopNavItem key={link.label} link={link} />
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <div className="flex items-center gap-6" ref={tabletDropdownRef}>
            {/* PWA Install Button for tablet */}
            {showInstall && !isPWAInstalled && (
              <button
                onClick={handleInstallClick}
                className="bg-green-600 text-sm px-3 py-2 rounded-full hover:bg-green-700 transition flex items-center gap-1"
                title="Install App"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            )}
            
            <div className="h-[40px] w-px bg-white/10" />
            
            <button onClick={() => setTabletDropdownOpen((prev) => !prev)} className="flex items-center gap-2">
              <ProfileAvatar />
            </button>

            {tabletDropdownOpen && <TabletDropdown />}
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {/* PWA Install Button for non-authenticated users */}
            {showInstall && !isPWAInstalled && (
              <button
                onClick={handleInstallClick}
                className="bg-green-600 text-sm px-3 py-2 rounded-full hover:bg-green-700 transition flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            )}
            <StarBorder
              onClick={() => { setShowGetStarted(true); setGetStartedView('options'); }}
              borderRadius="9999px"
              padding="9px 20px"
              className="cursor-pointer"
            >
              Get Started
            </StarBorder>
          </div>
        )}
        </div>
      </div>

      {/* Mobile (<768px) */}
      <div className="md:hidden flex items-center justify-between px-3 md:px-6 py-3 md:py-7">
        <Link href="/">
          <Image
            src="/image/Logo.png"
            alt="Logo"
            width={121}
            height={40}
            priority
            className={`transition-opacity duration-300 ${
              isOpen ? 'opacity-0' : 'opacity-100'
            }`}
          />
        </Link>
        <div className="flex items-center gap-4">
          {/* PWA Install Button for mobile */}
          {showInstall && !isPWAInstalled && (
            <button
              onClick={handleInstallClick}
              className="bg-green-600 text-sm px-3 py-2 rounded-full hover:bg-green-700 transition flex items-center gap-1"
              title="Install App"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}
          
          {isAuthenticated ? (
            <div ref={mobileDropdownRef}>
              <button onClick={() => setMobileDropdownOpen((prev) => !prev)} className="flex items-center gap-2">
                <ProfileAvatar />
              </button>

              {mobileDropdownOpen && <MobileDropdown />}
            </div>
          ) : (
            <StarBorder
              onClick={() => { setShowGetStarted(true); setGetStartedView('options'); }}
              borderRadius="9999px"
              padding="7px 16px"
              className="cursor-pointer"
            >
              Get Started
            </StarBorder>
          )}
          <button onClick={() => setIsOpen(true)} className="text-white focus:outline-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Slide-in Menu (<768px) - With PWA Install Button */}
      {isOpen && (
        <div role="presentation" className="fixed inset-0 z-50 md:hidden" onClick={() => setIsOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`fixed right-0 top-0 h-full w-64 bg-black transform transition-transform duration-300 ${
              isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4">
              <Image src="/image/Logo.png" alt="Logo" width={106} height={35} />
              <button onClick={() => setIsOpen(false)} className="text-white ml-auto">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* PWA Install Button in mobile menu */}
            {showInstall && !isPWAInstalled && (
              <div className="px-6 py-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleInstallClick();
                  }}
                  className="w-full bg-green-600 text-white text-sm px-4 py-3 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Install App
                </button>
              </div>
            )}
            
            {isAuthenticated && (
              <div className="px-6 py-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <ProfileAvatar />
                  <div>
                    <div className="text-sm text-white">{userName}</div>
                  </div>
                </div>
              </div>
            )}
            <nav className="px-6 py-6 space-y-6">
              {NAV_LINKS.map((link) => (
                <div key={link.label}>
                  {link.children ? (
                    <span
                      className={`block text-lg transition ${
                        isLinkActive(link.href)
                          ? 'text-white font-bold'
                          : 'text-zinc-400 font-normal'
                      }`}
                    >
                      {link.label}
                    </span>
                  ) : (
                    <Link
                      href={link.href}
                      className={`block text-lg transition ${
                        isLinkActive(link.href)
                          ? 'text-white font-bold'
                          : 'text-zinc-400 font-normal hover:text-white'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )}
                  {link.children && (
                    <div className="mt-3 ml-4 flex flex-col gap-3 border-l border-white/10 pl-4">
                      {link.children.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href}
                          className={`flex items-center gap-2 text-base transition ${
                            isLinkActive(child.href)
                              ? 'text-white font-semibold'
                              : 'text-zinc-400 font-normal hover:text-white'
                          }`}
                          onClick={() => setIsOpen(false)}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isLinkActive(child.href) ? 'bg-orange-500' : 'bg-white/25'
                            }`}
                          />
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
            <div className="px-6 py-4 space-y-3">
              {!isAuthenticated ? (
                <>
                  <Link href="/auth/login">
                    <button className="bg-orange-600 text-sm px-6 py-2 rounded-full hover:bg-orange-700 transition w-full">
                      Login
                    </button>
                  </Link>
                </>
              ) : (
                <>
                  {/* Profile - Hidden for admin users */}
                  {!isAdminUser() && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleProfileClick();
                      }}
                      className="bg-blue-600 text-sm px-6 py-2 rounded-full hover:bg-blue-700 transition w-full"
                    >
                      Profile
                    </button>
                  )}
                  
                  {/* Dashboard - ISV and admin users */}
                  {showDashboard && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleDashboardClick();
                      }}
                      className="bg-green-600 text-sm px-6 py-2 rounded-full hover:bg-green-700 transition w-full"
                    >
                      Dashboard
                    </button>
                  )}
                  
                  {/* Logout - Visible for all authenticated users */}
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleLogout();
                    }}
                    className="bg-red-600 text-sm px-6 py-2 rounded-full hover:bg-red-700 transition w-full"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Get Started Modal */}
      {showGetStarted && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 text-white">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { setShowGetStarted(false); setGetStartedView('options'); }}></div>
          <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-8 animate-fadeIn">
            
            {/* Close button */}
            <button onClick={() => { setShowGetStarted(false); setGetStartedView('options'); }}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            {/* Options View */}
            {getStartedView === 'options' && (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Get Started</h2>
                  <p className="text-slate-400 mt-1">Choose an option to proceed</p>
                </div>
                <div className="space-y-3">
                  <button onClick={() => setGetStartedView('newuser')}
                    className="w-full flex items-center gap-4 p-4 border border-white/10 rounded-xl hover:bg-white/10 hover:border-orange-500/50 transition-all duration-200 group">
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <Image src="/assests/getstarted/New_user.svg" alt="New User" width={20} height={20} style={{filter:'brightness(0) invert(1)', opacity:0.9}} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-white">New User</h3>
                      <p className="text-sm text-slate-400">Register as a new partner</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 ml-auto group-hover:text-orange-500 transition-colors"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>

                  <a href="/auth/login"
                    className="w-full flex items-center gap-4 p-4 border border-white/10 rounded-xl hover:bg-white/10 hover:border-orange-500/50 transition-all duration-200 group">
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <Image src="/assests/getstarted/Existing_user.svg" alt="Login" width={26} height={26} style={{filter:'brightness(0) invert(1)'}} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-white">Login with Email</h3>
                      <p className="text-sm text-slate-400">Already have an account</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 ml-auto group-hover:text-orange-500 transition-colors"><polyline points="9 18 15 12 9 6"/></svg>
                  </a>
                </div>
              </div>
            )}

            {/* New User View — Registration options */}
            {getStartedView === 'newuser' && (
              <div>
                <button onClick={() => setGetStartedView('options')} className="text-sm text-slate-400 hover:text-white mb-4 flex items-center gap-1 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> Back
                </button>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-white">Choose your registration type</h2>
                  <p className="text-slate-400 text-sm mt-1">Select the category that best describes you</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Customer */}
                  <a href="/auth/register"
                    className="flex flex-col items-center gap-3 p-6 border border-white/10 rounded-xl hover:bg-white/5 hover:border-orange-500/50 transition-all duration-200 group cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <Image src="/assests/getstarted/Customers.svg" alt="Customer" width={20} height={20} style={{filter:'brightness(0) invert(1)', opacity:0.9}} />
                    </div>
                    <h3 className="text-sm font-bold text-white text-center">Customer</h3>
                    <p className="text-xs text-slate-400 text-center">Buyer Registration</p>
                  </a>

                  {/* ISV Partner */}
                  <a href="/isv-registration"
                    className="flex flex-col items-center gap-3 p-6 border border-white/10 rounded-xl hover:bg-white/5 hover:border-orange-500/50 transition-all duration-200 group cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <Image src="/assests/getstarted/ISV.svg" alt="ISV Partner" width={26} height={26} style={{filter:'brightness(0) invert(1)'}} />
                    </div>
                    <h3 className="text-sm font-bold text-white text-center">ISV Partner</h3>
                    <p className="text-xs text-slate-400 text-center">Software Vendor</p>
                  </a>

                  {/* Service Partner */}
                  <a href="/solution-partner"
                    className="flex flex-col items-center gap-3 p-6 border border-white/10 rounded-xl hover:bg-white/5 hover:border-orange-500/50 transition-all duration-200 group cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <Image src="/assests/getstarted/Service_partner.svg" alt="Service Partner" width={26} height={26} style={{filter:'brightness(0) invert(1)'}} />
                    </div>
                    <h3 className="text-sm font-bold text-white text-center">Service Partner</h3>
                    <p className="text-xs text-slate-400 text-center">Consulting</p>
                  </a>

                  {/* Consulting Advisor */}
                  <a href="/consulting-advisor"
                    className="flex flex-col items-center gap-3 p-6 border border-white/10 rounded-xl hover:bg-white/5 hover:border-orange-500/50 transition-all duration-200 group cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <Image src="/assests/getstarted/Revenue_share.svg" alt="Consulting Advisor" width={22} height={22} style={{filter:'brightness(0) invert(1)', opacity:0.9}} />
                    </div>
                    <h3 className="text-sm font-bold text-white text-center">Consulting Advisor</h3>
                    <p className="text-xs text-slate-400 text-center">Revenue Share</p>
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}
    </header>
  );

  // `compact` pages (single product/service/solution, privacy, terms) opt out of
  // the padded shell and render the bare 80px header.
  if (compact) return headerNode;

  // Padded shell so the header reads identically on every other page — those
  // pages just drop in <Header /> with no wrapper of their own.
  return (
    <div className="relative z-20 w-full px-4 text-white sm:px-6 lg:px-10">
      {headerNode}
    </div>
  );
}
