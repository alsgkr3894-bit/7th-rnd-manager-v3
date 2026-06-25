import { describe, expect, test } from '@jest/globals';

const { normalizeNoteView, shouldShowAllNoteRows } = await import('../../lib/note/list-state.js');

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
});
