/**
 * scripts/dev-sandbox.mjs — 격리된 브라우저 검증용 dev 서버(기본 포트 3002).
 *
 * lib/db/sync-mode.js는 localhost를 무조건 "운영 PC"(authoritative, 쓰기 동기화 켜짐)로
 * 판정한다 — 배포 형태상 정확한 기본값이지만, 검증/샌드박스 목적으로 두 번째 localhost
 * dev 서버를 띄우면 같은 규칙이 적용돼 실서버 Postgres에 그대로 쓰기 동기화를 해버린다.
 * 2026-09-17에 이 안전장치 없이 verify-preview를 돌리다 실데이터(엣지 원가·영양성분·
 * 메뉴마스터 145행)를 덮어쓴 사고가 있었다(백업으로 복구함).
 *
 * 이 스크립트는 두 겹으로 막는다:
 *   NEXT_PUBLIC_SERVER_SYNC_FORCE_READONLY=1 — 브라우저 쪽 sync-mode를 강제 READONLY로.
 *   RND_SANDBOX_REJECT_WRITES=1              — 서버 API(/api/db/store-rows POST)가
 *                                               자체적으로 쓰기 요청을 403으로 거부.
 * 브라우저 쪽이 어떤 이유로든(예: 다른 override) 뚫려도 서버 쪽에서 한 번 더 막는다.
 */
import { spawn } from 'node:child_process';

const portIndex = process.argv.indexOf('--port');
const port = portIndex !== -1 ? process.argv[portIndex + 1] : '3002';

const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'dev', '-p', port], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_SERVER_SYNC_FORCE_READONLY: '1',
    RND_SANDBOX_REJECT_WRITES: '1',
  },
});

child.on('exit', code => process.exit(code ?? 0));
