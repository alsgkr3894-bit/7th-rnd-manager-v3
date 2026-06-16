'use client';

import { CHANGE_STATUS_STYLE } from '../managed-products-constants';
import { asDisplayText } from '@/lib/ui/prop-guards';

export function PriceCompareStatusChip({ status, alert = false }) {
  const safeStatus = asDisplayText(status, '-');
  const { bg, color } = CHANGE_STATUS_STYLE[safeStatus] || CHANGE_STATUS_STYLE._default;
  return (
    <span
      className="chip"
      style={{
        background: bg,
        color,
        boxShadow: alert ? `inset 0 0 0 1px ${color}` : undefined,
      }}
    >
      {safeStatus}
    </span>
  );
}
