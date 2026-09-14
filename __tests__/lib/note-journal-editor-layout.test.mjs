import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const editorSource = readFileSync(resolve('app/note/journal/_JournalEntryEditor.jsx'), 'utf8');
const pageSource = readFileSync(resolve('app/note/journal/page.jsx'), 'utf8');
const cardSource = readFileSync(resolve('components/note/WebJournalCard.jsx'), 'utf8');

// 회귀: 연구일지 작성 폼이 2열 그리드 + sticky aside였다 — 좁은 화면에서 입력칸이
// 작아지고, "보고서 저장" 버튼이 스크롤하면 화면 밖으로 사라졌다. 1열 세로 배치 +
// 페이지 하단 고정 저장바(StickySaveBar)로 바꿨다.
describe('연구일지 작성 UI — 1열 세로 + 하단 고정 저장바', () => {
  test('작성 폼은 더 이상 2열 grid나 자체 sticky aside를 쓰지 않는다', () => {
    expect(editorSource).not.toContain('gridTemplateColumns');
    expect(editorSource).not.toContain("position: 'sticky'");
  });

  test('입력칸이 커지고(rows=6), 카드 안 저장 버튼은 사라졌다(하단 바로 이동)', () => {
    expect(editorSource).toContain('rows = 6');
    expect(editorSource).toContain('일정 불러오기');
    expect(editorSource).not.toContain('보고서 저장');
    expect(editorSource).not.toContain('onSave');
  });

  test('사진 첨부 섹션은 그대로 재사용한다', () => {
    expect(editorSource).toContain(
      "import { NotePhotoSection } from '@/app/note/_NotePhotoSection'"
    );
    expect(editorSource).toContain("onChange={value => onChange('photos', value)}");
  });

  test('페이지가 하단 고정 저장바와 사진 라이트박스를 사용한다', () => {
    expect(pageSource).toContain("from '@/components/ui/StickySaveBar'");
    expect(pageSource).toContain('<StickySaveBar');
    expect(pageSource).toContain("from '@/hooks/useKeyboardSave'");
    expect(pageSource).toContain('useKeyboardSave(saveJournalEntry)');
    expect(pageSource).toContain('cancelLabel="되돌리기"');
    expect(pageSource).toContain('saveLabel="보고서 저장"');
    expect(pageSource).toContain("from '@/app/note/_NotePhotoLightbox'");
    expect(pageSource).toContain('<NotePhotoLightbox');
    expect(pageSource).toContain('onPhotoClick={setPreviewPhoto}');
  });

  test('PDF 출력은 공용 함수(openJournalPdf)로 헤더·저장바에서 함께 쓴다', () => {
    expect(pageSource).toContain('function openJournalPdf()');
    expect(pageSource).toContain('onClick={openJournalPdf}');
    expect(pageSource).toContain('buildJournalPrintHtml(printRangeTitle, printPeriodNotes');
  });

  test('저장 안 된 변경사항 여부(journalDirty)를 계산해 저장바 상태에 반영한다', () => {
    expect(pageSource).toContain('const journalDirty = useMemo(');
    expect(pageSource).toContain('canSave={canEdit && (journalDirty || !journalEntry)}');
    expect(pageSource).toContain('function revertJournalForm()');
  });

  test('일지 카드 사진 클릭 시 확대 미리보기를 연다', () => {
    expect(cardSource).toContain('onPhotoClick');
    expect(cardSource).toContain('onClick={() => onPhotoClick?.(p)}');
  });
});
