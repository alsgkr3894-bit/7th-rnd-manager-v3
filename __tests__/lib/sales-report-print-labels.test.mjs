import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

// 2026-10-01 주임님 요청: 보고서 PDF에서 카테고리가 페이지 중간에 잘리지 않게, 판매량 보고서의
// '미등록' 표시를 '비정규'로. (같은 점검에서 '상승 TOP 5'에 +-475가 나오던 부호 문제도 고침)
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('보고서 PDF — 카테고리 구획이 페이지 사이에서 잘리지 않는다', () => {
  test('판매량·제때 가격·출고량 보고서의 구획에 print-keep-together가 붙는다', () => {
    const files = {
      'components/report/sales/SalesRankTableSection.jsx':
        'paper-section paper-cat-section print-keep-together',
      'components/report/sales/SalesCompareTableSection.jsx':
        'paper-section paper-cat-section print-keep-together',
      'components/report/sales/SalesCategoryShareSection.jsx': 'paper-section print-keep-together',
      'components/report/sales/SalesPizzaMoverSection.jsx': 'paper-section print-keep-together',
      'components/report/price/PriceReportPreview.jsx':
        'paper-section paper-cat-section print-keep-together',
      'components/report/shipment/ShipmentReportPreview.jsx':
        'paper-section paper-cat-section print-keep-together',
    };
    for (const [file, cls] of Object.entries(files)) expect(read(file)).toContain(cls);
    // 아직 붙지 않은 구획이 남아 있지 않다
    for (const file of ['SalesRankTableSection', 'SalesCompareTableSection']) {
      expect(read(`components/report/sales/${file}.jsx`)).not.toContain(
        '"paper-section paper-cat-section"'
      );
    }
  });

  test('순위 막대 묶음은 중간에서 끊기지 않고, 인쇄 규칙이 이를 처리한다', () => {
    expect(read('components/report/sales/SalesCategoryBarRows.jsx')).toContain('print-keep-block');
    const print = read('lib/report/print.js');
    expect(print).toContain('.print-keep-block {');
    expect(print).toContain('.paper-section.print-keep-together {');
    expect(print).toContain('break-inside: avoid !important');
  });
});

describe("판매량 보고서 '미등록' → '비정규'", () => {
  test('배지·토글 칩·안내·토스트가 모두 비정규로 보인다', () => {
    const badge = read('components/sales/UnregisteredBadge.jsx');
    expect(badge).toContain('비정규\n    </span>');
    expect(badge).not.toMatch(/>\s*미등록\s*</);

    const rows = read('components/report/sales/SalesRankTableRows.jsx');
    expect(rows).toContain('label="비정규"');
    expect(rows).not.toContain('label="미등록"');
    expect(rows).toContain('비정규 판정으로 돌아갑니다');
    expect(rows).toContain('비정규 아님');

    const page = read('app/report/sales/page.jsx');
    expect(page).toContain('다시 비정규로 표시합니다');
    expect(page).toContain('비정규 판정을 해제했습니다');
    expect(page).not.toContain('다시 미등록으로 표시합니다');
    expect(page).not.toContain('미등록 판정을 해제했습니다');
  });
});

describe('피자 상승/하락 TOP 5', () => {
  test('실제로 오른·내린 메뉴만 올리고, 없으면 안내 문구를 보여 준다', () => {
    const src = read('components/report/sales/SalesPizzaMoverSection.jsx');
    expect(src).toContain('.filter(item => item.delta > 0)');
    expect(src).toContain('.filter(item => item.delta < 0)');
    expect(src).toContain('상승한 메뉴가 없습니다');
    expect(src).toContain('하락한 메뉴가 없습니다');
  });

  test('부호는 값으로 정한다(음수에 +를 붙여 +-475가 되지 않는다)', () => {
    const src = read('components/report/sales/SalesChartRows.jsx');
    expect(src).toContain("{delta > 0 ? '+' : ''}");
    expect(src).not.toContain("{up ? '+' : ''}");
  });
});
