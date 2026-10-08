'use client';

import Header from '../layouts/Header';
import Footer from '../layouts/Footer';
import PartnerTypeSelector from './PartnerTypeSelector';
import ISVPartnerPath from './ISVPartnerPath';
import SolutionPartnerPath from './SolutionPartnerPath';
import ConsultingAdvisorPath from './ConsultingAdvisorPath';
import SDGImpactSection from './SDGImpactSection';

export default function PlatformPartnersPage() {
  return (
    <main className="bg-[#020202] min-h-screen max-w-[1920px] mx-auto overflow-hidden">
      <div className="relative bg-[#020202]">
        <Header />
      </div>

      {/* Partnering for Impact — SDG 17 alignment */}
      <SDGImpactSection />

      {/* Primary UX: choose your partner path — desktop only */}
      <div className="hidden lg:block">
        <PartnerTypeSelector />
      </div>

      {/* Detailed partner sections — mobile only */}
      <div className="lg:hidden">
        <ISVPartnerPath />
        <SolutionPartnerPath />
        <ConsultingAdvisorPath />
      </div>

      <Footer />
    </main>
  );
}
