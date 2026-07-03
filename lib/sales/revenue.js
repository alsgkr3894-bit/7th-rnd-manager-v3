/**
 * Menu sales revenue helpers.
 *
 * Revenue is optional in upload files. Missing or unreadable values should not
 * block quantity-based sales workflows, so callers get a safe numeric fallback.
 */

export function safeRevenue(value) {
  if (value == null || value === '') return 0;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const text = String(value).trim();
  if (!text) return 0;

  const normalized = text.replace(/[,\s₩원]/g, '');
  if (!/^[-+]?\d+(\.\d+)?$/.test(normalized)) return 0;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}
