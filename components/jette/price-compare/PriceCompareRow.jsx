'use client';

import { TypeSelect } from '../_TypeSelect';
import { isPriceChangeAlert } from '@/lib/jette/settings';
import {
  formatChangeAmount,
  formatChangeRate,
  formatPriceWon,
  getPriceCompareRowValues,
  priceChangeColor,
  priceCompareAlertStyle,
} from './priceCompareTableUtils';
import { PriceCompareStatusChip } from './PriceCompareStatusChip';

export function PriceCompareRow({
  row,
  productTypeLookup,
  canEdit = false,
  onTypeChange,
  priceAlertThreshold,
}) {
  const values = getPriceCompareRowValues(row);
  const color = priceChangeColor(values.changeStatus);
  const alert = isPriceChangeAlert(row, priceAlertThreshold);

  return (
    <tr style={priceCompareAlertStyle(values.changeStatus, alert)}>
      <td className="num" style={{ color: 'var(--text-3)', fontSize: 12 }}>
        {values.productCode}
      </td>
      <td className="cell-name">
        <div className="menu-name" title={values.productName}>
          {values.productName}
        </div>
      </td>
      <td>
        <TypeSelect
          productCode={values.productCode}
          productName={values.productName}
          productTypeLookup={productTypeLookup}
          disabled={!canEdit}
          onTypeChange={onTypeChange}
        />
      </td>
      <td className="num right">{formatPriceWon(values.basePrice)}</td>
      <td className="num right" style={{ fontWeight: 700 }}>
        {formatPriceWon(values.latestPrice)}
      </td>
      <td className="num right" style={{ color, fontWeight: 600 }}>
        {formatChangeAmount(values.changeAmount)}
      </td>
      <td className="num right" style={{ color, fontWeight: alert ? 800 : 700 }}>
        {formatChangeRate(values.changeRate)}
      </td>
      <td>
        <PriceCompareStatusChip status={values.changeStatus} alert={alert} />
      </td>
    </tr>
  );
}
