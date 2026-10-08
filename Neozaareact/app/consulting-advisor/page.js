import AdvisorsView from '../isv-registration/cosell/AdvisorsView';

export const metadata = {
  title: 'Become a Consulting Advisor | CoSell360 by NeoZaar',
  description:
    'Register as a NeoZaar Consulting Advisor and connect your enterprise expertise with cloud, security, AI, compliance, data and modernization solutions.',
  openGraph: {
    title: 'Become a Consulting Advisor | CoSell360 by NeoZaar',
    description:
      'Bring the customer context and business need. NeoZaar brings the right technology ecosystem around it.',
    type: 'website',
  },
};

export default function Page() {
  return <AdvisorsView />;
}
