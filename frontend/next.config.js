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
}

module.exports = nextConfig
