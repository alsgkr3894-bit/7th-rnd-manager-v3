import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const hookSource = readFileSync(resolve('hooks/useKanbanBoard.js'), 'utf8');
const pageSource = readFileSync(resolve('app/note/board/page.jsx'), 'utf8');

describe('kanban board error visibility guards', () => {
  test('초기 로드 실패를 console-only로 처리하지 않는다', () => {
    expect(hookSource).not.toContain('.catch(console.error)');
    expect(hookSource).toContain('setLoadError(message)');
    expect(hookSource).toContain('showToast(`칸반 데이터 로드 실패: ${message}`');
  });

  test('드래그 저장 실패는 사용자에게 노출하고 재동기화한다', () => {
    expect(hookSource).toContain("console.error('[useKanbanBoard] handleDrop failed'");
    expect(hookSource).toContain("showToast('칸반 순서 저장 실패', 'error')");
    expect(hookSource).toContain('await refreshNotes()');
  });

  test('칸반 페이지는 로드 실패 카드와 재시도 액션을 렌더링한다', () => {
    expect(pageSource).toContain('loadError');
    expect(pageSource).toContain('칸반 데이터를 불러오지 못했습니다');
    expect(pageSource).toContain('retryLoad');
  });
});
