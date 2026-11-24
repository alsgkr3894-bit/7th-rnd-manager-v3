/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16 개발 서버가 저장소 루트에 AGENTS.md를 자동 생성하지 않게 한다.
  agentRules: false,
  // 샌드박스(scripts/dev-sandbox.mjs)가 메인 dev 서버(포트 3000)와 별도 빌드 디렉터리를
  // 쓰게 한다 — 같은 .next를 동시에 쓰면 캐시가 서로 깨질 수 있다(qa:prod가 .next를 지워
  // 돌아가던 dev 서버가 죽은 사고와 같은 종류의 문제).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "base-uri 'self'; frame-ancestors 'none'; object-src 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
          },
        ],
      },
    ];
  },
};
export default nextConfig;
