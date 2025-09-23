/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['logger', 'types', 'utils', 'ui'],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;