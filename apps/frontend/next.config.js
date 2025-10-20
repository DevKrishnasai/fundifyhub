/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['logger', 'types', 'utils', 'ui'],
  experimental: {
    externalDir: true,
  },
  // Enable src directory
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  // Automatically detect and use src directory
}

export default nextConfig