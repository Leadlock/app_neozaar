'use client';

import { FileText, Puzzle, Package, ScrollText, FileCheck2 } from 'lucide-react';

const ITEMS = [
  { title: 'Structured Requirement', caption: 'Clearly defined business and technical needs.', Icon: FileText },
  { title: 'Right Solution Approach', caption: 'Tailored to your objectives.', Icon: Puzzle },
  { title: 'Indicative BOM', caption: 'Products, licences and quantities.', Icon: Package },
  { title: 'Indicative SOW', caption: 'Implementation, migration & support scope.', Icon: ScrollText },
  { title: 'Ready for Proposal', caption: 'Everything compiled for NeoZaar to prepare your commercial proposal.', Icon: FileCheck2 },
];

export default function WhatYouGet() {
  return (
    <section className="w-full py-20 lg:py-28 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">

        <div className="mb-14">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-orange-500 mb-3">What you&rsquo;ll get</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {ITEMS.map(({ title, caption, Icon }) => (
            <div key={title} className="flex flex-col rounded-2xl bg-white border border-gray-100 p-6">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900 mb-1.5">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{caption}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
