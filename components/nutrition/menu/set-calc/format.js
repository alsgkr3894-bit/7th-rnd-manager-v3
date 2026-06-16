export const formatKcal = value =>
  value != null ? `${Math.round(Number(value)).toLocaleString()} kcal` : '—';

export const formatKcalRange = result =>
  result?.minKcal != null || result?.maxKcal != null
    ? `${formatKcal(result.minKcal)} ~ ${formatKcal(result.maxKcal)}`
    : '—';
