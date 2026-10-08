'use client';

import Header from '../layouts/Header';
import Footer from '../layouts/Footer';

// Form-only page. The marketing/landing content now lives on the CoSell360
// Solution Partner page (/solution-partner); this route hosts just the
// registration form, which every "Become a Solution Partner" CTA links to.
import SolutionPartnerRegistration from '../solution-partner/SolutionPartnerRegistration';

export default function SolutionPartnerRegistrationPage() {
  return (
    <main className="bg-white min-h-screen max-w-[1920px] mx-auto overflow-hidden">
      <div className="relative bg-[#0a0a0a]">
        <Header />
      </div>

      {/* Registration form only */}
      <SolutionPartnerRegistration />

      <Footer />
    </main>
  );
}
