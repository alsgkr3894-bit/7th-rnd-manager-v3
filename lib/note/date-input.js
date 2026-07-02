const DATE_INPUT_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const YEAR_MONTH_DAY_RE = /^(\d{2}|\d{4})[./\-\s](\d{1,2})[./\-\s](\d{1,2})$/;
const KOREAN_DATE_RE = /^(\d{2}|\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?$/;
const MONTH_DAY_RE = /^(\d{1,2})[./\-\s](\d{1,2})$/;
const KOREAN_MONTH_DAY_RE = /^(\d{1,2})\s*월\s*(\d{1,2})\s*일?$/;

function pad2(value) {
  return String(value).padStart(2, '0');
}

function expandYear(value) {
  const text = String(value);
  if (text.length === 4) return Number(text);
  const year = Number(text);
  if (!Number.isFinite(year)) return NaN;
  return year >= 70 ? 1900 + year : 2000 + year;
}

function referenceYear(referenceDate, now = new Date()) {
  const text = String(referenceDate || '');
  const match = text.match(/^(\d{4})-\d{2}-\d{2}$/);
  if (match) return Number(match[1]);
  if (now instanceof Date && Number.isFinite(now.getTime())) return now.getFullYear();
  return new Date().getFullYear();
}

function formatDateParts(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return '';
  if (y < 1900 || y > 2199 || m < 1 || m > 12 || d < 1 || d > 31) return '';

  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return '';
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function parseNoteQuickDate(value, { referenceDate, now } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const direct = raw.match(DATE_INPUT_RE);
  if (direct) return formatDateParts(direct[1], direct[2], direct[3]);

  const korean = raw.match(KOREAN_DATE_RE);
  if (korean) return formatDateParts(expandYear(korean[1]), korean[2], korean[3]);

  const separated = raw.match(YEAR_MONTH_DAY_RE);
  if (separated) return formatDateParts(expandYear(separated[1]), separated[2], separated[3]);

  const koreanMonthDay = raw.match(KOREAN_MONTH_DAY_RE);
  if (koreanMonthDay) {
    return formatDateParts(referenceYear(referenceDate, now), koreanMonthDay[1], koreanMonthDay[2]);
  }

  const monthDay = raw.match(MONTH_DAY_RE);
  if (monthDay) return formatDateParts(referenceYear(referenceDate, now), monthDay[1], monthDay[2]);

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) {
    return formatDateParts(digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8));
  }
  if (digits.length === 6) {
    return formatDateParts(expandYear(digits.slice(0, 2)), digits.slice(2, 4), digits.slice(4, 6));
  }
  if (digits.length === 4) {
    return formatDateParts(
      referenceYear(referenceDate, now),
      digits.slice(0, 2),
      digits.slice(2, 4)
    );
  }

  return '';
}
