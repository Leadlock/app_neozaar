"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const BottomNav = () => {
  const pathname = usePathname();

  useEffect(() => {
    document.body.setAttribute('data-has-bottom-nav', 'true');
    return () => document.body.removeAttribute('data-has-bottom-nav');
  }, []);

  const navItems = [
    { name: "Home", href: "/", path: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { name: "Solutions", href: "/marketplace/solution", path: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
    { name: "Product", href: "/marketplace/product", path: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
    { name: "Services", href: "/marketplace/service", path: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  ];

  return (
    // Changed: "bottom-0" and removed "bottom-2" and padding-x for a flush look
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <nav className="flex items-center justify-around w-full px-2 pt-3 pb-6 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border-t border-gray-200 dark:border-zinc-800 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] transition-all duration-300">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className="relative flex flex-col items-center justify-center flex-1 outline-none group"
            >
              {/* Background Glow Overlay */}
              <div className={`absolute transition-all duration-300 rounded-full ${
                isActive 
                ? "w-16 h-16 bg-orange-600/10 opacity-100 scale-100" 
                : "w-0 h-0 opacity-0 scale-50"
              }`} />

              <div className="relative z-10 flex flex-col items-center gap-1">
                <svg
                  className={`w-6 h-6 transition-all duration-300 ${
                    isActive 
                      ? "text-orange-600 scale-110" 
                      : "text-gray-500 dark:text-zinc-400 group-hover:text-orange-600"
                  }`}
                  fill="none" 
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.path} />
                </svg>
                
                <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-orange-600" : "text-gray-500"}`}>
                  {item.name}
                </span>
              </div>

              {isActive && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-orange-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;