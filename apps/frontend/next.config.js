import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from monorepo root
config({ path: resolve(process.cwd(), '../../.env') })

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['logger', 'types', 'utils', 'ui'],
  experimental: {
    externalDir: true,
  },
  // Enable src directory
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  // Automatically detect and use src directory
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  }
}

export default nextConfig