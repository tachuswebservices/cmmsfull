/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Keep this in sync with next.config.js or remove one of the files to avoid duplication
  allowedDevOrigins: [
    'http://172.20.10.3:3000',
    'http://localhost:3000',
  ],
}

export default nextConfig
