'use client';

import { Target, Server, Lightbulb, Box, Settings, ClipboardList } from 'lucide-react';

const STEPS = [
  { n: 1, title: 'Your Need', caption: 'What are you trying to achieve?', Icon: Target },
  { n: 2, title: 'Your Environment', caption: 'What do you have today, and what needs to change?', Icon: Server },
  { n: 3, title: 'Recommended Approach', caption: 'Neo builds the right solution approach.', Icon: Lightbulb },
  { n: 4, title: 'Technology', caption: 'Neo identifies the technology, licences and quantities required.', Icon: Box },
  { n: 5, title: 'Implementation', caption: 'Neo defines the deployment, migration and support needed.', Icon: Settings },
  { n: 6, title: 'Review & Request', caption: 'Review everything and request a commercial proposal.', Icon: ClipboardList },
];

export default function GuidedSteps() {
  return (
    <section className="w-full py-20 lg:py-28 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">

        <div className="mb-14">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-orange-500 mb-3">6 Guided Steps</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
            Neo helps you through each one.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 lg:gap-5">
          {STEPS.map(({ n, title, caption, Icon }) => (
            <div key={n} className="flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-orange-500" />
              </div>
              <span className="text-xs font-mono font-bold text-gray-300 mb-2">0{n}</span>
              <h3 className="text-[15px] font-semibold text-gray-900 mb-1.5">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{caption}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
