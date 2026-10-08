import { Suspense } from 'react';
import ProposalStudio from './ProposalStudio';
import { seoconfig } from '../seoconfig';

export const metadata = seoconfig.pages.proposalStudio;

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProposalStudio />
    </Suspense>
  );
}
