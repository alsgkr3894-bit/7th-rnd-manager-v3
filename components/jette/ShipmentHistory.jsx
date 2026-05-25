'use client';
import { useState } from 'react';
import { formatNumber, formatRelative } from '@/lib/format';

/**
 * ShipmentHistory — 출고량 파일 이력 + 개별 삭제 + 월 단위 선택
 *
 * 같은 (year, month) 파일은 행 별로 표시하되, 행 클릭 시 그 월의 모든 파일 합산.
 */
export function ShipmentHistory({ files, selectedYM, onSelectYM, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function handleDelete(f) {
    setBusyId(f.id);
    try { await onDelete(f.id); }
    finally { setBusyId(null); setConfirmId(null); }
  }

  if (!files || files.length === 0) {
    return (
      <div className="card" style={{marginTop:16}}>
        <div className="card-header">
          <div>
            <div className="card-title">업로드 이력</div>
            <div className="card-sub">출고량 파일은 월별로 누적됩니다</div>
          </div>
        </div>
        <div style={{padding:'24px 0', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
          업로드된 파일이 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{marginTop:16}}>
      <div className="card-header">
        <div>
          <div className="card-title">업로드 이력</div>
          <div className="card-sub">총 {files.length}건 · 행을 클릭하면 해당 월 집계가 표시됩니다</div>
        </div>
      </div>
      <div style={{overflowX:'auto'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:110}}>적용 년월</th>
              <th>파일명 / 업로드 시각</th>
              <th style={{width:120, textAlign:'right'}}>대상 행 수</th>
              <th style={{width:130, textAlign:'right'}}>원본 행 수</th>
              <th style={{width:140}}></th>
            </tr>
          </thead>
          <tbody>
            {files.map(f => {
              const isSelected = selectedYM
                && selectedYM.year === f.year && selectedYM.month === f.month;
              return (
                <tr key={f.id}
                  style={{
                    background: isSelected ? 'var(--accent-soft)' : undefined,
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    if (e.target.tagName === 'BUTTON') return;
                    onSelectYM?.({ year: f.year, month: f.month });
                  }}
                >
                  <td>
                    <span className="period-pill num">
                      {f.year}.{String(f.month).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="cell-name">
                    <div className="menu-name">{f.fileName || '(이름 없음)'}</div>
                    <div style={{fontSize:12, color:'var(--text-2)', marginTop:4, fontWeight:500}}>
                      업로드 {f.uploadedAt ? formatRelative(f.uploadedAt) : '-'}
                    </div>
                  </td>
                  <td className="num right" style={{fontWeight:700}}>
                    {formatNumber(f.totalRows ?? 0)}<span className="unit">건</span>
                  </td>
                  <td className="num right" style={{color:'var(--text-3)', fontSize:12}}>
                    {f.sourceTotalRows != null
                      ? `(${formatNumber(f.sourceTotalRows)}건)`
                      : '-'}
                  </td>
                  <td style={{textAlign:'right'}}>
                    {confirmId === f.id ? (
                      <span style={{display:'inline-flex', gap:6}}>
                        <button className="btn sm" disabled={busyId === f.id} onClick={() => setConfirmId(null)}>취소</button>
                        <button
                          className="btn sm"
                          disabled={busyId === f.id}
                          onClick={() => handleDelete(f)}
                          style={{background:'var(--negative)', color:'#fff', borderColor:'var(--negative)'}}
                        >
                          {busyId === f.id ? '삭제 중...' : '삭제 확인'}
                        </button>
                      </span>
                    ) : (
                      <button className="btn sm" style={{color:'var(--negative)'}} onClick={() => setConfirmId(f.id)}>
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
