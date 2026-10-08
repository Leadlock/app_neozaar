import pkg from 'next-pwa';

const withPWA = pkg.default || pkg;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // A production build must not overwrite chunks used by a running dev server.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  images: {
    unoptimized: true,
    domains: ['www.neozaar.com', 'app.neozaar.skilladders.com', 'neoblob.blob.core.windows.net', 'neozaarassets.blob.core.windows.net'],
  },
  trailingSlash: true,
  reactStrictMode: true,

  skipTrailingSlashRedirect: true,

  // Clean URLs for the two embedded static calculator apps living in /public.
  // These serve the standalone index.html of each app without exposing the
  // folder name or the .html extension.
  async rewrites() {
    return [
      { source: '/cloud-landing-zone', destination: '/cloud-landing-zone/index.html' },
      { source: '/cloud-landing-zone/', destination: '/cloud-landing-zone/index.html' },
      { source: '/cloud-pricing', destination: '/cloud-pricing/index.html' },
      { source: '/cloud-pricing/', destination: '/cloud-pricing/index.html' },
    ];
  },

  async headers() {
    return [
      {
        // HTML pages — never cache at CDN, always revalidate
        source: '/:path((?!_next/static|_next/image|favicon.ico|images|icons).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Surrogate-Control', value: 'no-store' },
        ],
      },
      {
        // Next.js hashed static assets — safe to cache long-term in production only.
        // In dev mode chunk filenames don't change between edits, so this header
        // must not apply there or the browser never sees new code after a save.
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'production'
              ? 'public, max-age=31536000, immutable'
              : 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};

// ✅ PWA - disabled in development to prevent caching issues
export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,

  // Disable PWA in development
  disable: process.env.NODE_ENV === 'development',

  buildExcludes: [/middleware-manifest\.json$/],

  runtimeCaching: [
    {
      // HTML pages — always fetch fresh from network
      urlPattern: /^https:\/\/www\.neozaar\.com\/(?!_next\/static|_next\/image).*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60, // 1 hour fallback
        },
        networkTimeoutSeconds: 5,
      },
    },
    {
      // Next.js hashed assets (_next/static/) — safe to cache, filenames change on rebuild
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days (content-hashed)
        },
      },
    },
    {
      urlPattern: /\.(png|jpg|jpeg|svg|webp|ico)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /\/api\/.*$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60,
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
})(nextConfig);
