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
    expect(normalizeNoteStatusFilter('보고예정')).toBe('보고예정');
    expect(normalizeNoteStatusFilter(' 보고예정 ')).toBe('보고예정');
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
