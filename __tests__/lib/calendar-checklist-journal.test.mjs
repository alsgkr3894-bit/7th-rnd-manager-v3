import { describe, expect, test } from '@jest/globals';
import {
  CHECKLIST_JOURNAL_BLOCK_END,
  CHECKLIST_JOURNAL_BLOCK_START,
  buildChecklistJournalBlock,
  mergeChecklistJournalContent,
} from '../../app/note/calendar/checklistJournalMerge.js';

describe('calendar checklist journal merge', () => {
  test('completed checklist items are merged into the research journal without losing manual text', () => {
    const merged = mergeChecklistJournalContent('수동 연구 메모', [
      { id: '1', text: '샘플 확인', done: true },
      { id: '2', text: '미완료 항목', done: false },
    ]);

    expect(merged).toContain('수동 연구 메모');
    expect(merged).toContain(CHECKLIST_JOURNAL_BLOCK_START);
    expect(merged).toContain('- 샘플 확인');
    expect(merged).not.toContain('미완료 항목');
  });

  test('updating checklist items replaces only the checklist block', () => {
    const first = mergeChecklistJournalContent('추가 일지', [
      { id: '1', text: '기존 완료', done: true },
    ]);
    const second = mergeChecklistJournalContent(first, [{ id: '2', text: '새 완료', done: true }]);

    expect(second).toContain('추가 일지');
    expect(second).toContain('- 새 완료');
    expect(second).not.toContain('- 기존 완료');
    expect(second.split(CHECKLIST_JOURNAL_BLOCK_START)).toHaveLength(2);
  });

  test('removing all completed items keeps the manually added journal content', () => {
    const existing = [
      '오늘 추가 작성',
      buildChecklistJournalBlock([{ text: '완료', done: true }]),
    ].join('\n\n');

    expect(mergeChecklistJournalContent(existing, [])).toBe('오늘 추가 작성');
    expect(mergeChecklistJournalContent(existing, [])).not.toContain(CHECKLIST_JOURNAL_BLOCK_END);
  });
});
