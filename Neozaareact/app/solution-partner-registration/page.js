import { Suspense } from 'react';
import SolutionPartnerRegistrationPage from './SolutionPartnerRegistrationPage';

export const metadata = {
  title: 'Solution Partner Registration | NeoZaar',
  description: 'Register as a NeoZaar Solution Partner. Turn your Microsoft & AWS capabilities into more customer opportunities and recurring services revenue.',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SolutionPartnerRegistrationPage />
    </Suspense>
  );
}
