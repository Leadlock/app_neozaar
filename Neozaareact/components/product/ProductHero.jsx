"use client";
import Image from "next/image";
import {
  Sparkles, Star, ChevronRight, Shield, Play,
  Building2, Tag, Cloud, ArrowRight, Lock, DollarSign
} from "lucide-react";
import { stripHTML } from "./productUtils";

const TAG_GRADIENTS = {
  category: "from-orange-400 to-orange-600",
  subcategory: "from-blue-400 to-blue-600",
};

function buildTags(product) {
  const tags = [];
  const seen = new Set();
  const add = (label, type) => {
    if (label && !seen.has(label)) { seen.add(label); tags.push({ label, type }); }
  };
  (product.category || []).forEach((c) => add(c, "category"));
  (product.category_subcategory || []).forEach((c) => add(c, "subcategory"));
  return tags;
}

export default function ProductHero({ product, isAuthenticated, onDemoClick, onOfferClick, onLoginClick, onImageClick, filteredScreenshots, onBookMeetingClick }) {
  const productName = product.product_name || product.name || "";
  const brandName = product.brand_name || product.vendor_name || "";
  const companyName = product.company_name || "";
  const description = product.short_description
    ? stripHTML(product.short_description).substring(0, 280)
    : product.long_description
    ? stripHTML(product.long_description).substring(0, 280)
    : "";
  const tags = buildTags(product);
  const hasPrice = product.starting_price && Number(product.starting_price) > 1;
  const ctaLabel = product.cta_model?.[0] || "Request a Demo";
  const primaryImage = product.product_logo || product.company_logo || (filteredScreenshots[0] || null);

  // Breadcrumb items
  const category = Array.isArray(product.category) ? product.category[0] : product.category;
  const subcategory = Array.isArray(product.category_subcategory) ? product.category_subcategory[0] : product.category_subcategory;

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Marketplace", href: "/marketplace" },
  ];
  if (category) breadcrumbs.push({ label: category, href: `/marketplace?category=${encodeURIComponent(category)}` });
  if (subcategory) breadcrumbs.push({ label: subcategory, href: `/marketplace?category=${encodeURIComponent(category || "")}&subcategory=${encodeURIComponent(subcategory)}` });
  breadcrumbs.push({ label: productName, href: null });

  return (
    <div className="bg-white border-b border-gray-100">
      {/* Breadcrumb - hidden */}

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Col 1: Product Image + Thumbnails ── */}
          <div className="lg:col-span-3 flex flex-col items-center lg:items-start gap-3">
            <div
              className="w-full max-w-[260px] aspect-square bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
              onClick={() => filteredScreenshots.length > 0 ? onImageClick(0) : null}
            >
              {primaryImage ? (
                <Image
                  src={primaryImage}
                  alt={productName}
                  width={200}
                  height={200}
                  className="object-contain w-full h-full"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl">
                  <Building2 className="w-16 h-16 text-orange-300" />
                </div>
              )}
            </div>

            {/* Screenshot thumbnails */}
            {filteredScreenshots.length > 0 && (
              <div className="flex gap-2 flex-wrap justify-center lg:justify-start">
                {filteredScreenshots.slice(0, 4).map((src, i) => (
                  <button
                    key={i}
                    onClick={() => isAuthenticated ? onImageClick(i) : onLoginClick()}
                    className="w-14 h-14 rounded-lg border-2 border-gray-200 hover:border-orange-400 overflow-hidden transition-all flex-shrink-0 relative"
                  >
                    <Image src={src} alt={`Screenshot ${i + 1}`} fill className="object-cover" sizes="56px" />
                    {!isAuthenticated && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Lock className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
                {filteredScreenshots.length > 4 && (
                  <button
                    onClick={() => isAuthenticated ? onImageClick(4) : onLoginClick()}
                    className="w-14 h-14 rounded-lg border-2 border-gray-200 bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 hover:border-orange-400 transition-all"
                  >
                    +{filteredScreenshots.length - 4}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Col 2: Product Information ── */}
          <div className="lg:col-span-6 space-y-4">
            {/* Brand + badges */}
            <div className="flex flex-wrap items-center gap-2">
              {(product.action_type === 'solution' || brandName) && (
                <span className="text-sm font-semibold text-orange-600">
                  {product.action_type === 'solution' ? 'Solution' : brandName}
                </span>
              )}
              {companyName && brandName !== companyName && (
                <span className="text-sm text-gray-400">by {companyName}</span>
              )}
              {product.is_featured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                  <Sparkles className="w-3 h-3" /> Featured
                </span>
              )}
              {product.badge && (
                <span className="inline-flex items-center px-2 py-0.5 bg-orange-100 text-orange-700 border border-orange-200 rounded-full text-xs font-semibold">
                  {product.badge}
                </span>
              )}
            </div>

            {/* Product name */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              {productName}
            </h1>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {tags.map((t, i) => (
                  <span key={i} className="flex items-center gap-x-2">
                    {i > 0 && <span className="text-gray-300">·</span>}
                    <span className={`text-xs font-semibold text-transparent bg-clip-text bg-gradient-to-r ${TAG_GRADIENTS[t.type]}`}>
                      {t.label}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {description && (
              <p className="text-gray-600 text-sm leading-relaxed max-w-xl">
                {description}{description.length >= 280 ? "…" : ""}
              </p>
            )}

            {/* Platform support */}
            {product.cloud_provider_support?.length > 0 && (
              <div className="pt-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-400">Marketplace Support</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {product.cloud_provider_support.map((p, i) => (
                    <span key={i} className="px-2.5 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-md">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ── Col 3: CTA Card ── */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4 sticky top-24">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Get Started</p>
                {hasPrice ? (
                  <>
                    <p className="text-xs text-gray-500 mb-0.5">Starting Price</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₹{Number(product.starting_price).toLocaleString("en-IN")}
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-semibold text-gray-700">Pricing</p>
                )}
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={isAuthenticated ? onDemoClick : onLoginClick}
                  className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {ctaLabel}
                </button>

                <button
                  onClick={isAuthenticated ? onOfferClick : onLoginClick}
                  className="w-full py-3 px-4 bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Get Private Offer
                </button>

                <button
                  onClick={isAuthenticated ? onBookMeetingClick : onLoginClick}
                  className="w-full py-2.5 px-4 text-orange-600 hover:text-orange-700 font-medium text-sm flex items-center justify-center gap-1.5 transition-colors"
                >
                  Book a Meeting
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
