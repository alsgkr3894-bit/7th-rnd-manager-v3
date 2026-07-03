import { buildJournalPrintHtml } from '../../lib/note/journal-print.js';
import { JOURNAL_NOTE_TYPE } from '../../lib/note/constants.js';
import { downloadDateStamp } from '../../lib/download.js';

describe('journal PDF print helpers', () => {
  test('연구일지 타입은 오늘 한 일 보고서 형식으로 출력한다', () => {
    const html = buildJournalPrintHtml('2026-07-03 (금)', [
      {
        title: '2026-07-03 연구일지',
        noteType: JOURNAL_NOTE_TYPE,
        status: '테스트',
        category: '기타',
        testContent: '오늘 작업',
        materials: '회의 및 보고 일정',
        tasteEval: '시식 결과',
        improvements: '특이사항 메모',
        nextAction: '다음 할 일 메모',
      },
    ]);

    expect(html).toContain(`R&amp;D 연구일지 2026-07-03 (금)_${downloadDateStamp()}.pdf`);
    expect(html).toContain('오늘 한 일 보고서');
    expect(html).toContain('작성일');
    expect(html).toContain('보고 건수');
    expect(html).toContain('문서 구분');
    expect(html).toContain('오늘 한 일');
    expect(html).toContain('일정 내용');
    expect(html).toContain('테스트/시식 결과');
    expect(html).toContain('특이사항');
    expect(html).toContain('다음 할 일');
    expect(html).not.toContain('핵심 테스트 내용');
    expect(html).not.toContain('사용 재료');
    expect(html).not.toContain('다음 액션');
  });

  test('일반 노트는 기존 PDF 라벨을 유지한다', () => {
    const html = buildJournalPrintHtml('2026-07-03 (금)', [
      {
        title: '메뉴 테스트',
        noteType: '메뉴개발',
        status: '테스트',
        category: '피자',
        testContent: '테스트 내용',
        materials: '치즈',
        nextAction: '재시식',
      },
    ]);

    expect(html).toContain('핵심 테스트 내용');
    expect(html).toContain('사용 재료');
    expect(html).toContain('다음 액션');
    expect(html).not.toContain('1. 오늘 한 일</div>');
    expect(html).not.toContain('2. 일정 내용</div>');
    expect(html).not.toContain('5. 다음 할 일</div>');
  });
});
