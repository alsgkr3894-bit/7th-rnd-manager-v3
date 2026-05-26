'use client';
import { MenuPriceRow } from './MenuPriceRow';

export function MenuPriceTable({ rows, deletePending, onEdit, onDeleteStart, onDeleteCancel, onDeleteConfirm }) {
  if (rows.length === 0) {
    return (
      <div className="card table-card" style={{padding:'40px 0', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
        조건에 맞는 항목이 없습니다
      </div>
    );
  }

  return (
    <div className="card table-card">
      <div style={{overflowX:'auto'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:100}}>분류</th>
              <th>메뉴명</th>
              <th style={{width:80}}>규격</th>
              <th style={{width:120, textAlign:'right'}}>판매가</th>
              <th>비고</th>
              <th style={{width:84}}/>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <MenuPriceRow
                key={r.id}
                r={r}
                deletePending={deletePending === r.id}
                onEdit={() => onEdit(r)}
                onDeleteStart={() => onDeleteStart(r.id)}
                onDeleteCancel={onDeleteCancel}
                onDeleteConfirm={() => onDeleteConfirm(r.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div style={{padding:'8px 16px', fontSize:11, color:'var(--text-3)', borderTop:'1px solid var(--divider)'}}>
        총 {rows.length}개
      </div>
    </div>
  );
}
