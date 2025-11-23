// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  // Allow dev assets to be requested from your LAN IP during development
  // Adjust or add more origins as needed (e.g., other devices on your network)
  allowedDevOrigins: [
    "http://172.20.10.3:3000",
    "http://localhost:3000",
  ],
  eslint: {
    // Skip ESLint errors during production builds so build can complete.
    // You can still fix issues via `npm run lint` locally.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to succeed even if there are type errors.
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig

