'use client';

import Header from '../layouts/Header';
import Footer from '../layouts/Footer';
import StudioHero from './components/StudioHero';
import GuidedSteps from './components/GuidedSteps';
import WhatYouGet from './components/WhatYouGet';
import TrustBadges from './components/TrustBadges';
import BeginCTA from './components/BeginCTA';

export default function ProposalStudio() {
  return (
    <main className="bg-white min-h-screen max-w-[1920px] mx-auto overflow-hidden">

      {/* Header sits inside the dark hero band. The <Header /> component brings
          its own padded shell, so no wrapper is needed here. */}
      <div className="relative bg-[#0a0a0a]">
        <Header />
        <StudioHero />
      </div>

      <GuidedSteps />
      <WhatYouGet />
      <TrustBadges />
      <BeginCTA />

      <Footer />
    </main>
  );
}
