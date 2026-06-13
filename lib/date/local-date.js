const DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

export function isDateInput(value) {
  return typeof value === 'string' && DATE_INPUT_RE.test(value);
}

export function formatLocalDateInput(value = new Date()) {
  const date = toDate(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatLocalMonthInput(value = new Date()) {
  const date = toDate(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function addLocalDays(value, days) {
  const date = toDate(value);
  if (!Number.isFinite(date.getTime())) return new Date(NaN);
  const next = new Date(date);
  next.setDate(next.getDate() + Number(days || 0));
  return next;
}

/** 오늘 날짜(로컬 타임존) → "YYYY-MM-DD" */
export function todayLocalDate() {
  return formatLocalDateInput();
}

/** days일 전 날짜(로컬 타임존) → "YYYY-MM-DD" */
export function localDateBefore(days) {
  return formatLocalDateInput(addLocalDays(new Date(), -days));
}
