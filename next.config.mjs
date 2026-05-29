/** @type {import('next').NextConfig} */
const nextConfig = {
  // HMR 캐시 충돌 방지 — 개발 중 다수 파일 동시 변경 시 청크 불일치 억제
  webpack: (config, { dev }) => {
    if (dev) config.cache = false;
    return config;
  },

};
export default nextConfig;
