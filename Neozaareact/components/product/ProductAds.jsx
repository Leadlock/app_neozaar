"use client";
import Image from "next/image";

export default function ProductAds({ ad, position, onClick }) {
  if (!ad) return null;
  return (
    <div
      onClick={() => onClick(ad, position)}
      className="cursor-pointer group bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
    >
      {ad.image && (
        <div className="relative w-full h-40 overflow-hidden">
          <Image
            src={ad.image}
            alt={ad.title || "Advertisement"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />
        </div>
      )}
      <div className="p-4">
        <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">
          {ad.label || "Sponsored"}
        </p>
        <p className="text-sm font-bold text-gray-900 line-clamp-2">{ad.title}</p>
        {ad.subtitle && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ad.subtitle}</p>}
      </div>
    </div>
  );
}
