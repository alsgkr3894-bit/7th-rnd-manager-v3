/** @type {import('next').NextConfig} */
const nextConfig = {
  // Windows/Next persistent cache can leave manifests pointing at missing chunks.
  webpack: config => {
    config.cache = false;
    return config;
  },
};
export default nextConfig;
