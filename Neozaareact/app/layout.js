import "./globals.css";
import { Inter, Roboto_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { seoconfig } from "./seoconfig";
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import ConsoleCleaner from '@/components/ConsoleCleaner';
import CookieConsent from '@/app/components/CookieConsent';
import ConsentSync from '@/app/components/ConsentSync';
import ConsentModeBridge from '@/app/components/ConsentModeBridge';
import Analytics4 from '@/app/components/Analytics4';
import MarketingTracker from '@/app/components/MarketingTracker';
import { INLINE_CONSENT_DEFAULT } from '@/app/lib/consentMode';
import WhatsAppButton from '@/app/components/WhatsAppButton';
import ProposalStudioButton from '@/app/components/ProposalStudioButton';
import VendorTicker from '@/app/components/VendorTicker/VendorTicker';
import NativeWrapper from '@/components/NativeWrapper';

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.neozaar.com'),
  title: seoconfig.default.title,
  description: seoconfig.default.description,
  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NeoZaar",
  },

  openGraph: {
    url: seoconfig.default.url,
    siteName: "NeoZaar",
    images: [
      {
        url: seoconfig.default.image,
        width: 1200,
        height: 630,
        alt: "NeoZaar Cloud Marketplace",
      },
    ],
    type: "website",
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: seoconfig.default.title,
    description: seoconfig.default.description,
    images: [seoconfig.default.image],
  },

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: "/brand-log/neozaardefault.jpg",
    apple: [
      { url: "/brand-log/neozaardefault.jpg", sizes: "152x152", type: "image/jpeg" },
      { url: "/brand-log/neozaardefault.jpg", sizes: "180x180", type: "image/jpeg" },
      { url: "/brand-log/neozaardefault.jpg", sizes: "192x192", type: "image/jpeg" },
    ],
  },

  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <head>
        {/* ✅ Keep ONLY valid meta + links */}

        {/* PWA meta */}
        <meta name="application-name" content="NeoZaar" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NeoZaar" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="theme-color" content="#000000" />
        {/* Preconnect — GA4 (loads only after analytics consent) */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />

        {/* Native app detection — adds .is-native-app / .is-ios classes only inside the Capacitor app */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
  try {
    var ua = navigator.userAgent || '';
    if (ua.indexOf('NeoZaarMobileApp') > -1 || window.Capacitor) {
      document.documentElement.classList.add('is-native-app');
      if (/iPad|iPhone|iPod/.test(ua)) document.documentElement.classList.add('is-ios');
    }
  } catch (e) {}
})();`,
          }}
        />
      </head>
    <body className="antialiased" suppressHydrationWarning>
      {/* Google Consent Mode v2 — default state, set before any Google tag loads (DPDPA prior blocking) */}
      <script dangerouslySetInnerHTML={{ __html: INLINE_CONSENT_DEFAULT }} />

        <ConsoleCleaner />

        <NativeWrapper>{children}</NativeWrapper>

        <VendorTicker />
        {/* <PWAInstallPrompt /> — temporarily hidden */}
        <ConsentSync />
        <ConsentModeBridge />
        <CookieConsent />
        <WhatsAppButton />
        <ProposalStudioButton />

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#333",
              color: "#fff",
            },
          }}
        />

        {/* Google Analytics 4 — injected only after analytics consent (see Analytics4.js) */}
        <Analytics4 />

        {/* Marketing visitor/session tracking for the backend Marketing module — injected only after analytics consent (see MarketingTracker.js) */}
        <MarketingTracker />
      </body>
    </html>
  );
}