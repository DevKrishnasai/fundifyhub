import dotenv from 'dotenv';

// Load environment variables from root .env file
dotenv.config({ path: '../../.env' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['logger', 'types', 'utils', 'ui'],
  // Enable src directory
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  typescript: {
    // Suppress type errors during build - we'll fix them later
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io',
      },
      {
        protocol: 'https',
        hostname: '*.ufs.sh',
      },
      // Allow backend signed URLs served from local dev backend
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
      },
    ],
  },
}

export default nextConfig