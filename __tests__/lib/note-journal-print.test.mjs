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
    expect(html).toContain('대상 기간');
    expect(html).toContain('보고 건수');
    expect(html).toContain('문서 구분');
    expect(html).toContain('오늘 한 일');
    expect(html).toContain('테스트 결과');
    expect(html).toContain('다음 일정');
    expect(html).not.toContain('일정 내용');
    expect(html).not.toContain('특이사항');
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
    expect(html).not.toContain('2. 테스트 결과</div>');
    expect(html).not.toContain('3. 다음 일정</div>');
  });

  test('통합 샘플 기록처럼 배열 태그가 들어와도 출력한다', () => {
    const html = buildJournalPrintHtml('2026-07-03 (금)', [
      {
        id: 'sample:10',
        _recordKind: 'sample',
        title: '소스 샘플',
        noteType: '샘플테스트',
        recordType: '샘플테스트',
        status: '테스트',
        category: '소스',
        testContent: '점도 확인',
        materials: '치즈바',
        tasteEval: '표면 갈라짐',
        company: '공급사',
        tester: '조홍',
        tags: ['소스', '재테스트'],
      },
    ]);

    expect(html).toContain('#소스');
    expect(html).toContain('#재테스트');
    expect(html).toContain('<b>유형:</b> 샘플테스트');
    expect(html).toContain('<b>식자재 분류:</b> 소스');
    expect(html).toContain('테스트 내용 / 조건');
    expect(html).toContain('샘플명');
    expect(html).toContain('평가 / 결과');
    expect(html).toContain('업체명');
    expect(html).toContain('담당자');
    expect(html).not.toContain('<b>구분:</b> 소스');
    expect(html).not.toContain('사용 재료');
    expect(html).not.toContain('상무님 평가');
  });

  test('journal print includes photos and waits for image loading', () => {
    const html = buildJournalPrintHtml('2026-07-07', [
      {
        title: 'Journal with photo',
        noteType: JOURNAL_NOTE_TYPE,
        status: 'test',
        testDate: '2026-07-07',
        testContent: 'photo check',
        photos: [
          { data: 'data:image/png;base64,AAAA', caption: 'lab photo' },
          { data: '', caption: 'blank photo' },
        ],
      },
    ]);

    expect(html).toContain('data:image/png;base64,AAAA');
    expect(html).toContain('lab photo');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('document.images');
    expect(html).not.toContain('src=""');
    expect(html).not.toContain('blank photo');
  });

  test('기간 종합본은 문서 제목을 바꿔 출력한다', () => {
    const html = buildJournalPrintHtml(
      '주간 2026-07-06 ~ 2026-07-12',
      [
        {
          title: '기간 연구일지',
          noteType: JOURNAL_NOTE_TYPE,
          testContent: '기간 작업',
        },
      ],
      { title: '연구일지 종합본' }
    );

    expect(html).toContain('연구일지 종합본');
    expect(html).toContain('주간 2026-07-06 ~ 2026-07-12');
  });
});
