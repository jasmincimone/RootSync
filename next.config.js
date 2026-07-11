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
      { source: "/rootsyncai", destination: "/rootsense-ai", permanent: true },
      { source: "/rootsyncai/:path*", destination: "/rootsense-ai/:path*", permanent: true },
    ];
  },
};

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(nextConfig, {
  // Used for source-map upload during CI/Vercel builds (optional until you set these).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Tunnel through our domain so ad blockers don't drop error reports.
  tunnelRoute: "/monitoring-tunnel",
  disableLogger: true,
  automaticVercelMonitors: true,
});
