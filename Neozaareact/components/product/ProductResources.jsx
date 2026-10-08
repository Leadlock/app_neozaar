"use client";
import { File, FileText, Video, Download, ExternalLink, Play, Lock } from "lucide-react";

function ResourceCard({ icon: Icon, iconColor, title, subtitle, actionIcon: ActionIcon, onClick, locked }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-sm transition-all group text-left"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex-shrink-0">
        {locked
          ? <Lock className="w-4 h-4 text-gray-400" />
          : <ActionIcon className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
        }
      </div>
    </button>
  );
}

export default function ProductResources({ product, isAuthenticated, onBrochureClick, onCaseStudyClick, onDemoVideoClick, onLoginClick, brochureAndPdfOnly = false }) {
  const brochures = product.brochures || [];
  const caseStudies = product.customer_case_studies || [];
  const demoVideo = brochureAndPdfOnly ? null : product.demo_video_link;

  const hasResources = brochures.length > 0 || caseStudies.length > 0 || demoVideo;
  if (!hasResources) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Download className="w-5 h-5 text-orange-500" />
        Resources
      </h2>

      <div className="space-y-3">
        {brochures.map((url, i) => (
          <ResourceCard
            key={`brochure-${i}`}
            icon={File}
            iconColor="bg-orange-50 text-orange-500"
            title={`Brochure ${brochures.length > 1 ? i + 1 : ""}`}
            subtitle="Product brochure — PDF"
            actionIcon={Download}
            locked={!isAuthenticated}
            onClick={(e) => {
              e.preventDefault();
              isAuthenticated ? onBrochureClick(e, url) : onLoginClick();
            }}
          />
        ))}

        {caseStudies.map((url, i) => (
          <ResourceCard
            key={`case-${i}`}
            icon={FileText}
            iconColor="bg-purple-50 text-purple-500"
            title={`Case Study ${caseStudies.length > 1 ? i + 1 : ""}`}
            subtitle="Customer success story"
            actionIcon={ExternalLink}
            locked={!isAuthenticated}
            onClick={(e) => {
              e.preventDefault();
              isAuthenticated ? onCaseStudyClick(e, url) : onLoginClick();
            }}
          />
        ))}

        {demoVideo && (
          <ResourceCard
            icon={Video}
            iconColor="bg-blue-50 text-blue-500"
            title="Demo Video"
            subtitle="Watch the product in action"
            actionIcon={Play}
            locked={!isAuthenticated}
            onClick={() => isAuthenticated ? onDemoVideoClick() : onLoginClick()}
          />
        )}
      </div>
    </div>
  );
}
