// 메뉴개발노트 보고서 출력용 이스케이프·문자열·날짜·원가 포맷 헬퍼

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function textHtml(value) {
  return esc(value).replace(/\n/g, '<br>');
}

export function cleanText(value) {
  return String(value ?? '').trim();
}

export function keyText(value) {
  return value == null ? '' : String(value);
}

export function parseReportTempCost(value) {
  try {
    if (!value) return { rows: [], sellingPrice: '' };
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return {
      rows: Array.isArray(parsed?.rows) ? parsed.rows : [],
      sellingPrice: parsed?.sellingPrice || '',
    };
  } catch {
    return { rows: [], sellingPrice: '' };
  }
}

export function tempCostRowSubtotal(row) {
  return (Number(row?.quantity) || 0) * (Number(row?.unitPrice) || 0);
}

export function calcReportTempCostSummary(rows, sellingPrice) {
  const totalCost = (Array.isArray(rows) ? rows : []).reduce(
    (sum, row) => sum + tempCostRowSubtotal(row),
    0
  );
  const sellNum = Number(sellingPrice) || 0;
  return {
    totalCost,
    costRate: sellNum > 0 ? (totalCost / sellNum) * 100 : null,
  };
}

export function validDate(date) {
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : new Date();
}

function pad(value) {
  return String(value).padStart(2, '0');
}

export function formatNoteReportDownloadDate(date = new Date()) {
  const safeDate = validDate(date);
  return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(safeDate.getDate())}`;
}

export function timeValue(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

export function compactDate(value) {
  return cleanText(value).slice(0, 10);
}

export function koreanDate(value) {
  const date = compactDate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [year, month, day] = date.split('-');
  return `${year}년${month}월${day}일`;
}
