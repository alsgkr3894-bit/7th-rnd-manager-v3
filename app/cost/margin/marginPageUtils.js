export function normalizePercentSetting(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

export const normalizeWarnPercentSetting = value => normalizePercentSetting(value, 30);
export const normalizeCritPercentSetting = value => normalizePercentSetting(value, 40);
