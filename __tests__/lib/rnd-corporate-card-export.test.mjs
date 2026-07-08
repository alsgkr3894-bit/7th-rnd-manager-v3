import { describe, expect, test } from '@jest/globals';
import {
  buildCorporateCardMonthlySummary,
  buildCorporateCardStatementWorkbookData,
  parseCorporateCardRows,
} from '@/lib/rnd/corporate-card';

describe('법인카드 내역서 엑셀 양식', () => {
  test('업로드 엑셀 헤더를 자동 매칭해 저장 행으로 변환한다', () => {
    const parsed = parseCorporateCardRows(
      ['승인일자', '카드번호', '가맹점명', '승인금액', '부가세', '계정과목', 'ISP/비고', '적요'],
      [
        {
          승인일자: '2025.05.02',
          카드번호: '5205-0411-7042-9902',
          가맹점명: '하나로마트',
          승인금액: '27,280',
          부가세: '2,480',
          계정과목: '개발비',
          'ISP/비고': 'ic',
          적요: '대하,청경채/메뉴테스트',
        },
      ]
    );

    expect(parsed.columns).toMatchObject({
      usedAt: '승인일자',
      cardName: '카드번호',
      vendor: '가맹점명',
      amount: '승인금액',
      memo: '적요',
    });
    expect(parsed.entries).toEqual([
      {
        usedAt: '2025-05-02',
        yearMonth: '2025-05',
        cardName: '5205-0411-7042-9902',
        vendor: '하나로마트',
        amount: 27280,
        vat: 2480,
        category: '개발비',
        ispMemo: 'ic',
        memo: '대하,청경채/메뉴테스트',
        sourceRowNumber: 2,
      },
    ]);
    expect(parsed.warnings).toEqual([]);
  });

  test('업로드 행의 사용처나 금액이 비어 있으면 경고를 남긴다', () => {
    const parsed = parseCorporateCardRows(
      ['사용일', '사용처', '금액'],
      [{ 사용일: '20250503', 사용처: '', 금액: '' }]
    );

    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0]).toMatchObject({
      usedAt: '2025-05-03',
      yearMonth: '2025-05',
      amount: 0,
    });
    expect(parsed.warnings).toEqual(['2행: 사용처가 비어 있습니다.', '2행: 금액이 비어 있습니다.']);
  });

  test('법인체크카드 지출경비내역서 출력 양식을 다시 업로드해도 상세 행만 읽는다', () => {
    const rawRows = [
      ['법인체크카드 지출경비내역서', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['카드번호', '5205-0475-1940-0959', '', '관 리', '담당자', '', '', '실장', '', ''],
      ['청 구 자', '이민학 주임', '', '', '', '', '', '', '', ''],
      ['청구기간', '2026.06.01.~2026.06.30', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['날  짜', '계정과목', '거 래 처', '', '적     요', '', '', '사용금액', '비 고', ''],
      [new Date(2026, 5, 8), '', '네이버', '', '허니리코타치즈', '', '', 16390, '', ''],
      [new Date(2026, 5, 14), '', '다이소', '', '건전지', '', '', 8000, '', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['합   계', '', '', '', '', '', '', 24390, '', ''],
      ['비   고', '', '', '', '', '', '', '', '', ''],
    ];
    const parsed = parseCorporateCardRows({
      headers: ['카드번호', '청 구 자', '청구기간'],
      rows: [],
      rawRows,
    });

    expect(parsed.columns).toMatchObject({
      usedAt: '날  짜',
      vendor: '거 래 처',
      amount: '사용금액',
      memo: '적     요',
      ispMemo: '비 고',
    });
    expect(parsed.entries).toEqual([
      {
        usedAt: '2026-06-08',
        yearMonth: '2026-06',
        cardName: '',
        vendor: '네이버',
        amount: 16390,
        vat: 0,
        category: '',
        ispMemo: '',
        memo: '허니리코타치즈',
        sourceRowNumber: 8,
      },
      {
        usedAt: '2026-06-14',
        yearMonth: '2026-06',
        cardName: '',
        vendor: '다이소',
        amount: 8000,
        vat: 0,
        category: '',
        ispMemo: '',
        memo: '건전지',
        sourceRowNumber: 9,
      },
    ]);
    expect(parsed.warnings).toEqual([]);
  });

  test('사용일 기준 년월 단위 합계를 만든다', () => {
    const summary = buildCorporateCardMonthlySummary([
      { usedAt: '2026-06-08', amount: 16390 },
      { usedAt: '2026-06-14', amount: '8,000' },
      { usedAt: '2026-05-31', yearMonth: '2026-05', amount: 1000 },
    ]);

    expect(summary).toEqual([
      { yearMonth: '2026-06', count: 2, total: 24390 },
      { yearMonth: '2026-05', count: 1, total: 1000 },
    ]);
  });

  test('첨부 양식의 제목, 헤더, 병합, 합계 구조로 출력 데이터를 만든다', () => {
    const statement = buildCorporateCardStatementWorkbookData([
      {
        usedAt: '2025-05-02',
        cardName: '5205-0411-7042-9902',
        vendor: '하나로마트',
        amount: 27280,
        category: '개발비',
        memo: '대하,청경채/메뉴테스트',
        ispMemo: 'ic',
      },
      {
        usedAt: '2025-05-03',
        vendor: '다이소',
        amount: '37,000',
        category: '비품',
        memo: '바구니,주걱/비품',
      },
    ]);

    expect(statement.rows[0]).toEqual([
      '법인체크카드 지출경비내역서',
      '',
      '',
      '발 의',
      '담 당',
      '대리(과장)',
      '팀장(실장)',
      '본부장',
      '이사',
      '대표이사',
    ]);
    expect(statement.rows[2].slice(0, 4)).toEqual(['카드번호', '5205-0411-7042-9902', '', '관 리']);
    expect(statement.rows[4][1]).toBe('2025.05.02 ~ 2025.05.03');
    expect(statement.rows[6]).toEqual([
      '날  짜',
      '계정과목',
      '거 래 처',
      '',
      '적     요',
      '',
      '',
      '사용금액',
      '비 고',
      '',
    ]);
    expect(statement.rows[7][0]).toBeInstanceOf(Date);
    expect(statement.rows[7][1]).toBe('개발비');
    expect(statement.rows[7][2]).toBe('하나로마트');
    expect(statement.rows[7][4]).toBe('대하,청경채/메뉴테스트');
    expect(statement.rows[7][7]).toBe(27280);
    expect(statement.rows[7][8]).toBe('ic');
    expect(statement.rows[42][0]).toBe('합   계');
    expect(statement.rows[42][7]).toBe(64280);
    expect(statement.merges).toContain('A1:C2');
    expect(statement.merges).toContain('C7:D7');
    expect(statement.merges).toContain('E8:G8');
    expect(statement.merges).toContain('A43:G43');
    expect(statement.merges).toContain('B44:J47');
    expect(statement.cols).toEqual([6.6, 9.6, 14.4, 3.2, 8.7, 8.7, 8.7, 8.7, 8.7, 8.7]);
  });

  test('35건을 초과해도 상세 행을 누락하지 않고 합계 행을 뒤로 민다', () => {
    const entries = Array.from({ length: 36 }, (_, index) => ({
      usedAt:
        index < 31
          ? `2025-05-${String(index + 1).padStart(2, '0')}`
          : `2025-06-${String(index - 30).padStart(2, '0')}`,
      vendor: `거래처${index + 1}`,
      amount: 1000,
      memo: `적요${index + 1}`,
    }));
    const statement = buildCorporateCardStatementWorkbookData(entries);

    expect(statement.detailRowCount).toBe(36);
    expect(statement.rows[42][2]).toBe('거래처36');
    expect(statement.rows[43][0]).toBe('합   계');
    expect(statement.rows[43][7]).toBe(36000);
    expect(statement.merges).toContain('A44:G44');
    expect(statement.merges).toContain('B45:J48');
  });
});
