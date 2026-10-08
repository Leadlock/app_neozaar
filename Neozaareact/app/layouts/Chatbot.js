'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  X, Eye, EyeOff, Lock, LogIn, ArrowRight, Mail, Calendar, ExternalLink, Video, PlusCircle
} from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

// ---------- Cookie helpers ----------
const cookieUtils = {
  set: (name, value, days = 1) => {
    if (typeof document === 'undefined') return;
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/`;
  },
  get: (name) => {
    if (typeof document === 'undefined') return null;
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  },
  remove: (name) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  },
};

// ---------- Animated Badge ----------
const AnimatedBadge = ({ children, color = "orange", className = "" }) => {
  const colors = {
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    green: "bg-green-100 text-green-700 border-green-200",
    red: "bg-red-100 text-red-700 border-red-200",
    yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border animate-pulse ${colors[color] || colors.orange} ${className}`}>
      {children}
    </span>
  );
};

// ---------- Login Modal ----------
const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isOpen) return null;

  const handleRegistrationClick = (e) => {
    e.preventDefault();
    window.location.href = '/auth/register/';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        const { token, user } = data.data;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        cookieUtils.set('token', token, 1);
        cookieUtils.set('user', JSON.stringify(user), 1);
        cookieUtils.set('user_email', user.email, 1);
        cookieUtils.set('user_role', user.role_id.toString(), 1);
        cookieUtils.set('user_name', user.name || user.email.split('@')[0], 1);

        toast.success('Login successful!');
        onLoginSuccess();
        onClose();
      } else {
        toast.error(data.message || 'Login failed');
        setLoginError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong');
      setLoginError('Network error, please try again');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn login-modal">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 max-w-md w-full rounded-2xl shadow-2xl overflow-hidden relative animate-slideUp">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-amber-500 rounded-full opacity-10 blur-3xl"></div>

        <button
          onClick={() => {
            setEmail('');
            setPassword('');
            setLoginError('');
            onClose();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400">Please login to continue with your action</p>
            <AnimatedBadge color="orange" className="mt-3">
              You{`'`}ll be redirected back after login
            </AnimatedBadge>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {isLoggingIn ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Logging in...
                </>
              ) : (
                <>
                  Login
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="text-center mt-6">
              <p className="text-sm text-gray-400">
                Don{`'`}t have an account?{' '}
                <button
                  onClick={handleRegistrationClick}
                  className="text-orange-400 hover:text-orange-300 font-medium underline decoration-2 underline-offset-2 transition-colors"
                >
                  Sign up
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ---------- Main Chat Widget ----------
export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'bot',
      content: "Neo is your AI guide on NeoZaar — helping you discover the right products, solutions, services and private offers, for your business need.",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        setUser(JSON.parse(userStr));
        return true;
      } catch (e) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    return false;
  };

  useEffect(() => {
    checkAuth();
    setAuthLoading(false);
    const handleStorage = () => checkAuth();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const productsCache = useRef({ data: null, timestamp: null });
  const CACHE_DURATION = 5 * 60 * 1000;

  const fetchProducts = useCallback(async () => {
    if (productsCache.current.data && productsCache.current.timestamp &&
        Date.now() - productsCache.current.timestamp < CACHE_DURATION) {
      return productsCache.current.data;
    }
    try {
      const res = await fetch(
        'https://www.neozaar.com/api/catalog/marketplace/published?page=1&action_type=all'
      );
      if (!res.ok) throw new Error('API error');
      const result = await res.json();
      const data = result.success && result.data ? result.data : Array.isArray(result) ? result : [];
      productsCache.current = { data, timestamp: Date.now() };
      localStorage.setItem('products_cache', JSON.stringify(productsCache.current));
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoadingProducts(true);
      const data = await fetchProducts();
      if (data) setProducts(data);
      setIsLoadingProducts(false);
    };
    load();
  }, [fetchProducts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target) &&
          !e.target.closest('.chat-icon') && !e.target.closest('.login-modal')) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const addMessage = (type, content, extraData = null) => {
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      type,
      content,
      ...(extraData && type === 'bot' && content === '__calcom_booking' ? { calcomBooking: extraData } : {}),
      ...(extraData && type === 'bot' && content !== '__calcom_booking' ? { product: extraData } : {})
    }]);
  };

  const getRecommendations = async (query, productList, chatMessages) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No auth token found');
        return null;
      }

      const context = productList.map(p => ({
        id: p.id,
        name: p.name,
        description: p.short_description?.substring(0, 300) || '',
        actionType: p.action_type,
        brand: p.brand_name,
      }));

      const conversationHistory = chatMessages
        .filter(msg => msg.content)
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }));

      const res = await fetch('/allapi/chat/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: conversationHistory,
          products: context,
        }),
      });

      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      let data = await res.json();
      
      // Multi-layered string extraction handler for nested JSON questions
      if (data.type === 'question' && typeof data.message === 'string') {
        const trimmed = data.message.trim();
        if (trimmed.startsWith('{') && (trimmed.includes('"type":"recommendation"') || trimmed.includes('"productDetails"'))) {
          try {
            const parsed = JSON.parse(trimmed);
            return {
              type: 'recommendation',
              productDetails: parsed.productDetails || [],
              calcomBooking: parsed.calcomBooking || null,
            };
          } catch (e) {}
        }
      }

      if (data.type === 'recommendation') {
        return {
          type: 'recommendation',
          productDetails: data.productDetails || [],
          calcomBooking: data.calcomBooking || null,
        };
      } else if (data.type === 'question') {
        return { type: 'question', message: data.message };
      } else if (Array.isArray(data.productIds)) {
        const matched = productList.filter(p => data.productIds.includes(p.id));
        return {
          type: 'recommendation',
          productDetails: matched.map(p => ({
            id: p.id,
            title: p.name,
            actionType: p.action_type || 'Contact Sales',
          })),
          calcomBooking: {
            url: "https://cal.com/neozaar/30min",
            namespace: "30min",
            config: { layout: "month_view" },
            buttonText: "Talk to an Expert",
          },
        };
      }
      return null;
    } catch (err) {
      console.error('getRecommendations error:', err);
      return null;
    }
  };

  const sendMessage = async () => {
    const message = inputValue.trim();
    if (!message) return;

    addMessage('user', message);
    const currentChatHistory = [...messages, { type: 'user', content: message }];
    setInputValue('');
    setIsTyping(true);

    let currentProducts = products;
    if (currentProducts.length === 0) {
      const fresh = await fetchProducts();
      if (fresh) {
        setProducts(fresh);
        currentProducts = fresh;
      }
    }

    if (currentProducts.length === 0) {
      setIsTyping(false);
      addMessage('bot', 'Sorry, cannot fetch products. Try later.');
      return;
    }

    const result = await getRecommendations(message, currentProducts, currentChatHistory);
    setIsTyping(false);

    if (!result) {
      addMessage('bot', 'Sorry, something went wrong. Please try again later.');
      return;
    }

    if (result.type === 'question') {
      const trimmed = (result.message || '').trim();
      if (trimmed.startsWith('{') && (trimmed.includes('"productDetails"') || trimmed.includes('"type":"recommendation"'))) {
        try {
          const parsed = JSON.parse(trimmed);
          handleRenderRecommendationFlow(parsed, currentProducts);
          return;
        } catch (e) {}
      }
      addMessage('bot', result.message || 'Can you provide more details?');
      return;
    }

    if (result.type === 'recommendation') {
      handleRenderRecommendationFlow(result, currentProducts);
    }
  };

  // FIX: Batched single-update processing ensures all 2, 10, or more items map correctly to state
  const handleRenderRecommendationFlow = (resultData, currentProducts) => {
    const productDetails = resultData.productDetails || [];
    if (productDetails.length === 0) {
      addMessage('bot', 'No products match your query. Try different keywords.');
      return;
    }

    const newMessagesBatch = [];

    // 1. Title message
    newMessagesBatch.push({
      id: `title-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'bot',
      content: `Top ${productDetails.length} recommendation${productDetails.length > 1 ? 's' : ''}:`
    });

    // 2. Map all product card payloads 
    productDetails.forEach(prod => {
      const fullProduct = currentProducts.find(p => p.id === prod.id || p.id === parseInt(prod.id));
      const messageId = `prod-${prod.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      if (fullProduct) {
        newMessagesBatch.push({
          id: messageId,
          type: 'bot',
          content: null,
          product: {
            ...fullProduct,
            name: prod.title || fullProduct.name,
            actionType: prod.actionType || fullProduct.action_type || 'Contact Sales',
          }
        });
      } else {
        newMessagesBatch.push({
          id: messageId,
          type: 'bot',
          content: null,
          product: {
            id: prod.id,
            name: prod.title || 'Product Recommendation',
            actionType: prod.actionType || 'Request Demo',
            starting_price: null,
            short_description: 'Review custom specifications and licensing matrices on the platform.',
            brand_name: 'Marketplace Solution'
          }
        });
      }
    });

    // 3. Append Cal.com booking block if exists
    if (resultData.calcomBooking) {
      newMessagesBatch.push({
        id: `cal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'bot',
        content: '__calcom_booking',
        calcomBooking: resultData.calcomBooking
      });
    }

    // 4. Fire atomic functional single update row to state
    setMessages(prev => [...prev, ...newMessagesBatch]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  const formatPrice = (price) => {
    if (!price) return 'Contact for pricing';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return 'Contact for pricing';
    return num >= 1000 ? `₹${(num / 1000).toFixed(0)}K` : `₹${num.toFixed(2)}`;
  };

  const handleIconClick = () => {
    if (authLoading) return;
    if (!user) {
      setShowLoginModal(true);
    } else {
      setIsOpen(true);
    }
  };

  const onLoginSuccess = () => {
    checkAuth();
    setIsOpen(true);
  };

  if (authLoading) return null;

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />

      <div
        className="chat-icon fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full cursor-pointer flex items-center justify-center shadow-lg hover:scale-110 transition-all z-[1000]"
        onClick={handleIconClick}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={onLoginSuccess}
      />

      {isOpen && user && (
        <div
          ref={containerRef}
          className="fixed bottom-24 right-6 w-[500px] h-[600px] bg-neutral-900 rounded-2xl border border-neutral-800 shadow-2xl flex flex-col overflow-hidden z-[999] animate-slideUp max-md:w-[calc(100vw-48px)] max-md:h-[70vh] max-md:bottom-20"
        >
          <div className="px-5 py-4 bg-gradient-to-r from-neutral-900 to-black border-b border-neutral-800 flex justify-between items-center">
            <span className="text-lg font-semibold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent flex items-center">
              <Image className="inline-block mr-3 rounded-full" src="/image/Neo-icoai.png" alt="Neo" width={30} height={30} />
              Neo
            </span>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-2xl leading-none">
              ×
            </button>
          </div>

          <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
            {messages.map(msg => (
              <React.Fragment key={msg.id}>
                {/* User message layout */}
                {msg.type === 'user' && msg.content && (
                  <div className="self-end max-w-[80%] px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium animate-messageSlide">
                    {msg.content}
                  </div>
                )}

                {/* Bot Standard Text Messages */}
                {msg.type === 'bot' && msg.content && msg.content !== '__calcom_booking' && (
                  <div className="self-start max-w-[80%] px-4 py-3 rounded-2xl bg-neutral-800 border border-neutral-700 text-white animate-messageSlide text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                )}

                {/* Bot Structured Product Cards */}
             {/* Bot Structured Product Layouts (Summary List + Detailed Card) */}
{msg.type === 'bot' && msg.product && msg.content !== '__calcom_booking' && (
  <div className="self-start w-full max-w-[95%] flex flex-col gap-3 animate-messageSlide">
    
    {/* 1. Inline Quick Reference List Segment */}
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-gray-300">
    
      <ul className="space-y-2">
        <li className="flex items-center justify-between gap-4 bg-neutral-800/40 p-2 rounded-lg border border-neutral-800/60">
          <div className="flex items-center gap-2 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span className="font-medium text-white truncate">{msg.product.name}</span>
          </div>
          <a 
            href={`https://www.neozaar.com/${msg.product.actionType}/${msg.product.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 underline font-mono shrink-0 transition-colors bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"
          >
            ID: #{msg.product.id}
          </a>
        </li>
      </ul>
    </div>

    {/* 2. Full Standard Showcase Card */}
    <div className="w-full rounded-2xl bg-neutral-800 border border-neutral-700 overflow-hidden shadow-md">
      <div className="bg-neutral-900 border-b border-neutral-800 p-4">
     
        <div className="font-bold text-amber-400 text-base leading-snug">{msg.product.name}</div>
        


        {msg.product.short_description && (
          <p className="text-gray-300 text-xs mt-2 leading-relaxed line-clamp-3">{msg.product.short_description}</p>
        )}

        <div className="flex flex-wrap gap-2 mt-3 items-center justify-between">
          {msg.product.brand_name && (
            <div className="text-gray-500 text-[11px]">Brand: <span className="text-gray-400 font-medium">{msg.product.brand_name}</span></div>
          )}
          <span className="inline-block bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase">
            {msg.product.actionType || 'Contact Sales'}
          </span>
        </div>
      </div>

      {/* Action button row layout */}
      <div className="bg-neutral-800/60 p-3 flex flex-wrap gap-2">
        <a
          href={`https://www.neozaar.com/${msg.product.actionType}/${msg.product.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-[100px] text-center flex items-center justify-center gap-1 text-[11px] font-semibold bg-neutral-900 border border-neutral-700 text-white py-2 rounded-xl hover:bg-neutral-950 hover:border-amber-400 transition-all shadow-sm"
        >
          Product <ExternalLink className="w-2.5 h-2.5" />
        </a>

    <a
          href="https://cal.com/neozaar/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-[110px] text-center flex items-center justify-center gap-1 text-[11px] font-semibold bg-gradient-to-r from-amber-400 to-orange-500 text-white py-2 rounded-xl hover:opacity-95 transition-all shadow-sm"
        >
          <Calendar className="w-2.5 h-2.5" /> Expert Call
        </a>
        
    
      </div>
    </div>

  </div>
)}
              </React.Fragment>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-gray-400 text-xs px-4 py-2">
                <span>Neo is thinking...</span>
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1 h-1 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1 h-1 bg-amber-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-5 border-t border-neutral-800 flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Neo what you are looking for..."
              disabled={isLoadingProducts}
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isLoadingProducts || !inputValue.trim()}
              className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl px-4 py-3 text-white font-medium hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}