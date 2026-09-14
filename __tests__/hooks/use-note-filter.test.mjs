import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, jest, test } from '@jest/globals';

jest.unstable_mockModule('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const {
  normalizeNoteBrandFilter,
  normalizeNoteFilterText,
  normalizeNoteSortKey,
  normalizeNoteStatusFilter,
} = await import('../../hooks/useNoteFilter.js');

describe('useNoteFilter helpers', () => {
  test('검색어는 문자열과 유한 숫자만 표시 텍스트로 보존한다', () => {
    expect(normalizeNoteFilterText('  메뉴  ')).toBe('  메뉴  ');
    expect(normalizeNoteFilterText(2026)).toBe('2026');
    expect(normalizeNoteFilterText(null)).toBe('');
    expect(normalizeNoteFilterText({ q: 'bad' })).toBe('');
    expect(normalizeNoteFilterText(NaN)).toBe('');
  });

  test('상태 필터는 허용된 노트 상태나 all만 사용한다', () => {
    expect(normalizeNoteStatusFilter('테스트예정')).toBe('테스트예정');
    expect(normalizeNoteStatusFilter(' 테스트 예정 ')).toBe('테스트예정');
    expect(normalizeNoteStatusFilter('출시예정')).toBe('보류');
    expect(normalizeNoteStatusFilter(' 출시예정 ')).toBe('보류');
    expect(normalizeNoteStatusFilter('보고예정')).toBe('보류');
    expect(normalizeNoteStatusFilter('ghost')).toBe('all');
    expect(normalizeNoteStatusFilter(null)).toBe('all');
  });

  test('정렬 키는 기존 정렬 옵션으로 제한한다', () => {
    expect(normalizeNoteSortKey('menuName')).toBe('menuName');
    expect(normalizeNoteSortKey('testDate')).toBe('testDate');
    expect(normalizeNoteSortKey('invalid')).toBe('createdAt');
  });

  test('브랜드 필터는 all 또는 등록된 브랜드 id만 유지한다', () => {
    expect(normalizeNoteBrandFilter('all')).toBe('all');
    expect(normalizeNoteBrandFilter('main')).toBe('main');
    expect(normalizeNoteBrandFilter('ghost', 'main')).toBe('main');
    expect(normalizeNoteBrandFilter(null)).toBe('all');
  });
});

// 회귀: 사이드바 "노트 목록"을 다시 눌러도(같은 라우트라 리마운트 안 됨) 지난 필터가
// 남아 있어 "전체"로 안 열리던 문제 — search/statusFilter/typeFilter는 더 이상
// localStorage에서 복원하지 않고 URL만 정본으로 쓴다. sortBy만 예외적으로 유지.
describe('노트 목록 필터 — URL을 정본으로 쓰고 localStorage 복원을 제거', () => {
  const source = readFileSync(resolve('hooks/useNoteFilter.js'), 'utf8');

  test('search/statusFilter/typeFilter는 마운트 시 localStorage로 폴백하지 않는다', () => {
    expect(source).not.toContain('tryLS(KEYS.NOTE_SEARCH');
    expect(source).not.toContain('tryLS(KEYS.NOTE_STATUS');
    expect(source).not.toContain('tryLS(KEYS.NOTE_TYPE_FILTER');
  });

  test('search/statusFilter/typeFilter는 더 이상 localStorage에 저장하지 않는다', () => {
    expect(source).not.toContain('setLS(KEYS.NOTE_SEARCH');
    expect(source).not.toContain('setLS(KEYS.NOTE_STATUS');
    expect(source).not.toContain('setLS(KEYS.NOTE_TYPE_FILTER');
  });

  test('sortBy는 그대로 localStorage에 유지된다', () => {
    expect(source).toContain("tryLS(KEYS.NOTE_SORT, 'createdAt')");
    expect(source).toContain('setLS(KEYS.NOTE_SORT, safeSortBy)');
  });

  test('URL 조립은 공용 buildNoteListQuery를 쓰고, 같은 라우트 재방문 시 URL→state 역동기화가 있다', () => {
    expect(source).toContain("from '@/lib/note/list-state'");
    expect(source).toContain('buildNoteListQuery(');
    expect(source).toContain('window.location.search');
  });
});
