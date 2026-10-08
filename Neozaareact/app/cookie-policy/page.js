import Header from "../layouts/Header";
import Footer from "../layouts/Footer";
import CookiePreferencesButton from "@/app/components/CookiePreferencesButton";

export const metadata = {
  title: "Cookie Policy | NeoZaar",
  description:
    "How NeoZaar uses cookies and similar technologies, the purposes and recipients, retention periods, and how to manage or withdraw your consent under the DPDP Act, 2023.",
};

const CATEGORIES = [
  {
    name: "Strictly necessary",
    consent: "Not required (essential)",
    purpose:
      "Authentication, session management, security, CSRF protection and load-balancing. The site cannot function without these.",
    recipients: "NeoZaar",
    retention: "Session to 12 months",
  },
  {
    name: "Analytics",
    consent: "Opt-in",
    purpose:
      "Understand how visitors find and use the site so we can measure and improve it (Google Analytics 4).",
    recipients: "Google LLC",
    retention: "Up to 14 months",
  },
];

export default function Page() {
  return (
    <>
      <Header compact />
      <main className="bg-white min-h-screen w-full mx-auto max-w-[1920px] px-6 sm:px-12 lg:px-24 py-12">
        <section className="max-w-4xl mx-auto text-black">
          <h1 className="text-3xl font-bold mb-4">Cookie Policy</h1>
          <p className="text-sm mb-8">
            Effective Date: 9th September, 2026 &nbsp;·&nbsp; Last Updated: 9th September, 2026
          </p>

          <p className="mb-6">
            This Cookie Policy explains how NeoZaar Technologies Pvt. Ltd. (&ldquo;NeoZaar&rdquo;,
            &ldquo;we&rdquo;) uses cookies and similar technologies on{" "}
            <a href="https://www.neozaar.com" className="text-blue-600 hover:underline">
              www.neozaar.com
            </a>
            , and the choices available to you. It should be read with our{" "}
            <a href="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
            .
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">1. What cookies are</h2>
          <p className="mb-6">
            Cookies are small files placed on your device. Similar technologies (pixels, local
            storage, SDKs) work the same way. We use both first-party items (set by NeoZaar) and
            third-party items (set by the providers named below).
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">2. Categories we use</h2>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b border-gray-200">Category</th>
                  <th className="text-left p-3 border-b border-gray-200">Consent</th>
                  <th className="text-left p-3 border-b border-gray-200">Purpose</th>
                  <th className="text-left p-3 border-b border-gray-200">Recipients</th>
                  <th className="text-left p-3 border-b border-gray-200">Retention</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((c) => (
                  <tr key={c.name} className="align-top">
                    <td className="p-3 border-b border-gray-100 font-semibold">{c.name}</td>
                    <td className="p-3 border-b border-gray-100">{c.consent}</td>
                    <td className="p-3 border-b border-gray-100">{c.purpose}</td>
                    <td className="p-3 border-b border-gray-100">{c.recipients}</td>
                    <td className="p-3 border-b border-gray-100">{c.retention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-xl font-semibold mt-6 mb-3">3. Your consent and how to change it</h2>
          <p className="mb-4">
            Non-necessary cookies are set only after you opt in through our consent banner. Necessary
            cookies are always active because the site cannot run without them.
          </p>
          <p className="mb-4">
            You can review or change your choice at any time &mdash; withdrawing consent is as easy as
            giving it:
          </p>
          <div className="mb-6">
            <CookiePreferencesButton />
          </div>
          <p className="mb-6">
            When you withdraw a category, we stop the relevant tags and remove the associated
            cookies we can reach. You can also block or delete cookies in your browser settings;
            some features may then not work.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">4. Legal basis</h2>
          <p className="mb-6">
            For analytics technologies we rely on your consent under Section 6 of the Digital
            Personal Data Protection Act, 2023. Strictly necessary items are used to provide the
            service you have requested.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">5. Grievances</h2>
          <p className="mb-6">
            Contact our Compliance Officer at{" "}
            <a href="mailto:compliance@neozaar.com" className="text-blue-600 hover:underline">
              compliance@neozaar.com
            </a>
            . If your grievance is not resolved, you may approach the Data Protection Board of India.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-3">6. Changes</h2>
          <p>
            We may update this policy. Material changes to purposes, recipients or retention will be
            reflected in a new consent-notice version, and you will be asked to choose again.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
