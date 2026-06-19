/**
 * 모바일·좁은 화면 재검사 — 구조 테스트
 *
 * 실제 Playwright 실행(qa:mobile)과 달리 정적 코드·CSS로 검증 가능한 것들을 확인.
 * - scripts/mobile-qa.mjs 존재 및 390px viewport 설정
 * - package.json에 qa:mobile 스크립트 등록
 * - overlay.css에 540px 반응형 존재 (모달 너비 고정 문제 해소)
 * - features.css 768px 블록에 page-head-row 반응형 존재 (가로 스크롤 방지)
 * - features.css에 480px 블록에 stat-value 축소 존재
 * - table-wrap overflow-x: auto 존재 (테이블 가로 스크롤 보장)
 * - stat-row 768px에서 1fr 1fr (2열) 로 전환 확인
 */
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

function src(path) {
  return readFileSync(resolve(path), 'utf-8');
}

// ── scripts/mobile-qa.mjs ────────────────────────────────────────────────────

describe('mobile-qa 스크립트', () => {
  test('scripts/mobile-qa.mjs 파일이 존재한다', () => {
    expect(existsSync(resolve('scripts/mobile-qa.mjs'))).toBe(true);
  });

  test('VIEWPORT width가 420px 이하(모바일 기준)이다', () => {
    const s = src('scripts/mobile-qa.mjs');
    // "width: 390" 또는 "width: 375" 등 420 이하 패턴
    const match = s.match(/width:\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match[1])).toBeLessThanOrEqual(420);
  });

  test('package.json에 qa:mobile 스크립트가 등록되어 있다', () => {
    const pkg = src('package.json');
    expect(pkg).toContain('"qa:mobile"');
    expect(pkg).toContain('mobile-qa.mjs');
  });
});

// ── overlay.css 반응형 ────────────────────────────────────────────────────────

describe('overlay.css 모바일 반응형', () => {
  test('540px 이하 미디어 쿼리가 존재한다', () => {
    const s = src('app/styles/components/overlay.css');
    expect(s).toContain('@media (max-width: 540px)');
  });

  test('540px 쿼리 안에 .modal width 재정의가 있다', () => {
    const s = src('app/styles/components/overlay.css');
    const idx = s.indexOf('@media (max-width: 540px)');
    const block = s.slice(idx, idx + 300);
    expect(block).toContain('.modal');
    expect(block).toContain('100vw');
  });
});

// ── features.css 반응형 ───────────────────────────────────────────────────────

describe('features.css 모바일 반응형', () => {
  test('768px 블록에 page-head-row 세로쌓기가 있다 (가로 스크롤 방지)', () => {
    const s = src('app/styles/features.css');
    expect(s).toContain('page-head-row');
    // flex-direction: column이 768px 쿼리 안에 있어야 함
    const idx768 = s.indexOf('@media (max-width: 768px)');
    const block = s.slice(idx768, idx768 + 1500);
    expect(block).toContain('page-head-row');
    expect(block).toContain('flex-direction: column');
  });

  test('768px 블록에 page-actions width:100% 가 있다', () => {
    const s = src('app/styles/features.css');
    const idx768 = s.indexOf('@media (max-width: 768px)');
    const block = s.slice(idx768, idx768 + 1500);
    expect(block).toContain('page-actions');
    expect(block).toContain('width: 100%');
  });

  test('480px 블록에 stat-value 폰트 축소가 있다', () => {
    const s = src('app/styles/features.css');
    const idx = s.indexOf('@media (max-width: 480px)');
    expect(idx).toBeGreaterThan(-1);
    const block = s.slice(idx, idx + 300);
    expect(block).toContain('stat-value');
    expect(block).toContain('font-size');
  });

  test('768px 블록에 stat-row 2열 전환이 있다', () => {
    const s = src('app/styles/features.css');
    const idx768 = s.indexOf('@media (max-width: 768px)');
    const block = s.slice(idx768, idx768 + 1500);
    expect(block).toContain('stat-row');
    expect(block).toContain('1fr 1fr');
  });
});

// ── table-wrap overflow ───────────────────────────────────────────────────────

describe('테이블 가로 스크롤 처리', () => {
  test('features.css에 .table-wrap overflow-x: auto 가 있다', () => {
    const s = src('app/styles/features.css');
    const idx = s.indexOf('.table-wrap');
    const block = s.slice(idx, idx + 200);
    expect(block).toContain('overflow-x: auto');
  });
});

// ── 식자재 탭 오버플로 ─────────────────────────────────────────────────────────

describe('식자재 관리 탭 컨테이너', () => {
  test('탭 컨테이너에 overflowX: auto 가 있다 (390px 탭 잘림 방지)', () => {
    const s = src('app/ingredient/manage/page.jsx');
    // 탭 6개를 담는 flex 컨테이너에 overflowX 처리가 있어야 함
    expect(s).toContain("overflowX: 'auto'");
  });
});
