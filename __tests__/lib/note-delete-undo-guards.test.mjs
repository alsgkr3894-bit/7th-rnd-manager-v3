import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const controllerSource = readFileSync(resolve('hooks/useNoteContentController.js'), 'utf8');
const actionHookSource = readFileSync(resolve('hooks/useNoteItemActions.js'), 'utf8');

describe('note delete undo guards', () => {
  test('삭제 실행취소는 restoreRecord 실패를 숨기지 않는다', () => {
    expect(controllerSource).toContain(
      "import { useNoteItemActions } from '@/hooks/useNoteItemActions'"
    );
    expect(actionHookSource).not.toContain("restoreRecord('menu_dev_notes', rec).catch(() => {})");
    expect(actionHookSource).toContain('restoreDeletedNotes');
    expect(actionHookSource).toContain('invalidateNotesCache();');
    expect(actionHookSource).toContain("console.error('[useNoteItemActions] undo delete failed'");
    expect(actionHookSource).toContain("showToast('실행취소 실패: ' + err.message, 'error')");
  });

  test('삭제 직후 UI state는 삭제된 하위 노트까지 제거한다', () => {
    expect(actionHookSource).toContain(
      'const removedIds = new Set((removed || []).map(rec => rec.id))'
    );
    expect(actionHookSource).toContain('setNotes(prev => prev.filter(n => !removedIds.has(n.id)))');
  });
});
