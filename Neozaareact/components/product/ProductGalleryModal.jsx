"use client";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

export default function ProductGalleryModal({ screenshots, currentIndex, onClose, onNavigate, onThumbnailClick, productName }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate("prev");
      if (e.key === "ArrowRight") onNavigate("next");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onNavigate]);

  if (!screenshots?.length) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white/10 rounded-full text-white text-sm">
        {currentIndex + 1} / {screenshots.length}
      </div>

      {/* Main image */}
      <div className="relative w-full max-w-5xl max-h-[70vh] flex items-center justify-center">
        {screenshots.length > 1 && (
          <button
            onClick={() => onNavigate("prev")}
            className="absolute left-0 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <div className="relative w-full h-[60vh] rounded-xl overflow-hidden">
          <Image
            src={screenshots[currentIndex]}
            alt={`${productName} — Screenshot ${currentIndex + 1}`}
            fill
            className="object-contain"
            priority
          />
        </div>

        {screenshots.length > 1 && (
          <button
            onClick={() => onNavigate("next")}
            className="absolute right-0 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {screenshots.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto py-2 px-4 max-w-full">
          {screenshots.map((src, i) => (
            <button
              key={i}
              onClick={() => onThumbnailClick(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                currentIndex === i ? "border-orange-500 scale-110" : "border-transparent hover:border-gray-400"
              }`}
            >
              <div className="relative w-full h-full">
                <Image src={src} alt={`Thumbnail ${i + 1}`} fill className="object-cover" sizes="64px" loading="lazy" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
