/**
 * lib/nutrition/origin/export.js
 * 원산지 → 엑셀 출력 (템플릿 없이 직접 생성)
 *
 * 시트1 매장비치용   : 표시품목(재료명) / (표시품목:원산지) / 메뉴명 — 표 제목은 "원산지 표시판"
 * 시트2 냉장고부착용 : 음식명(재료명) / 표시품목 / (표시품목:원산지) — 같은 원산지 재료는 한 행
 * 시트3 배달플랫폼용 : 메뉴명 / 재료명(표시품목:원산지)
 * 시트4 원산지정보   : "※ 피자공통" 재료 한 줄씩 + 나머지 한 문단, 테두리 친 셀 하나
 */
import { loadXlsxStyled } from '@/lib/excel';
import { makeFileNameWithBrand } from '@/lib/download';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import {
  buildOriginStatementLines,
  buildPizzaCommonSpans,
} from '@/lib/nutrition/origin/output-sheets';

let XLSX;

const DISCLAIMER = '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.';
const EMPTY_SET = new Set();
const asSet = value => (value instanceof Set ? value : EMPTY_SET);
const menuNames = value =>
  Array.isArray(value) ? value.map(asDisplayText).filter(Boolean) : [...asSet(value)];

const THIN = { style: 'thin', color: { rgb: '000000' } };
const CELL_BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };

// 표 영역(제목 제외) 전체에 테두리·가운데 정렬·줄바꿈을 주고 헤더는 굵게 — xlsx-js-style만 반영한다.
function styleTable(ws, { headerRow, lastRow, cols, titleRow = 0 }) {
  for (let c = 0; c < cols; c++) {
    const title = ws[XLSX.utils.encode_cell({ r: titleRow, c })];
    if (title) {
      title.s = {
        font: { bold: true, sz: 16 },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    for (let r = headerRow; r <= lastRow; r++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = {
        border: CELL_BORDER,
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        ...(r === headerRow ? { font: { bold: true } } : {}),
      };
    }
  }
  ws['!rows'] = ws['!rows'] || [];
  ws['!rows'][titleRow] = { hpt: 28 };
}

// 연속된 "피자공통" 행의 메뉴명 셀을 세로로 합친다 (rowOffset: 데이터 첫 행의 시트 행 번호)
function buildPizzaCommonMerges(rows, rowOffset, col) {
  return buildPizzaCommonSpans(rows).map(span => ({
    s: { r: rowOffset + span.start, c: col },
    e: { r: rowOffset + span.start + span.length - 1, c: col },
  }));
}

/**
 * @param {{ sheet1, sheet2, sheet3 }} data — OriginResult.jsx의 빌드 결과 그대로 수신
 * @param {string} [filename]
 */
export async function exportOriginToExcel(
  { sheet1, sheet2, sheet3, sheet4 = [] } = {},
  filename = '원산지표시판'
) {
  XLSX = await loadXlsxStyled();

  const wb = XLSX.utils.book_new();
  const safeSheet1 = asObjectArray(sheet1);
  const safeSheet2 = asObjectArray(sheet2);
  const safeSheet3 = asObjectArray(sheet3);
  const safeSheet4 = asObjectArray(sheet4);

  // ── 시트1: 매장비치용 — "매장비치용"은 시트 이름에만 적고 표 제목은 "원산지 표시판" ──
  const ws1Rows = [
    ['원산지 표시판'],
    ['표시품목', '원산지', '메뉴명'],
    ...safeSheet1.map(r => [
      asDisplayText(r.displayName),
      asDisplayText(r.originCountry),
      menuNames(r.menus).join(', '),
    ]),
    [],
    [DISCLAIMER],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(ws1Rows);
  ws1['!cols'] = [{ wch: 28 }, { wch: 40 }, { wch: 50 }];
  ws1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    ...buildPizzaCommonMerges(safeSheet1, 2, 2),
  ];
  styleTable(ws1, { headerRow: 1, lastRow: 1 + safeSheet1.length, cols: 3 });
  XLSX.utils.book_append_sheet(wb, ws1, '원산지(매장)');

  // ── 시트2: 냉장고부착용 — 시트 이름에만 "냉장고", 표 제목은 "원산지 표시판" ──
  const ws2Rows = [
    ['원산지 표시판'],
    ['음식명', '표시품목', '원산지'],
    ...safeSheet2.map(r => [
      asDisplayText(r.ingredientName),
      asDisplayText(r.itemText),
      asDisplayText(r.originText),
    ]),
    [],
    [DISCLAIMER],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(ws2Rows);
  ws2['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 56 }];
  ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  styleTable(ws2, { headerRow: 1, lastRow: 1 + safeSheet2.length, cols: 3 });
  XLSX.utils.book_append_sheet(wb, ws2, '원산지(냉장고)');

  // ── 시트3: 배달플랫폼용 ────────────────────────────────────
  const ws3Rows = [
    ['배달플랫폼 원산지 표기'],
    ['구분', '메뉴명', '재료명(원산지)'],
    ...safeSheet3.map(r => [
      asDisplayText(r.group),
      asDisplayText(r.menuName),
      Array.isArray(r.parts) ? r.parts.map(part => asDisplayText(part)).join(', ') : '',
    ]),
    [],
    [DISCLAIMER],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(ws3Rows);
  ws3['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 80 }];
  ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  styleTable(ws3, { headerRow: 1, lastRow: 1 + safeSheet3.length, cols: 3 });
  XLSX.utils.book_append_sheet(wb, ws3, '배달플랫폼용');

  // ── 시트4: 원산지정보 표기문 — 제목 셀 + 표기문 전체가 든 셀 하나(줄바꿈·테두리) ──
  const statementText = buildOriginStatementLines(safeSheet4).join('\n');
  const ws4Rows = [['원산지'], [statementText], [], [DISCLAIMER]];
  const ws4 = XLSX.utils.aoa_to_sheet(ws4Rows);
  ws4['!cols'] = [{ wch: 110 }];
  ws4.A1.s = {
    font: { bold: true, sz: 16 },
    border: CELL_BORDER,
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  ws4.A2.s = {
    border: CELL_BORDER,
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
  };
  // 줄바꿈 셀은 Excel이 높이를 자동으로 안 늘리는 경우가 있어 줄 수 기준으로 잡아 둔다
  ws4['!rows'] = [{ hpt: 28 }, { hpt: Math.max(120, 18 * (statementText.split('\n').length + 6)) }];
  XLSX.utils.book_append_sheet(wb, ws4, '원산지정보');

  XLSX.writeFile(wb, makeFileNameWithBrand(filename, 'xlsx'));
}
