"use client";
import { useState } from "react";
import Image from "next/image";
import { BookOpen, Image as ImageIcon, Lock, ShieldCheck, CheckCircle, Zap, Target, AlertTriangle, TrendingUp } from "lucide-react";
import { HTMLContent, FormattedContent } from "./ProductContent";
import { containsHTML, parseKeyFeatures } from "./productUtils";

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

function decodePostgresArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    if (val.startsWith("{") && val.endsWith("}")) {
      return val.slice(1, -1).split(",").map(s => s.trim().replace(/^"|"$/g, ""));
    }
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

// service_solution_details.outcome is a JSON-stringified array of plain
// strings (or, for older rows, a stray placeholder value that must render
// as nothing rather than a garbled bullet).
function parseOutcomeArray(val) {
  if (!val || val === '["challengesaddressed "]') return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [val].filter(Boolean);
    } catch { return [val].filter(Boolean); }
  }
  return [];
}

export default function ProductOverview({ product, filteredScreenshots, isAuthenticated, onImageClick, onLoginClick, singleSection }) {
  const isService = product.action_type === "service";
  const isSolution = product.action_type === "solution";
  const extra = product.extraDataForServiceSolution || {};
  const [scopeExpanded, setScopeExpanded] = useState(false);
  const [approachExpanded, setApproachExpanded] = useState(false);

  const overviewContent = (isService || isSolution)
    ? (extra.overview || product.long_description)
    : product.long_description;

  const renderContent = (val) => {
    if (!val) return null;
    const str = typeof val === "string" ? val : JSON.stringify(val);
    return containsHTML(str)
      ? <HTMLContent html={str} className="prose-content" />
      : <FormattedContent data={str} />;
  };

  if (singleSection === "scope") {
    const useCaseItems = decodePostgresArray(product.use_cases).filter(Boolean);
    const customerChallengeItems = decodePostgresArray(product.customer_challenges).filter(Boolean);
    const businessOutcomeItems = decodePostgresArray(product.primary_business_outcome).filter(Boolean);
    const scopeItems = decodePostgresArray(extra.scope).filter(Boolean);
    const scopeLineCount = scopeItems.length > 0
      ? scopeItems.length
      : typeof extra.scope === "string"
        ? ((extra.scope.match(/<li/gi) || []).length || extra.scope.split("\n").filter(l => l.trim()).length)
        : 0;
    const needsTruncation = scopeLineCount > 6;
    return (
      <div className="space-y-6">
        {customerChallengeItems.length > 0 && (
          <SectionCard title="Customer Challenges" icon={AlertTriangle}>
            <ul className="space-y-2">
              {customerChallengeItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
        {businessOutcomeItems.length > 0 && (
          <SectionCard title="Business Outcomes" icon={TrendingUp}>
            <ul className="space-y-2">
              {businessOutcomeItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
        {extra.scope ? (
          <SectionCard title="Scope" icon={BookOpen}>
            <div className="text-gray-600 text-sm">
              <div className={`relative${!scopeExpanded && needsTruncation ? " max-h-52 overflow-hidden" : ""}`}>
                {scopeItems.length > 0 ? (
                  <ul className="space-y-2">
                    {scopeItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : renderContent(extra.scope)}
                {!scopeExpanded && needsTruncation && (
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                )}
              </div>
              {needsTruncation && (
                <button
                  onClick={() => setScopeExpanded(v => !v)}
                  className="mt-3 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
                >
                  {scopeExpanded ? "Show less ↑" : "Show more ↓"}
                </button>
              )}
            </div>
          </SectionCard>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">No scope information available.</div>
        )}
        {useCaseItems.length > 0 && (
          <SectionCard title="Use Cases / Capabilities" icon={Target}>
            <ul className="space-y-2">
              {useCaseItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </div>
    );
  }

  if (singleSection === "approach") {
    const approachLineCount = typeof extra.approach === "string"
      ? ((extra.approach.match(/<li/gi) || []).length || extra.approach.split("\n").filter(l => l.trim()).length)
      : 0;
    const approachNeedsTruncation = approachLineCount > 6;
    const outcomeItems = parseOutcomeArray(extra.outcome);
    return (
      <div className="space-y-6">
        {extra.approach ? (
          <SectionCard title="Approach" icon={BookOpen}>
            <div className="text-gray-600 text-sm">
              <div className={`relative${!approachExpanded && approachNeedsTruncation ? " max-h-52 overflow-hidden" : ""}`}>
                {renderContent(extra.approach)}
                {!approachExpanded && approachNeedsTruncation && (
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                )}
              </div>
              {approachNeedsTruncation && (
                <button
                  onClick={() => setApproachExpanded(v => !v)}
                  className="mt-3 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
                >
                  {approachExpanded ? "Show less ↑" : "Show more ↓"}
                </button>
              )}
            </div>
          </SectionCard>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">No approach information available.</div>
        )}
        {extra.challenges_addressed && (
          <SectionCard title="Challenges Addressed" icon={AlertTriangle}>
            <div className="text-gray-600 text-sm">{renderContent(extra.challenges_addressed)}</div>
          </SectionCard>
        )}
        {outcomeItems.length > 0 && (
          <SectionCard title="Outcomes" icon={TrendingUp}>
            <ul className="space-y-2">
              {outcomeItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gallery */}
      {filteredScreenshots.length > 0 && (
        <SectionCard title="Gallery" icon={ImageIcon}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredScreenshots.slice(0, 4).map((src, i) => (
              <div
                key={i}
                className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 cursor-pointer group"
                onClick={() => isAuthenticated ? onImageClick(i) : onLoginClick()}
              >
                <Image
                  src={src}
                  alt={`Screenshot ${i + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {!isAuthenticated && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
          {filteredScreenshots.length > 4 && (
            <button
              onClick={() => isAuthenticated ? onImageClick(4) : onLoginClick()}
              className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-medium"
            >
              View all {filteredScreenshots.length} screenshots →
            </button>
          )}
        </SectionCard>
      )}

      {/* About / Overview */}
      {overviewContent && (
        <SectionCard title={isService ? "Service Overview" : isSolution ? "Solution Overview" : "About this Product"} icon={BookOpen}>
          <div className="text-gray-600 leading-relaxed text-sm">
            {containsHTML(overviewContent)
              ? <HTMLContent html={overviewContent} className="prose-content" />
              : <FormattedContent data={overviewContent} />
            }
          </div>
        </SectionCard>
      )}

      {/* Product-specific: Key Features */}
      {!isService && !isSolution && (() => {
        const features = parseKeyFeatures(product.key_features);
        if (!features.length) return null;
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
      })()}

      {/* Solution-specific: Key Features, Approach, Coverage */}
      {isSolution && (
        <>
          {(() => {
            const features = parseKeyFeatures(product.key_features);
            if (!features.length) return null;
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
          })()}
          {extra.approach && (
            <SectionCard title="Approach" icon={BookOpen}>
              <div className="text-gray-600 text-sm">{renderContent(extra.approach)}</div>
            </SectionCard>
          )}
          {(() => {
            const items = Array.isArray(extra.coverage)
              ? extra.coverage.filter(Boolean)
              : typeof extra.coverage === "string" && extra.coverage.trim()
              ? [extra.coverage]
              : [];
            if (!items.length) return null;
            return (
              <SectionCard title="Coverage" icon={ShieldCheck}>
                <div className="flex flex-wrap gap-2">
                  {items.map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-100 text-orange-700 text-sm font-medium rounded-full"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                      {item}
                    </span>
                  ))}
                </div>
              </SectionCard>
            );
          })()}
        </>
      )}
    </div>
  );
}
