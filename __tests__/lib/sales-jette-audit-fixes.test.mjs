import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { parseAndValidateRows } from '../../lib/sales/parse-rows.js';
import { validateSalesFile } from '../../lib/sales/parse.js';
import { parseShipmentRows } from '../../lib/shipment/parse.js';
import { aggregateShipmentRows } from '../../lib/shipment/aggregate.js';
import { isEquivalentIssueBasis } from '../../lib/sales/resolve-helpers.js';
import { excelDateObjectToYmd, parseExcelDate } from '../../lib/parse.js';
import { planCorporateCardImport } from '../../lib/rnd/corporate-card.js';
import { buildUnitPriceMap } from '../../lib/recipe/index.js';
import {
  formatChangeRate,
  formatPriceWon,
  getPriceCompareRowValues,
} from '../../components/jette/price-compare/priceCompareTableUtils.js';

// 2026-09-30 전체 점검(판매·제때·노트 영역 버그 헌트)에서 나온 것들.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('판매량 업로드', () => {
  test("판매량 '1,234'는 거절하지 않고 1234로 받는다", () => {
    const r = parseAndValidateRows([['피자', '1,234', '10,000']], 0, 1, 2);
    expect(r.invalidRows).toEqual([]);
    expect(r.validRows[0].quantity).toBe(1234);
  });

  test('숫자가 아니거나 소수인 판매량은 여전히 거절한다', () => {
    const r = parseAndValidateRows(
      [
        ['a', 'x'],
        ['b', '1.5'],
        ['c', '-3'],
      ],
      0,
      1
    );
    expect(r.invalidRows.map(i => i.reason)).toEqual([
      '판매량에 숫자가 아닌 값이 있습니다.',
      '판매량은 정수만 허용됩니다. (소수 불가)',
      '판매량은 0 이상이어야 합니다. (음수 불가)',
    ]);
  });

  test('오류 행 번호는 시트의 실제 행 번호 — 헤더 위 기간 줄이 있으면 헤더는 2행이다', () => {
    const rows = [
      ['2026-08-01 ~ 2026-08-31'], // 1행: 기간
      ['메뉴명', '판매량(개)'], // 2행: 헤더
      ['피자', '5'], // 3행
      ['콜라', 'abc'], // 4행 ← 잘못된 값
    ];
    const result = validateSalesFile(rows);
    expect(result.success).toBe(false);
    expect(result.invalidRows[0].originalIndex).toBe(4);
  });

  test('헤더가 첫 줄이면 첫 데이터 행은 2행', () => {
    const r = parseAndValidateRows([['a', 'x']], 0, 1);
    expect(r.invalidRows[0].originalIndex).toBe(2);
  });
});

describe('출고량 업로드', () => {
  test('열 이름 후보의 우선순위를 지킨다(배송수량 > 주문수량, 합계 > 금액)', () => {
    const headers = ['제품코드', '제품명', '주문수량', '배송수량', '금액', '부가세', '합계'];
    // 행은 헤더 이름을 키로 하는 객체다(readExcelFile 결과)
    const rows = [
      {
        제품코드: 'A1',
        제품명: '치즈',
        주문수량: 10,
        배송수량: 8,
        금액: 80000,
        부가세: 8000,
        합계: 88000,
      },
    ];
    const result = parseShipmentRows(headers, rows);
    expect(result.ok).toBe(true);
    expect(result.success[0].quantity).toBe(8);
    expect(result.success[0].amount).toBe(88000);
  });

  test('코드가 바뀐 관리품목(이름만 일치)도 집계에서 관리품목으로 잡힌다', () => {
    const rows = [
      {
        productCode: 'NEW-1',
        productName: '모짜렐라치즈',
        normalizedProductName: '모짜렐라치즈',
        quantity: 3,
        amount: 3000,
        yearMonth: '2026-09',
      },
    ];
    const managed = [
      {
        productCode: 'OLD-1',
        productName: '모짜렐라치즈',
        normalizedProductName: '모짜렐라치즈',
        productType: 'generic',
        isManaged: true,
      },
    ];
    const [agg] = aggregateShipmentRows(rows, managed);
    // 관리품목(범용+관리)으로 잡혀야 한다 — 전엔 코드가 달라 기본값(미관리)이었다
    expect(agg.isManaged).toBe(true);
  });
});

describe('제때 가격 비교', () => {
  test('신규·삭제 행의 빈 값은 0이 아니라 null → "—"', () => {
    const v = getPriceCompareRowValues({
      basePrice: null,
      latestPrice: 1200,
      changeAmount: null,
      changeRate: null,
      changeStatus: '신규',
    });
    expect(v.basePrice).toBeNull();
    expect(v.changeAmount).toBeNull();
    expect(v.changeRate).toBeNull();
    expect(formatChangeRate(v.changeRate)).toBe('—');
    expect(formatPriceWon(v.basePrice)).toBe('—');
  });

  test('실제 0 값은 그대로 0', () => {
    expect(getPriceCompareRowValues({ changeAmount: 0 }).changeAmount).toBe(0);
  });

  test('표에서 필터가 초기화되면 페이지 카드 상태도 같이 되돌린다', () => {
    const table = read('components/jette/PriceCompareTable.jsx');
    expect(table).toContain("onFilterChange('all')");
    expect(table).toContain('onFilter={changeFilter}');
    expect(read('app/jette/price-compare/page.jsx')).toContain('onFilterChange={setCardFilter}');
  });
});

