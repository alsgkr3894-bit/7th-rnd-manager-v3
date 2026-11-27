/**
 * 콘텐츠 보안 정책 — 이 사이트가 실제로 쓰는 출처만 연다. 바깥 스크립트·연결·폼 전송은 막힌다.
 * - 인라인 스크립트·스타일은 허용한다. 인쇄 창(document.write)과 테마 적용 스크립트가 쓰고,
 *   nonce 방식은 모든 화면을 요청마다 다시 그려야 해서 쓰지 않는다.
 * - api.ipify.org: 계정 화면의 [IP 조회] 버튼
 * - 개발 서버만 eval과 WebSocket(HMR)을 더 연다
 */
function contentSecurityPolicy(isDev) {
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", 'data:', 'blob:', 'https://api.ipify.org', ...(isDev ? ['ws:'] : [])],
    'worker-src': ["'self'", 'blob:'],
    'frame-src': ["'self'", 'blob:'],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
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
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy(process.env.NODE_ENV === 'development'),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
          },
        ],
      },
      // 업무 데이터와 로그인 응답은 브라우저·중간 장비에 남기지 않는다
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};
export default nextConfig;
