"use client";

import Head from "next/head";
import { SEO_DATA } from "../config/seo.config";

export default function SEO({ pageKey, customMeta = {} }) {
  const pageMeta = SEO_DATA.pages[pageKey] || {};
  const defaultMeta = SEO_DATA.default;

  const title = customMeta.title || pageMeta.title || defaultMeta.title;
  const description = customMeta.description || pageMeta.description || defaultMeta.description;
  const keywords = customMeta.keywords || defaultMeta.keywords;
  const canonical = customMeta.canonical || pageMeta.canonical || defaultMeta.url;
  const image = customMeta.image || defaultMeta.image;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
}
