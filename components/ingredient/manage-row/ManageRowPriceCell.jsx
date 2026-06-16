import { formatNumber } from '@/lib/format';

export function ManageRowPriceCell({ priceWithTax }) {
  return (
    <td className="num right" style={{ fontWeight: 600, fontSize: 12 }}>
      {priceWithTax != null ? (
        <>
          {formatNumber(priceWithTax)}
          <span className="unit">원</span>
        </>
      ) : (
        '-'
      )}
    </td>
  );
}
