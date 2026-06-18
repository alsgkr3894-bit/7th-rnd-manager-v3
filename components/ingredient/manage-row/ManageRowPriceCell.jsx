import { formatNumber } from '@/lib/format';

export function ManageRowPriceCell({ priceWithTax }) {
  const missing = priceWithTax == null;
  return (
    <td
      className="num right"
      style={{ fontWeight: 600, fontSize: 12, color: missing ? 'var(--warn)' : undefined }}
    >
      {missing ? (
        '미입력'
      ) : (
        <>
          {formatNumber(priceWithTax)}
          <span className="unit">원</span>
        </>
      )}
    </td>
  );
}
