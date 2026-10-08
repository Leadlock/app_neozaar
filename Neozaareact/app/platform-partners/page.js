import { notFound } from 'next/navigation';

// The Platform Partners page has been disabled. Its content now lives under
// /isv-registration (CoSell360). The component files in this folder are kept
// intact so the page can be re-enabled later if needed — restore the previous
// page.js (which rendered <PlatformPartnersPage />) to bring it back.
export default function Page() {
  notFound();
}
