'use client';

import { Clock, Lock, PencilLine } from 'lucide-react';

const BADGES = [
  { title: 'Takes just a few minutes', caption: 'Answer a few simple questions. That’s it.', Icon: Clock },
  { title: 'No pricing shown', caption: 'We prepare your request. Pricing comes later.', Icon: Lock },
  { title: 'You’re in control', caption: 'Review and change everything before submitting.', Icon: PencilLine },
];

export default function TrustBadges() {
  return (
    <section className="w-full py-16 lg:py-20 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {BADGES.map(({ title, caption, Icon }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{caption}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
