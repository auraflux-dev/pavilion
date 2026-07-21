/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'static.wixstatic.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async redirects() {
    return [
      // Canonical host: apex → www (keeps OAuth callbacks + canonical URLs on one origin)
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
      // After DNS cutover, Wix login still expects /_api and /__auth on www.
      // Proxy those paths to Wix (via Node route) so OAuth works on Vercel.
      {
        source: '/_api/:path*',
        destination: '/api/wix-auth-proxy/_api/:path*',
      },
      {
        source: '/__auth/:path*',
        destination: '/api/wix-auth-proxy/__auth/:path*',
      },
    ]
  },
}

module.exports = nextConfig
