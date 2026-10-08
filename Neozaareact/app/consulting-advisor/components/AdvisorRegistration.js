import { Suspense } from 'react';
import ISV from '../../components/isvclient';

export default function AdvisorRegistration() {
  return (
    <section id="advisor-form" className="w-full bg-[#f8f8f8] border-t border-gray-200 scroll-mt-0">
      <Suspense fallback={
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
      }>
        <ISV type="revshare" />
      </Suspense>
    </section>
  );
}
