import {
  buildMenuDevelopmentReportHtml,
  buildMenuDevelopmentReportSummary,
  formatNoteReportDownloadDate,
} from '../../lib/note/report-print.js';

describe('menu development note PDF report', () => {
  test('전체 노트 요약과 날짜를 보고서 HTML에 포함한다', () => {
    const notes = [
      {
        title: '치즈 피자 테스트 <script>alert(1)</script>',
        menuName: '버섯 & 치즈 피자',
        category: '피자',
        noteType: '메뉴개발',
        status: '보류',
        testDate: '2026-06-22',
        testContent: '도우 180g\n치즈 90g',
        materials: '치즈, 버섯',
        tasteEval: '고소함',
        managerEval: '개선 검토',
        costNote: '원가 확인 필요',
        issues: '가장자리 수분',
        improvements: '굽기 시간 조정',
        nextAction: '2차 테스트',
        reportSummary: '보고용 핵심 요약',
        tags: '치즈, 테스트',
        photos: [{ data: 'data:image/jpeg;base64,AAAA', caption: '시식 사진' }],
        tempCostCalc: {
          sellingPrice: '5000',
          rows: [{ name: '치즈', quantity: '10', unit: 'g', unitPrice: '100' }],
        },
      },
      {
        title: '소스 테스트',
        menuName: '소스',
        category: '소스',
        noteType: '메뉴개선',
        status: '보류',
        testDate: '2026-06-20',
      },
    ];

    const summary = buildMenuDevelopmentReportSummary(notes);
    expect(summary).toMatchObject({
      total: 2,
      menuCount: 2,
      photoCount: 1,
      tempCostCount: 1,
    });
    expect(summary.statusCounts).toContainEqual(['보류', 2]);
    expect(summary.categoryCounts).toContainEqual(['피자', 1]);

    const html = buildMenuDevelopmentReportHtml(notes, {
      now: new Date('2026-06-23T09:00:00'),
      scopeLabel: '현재 필터 결과',
    });

    expect(formatNoteReportDownloadDate(new Date('2026-06-23T09:00:00'))).toBe('2026-06-23');
    expect(html).toContain('메뉴개발노트 전체 보고서_20260623');
    expect(html).toContain('다운로드일 2026-06-23');
    expect(html).toContain('현재 필터 결과');
    expect(html).toContain('제목 수');
    expect(html).toContain('치즈 피자 테스트 &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('버섯 &amp; 치즈 피자');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('임시 원가 계산');
    expect(html).toContain('원가 1,000원');
    expect(html).toContain('시식 사진');
    expect(html).toContain('grid-template-columns: repeat(2, 1fr)');
    expect(html).toContain('max-height: 240px');
    expect(html).toContain('window.print');
  });

  test('상태 요약과 노트 카드 상태는 마지막 차수의 메뉴 상태를 사용한다', () => {
    const notes = [
      {
        id: 1,
        title: '불고기 피자',
        category: '피자',
        noteType: '메뉴개발',
        testRound: '1',
        status: '폐기',
      },
      {
        id: 2,
        parentId: 1,
        title: '불고기 피자',
        category: '피자',
        noteType: '메뉴개발',
        testRound: '2',
        status: '보류',
      },
    ];

    const summary = buildMenuDevelopmentReportSummary(notes);
    expect(summary.statusCounts).toEqual([['보류', 1]]);

    const html = buildMenuDevelopmentReportHtml(notes, {
      now: new Date('2026-06-23T09:00:00'),
    });
    expect(html).toContain('보류');
    expect(html).not.toContain('폐기</span>');
  });
});
