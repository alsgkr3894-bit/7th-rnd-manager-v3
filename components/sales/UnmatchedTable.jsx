'use client';
import { formatNumber } from '@/lib/format';

/**
 * UnmatchedTable — 미매칭 issue 목록 테이블
 *
 * @param {Array} issues — { id, year, month, representativeRawMenuName, normalizedMenuName, totalQuantity, affectedRowCount, status }
 */
export function UnmatchedTable({ issues }) {
  return (
    <div className="card" style={{marginTop:16}}>
      <div style={{overflowX:'auto'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:110}}>월</th>
              <th>대표 메뉴명 (원본)</th>
              <th>정규화 후</th>
              <th style={{width:120, textAlign:'right'}}>총 수량</th>
              <th style={{width:120, textAlign:'right'}}>영향 행 수</th>
              <th style={{width:100}}>상태</th>
            </tr>
          </thead>
          <tbody>
            {issues.map(it => (
              <tr key={it.id}>
                <td>
                  <span className="period-pill num">
                    {it.year}.{String(it.month).padStart(2, '0')}
                  </span>
                </td>
                <td className="cell-name"><div className="menu-name">{it.representativeRawMenuName}</div></td>
                <td className="cell-name">
                  <span style={{color:'var(--text-3)', fontSize:12}}>{it.normalizedMenuName}</span>
                </td>
                <td className="num right">{formatNumber(it.totalQuantity)}<span className="unit">개</span></td>
                <td className="num right">{formatNumber(it.affectedRowCount)}</td>
                <td>
                  {it.status === 'open' ? (
                    <span className="chip" style={{background:'var(--negative-soft)', color:'var(--negative)'}}>미해결</span>
                  ) : (
                    <span className="chip" style={{background:'var(--positive-soft)', color:'var(--positive)'}}>해결됨</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
