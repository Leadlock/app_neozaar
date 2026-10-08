/** @type {import('next-seo').DefaultSeoProps} */
const defaultSEOConfig = {
  title: "Default Title",
  titleTemplate: "%s | Your Site Name",
  defaultTitle: "Your Site Name",
  description: "Default description of your site",
  canonical: "https://yoursite.com",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://yoursite.com",
    siteName: "Your Site Name",
    images: [
      {
        url: "https://yoursite.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Your Site OG Image",
      },
    ],
  },
  twitter: {
    handle: "@yourhandle",
    site: "@yoursite",
    cardType: "summary_large_image",
  },
};

module.exports = defaultSEOConfig;