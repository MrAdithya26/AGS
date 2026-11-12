import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false, reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: '11mb' } }, // document uploads up to 10 MB
};
export default config;
