import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('app/note/_NoteContent.jsx'), 'utf8');

describe('note delete undo guards', () => {
  test('삭제 실행취소는 restoreRecord 실패를 숨기지 않는다', () => {
    expect(source).not.toContain("restoreRecord('menu_dev_notes', rec).catch(() => {})");
    expect(source).toContain('restoreDeletedNotes');
    expect(source).toContain("console.error('[NoteContent] undo delete failed'");
    expect(source).toContain("showToast('실행취소 실패: ' + err.message, 'error')");
  });

  test('삭제 직후 UI state는 삭제된 하위 노트까지 제거한다', () => {
    expect(source).toContain('const removedIds = new Set((removed || []).map(rec => rec.id))');
    expect(source).toContain('setNotes(prev => prev.filter(n => !removedIds.has(n.id)))');
  });
});
