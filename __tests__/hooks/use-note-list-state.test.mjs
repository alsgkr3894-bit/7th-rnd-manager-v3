import { describe, expect, test } from '@jest/globals';

const { normalizeNoteView, shouldShowAllNoteRows, buildNoteListQuery } =
  await import('../../lib/note/list-state.js');

describe('useNoteListState helpers', () => {
  test('노트 보기 모드는 허용된 값만 유지한다', () => {
    expect(normalizeNoteView('card')).toBe('card');
    expect(normalizeNoteView('table')).toBe('table');
    expect(normalizeNoteView('grid')).toBe('card');
    expect(normalizeNoteView(null)).toBe('card');
  });

  test('상태 전체 필터는 노트 목록을 페이지 제한 없이 표시한다', () => {
    expect(shouldShowAllNoteRows('all')).toBe(true);
    expect(shouldShowAllNoteRows('출시')).toBe(false);
    expect(shouldShowAllNoteRows('보류')).toBe(false);
  });

  test('buildNoteListQuery — 기본값이면 빈 문자열, 아니면 쿼리스트링', () => {
    expect(buildNoteListQuery({ search: '', statusFilter: 'all', typeFilter: 'all' })).toBe('');
    expect(buildNoteListQuery()).toBe('');
    expect(buildNoteListQuery({ search: '피자', statusFilter: 'all', typeFilter: 'all' })).toBe(
      'q=%ED%94%BC%EC%9E%90'
    );
    expect(buildNoteListQuery({ search: '', statusFilter: '보류', typeFilter: 'all' })).toBe(
      'status=%EB%B3%B4%EB%A5%98'
    );
    expect(buildNoteListQuery({ search: '', statusFilter: 'all', typeFilter: '샘플테스트' })).toBe(
      'type=%EC%83%98%ED%94%8C%ED%85%8C%EC%8A%A4%ED%8A%B8'
    );
    expect(
      buildNoteListQuery({ search: 'a', statusFilter: '보류', typeFilter: '샘플테스트' })
    ).toBe('q=a&status=%EB%B3%B4%EB%A5%98&type=%EC%83%98%ED%94%8C%ED%85%8C%EC%8A%A4%ED%8A%B8');
  });
});
