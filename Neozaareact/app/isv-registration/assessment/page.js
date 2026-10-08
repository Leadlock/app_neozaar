import AssessmentView from '../cosell/AssessmentView';

export const metadata = {
  title: "CoSell360 Readiness Assessment | NeoZaar",
  description: "Tell CoSell360 about your SaaS, marketplace stage, support needs and priority outcome.",
  openGraph: { title: "CoSell360 Readiness Assessment | NeoZaar", description: "Tell CoSell360 about your SaaS, marketplace stage, support needs and priority outcome.", type: 'website' },
};

export default function Page() {
  return <AssessmentView />;
}
