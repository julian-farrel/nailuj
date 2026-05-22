/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly set the distDir to avoid Vercel modifyConfig undefined path errors
  distDir: ".next",
  // Standard recommended Next.js config
  reactStrictMode: true,
  // Standalone output is often required for modern Vercel/Docker builds
  output: "standalone",
};

module.exports = nextConfig;
