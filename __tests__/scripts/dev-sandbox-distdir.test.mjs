import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

/**
 * 샌드박스(포트 3002)와 메인 dev 서버(포트 3000)가 같은 .next를 동시에 쓰면 빌드 캐시가
 * 서로 깨질 수 있다(qa:prod가 .next를 지워 dev 서버가 죽은 사고와 같은 종류) — 또한
 * NEXT_PUBLIC_SERVER_SYNC_FORCE_READONLY는 빌드 시점에 번들에 박히는 값이라, 같은 .next를
 * 공유하면 어느 쪽이 마지막에 컴파일했는지에 따라 엉뚱한 서버가 강제 읽기전용 번들을
 * 받을 수도 있다. distDir를 분리해 이 위험을 없앤다.
 */
const nextConfigSrc = readFileSync(resolve('next.config.mjs'), 'utf8');
const sandboxSrc = readFileSync(resolve('scripts/dev-sandbox.mjs'), 'utf8');

describe('샌드박스 빌드 캐시 분리', () => {
  test('next.config.mjs가 NEXT_DIST_DIR 환경변수로 distDir를 오버라이드할 수 있다', () => {
    expect(nextConfigSrc).toContain("distDir: process.env.NEXT_DIST_DIR || '.next'");
  });

  test('dev-sandbox.mjs가 NEXT_DIST_DIR을 .next-sandbox로 설정한다', () => {
    expect(sandboxSrc).toContain("NEXT_DIST_DIR: '.next-sandbox'");
  });
});
