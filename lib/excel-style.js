/**
 * lib/excel-style.js — 엑셀 셀 스타일 헬퍼 (xlsx-js-style 전용)
 *
 * `xlsx`(커뮤니티판)는 셀의 `s`를 조용히 버리므로, 여기 함수들은 `loadXlsxStyled()`로 얻은
 * XLSX와 함께 써야 파일에 반영된다. 병합 범위 안의 빈 셀에도 스타일을 넣어야 Excel에서
 * 테두리가 끊기지 않으므로, 범위 안에 셀이 없으면 빈 문자열 셀을 만들어 넣는다.
 */
const THIN = { style: 'thin', color: { rgb: '000000' } };
const MEDIUM = { style: 'medium', color: { rgb: '000000' } };
export const CELL_BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };

function ensureCell(XLSX, ws, r, c) {
  const addr = XLSX.utils.encode_cell({ r, c });
  if (!ws[addr]) ws[addr] = { t: 's', v: '' };
  return ws[addr];
}

/** 이웃 셀과 맞닿는 변은 양쪽이 같은 굵기여야 Excel에서 굵은 선이 끊기지 않는다. */
function borderFor(r, c, thickTop, thickLeft) {
  return {
    top: thickTop.has(r) ? MEDIUM : THIN,
    bottom: thickTop.has(r + 1) ? MEDIUM : THIN,
    left: thickLeft.has(c) ? MEDIUM : THIN,
    right: thickLeft.has(c + 1) ? MEDIUM : THIN,
  };
}

/**
 * 표 영역 전체에 테두리·가운데 정렬·줄바꿈을 주고, 위쪽 headerRows개 행은 굵게.
 *
 * 옵션(모두 선택 — 안 주면 종전과 똑같이 동작):
 *  - font: { name, sz } 본문 글꼴. 헤더는 같은 글꼴에 굵게 + sz+1
 *  - headerFill: 헤더 배경색 rgb (예: 'F2F2F2')
 *  - columns: 절대 열 번호 → { align, numFmt } (숫자 셀에만 numFmt)
 *  - thickTop: 위쪽 선을 굵게 할 행 번호 배열(구역 구분)
 *  - thickLeft: 왼쪽 선을 굵게 할 열 번호 배열(그룹 구분)
 *  - cellStyle: (r, c, cell) => { font?, fill? } 셀별 추가 스타일(강조 등)
 *
 * @param {object} XLSX
 * @param {object} ws
 * @param {{ r0:number, r1:number, c0?:number, c1:number, headerRows?:number, align?:string }} range
 */
export function applyTableStyle(
  XLSX,
  ws,
  {
    r0,
    r1,
    c0 = 0,
    c1,
    headerRows = 1,
    align,
    font,
    headerFill,
    columns,
    thickTop,
    thickLeft,
    cellStyle,
  }
) {
  const topSet = new Set(thickTop || []);
  const leftSet = new Set(thickLeft || []);
  const custom = Boolean(font || headerFill || columns || thickTop || thickLeft || cellStyle);

  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const isHeader = r < r0 + headerRows;
      const cell = ensureCell(XLSX, ws, r, c);
      const col = columns?.[c] || {};

      if (!custom) {
        cell.s = {
          border: CELL_BORDER,
          alignment: {
            horizontal: isHeader ? 'center' : align || 'center',
            vertical: 'center',
            wrapText: true,
          },
          ...(isHeader ? { font: { bold: true } } : {}),
        };
        continue;
      }

      const style = {
        border: borderFor(r, c, topSet, leftSet),
        alignment: {
          horizontal: isHeader ? 'center' : col.align || align || 'center',
          vertical: 'center',
          wrapText: true,
        },
      };
      if (font) {
        style.font = isHeader
          ? { name: font.name, sz: (font.sz || 10) + 1, bold: true }
          : { name: font.name, sz: font.sz || 10 };
      } else if (isHeader) {
        style.font = { bold: true };
      }
      if (isHeader && headerFill) {
        style.fill = { patternType: 'solid', fgColor: { rgb: headerFill } };
      }
      if (!isHeader && col.numFmt && cell.t === 'n') style.numFmt = col.numFmt;

      const extra = !isHeader && cellStyle ? cellStyle(r, c, cell) : null;
      if (extra?.font) style.font = { ...(style.font || {}), ...extra.font };
      if (extra?.fill) {
        style.fill = { patternType: 'solid', fgColor: { rgb: extra.fill } };
      }
      cell.s = style;
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
