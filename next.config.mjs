/** @type {import('next').NextConfig} */
const nextConfig = {
  // 샌드박스(scripts/dev-sandbox.mjs)가 메인 dev 서버(포트 3000)와 별도 빌드 디렉터리를
  // 쓰게 한다 — 같은 .next를 동시에 쓰면 캐시가 서로 깨질 수 있다(qa:prod가 .next를 지워
  // 돌아가던 dev 서버가 죽은 사고와 같은 종류의 문제).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Windows/Next persistent cache can leave manifests pointing at missing chunks.
  webpack: config => {
    config.cache = false;
    return config;
  },
};
export default nextConfig;
