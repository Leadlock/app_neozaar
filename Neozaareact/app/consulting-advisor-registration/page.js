import { Suspense } from 'react';
import Header from '../layouts/Header';
import Footer from '../layouts/Footer';
import AdvisorRegistration from '../consulting-advisor/components/AdvisorRegistration';

export const metadata = {
  title: 'Consulting Advisor Registration | NeoZaar',
  description: 'Register as a NeoZaar Consulting Advisor. Refer clients, earn commissions and grow your revenue.',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <main className="bg-white min-h-screen max-w-[1920px] mx-auto overflow-hidden">
        <div className="relative bg-[#0a0a0a]">
          <Header />
        </div>
        <AdvisorRegistration />
        <Footer />
      </main>
    </Suspense>
  );
}
