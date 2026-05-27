'use client';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { PIZZA_EDGE_VARIANTS } from '@/lib/cost/pizza-summary';
import { CostCell } from './CostCell';

/**
 * 피자 종합 원가표 — 메뉴 × 4종 엣지 매트릭스.
 *
 * @prop rows  buildPizzaSummary 결과
 */
export function PizzaSummaryTable({ rows }) {
  if (!rows?.length) {
    return (
      <div className="card" style={{minHeight:180, display:'grid', placeItems:'center'}}>
        <div style={{textAlign:'center', color:'var(--text-3)'}}>
          <Icon.calc style={{width:32, height:32, marginBottom:12, opacity:.4}}/>
          <div style={{fontWeight:600, marginBottom:4}}>표시할 피자 메뉴가 없습니다</div>
          <div style={{fontSize:13}}>메뉴 판매가에서 피자 메뉴를 먼저 등록해주세요.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card table-card">
      <div style={{overflowX:'auto'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:88}}>메뉴코드</th>
              <th>메뉴명</th>
              <th style={{width:50}}>규격</th>
              <th style={{width:96, textAlign:'right'}}>판매가</th>
              {PIZZA_EDGE_VARIANTS.map(v => (
                <th key={v.key} style={{width:110, textAlign:'right'}}>{v.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.menu.menuCode}>
                <td style={{
                  fontFamily:"'JetBrains Mono', ui-monospace, monospace",
                  fontSize:11, color:'var(--text-3)',
                }}>{r.menu.menuCode}</td>
                <td style={{fontWeight:600, fontSize:13}}>{r.menu.menuName}</td>
                <td style={{fontSize:12, color:'var(--text-2)'}}>{r.menu.size}</td>
                <td style={{textAlign:'right', fontWeight:600, fontSize:12}}>
                  {r.menu.price != null
                    ? <>{formatNumber(r.menu.price)}<span style={{fontSize:11, color:'var(--text-3)', marginLeft:2}}>원</span></>
                    : <span style={{color:'var(--text-4)'}}>—</span>}
                </td>
                {PIZZA_EDGE_VARIANTS.map(v => (
                  <CostCell key={v.key} value={r.byVariant[v.key]}/>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{padding:'10px 16px', fontSize:11, color:'var(--text-3)', borderTop:'1px solid var(--divider)',
        display:'flex', gap:16, flexWrap:'wrap'}}>
        <span><span style={{color:'var(--negative)'}}>●</span> 원가율 35%↑ 위험</span>
        <span><span style={{color:'var(--warn)'}}>●</span> 30~35% 주의</span>
        <span style={{color:'var(--text-4)'}}>※ 베이스(피자 세부) + 엣지·도우 자동 합산</span>
      </div>
    </div>
  );
}
