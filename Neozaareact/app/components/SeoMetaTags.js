// components/SeoMetaTags.js
export default function SeoMetaTags({ seoData }) {
  // Handle case when seoData might be undefined
  if (!seoData) {
    return (
      <>
        <title>Product Page</title>
        <meta name="description" content="Default product description" />
      </>
    );
  }

  const {
    meta_title,
    meta_description,
    meta_keywords,
    canonical_url,
    og_title,
    og_description,
    og_image,
    twitter_title,
    twitter_description,
    twitter_image,
    is_follow = 1,
    is_index = 1,
    schema_markup
  } = seoData;

  // Determine robots meta tag
  const robotsContent = [
    is_index === 1 ? 'index' : 'noindex',
    is_follow === 1 ? 'follow' : 'nofollow'
  ].join(', ');

  return (
    <>
      {/* Basic Meta Tags */}
      <title>{meta_title}</title>
      <meta name="description" content={meta_description} />
      <meta name="keywords" content={meta_keywords} />
      <link rel="canonical" href={canonical_url} />
      <meta name="robots" content={robotsContent} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={og_title} />
      <meta property="og:description" content={og_description} />
      <meta property="og:image" content={og_image} />
      <meta property="og:type" content="product" />
      <meta property="og:url" content={canonical_url} />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={twitter_title} />
      <meta name="twitter:description" content={twitter_description} />
      <meta name="twitter:image" content={twitter_image} />

      {/* JSON-LD Schema Markup */}
      {schema_markup && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schema_markup }}
        />
      )}
    </>
  );
}