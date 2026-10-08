"use client";
import { X, Play, Lock, Check } from "lucide-react";
import { cleanHTML } from "./productUtils";

export function ProductDemoModal({ product, onSubmit, onClose, message, setMessage, ctaLabel }) {
  const name = product.product_name || product.name || "";
  const desc = cleanHTML(product.short_description || "").substring(0, 120);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden relative">
        <div className="h-1 w-full bg-gradient-to-r from-orange-400 to-amber-400" />
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-50 border border-orange-100 rounded-2xl mb-4">
              <Play className="w-7 h-7 text-orange-500 fill-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{ctaLabel || "Request a Demo"}</h2>
          </div>

          <div className="mb-5 p-4 bg-orange-50 border border-orange-100 rounded-xl">
            <p className="text-sm font-semibold text-orange-800">{name}</p>
            {desc && <p className="text-xs text-orange-600 mt-1">{desc}</p>}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <input
                type="checkbox"
                id="auth-demo"
                required
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="auth-demo" className="text-xs text-gray-600 leading-relaxed">
                I authorize <span className="font-semibold text-orange-600">NeoZaar</span> to share my information with relevant solution experts for follow-up on this inquiry.
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Submit Request
            </button>
            <p className="text-xs text-center text-gray-400">
              NeoZaar processes personal data in accordance with applicable data protection regulations.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export function ProductOfferModal({ product, onSubmit, onClose, actionFor, setActionFor }) {
  const name = product.product_name || product.name || "";
  const desc = cleanHTML(product.short_description || "").substring(0, 120);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden relative">
        <div className="h-1 w-full bg-gradient-to-r from-orange-400 to-amber-400" />
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-50 border border-orange-100 rounded-2xl mb-4">
              <Lock className="w-7 h-7 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Unlock Private Offer</h2>
          </div>

          <div className="mb-5 p-4 bg-orange-50 border border-orange-100 rounded-xl">
            <p className="text-sm font-semibold text-orange-800">{name}</p>
            {desc && <p className="text-xs text-orange-600 mt-1">{desc}</p>}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-700 mb-3">I intend to retire my commitment with this purchase:</p>
              <div className="space-y-2.5">
                {[
                  { value: "azure_macc", label: "Azure MACC" },
                  { value: "aws_edp", label: "AWS EDP" },
                  { value: "none", label: "None / Not Applicable" },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="action_for"
                      value={opt.value}
                      checked={actionFor === opt.value}
                      onChange={(e) => setActionFor(e.target.value)}
                      className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-orange-600 transition-colors">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {(actionFor === "azure_macc" || actionFor === "aws_edp") && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">Disclaimer:</span> Available through Microsoft Marketplace and/or AWS Marketplace where applicable. NeoZaar can validate the right offer and confirm whether the purchase may contribute toward your applicable MACC or AWS commitment. Eligibility depends on the specific offer, purchasing route, customer agreement, and marketplace terms.
                </p>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <input
                type="checkbox"
                id="auth-offer"
                required
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="auth-offer" className="text-xs text-gray-600 leading-relaxed">
                I authorize <span className="font-semibold text-orange-600">NeoZaar</span> to share my information with relevant solution experts for follow-up on this inquiry.
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Submit Enquiry
            </button>
            <p className="text-xs text-center text-gray-400">
              NeoZaar processes personal data in accordance with applicable data protection regulations.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export function ProductSuccessModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl overflow-hidden relative text-center">
        <div className="h-1 w-full bg-gradient-to-r from-green-400 to-emerald-500" />
        <div className="p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 border border-green-100 rounded-full mb-5">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Thank you. Our team will reach out shortly to understand your requirements.
          </p>
          <button
            onClick={onClose}
            className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
