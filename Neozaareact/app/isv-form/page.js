import { Suspense } from 'react';
import Header from '../layouts/Header';
import Footer from '../layouts/Footer';
import ISVRegistration from '../isv-registration/ISVRegistration';

export const metadata = {
  title: 'ISV / SaaS Registration Form | NeoZaar',
  description: 'Register your ISV or SaaS product on NeoZaar. Share your technology profile and join the partner ecosystem.',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <main className="bg-white min-h-screen max-w-[1920px] mx-auto overflow-hidden">
        <div className="relative bg-[#050505]">
          <Header />
        </div>
        <ISVRegistration />
        <Footer />
      </main>
    </Suspense>
  );
}
