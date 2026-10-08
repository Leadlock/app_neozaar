"use client";
import { ShieldCheck, Zap, Lock, Settings, Lightbulb } from "lucide-react";

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "Secure" },
  { icon: Zap,         label: "Modernize" },
  { icon: Lock,        label: "Protect" },
  { icon: Settings,    label: "Optimize" },
  { icon: Lightbulb,   label: "Innovate" },
];

export default function ProductTrustStrip() {
  return (
    <div className="bg-gray-50 border-y border-gray-100 py-3">
      <div className="flex items-center justify-around px-2">
        {TRUST_ITEMS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1 min-w-0">
            <Icon className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
