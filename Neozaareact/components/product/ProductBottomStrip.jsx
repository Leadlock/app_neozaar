"use client";
import { Target, Globe, Cloud, ArrowRight, TrendingUp } from "lucide-react";

const ITEMS = [
  { icon: Target,     label: "Outcome-Led",              desc: "Focused on measurable results" },
  { icon: Globe,      label: "Vendor-Agnostic",          desc: "Best-fit, not best-marketed" },
  { icon: Cloud,      label: "Multi-Cloud Ready",        desc: "Works across all hyperscalers" },
  { icon: ArrowRight, label: "Assessment to Execution",  desc: "End-to-end delivery" },
  { icon: TrendingUp, label: "Commercially Optimised",   desc: "Value-driven procurement" },
];

export default function ProductBottomStrip() {
  return (
    <div className="bg-gray-900 py-8">
      {/* Mobile: horizontal scroll row */}
      <div className="flex lg:hidden overflow-x-auto scrollbar-hide gap-4 px-4">
        {ITEMS.map(({ icon: Icon, label, desc }, i) => (
          <div key={i} className="flex-none flex flex-col items-center text-center gap-2 w-28">
            <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center">
              <Icon className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-sm font-semibold text-white leading-tight">{label}</p>
            <p className="text-xs text-gray-400 leading-tight">{desc}</p>
          </div>
        ))}
      </div>

      {/* Desktop: equal 5-column grid */}
      <div className="hidden lg:grid max-w-7xl mx-auto px-8 grid-cols-5 gap-6">
        {ITEMS.map(({ icon: Icon, label, desc }, i) => (
          <div key={i} className="flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center">
              <Icon className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs text-gray-400">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
