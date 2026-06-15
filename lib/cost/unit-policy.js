export const COST_BASE_UNITS = ['g', '개'];

const COUNT_UNITS = new Set([
  '개',
  'ea',
  'each',
  '입',
  '장',
  '봉',
  '팩',
  'pk',
  'pack',
  '캔',
  '병',
  '통',
  'box',
  'set',
  '세트',
]);

function cleanUnit(value) {
  return String(value ?? '').trim();
}

export function normalizeCostBaseUnit(value) {
  const unit = cleanUnit(value);
  if (unit === '개') return '개';
  if (COUNT_UNITS.has(unit.toLowerCase())) return '개';
  return 'g';
}

export function roundUnitPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 10) / 10;
}

export function normalizePurchaseQuantity(quantity, unit) {
  const amount = Number(quantity);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const text = cleanUnit(unit);
  const lower = text.toLowerCase();
  if (!text || lower === 'g' || text === '그램') return { quantity: amount, unit: 'g' };
  if (lower === 'kg' || text === '킬로' || text === '킬로그램') {
    return { quantity: amount * 1000, unit: 'g' };
  }
  if (text === '개' || COUNT_UNITS.has(lower)) return { quantity: amount, unit: '개' };

  return null;
}
