import { loadXlsxStyled } from '@/lib/excel';
import { applyTableStyle, setRowHeight } from '@/lib/excel-style';
import { withDownloadDateSuffix } from '@/lib/download';
import { getActiveBrand } from '@/lib/active-brand';
import { getMenuCodeRank } from '@/lib/menu-categories';
import { groupCostMenusBySize } from '@/lib/report/cost-menu-display';

function formatRateValue(menu) {
  return menu?.rate > 0 ? Math.round(menu.rate * 10) / 10 : '';
}

// 글자 크기·색을 시트마다 같게 — 본문 10pt, 헤더 11pt 굵게(applyTableStyle이 +1).
const FONT = { name: '맑은 고딕', sz: 10 };
const HEADER_FILL = 'F2F2F2';
// 위험 원가율 강조. 진한 빨강(C62828)은 흰/연회색 배경에서 4.5:1 이상이라 읽힌다.
const RISK_STYLE = { fill: 'FDECEA', font: { color: { rgb: 'C62828' }, bold: true } };

const LEFT = { align: 'left' };
const CENTER = { align: 'center' };
const money = { align: 'right', numFmt: '#,##0' };
const rate = { align: 'right', numFmt: '0.0' };

/**
 * 표 하나를 마무리한다: 테두리·서식·헤더 행 높이·자동 필터.
 * 시트 구성·값은 건드리지 않고 스타일만 얹는다.
 */
