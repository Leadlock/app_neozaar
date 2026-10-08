"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { openCookiePreferences } from "@/app/lib/consent";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Cookie utility functions
  const setCookie = (name, value, days = 15) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
  };

  const getCookie = (name) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  useEffect(() => {
    const hasSubscribed = getCookie("newsletter_subscribed");
    if (hasSubscribed) {
      setIsSubscribed(true);
      const savedEmail = getCookie("subscriber_email");
      if (savedEmail) setEmail(savedEmail);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setStatus("error");
      setMessage("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    const hasSubscribed = getCookie("newsletter_subscribed");
    if (hasSubscribed) {
      setStatus("success");
      setMessage("🎉 You're already subscribed to our newsletter!");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/allapi/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "website" }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "🎉 You have subscribed successfully!");
        setIsSubscribed(true);
        setCookie("newsletter_subscribed", "true", 15);
        setCookie("subscriber_email", email, 15);
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error("Subscription error:", err);
      setStatus("error");
      setMessage("Network error. Please check your connection.");
    }
  };

  useEffect(() => {
    if (status !== "idle" && status !== "loading") {
      const timer = setTimeout(() => setStatus("idle"), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const NAV_LINKS = [
    { href: "/isv-registration", label: "Isv Registration" },
    { href: "/contact-us", label: "Get in touch" },
  ];

  return (
    <div className="relative">
      <footer className="bg-black text-gray-200 relative overflow-hidden m-auto max-w-[1920px]">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-11 gap-8 relative z-10 border-t border-white/10 mt-5">
          {/* Left Column - Description */}
          <div className="md:col-span-4 space-y-4">
            <div className="space-y-4">
              <p className="text-sm leading-relaxed mt-4">
               NeoZaar brings together the right products, services and expertise to turn technology priorities into measurable outcomes — from solution selection and implementation to marketplace procurement, private offers and eligible hyperscaler programs.
              </p>

              <div className="flex flex-wrap gap-[10px] pt-28 pb-8 text-sm items-center">
                <a href="https://www.linkedin.com/company/neozaar/" target="_blank" rel="noopener noreferrer" className="hover:underline">LinkedIn</a>
                <a href="https://www.facebook.com/people/Neozaar/61576376054230/" target="_blank" rel="noopener noreferrer" className="hover:underline">Facebook</a>
                <a href="https://www.instagram.com/neozaarofficial/" target="_blank" rel="noopener noreferrer" className="hover:underline">Instagram</a>
                <a href="https://www.youtube.com/@neozaar_com" target="_blank" rel="noopener noreferrer" className="hover:underline">YouTube</a>
              </div>
            </div>
          </div>

          <div className="hidden md:block border-l border-white/10 h-auto mx-auto"></div>

          {/* Links Column */}
          <div className="md:col-span-2">
            <h5 className="font-light tracking-wide text-white text-xl mb-4 mt-4">Links</h5>
            <div className="space-y-3 text-sm">
              {NAV_LINKS.map((link) => (
                <Link key={link.label} href={link.href} className="block text-zinc-400 hover:text-white transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:block border-l border-white/10 h-auto mx-auto"></div>

          {/* Newsletter Column */}
          <div className="md:col-span-3">
            <h5 className="text-white font-light tracking-wide mb-2 mt-4">
              Subscribe Our
              <br />
              <span className="font-bold">Newsletter</span>
            </h5>
            <form onSubmit={handleSubmit} className="relative mt-4 max-w-full">
              <input
                type="email"
                placeholder={isSubscribed ? "You're subscribed! ✓" : "Enter your email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 bg-transparent border border-gray-500 rounded text-sm placeholder-gray-400 pl-4 pr-12 focus:outline-none focus:border-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={isSubscribed}
              />
              <button
                type="submit"
                disabled={status === "loading" || isSubscribed}
                className="absolute cursor-pointer inset-y-0 right-0 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
              >
                <img src="/image/arrow.png" alt="Submit" className="w-12 h-12" />
              </button>
            </form>

            {isSubscribed && (
              <p className="mt-2 text-green-400 text-xs">
                ✓ Subscribed! You{`'`}ll receive updates for the next 15 days.
              </p>
            )}

            <div className="flex flex-wrap gap-4 mt-6 text-sm text-zinc-400">
              <Link href="/terms-of-use" className="hover:text-white transition-colors">Terms of Use</Link>
              <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <button type="button" onClick={openCookiePreferences} className="hover:text-white transition-colors cursor-pointer">Cookie Preferences</button>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="relative z-10 border-t border-white/10 flex justify-center py-6">
          <Link href="/">
            <img src="/image/Logo W.png" alt="Logo" className="w-11/12 m-auto" />
          </Link>
        </div>

        <div className="border-t border-white/10 mt-6 relative z-10">
          <div className="container mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400">
            <p>© 2025, Designed by NeoZaar.</p>
            <div className="flex flex-wrap gap-4 mt-2 md:mt-0">
              <Link href="/terms-of-use" className="hover:underline">Terms of Use</Link>
              <Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link>
              <button type="button" onClick={openCookiePreferences} className="hover:underline cursor-pointer">Cookie Preferences</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Status Modal */}
      {status !== "idle" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end items-start overflow-hidden">
          <div className="relative bg-gray-900 rounded-xl shadow-lg p-6 w-80 m-6">
            <button className="absolute top-3 right-3 text-gray-400 hover:text-white font-bold text-xl" onClick={() => setStatus("idle")}>✕</button>
            {status === "loading" && (
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-2"></div>
                <p className="text-gray-300">Subscribing...</p>
              </div>
            )}
            {status === "success" && <p className="text-green-400 font-semibold text-center">{message}</p>}
            {status === "error" && <p className="text-red-400 font-semibold text-center">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}