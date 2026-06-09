/**
 * lib/sales/parse-period.js — 판매 기간 탐지
 *
 * 월 전체 기간(1일~말일)만 허용. 월 일부 기간은 차단.
 * 예: "2026-04-01 ~ 2026-04-30" → { year: 2026, month: 4 }
 */

function getMonthEndDate(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * 텍스트에서 (년, 월) 추출. 월 전체가 아니면 null.
 */
function extractMonthPeriod(text) {
  if (!text || typeof text !== 'string') return null;

  const m = text.match(
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s*[~\-→]\s*(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/
  );
  if (!m) return null;

  const sy = +m[1],
    sM = +m[2],
    sd = +m[3];
  const ey = +m[4],
    eM = +m[5],
    ed = +m[6];

  if (sM < 1 || sM > 12 || eM < 1 || eM > 12) return null;
  if (sd < 1 || sd > 31 || ed < 1 || ed > 31) return null;
  if (sy < 2000 || sy > 2100) return null;

  // 실재 날짜 검증 (2026-02-30 같은 invalid 차단)
  const startDate = new Date(sy, sM - 1, sd);
  if (
    startDate.getFullYear() !== sy ||
    startDate.getMonth() !== sM - 1 ||
    startDate.getDate() !== sd
  )
    return null;

  // 같은 월
  if (sy !== ey || sM !== eM) return null;

  // 1일 시작 + 말일 종료
  const monthEnd = getMonthEndDate(sy, sM);
  if (sd === 1 && ed === monthEnd) return { year: sy, month: sM };
  return null;
}

/**
 * 행 데이터에서 판매 기간 탐지 (첫 20행 스캔)
 * @returns { success, year?, month?, reason? }
 */
export function parseSalesPeriod(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: false, reason: '파일이 비어있습니다.' };
  }
  const scan = rows.slice(0, 20);
  for (const row of scan) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      const period = extractMonthPeriod(String(cell));
      if (period) return { success: true, ...period };
    }
  }
  return {
    success: false,
    reason:
      '파일에서 판매 기간(월 전체: YYYY-MM-01 ~ YYYY-MM-말일)을 찾을 수 없습니다. 월 일부 기간은 업로드할 수 없습니다.',
  };
}