describe('식자재 단가', () => {
  const meta = [
    {
      productCode: 'CC1',
      ingredientName: '치즈',
      baseQuantity: 1000,
      baseUnitType: 'g',
      priceOverride: 20000,
    },
  ];
  test('제때 단가가 0이면 수동 단가를 쓴다', () => {
    const map = buildUnitPriceMap(meta, new Map([['CC1', { priceWithTax: 0 }]]));
    expect(map.get('CC1').unitPrice).toBe(20);
  });
  test('제때 단가가 있으면 제때 단가가 우선', () => {
    const map = buildUnitPriceMap(meta, new Map([['CC1', { priceWithTax: 10000 }]]));
    expect(map.get('CC1').unitPrice).toBe(10);
  });
});

describe('월 순위표', () => {
  test('검색해도 순위는 전체 순위 그대로(검색 전에 매긴다)', () => {
    const src = read('components/sales/MonthRankTable.jsx');
    expect(src).toContain('rank={m.rank}');
    expect(src).toContain('list.map((m, i) => ({ ...m, rank: i + 1 }))');
    expect(src).not.toContain('rank={i + 1}');
  });
});

describe('미매칭 해결', () => {
  test('같은 내용으로 이미 등록됐으면 재사용 판정(다른 달 같은 메뉴)', () => {
    expect(
      isEquivalentIssueBasis(
        { category: '피자', groupName: '오리지널', detailName: null },
        'rule',
        { category: '피자', groupName: '오리지널' }
      )
    ).toBe(true);
    expect(isEquivalentIssueBasis({ mappedName: '콜라' }, 'alias', { outputName: '콜라' })).toBe(
      true
    );
    expect(isEquivalentIssueBasis({ menuName: 'x' }, 'exclude', {})).toBe(true);
  });

  test('내용이 다르면 여전히 중복으로 거절(재사용 아님)', () => {
    expect(
      isEquivalentIssueBasis({ category: '피자', groupName: '오리지널' }, 'rule', {
        category: '사이드',
        groupName: '오리지널',
      })
    ).toBe(false);
    expect(isEquivalentIssueBasis({ mappedName: '콜라' }, 'alias', { outputName: '사이다' })).toBe(
      false
    );
    expect(isEquivalentIssueBasis(null, 'rule', {})).toBe(false);
  });

  test('별칭 검증은 업로드와 같은 DB 분류기를 쓴다(브랜드·사용자 규칙 무관)', () => {
    const src = read('lib/sales/resolve.js');
    expect(src).toContain('buildClassifierFromDB');
    expect(src).not.toContain("import { matchRule } from './rule-matcher.js'");
  });
});

describe('엑셀 날짜 하루 밀림', () => {
  test('SheetJS가 준 전날 23:59:08 값을 그날로 되돌린다', () => {
    // 2025-05-02 자정이 시간대 오차로 5/1 23:59:08(로컬)로 오는 상황
    const d = new Date(2025, 4, 1, 23, 59, 8);
    expect(excelDateObjectToYmd(d)).toBe('2025-05-02');
    expect(parseExcelDate(d)).toBe('2025-05-02');
  });

  test('정상 자정 값은 그대로', () => {
    expect(excelDateObjectToYmd(new Date(2025, 4, 2, 0, 0, 0))).toBe('2025-05-02');
    expect(excelDateObjectToYmd(new Date(2025, 4, 2, 12, 0, 0))).toBe('2025-05-02');
  });

  test('잘못된 값은 빈 문자열', () => {
    expect(excelDateObjectToYmd(new Date('x'))).toBe('');
    expect(excelDateObjectToYmd('2025-05-02')).toBe('');
  });
});

describe('법인카드 업로드 중복 판정', () => {
  const row = (extra = {}) => ({
    usedAt: '2026-09-01',
    vendor: '식당',
    amount: 9000,
    vat: 818,
    memo: '점심',
    cardName: '법인1',
    category: '식대',
    ...extra,
  });

  test('같은 날 같은 가게에서 같은 금액을 두 번 결제하면 둘 다 들어간다', () => {
    const { records, skipped } = planCorporateCardImport([], [row(), row()]);
    expect(records).toHaveLength(2);
    expect(skipped).toBe(0);
  });

  test('같은 명세서를 다시 올리면 기존 개수만큼만 건너뛴다', () => {
    const existing = [row(), row()];
    const { records, skipped } = planCorporateCardImport(existing, [row(), row(), row()]);
    expect(records).toHaveLength(1);
    expect(skipped).toBe(2);
  });

  test('완전히 같은 재업로드는 전부 건너뛴다', () => {
    const existing = [row(), row({ vendor: '카페' })];
    const { records, skipped } = planCorporateCardImport(existing, [
      row(),
      row({ vendor: '카페' }),
    ]);
    expect(records).toHaveLength(0);
    expect(skipped).toBe(2);
  });
});
