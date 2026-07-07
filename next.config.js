/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@vercel/blob"],
  async redirects() {
    return [
      { source: "/marketplace", destination: "/discover", permanent: true },
      { source: "/marketplace/:path*", destination: "/discover/:path*", permanent: true },
      { source: "/cart", destination: "/discover", permanent: false },
      { source: "/products/:path*", destination: "/discover", permanent: false },
      { source: "/checkout", destination: "/discover", permanent: false },
      { source: "/shops", destination: "/discover", permanent: true },
      { source: "/shops/:path*", destination: "/discover", permanent: true },
      { source: "/downloads", destination: "/discover?type=RESOURCE", permanent: true },
      { source: "/downloads/:path*", destination: "/discover?type=RESOURCE", permanent: true },
      { source: "/courses", destination: "/discover?type=EVENT", permanent: true },
      { source: "/courses/:path*", destination: "/discover?type=EVENT", permanent: true },
    ];
  },
};

module.exports = nextConfig;

