'use client';
import { Icon } from '@/components/icons';
import { formatNumber, formatRelative } from '@/lib/format';

/**
 * UploadHistory — 업로드 이력 테이블
 *
 * @param {Array} files — sales_files [{ id, year, month, fileName, uploadedAt, totalRows, ... }, ...]
 */
export function UploadHistory({ files }) {
  if (!files || files.length === 0) {
    return (
      <div className="card" style={{marginTop:8}}>
        <div className="card-header" style={{borderBottom:'none'}}>
          <div>
            <div className="card-title">업로드 이력</div>
            <div className="card-sub">월별로 1건씩 유지됩니다</div>
          </div>
        </div>
        <div className="empty-state" style={{margin:'0 22px 22px'}}>
          <Icon.upload style={{width:36, height:36, color:'var(--text-4)'}}/>
          <div className="empty-title">업로드 이력이 비어있어요</div>
          <div className="empty-sub">위에서 새 파일을 업로드해보세요.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card table-card" style={{marginTop:8}}>
      <div className="card-header">
        <div>
          <div className="card-title">업로드 이력</div>
          <div className="card-sub">월별로 1건씩 유지됩니다</div>
        </div>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{width:110}}>적용 년월</th>
            <th>파일명</th>
            <th style={{width:140, textAlign:'right'}}>처리 건수</th>
            <th style={{width:170}}>업로드 시각</th>
          </tr>
        </thead>
        <tbody>
          {files.map(f => (
            <tr key={f.id}>
              <td>
                <span className="period-pill num">
                  {f.year}.{String(f.month).padStart(2, '0')}
                </span>
              </td>
              <td className="cell-name">
                <div className="menu-name">{f.fileName || '(이름 없음)'}</div>
              </td>
              <td className="num right">
                {formatNumber(f.totalRows ?? 0)}<span className="unit">건</span>
              </td>
              <td className="num" style={{fontSize:12, color:'var(--text-3)'}}>
                {f.uploadedAt ? formatRelative(f.uploadedAt) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
