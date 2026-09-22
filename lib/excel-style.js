/**
 * lib/excel-style.js — 엑셀 셀 스타일 헬퍼 (xlsx-js-style 전용)
 *
 * `xlsx`(커뮤니티판)는 셀의 `s`를 조용히 버리므로, 여기 함수들은 `loadXlsxStyled()`로 얻은
 * XLSX와 함께 써야 파일에 반영된다. 병합 범위 안의 빈 셀에도 스타일을 넣어야 Excel에서
 * 테두리가 끊기지 않으므로, 범위 안에 셀이 없으면 빈 문자열 셀을 만들어 넣는다.
 */
const THIN = { style: 'thin', color: { rgb: '000000' } };
export const CELL_BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };

function ensureCell(XLSX, ws, r, c) {
  const addr = XLSX.utils.encode_cell({ r, c });
  if (!ws[addr]) ws[addr] = { t: 's', v: '' };
  return ws[addr];
}

/**
 * 표 영역 전체에 테두리·가운데 정렬·줄바꿈을 주고, 위쪽 headerRows개 행은 굵게.
 * @param {object} XLSX
 * @param {object} ws
 * @param {{ r0:number, r1:number, c0?:number, c1:number, headerRows?:number, align?:string }} range
 */
export function applyTableStyle(XLSX, ws, { r0, r1, c0 = 0, c1, headerRows = 1, align }) {
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const isHeader = r < r0 + headerRows;
      ensureCell(XLSX, ws, r, c).s = {
        border: CELL_BORDER,
        alignment: {
          horizontal: isHeader ? 'center' : align || 'center',
          vertical: 'center',
          wrapText: true,
        },
        ...(isHeader ? { font: { bold: true } } : {}),
      };
    }
  }
}

/** 제목 셀: 굵게·크게·가운데. border를 주면 테두리도 함께. */
export function applyTitleStyle(XLSX, ws, { r, c = 0, size = 16, border = false }) {
  ensureCell(XLSX, ws, r, c).s = {
    font: { bold: true, sz: size },
    alignment: { horizontal: 'center', vertical: 'center' },
    ...(border ? { border: CELL_BORDER } : {}),
  };
}

export function setRowHeight(ws, r, hpt) {
  ws['!rows'] = ws['!rows'] || [];
  ws['!rows'][r] = { hpt };
}
