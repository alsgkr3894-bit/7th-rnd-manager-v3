import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

// 시장조사 페이지는 상세 모달·사진 라이트박스·그룹핑/검색 헬퍼가 한 파일(762줄)에
// 인라인돼 있었다. 역할별로 나누고 page는 목록·작성 폼 조립만 담당한다.
describe('시장조사 페이지 파일 분리', () => {
  test('page.jsx는 550줄을 넘지 않고 분리된 구현을 다시 품지 않는다', () => {
    const page = src('app/note/market/page.jsx');
    expect(page.split('\n').length).toBeLessThanOrEqual(550);
    expect(page).not.toContain('function MarketDetailModal');
    expect(page).not.toContain('function PhotoLightbox');
    expect(page).not.toContain('function groupByCompetitor');
    expect(page).not.toContain('function includesQuery');
  });

  test('그룹핑·검색·폼 기본값은 marketUtils.js가 갖는다', () => {
    const utils = src('app/note/market/marketUtils.js');
    expect(utils).toContain('export function groupByCompetitor');
    expect(utils).toContain('export function colorForCompetitor');
    expect(utils).toContain('export function includesQuery');
    expect(utils).toContain('export function hasFormContent');
    expect(utils).toContain('export const EMPTY_FORM');
  });

  test('상세 모달·라이트박스·라벨 필드는 각자 파일이다', () => {
    expect(src('app/note/market/_MarketDetailModal.jsx')).toContain(
      'export function MarketDetailModal'
    );
    expect(src('app/note/market/_MarketPhotoLightbox.jsx')).toContain(
      'export function MarketPhotoLightbox'
    );
    const fields = src('app/note/market/_MarketFields.jsx');
    expect(fields).toContain('export function Field');
    expect(fields).toContain('export function DetailField');
    // 라벨 필드는 작성 폼(page)과 상세 모달이 함께 쓴다 — 각자 복제하지 않는다.
    expect(src('app/note/market/page.jsx')).toContain("from './_MarketFields'");
    expect(src('app/note/market/_MarketDetailModal.jsx')).toContain("from './_MarketFields'");
  });

  test('분리된 파일은 각자 150줄을 넘지 않는다', () => {
    const files = [
      'app/note/market/marketUtils.js',
      'app/note/market/_MarketDetailModal.jsx',
      'app/note/market/_MarketPhotoLightbox.jsx',
      'app/note/market/_MarketFields.jsx',
    ];
    for (const file of files) {
      expect(src(file).split('\n').length).toBeLessThanOrEqual(150);
    }
  });
});
