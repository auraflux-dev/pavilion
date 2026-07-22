/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    // HTTPS third-parties (Wix OAuth, Square, PayPal, POWR, Google) are allowed;
    // frame-ancestors/object-src still block clickjacking and plugin vectors.
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self' https:",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https:",
      'upgrade-insecure-requests',
    ].join('; '),
  },
]

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'static.wixstatic.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'shmspto.org' }],
        destination: 'https://www.shmspto.org/:path*',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/_api/:path*',
        destination: '/api/wix-auth-proxy/_api/:path*',
      },
      {
        source: '/__auth/:path*',
        destination: '/api/wix-auth-proxy/__auth/:path*',
      },
      {
        source: '/_serverless/:path*',
        destination: '/api/wix-auth-proxy/_serverless/:path*',
      },
      {
        source: '/_partials/:path*',
        destination: '/api/wix-auth-proxy/_partials/:path*',
      },
    ]
  },
}

module.exports = nextConfig
