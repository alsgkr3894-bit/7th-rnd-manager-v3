import { formatNumber } from '@/lib/format';
import { InfoRow } from './RegisterModalPrimitives';

export function RegisterModalInfoPanel({ row }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'var(--surface-2)',
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 12,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '4px 16px',
      }}
    >
      <InfoRow label="제품명" value={row.productName} />
      <InfoRow
        label="부가세포함가"
        value={row.priceWithTax != null ? `${formatNumber(row.priceWithTax)}원` : '—'}
      />
      <InfoRow label="온도" value={row.temperature || '—'} />
      <InfoRow label="과세구분" value={row.taxType || '—'} />
      <InfoRow label="판매단위" value={row.salesUnit || '—'} />
    </div>
  );
}
