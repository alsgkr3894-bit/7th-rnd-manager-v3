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

  test('비동기 로드는 unmount와 오래된 reload 결과를 무시한다', () => {
    expect(hookSource).toContain("from '@/hooks/useMounted'");
    expect(hookSource).toContain('const mountedRef = useMounted();');
    expect(hookSource).toContain('const loadSeqRef = useRef(0);');
    expect(hookSource).toContain('const seq = ++loadSeqRef.current;');
    expect(hookSource).toContain('seq !== loadSeqRef.current');
    expect(hookSource).toContain('let shouldFinishLoading = false;');
    expect(hookSource).toContain('shouldFinishLoading = true;');
    expect(hookSource).toContain(
      'if (finishLoading && shouldFinishLoading && mountedRef.current) setLoading(false);'
    );
  });

  test('드래그 저장 실패는 사용자에게 노출하고 재동기화한다', () => {
    expect(hookSource).toContain("console.error('[useKanbanBoard] handleDrop failed'");
    expect(hookSource).toContain("showToast('칸반 순서 저장 실패', 'error')");
    expect(hookSource).toContain('await refreshNotes()');
  });

  test('체크리스트 연구일지 노트는 칸반 파이프라인에서 제외한다', () => {
    expect(hookSource).toContain("from '@/lib/note/filter'");
    expect(hookSource).toContain("from '@/lib/note/kanban'");
    expect(hookSource).toContain('filterKanbanNotes(await getAllNotesCached())');
    expect(hookSource).toContain('buildKanbanBoardCards(notes, search)');
  });

  test('칸반 페이지는 대표 카드 기준 전체 개수를 표시한다', () => {
    expect(pageSource).toContain('totalBoardCount');
    expect(pageSource).toContain('검색 ${filteredNotes.length}개 / 전체 ${totalBoardCount}개');
    expect(pageSource).toContain('전체 ${totalBoardCount}개');
  });

  test('칸반 페이지는 로드 실패 카드와 재시도 액션을 렌더링한다', () => {
    expect(pageSource).toContain('loadError');
    expect(pageSource).toContain('칸반 데이터를 불러오지 못했습니다');
    expect(pageSource).toContain('retryLoad');
  });

  test('칸반 빈 상태 작성 버튼도 viewer에서 비활성화된다', () => {
    expect(pageSource).toContain("from '@/hooks/useCurrentRole'");
    expect(pageSource).toContain('const canEdit = roleReady && isAdmin');
    expect(pageSource).toContain("if (canEdit) router.push('/note/write')");
    expect(pageSource).toContain('disabled={!canEdit}');
  });
});
