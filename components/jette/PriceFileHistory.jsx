'use client';
import { formatNumber, formatRelative } from '@/lib/format';
import { ConfirmDeleteButton } from './_ConfirmDeleteButton';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

export function PriceFileHistory({ files, onDelete }) {
  const safeFiles = asObjectArray(files);
  const handleDelete = typeof onDelete === 'function' ? onDelete : null;
  if (safeFiles.length === 0) {
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
          <div className="card-sub">총 {safeFiles.length}건 · 최신순</div>
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
            {safeFiles.map((f, index) => {
              const fileId = f.id;
              const rowKey = asDisplayText(fileId, `price-file-${index}`);
              const updateDate = asDisplayText(f.updateDate, '-');
              const fileName = asDisplayText(f.fileName, '(이름 없음)');
              const uploadedAt = asDisplayText(f.uploadedAt);
              const totalRows = Number.isFinite(Number(f.totalRows)) ? Number(f.totalRows) : 0;
              const canDelete = handleDelete && fileId != null;

              return (
              <tr key={rowKey}>
                <td>
                  <span className="period-pill num">{updateDate}</span>
                </td>
                <td className="cell-name">
                  <div className="menu-name">{fileName}</div>
                  <div style={{fontSize:12, color:'var(--text-2)', marginTop:4, fontWeight:500}}>
                    업로드 {uploadedAt ? formatRelative(uploadedAt) : '-'}
                  </div>
                </td>
                <td className="num right">
                  {formatNumber(totalRows)}<span className="unit">개</span>
                </td>
                <td style={{textAlign:'right'}}>
                  {canDelete && <ConfirmDeleteButton onDelete={() => handleDelete(fileId)} />}
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
