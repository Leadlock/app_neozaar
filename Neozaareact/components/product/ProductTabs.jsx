"use client";
import { Lock } from "lucide-react";

const PRODUCT_TABS = [
  { id: "overview",  label: "Overview",     public: true  },
  { id: "technical",label: "Product Details", public: false },
  { id: "resources",label: "Resources",      public: false },
];

const SOLUTION_TABS = [
  { id: "overview",  label: "Overview",     public: true  },
  { id: "scope",    label: "Scope",         public: false },
  { id: "technical",label: "Demographics",  public: false },
  { id: "resources",label: "Resources",     public: false },
];

const SERVICE_TABS = [
  { id: "overview",  label: "Overview",      public: true  },
  { id: "approach", label: "Approach",       public: false },
  { id: "technical",label: "Demographics",   public: false },
  { id: "resources",label: "Resources",      public: false },
];

export default function ProductTabs({ activeTab, onTabChange, isAuthenticated, actionType, hasResources = true }) {
  const baseTabs = actionType === "service" ? SERVICE_TABS : actionType === "solution" ? SOLUTION_TABS : PRODUCT_TABS;
  const TABS = hasResources ? baseTabs : baseTabs.filter(t => t.id !== "resources");
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex overflow-x-auto scrollbar-hide -mb-px">
          {TABS.map((tab) => {
            const locked = !tab.public && !isAuthenticated;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 flex-shrink-0 ${
                  active
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                }`}
              >
                {tab.label}
                {locked && <Lock className="w-3 h-3 text-gray-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
