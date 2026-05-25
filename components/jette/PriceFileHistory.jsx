'use client';
import { useState } from 'react';
import { formatNumber, formatRelative } from '@/lib/format';

/**
 * PriceFileHistory — 업로드된 가격 파일 이력 + 삭제
 *
 * @param {Array} files
 * @param {(fileId) => Promise<void>} onDelete
 */
export function PriceFileHistory({ files, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function handleDelete(f) {
    setBusyId(f.id);
    try {
      await onDelete(f.id);
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  }

  if (!files || files.length === 0) {
    return (
      <div className="card" style={{marginTop:16}}>
        <div className="card-header">
          <div>
            <div className="card-title">업로드 이력</div>
            <div className="card-sub">가격 파일은 같은 날짜로 중복 업로드할 수 없습니다</div>
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
          <div className="card-sub">총 {files.length}건 · 최신순</div>
        </div>
      </div>
      <div style={{overflowX:'auto'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:130}}>적용 날짜</th>
              <th>파일명 / 업로드 시각</th>
              <th style={{width:130, textAlign:'right'}}>행 수</th>
              <th style={{width:140}}></th>
            </tr>
          </thead>
          <tbody>
            {files.map(f => (
              <tr key={f.id}>
                <td>
                  <span className="period-pill num">{f.updateDate}</span>
                </td>
                <td className="cell-name">
                  <div className="menu-name">{f.fileName || '(이름 없음)'}</div>
                  <div style={{fontSize:12, color:'var(--text-2)', marginTop:4, fontWeight:500}}>
                    업로드 {f.uploadedAt ? formatRelative(f.uploadedAt) : '-'}
                  </div>
                </td>
                <td className="num right">
                  {formatNumber(f.totalRows ?? 0)}<span className="unit">개</span>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
