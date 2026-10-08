"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { Briefcase, Layers, Package, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { cleanHTML, containsHTML } from "./productUtils";

function typeBadge(actionType) {
  if (actionType === "service") return { bg: "bg-purple-100 text-purple-700", icon: Briefcase, label: "Service" };
  if (actionType === "solution") return { bg: "bg-blue-100 text-blue-700", icon: Layers, label: "Solution" };
  return { bg: "bg-orange-100 text-orange-700", icon: Package, label: "Product" };
}

export default function ProductRecommendations({ recommendations, isAuthenticated, onProductClick, onLoginClick, actionType }) {
  if (!recommendations?.length) return null;
  const items = recommendations.slice(0, 6);
  const swiperRef = useRef(null);
  const relatedLabel = actionType === "service" ? "Other Services" : actionType === "product" ? "Other Products" : "Other Solutions";

  return (
    <section className="bg-gray-50 py-8 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{relatedLabel}</h2>
            <p className="text-sm text-gray-500 mt-0.5">You may also be interested in these</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => swiperRef.current?.slidePrev()}
              className="w-9 h-9 rounded-full border border-gray-200 bg-white hover:border-orange-400 hover:text-orange-500 flex items-center justify-center text-gray-500 transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => swiperRef.current?.slideNext()}
              className="w-9 h-9 rounded-full border border-gray-200 bg-white hover:border-orange-400 hover:text-orange-500 flex items-center justify-center text-gray-500 transition-all shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="[&_.swiper-wrapper]:mt-0">
        <Swiper
          modules={[Autoplay, Pagination]}
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
          spaceBetween={16}
          pagination={{ clickable: true }}
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          breakpoints={{
            0: { slidesPerView: 1 },
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
          className="pb-6"
        >
          {items.map((product, index) => {
            const badge = typeBadge(product.action_type);
            const BadgeIcon = badge.icon;
            const name = product.title || product.product_name || product.name || "";
            const brand = product.brand_name || "";
            const desc = product.description || product.short_description || "";
            const descText = containsHTML(desc) ? cleanHTML(desc).replace(/<[^>]*>/g, "").substring(0, 90) : desc.substring(0, 90);
            const hasPrice = product.starting_price && Number(product.starting_price) > 1;
            const imgSrc = product.image_url || product.product_logo || "/brand-log/neozaardefault.jpg";

            return (
              <SwiperSlide key={`rec-${product.id || index}`}>
                <div
                  onClick={() => isAuthenticated ? onProductClick(product) : onLoginClick()}
                  className="bg-white border border-gray-200 rounded-2xl p-4 cursor-pointer hover:shadow-md hover:border-orange-200 transition-all duration-200 h-full flex flex-col"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative w-12 h-12 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0 bg-gray-50">
                      <Image src={imgSrc} alt={name} fill className="object-contain p-1" sizes="48px" />
                      {!isAuthenticated && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Lock className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {brand && <p className="text-xs font-semibold text-orange-600 mb-0.5 truncate">{brand}</p>}
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">{name}</h3>
                    </div>
                  </div>

                  {descText && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">{descText}{descText.length >= 90 ? "…" : ""}</p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg}`}>
                      <BadgeIcon className="w-3 h-3" />
                      {badge.label}
                    </span>
                    {hasPrice ? (
                      <span className="text-sm font-bold text-gray-900">
                        ₹{Number(product.starting_price).toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">On request</span>
                    )}
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
        </div>
      </div>
    </section>
  );
}
