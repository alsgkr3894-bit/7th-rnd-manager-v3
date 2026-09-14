import { formatNumber } from '@/lib/format';

export function ManageRowPriceCell({
  priceWithTax,
  isPieceUnit = false,
  unitPrice = null,
  pieceWeightGrams = null,
  perGramPrice = null,
}) {
  const missing = priceWithTax == null;
  // 포장단위가 '개'일 때만 1개당 원가·g 정보를 보조로 보여준다. unitPrice는 이미 "1개당 원가"다
  // (calcUnitPrice가 포장수량으로 나눔) — priceWithTax(포장 전체 가격)와는 다른 값이다.
  const showPieceInfo = isPieceUnit && unitPrice != null;
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
      {showPieceInfo && (
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', marginTop: 2 }}>
          1개당 {formatNumber(unitPrice)}원
          {pieceWeightGrams != null && ` · ${formatNumber(pieceWeightGrams)}g`}
          {perGramPrice != null && ` (g당 ${formatNumber(perGramPrice)}원)`}
        </div>
      )}
    </td>
  );
}
