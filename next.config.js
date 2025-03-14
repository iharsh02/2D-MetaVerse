/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add this to prevent server-side errors with media libraries
  experimental: {
    serverComponentsExternalPackages: ['mediasoup-client'],
  }
};

export default nextConfig; 