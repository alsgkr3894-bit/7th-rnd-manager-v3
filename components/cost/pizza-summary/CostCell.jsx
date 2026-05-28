'use client';
import { formatNumber } from '@/lib/format';

/**
 * 종합표의 한 셀 — 원가 + 원가율을 보여줌. 원가율 따라 색상 변경.
 *
 * @prop value { cost, rate, available, empty }
 */
export function CostCell({ value }) {
  if (!value || !value.available) {
    // 해당 없음 (예: 씬도우 R)
    return <td style={{textAlign:'right', color:'var(--text-4)', fontSize:12}}>—</td>;
  }
  if (value.empty || value.cost == null) {
    // 데이터 미입력
    return (
      <td style={{textAlign:'right', color:'var(--text-4)', fontSize:11, fontStyle:'italic'}}>
        미입력
      </td>
    );
  }

  const { cost, rate } = value;
  const isRisk = rate != null && rate >= 35;
  const isWarn = rate != null && rate >= 30 && rate < 35;
  const color = isRisk ? 'var(--negative)' : isWarn ? 'var(--warn)' : 'var(--text-1)';

  return (
    <td style={{textAlign:'right'}}>
      <div style={{fontWeight:700, fontSize:13, color}}>
        {formatNumber(cost)}<span style={{fontSize:11, fontWeight:500, marginLeft:2, opacity:.7}}>원</span>
      </div>
      {rate != null && (
        <div style={{fontSize:10, fontWeight:600, color, marginTop:1}}>
          {rate.toFixed(1)}%<span style={{fontWeight:400, opacity:.65, marginLeft:2}}>원가율</span>
        </div>
      )}
    </td>
  );
}
