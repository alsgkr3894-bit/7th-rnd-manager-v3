import { clampInteger } from '@/lib/ui/prop-guards';

export function Stars({ value, size = 14 }) {
  const rating = clampInteger(value, { min: 0, max: 5, fallback: 0 });

  return (
    <span style={{ color: 'var(--star)', fontSize: size, letterSpacing: 1 }}>
      {'★'.repeat(rating)}
      <span style={{ color: 'var(--border)' }}>{'★'.repeat(5 - rating)}</span>
    </span>
  );
}