function finishSheet(XLSX, ws, rows, options) {
  const lastRow = rows.length - 1;
  const lastCol = rows[0].length - 1;
  applyTableStyle(XLSX, ws, {
    r0: 0,
    r1: lastRow,
    c1: lastCol,
    font: FONT,
    headerFill: HEADER_FILL,
    ...options,
  });
  setRowHeight(ws, 0, 24);
  if (lastRow >= 1) {
    ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(lastCol)}${rows.length}` };
  }
}

/** 앞 행과 값이 달라지는 행 번호 — 구역 경계에 굵은 선을 그을 때 쓴다. */
function boundaryRows(rows, keyOf) {
  const out = [];
  for (let r = 2; r < rows.length; r++) {
    if (keyOf(rows[r]) !== keyOf(rows[r - 1])) out.push(r);
  }
  return out;
}

function costTableCells(menu) {
  return [menu?.sale || '', menu?.cost || '', formatRateValue(menu)];
}

export async function exportCostXlsx(periodLabel, activeCats, recipeRows, riskThreshold = 35) {
  const XLSX = await loadXlsxStyled();
  const periodPart = periodLabel.replace(
    /(\d+)년 (\d+)월/,
    (_, y, m) => `${y}년${m.padStart(2, '0')}월`
  );
  const wb = XLSX.utils.book_new();

  // 시트1: 카테고리 요약
  const summaryRows = [
    ['카테고리', '메뉴 수', '평균 원가율(%)', '최저(%)', '최고(%)', '위험 메뉴'],
    ...activeCats.map(([, c]) => {
      const rates = c.menus.filter(m => m.rate > 0).map(m => m.rate);
      const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
      return [
        c.label,
        c.menus.length,
        avg > 0 ? Math.round(avg * 10) / 10 : '',
        rates.length ? Math.round(Math.min(...rates) * 10) / 10 : '',
        rates.length ? Math.round(Math.max(...rates) * 10) / 10 : '',
        c.menus.filter(m => m.rate >= riskThreshold).length,
      ];
    }),
  ];
  const sheet1 = XLSX.utils.aoa_to_sheet(summaryRows);
  sheet1['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
  finishSheet(XLSX, sheet1, summaryRows, {
    columns: [LEFT, money, rate, rate, rate, money],
    // 위험 메뉴가 있는 카테고리만 빨간 글자
    cellStyle: (r, c, cell) => (c === 5 && cell.t === 'n' && cell.v > 0 ? RISK_STYLE : null),
  });
  XLSX.utils.book_append_sheet(wb, sheet1, '카테고리 요약');

  // 시트2: 메뉴 상세 (원가마진표처럼 메뉴 1줄에 L/R/단일 원가를 배치)
  const detailRows = [
    [
      '카테고리',
      '메뉴명',
      'L판매가(원)',
      'L원가(원)',
      'L원가율(%)',
      'R판매가(원)',
      'R원가(원)',
      'R원가율(%)',
      '단일판매가(원)',
      '단일원가(원)',
      '단일원가율(%)',
    ],
    ...activeCats.flatMap(([, c]) =>
      groupCostMenusBySize(
        [...c.menus].sort(
          (a, b) =>
            getMenuCodeRank(a.code) - getMenuCodeRank(b.code) ||
            (a.code || '').localeCompare(b.code || '', 'ko')
        )
      ).map(group => [
        c.label,
        group.name,
        ...costTableCells(group.sizes.L),
        ...costTableCells(group.sizes.R),
        ...costTableCells(group.single),
      ])
    ),
  ];
  const sheet2 = XLSX.utils.aoa_to_sheet(detailRows);
  sheet2['!cols'] = [
    { wch: 14 },
    { wch: 36 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
  ];
  // L / R / 단일 그룹 경계(2·5·8열)는 굵은 세로선, 카테고리가 바뀌는 행은 굵은 위쪽선.
  // 병합하지 않아야 엑셀 필터·정렬이 그대로 된다.
  const RATE_COLS = new Set([4, 7, 10]);
  finishSheet(XLSX, sheet2, detailRows, {
    columns: [LEFT, LEFT, money, money, rate, money, money, rate, money, money, rate],
    thickLeft: [2, 5, 8],
    thickTop: boundaryRows(detailRows, row => row[0]),
    cellStyle: (r, c, cell) =>
      RATE_COLS.has(c) && cell.t === 'n' && cell.v >= riskThreshold ? RISK_STYLE : null,
  });
  XLSX.utils.book_append_sheet(wb, sheet2, '메뉴 상세');

  // 시트3: 레시피 출력
  const recipeSheetRows = [
    [
      '카테고리',
      '메뉴코드',
      '메뉴명',
      '규격',
      '구분',
      '원가식자재',
      '제품코드',
      '수량',
      '단위',
      '단가(원)',
      '소계(원)',
      '레시피합계(원)',
      '비고',
    ],
    ...(Array.isArray(recipeRows) ? recipeRows : []).flatMap(row => {
      const components = Array.isArray(row.components) ? row.components : [];
      if (!components.length) {
        return [
          [
            row.categoryLabel,
            row.menuCode,
            row.menuName,
            row.size,
            '직접 입력',
            '구성품 미작성',
            '',
            '',
            '',
            '',
            '',
            '',
            row.note || '',
          ],
        ];
      }
      return components.map((component, index) => [
        row.categoryLabel,
        row.menuCode,
        row.menuName,
        row.size,
        component.sourceLabel || (component.sourceType === 'common' ? '공통관리' : '직접 입력'),
        component.ingredientName,
        component.productCode,
        component.quantity ?? '',
        component.unit || '',
        component.unitPrice ?? '',
        component.subtotal ?? '',
        index === 0 ? row.totalCost || '' : '',
        component.note || row.note || '',
      ]);
    }),
  ];
  const sheet3 = XLSX.utils.aoa_to_sheet(recipeSheetRows);
  sheet3['!cols'] = [
    { wch: 12 },
    { wch: 16 },
    { wch: 36 },
    { wch: 8 },
    { wch: 26 },
    { wch: 42 },
    { wch: 16 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 24 },
  ];
  // 메뉴(코드+이름+규격)가 바뀌는 행에 굵은 위쪽선 — 병합 없이 메뉴 블록을 구분한다.
  // 단가는 소수가 대부분이라 고정 2자리로 자릿수를 맞춘다(값은 그대로, 표시만).
  finishSheet(XLSX, sheet3, recipeSheetRows, {
    columns: [
      LEFT,
      CENTER,
      LEFT,
      CENTER,
      CENTER,
      LEFT,
      CENTER,
      { align: 'right' },
      CENTER,
      { align: 'right', numFmt: '#,##0.00' },
      money,
      money,
      LEFT,
    ],
    thickTop: boundaryRows(recipeSheetRows, row => `${row[1]}|${row[2]}|${row[3]}`),
    // 레시피합계(메뉴의 첫 행에만 있음)는 굵게
    cellStyle: (r, c, cell) => (c === 11 && cell.t === 'n' ? { font: { bold: true } } : null),
  });
  XLSX.utils.book_append_sheet(wb, sheet3, '레시피 출력');

  XLSX.writeFile(
    wb,
    withDownloadDateSuffix(`${getActiveBrand().name}_${periodPart} 원가계산 보고서.xlsx`)
  );
}
