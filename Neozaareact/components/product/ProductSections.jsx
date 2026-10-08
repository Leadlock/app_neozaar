"use client";
import {
  CheckCircle, Zap, Target, Code, Users, Globe,
  Building2, MapPin, Layers, Tag
} from "lucide-react";
import { parseKeyFeatures, containsHTML } from "./productUtils";
import { HTMLContent, FormattedContent } from "./ProductContent";

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5 text-orange-500" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function MetaItem({ label, value }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(", ") : String(value);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{display}</span>
    </div>
  );
}

function TagList({ items }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
          {item}
        </span>
      ))}
    </div>
  );
}

function CheckList({ items }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span className="text-sm text-gray-700">{item}</span>
        </div>
      ))}
    </div>
  );
}

export function ProductFeatures({ product }) {
  const features = parseKeyFeatures(product.key_features);
  if (!features.length) return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">
      No key features listed for this product.
    </div>
  );

  return (
    <SectionCard title="Key Features" icon={Zap}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-orange-500" />
            </div>
            <span className="text-sm text-gray-700 leading-relaxed">{f}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function ProductUseCases({ product }) {
  const useCases = product.primary_use_cases;
  const extra = product.extraDataForServiceSolution || {};
  const hasContent = useCases || extra.use_cases;
  if (!hasContent) return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">
      No use cases listed for this product.
    </div>
  );

  return (
    <div className="space-y-6">
      {useCases && (
        <SectionCard title="Primary Use Cases" icon={Target}>
          <div className="text-gray-600 text-sm">
            {containsHTML(useCases)
              ? <HTMLContent html={useCases} className="prose-content" />
              : <FormattedContent data={useCases} />
            }
          </div>
        </SectionCard>
      )}
      {extra.use_cases && (
        <SectionCard title="Solution Use Cases" icon={Target}>
          <div className="text-gray-600 text-sm">
            <FormattedContent data={extra.use_cases} />
          </div>
        </SectionCard>
      )}
    </div>
  );
}

export function ProductTechnical({ product }) {
  const prereqs = product.technical_prerequisites;
  const hasContent = prereqs || product.regions_supported?.length;
  if (!hasContent) return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">
      No technical information available.
    </div>
  );

  return (
    <div className="space-y-6">
      {prereqs && (
        <SectionCard title="Technical Prerequisites" icon={Code}>
          <div className="text-gray-600 text-sm">
            {containsHTML(prereqs)
              ? <HTMLContent html={prereqs} className="prose-content" />
              : <FormattedContent data={prereqs} />
            }
          </div>
        </SectionCard>
      )}

      {product.regions_supported?.length > 0 && (
        <SectionCard title="Regions Supported" icon={MapPin}>
          <TagList items={product.regions_supported} />
        </SectionCard>
      )}
    </div>
  );
}

export function ProductMetadata({ product }) {
  const hasContent = product.target_audience?.length || product.target_segments?.length || product.industry?.length;
  if (!hasContent) return null;

  const sections = [
    { label: "Audience",        icon: Users,    items: product.target_audience || [] },
    { label: "Target Segments", icon: Layers,   items: product.target_segments || [] },
    { label: "Industry",        icon: Building2,items: product.industry        || [] },
  ].filter(s => s.items.length > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {sections.map(({ label, icon: Icon, items }) => (
          <div key={label}>
            <div className="flex items-center gap-1.5 mb-3 text-gray-400">
              <Icon className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((item, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductChallenges({ product }) {
  const extra = product.extraDataForServiceSolution || {};
  if (!extra.challenges_addressed) return null;
  return (
    <SectionCard title="Challenges Addressed" icon={Target}>
      <div className="text-gray-600 text-sm">
        {containsHTML(extra.challenges_addressed)
          ? <HTMLContent html={extra.challenges_addressed} className="prose-content" />
          : <FormattedContent data={extra.challenges_addressed} />
        }
      </div>
    </SectionCard>
  );
}
