/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // In production, nginx handles the proxy
};

module.exports = nextConfig;
