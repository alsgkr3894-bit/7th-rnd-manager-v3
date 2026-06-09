'use client';
import { formatNumber, formatRelative } from '@/lib/format';
import { ConfirmDeleteButton } from './_ConfirmDeleteButton';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

export function ShipmentHistory({ files, selectedYM, onSelectYM, onDelete }) {
  const safeFiles = asObjectArray(files);
  const safeSelectedYM = selectedYM && typeof selectedYM === 'object' ? selectedYM : null;
  const handleSelectYM = typeof onSelectYM === 'function' ? onSelectYM : null;
  const handleDelete = typeof onDelete === 'function' ? onDelete : null;

  if (safeFiles.length === 0) {
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">업로드 이력</div>
            <div className="card-sub">출고량 파일은 월별로 누적됩니다</div>
          </div>
        </div>
        <div
          style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}
        >
          업로드된 파일이 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <div>
          <div className="card-title">업로드 이력</div>
          <div className="card-sub">
            총 {safeFiles.length}건 · 행을 클릭하면 해당 월 집계가 표시됩니다
          </div>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 110 }}>적용 년월</th>
              <th>파일명 / 업로드 시각</th>
              <th style={{ width: 120, textAlign: 'right' }}>대상 행 수</th>
              <th style={{ width: 130, textAlign: 'right' }}>원본 행 수</th>
              <th style={{ width: 140 }}></th>
            </tr>
          </thead>
          <tbody>
            {safeFiles.map((f, index) => {
              const fileId = f.id;
              const rowKey = asDisplayText(fileId, `shipment-file-${index}`);
              const year = Number.isFinite(Number(f.year)) ? Number(f.year) : null;
              const month = Number.isFinite(Number(f.month)) ? Number(f.month) : null;
              const monthLabel = month == null ? '--' : String(month).padStart(2, '0');
              const fileName = asDisplayText(f.fileName, '(이름 없음)');
              const uploadedAt = asDisplayText(f.uploadedAt);
              const totalRows = Number.isFinite(Number(f.totalRows)) ? Number(f.totalRows) : 0;
              const sourceTotalRows = Number.isFinite(Number(f.sourceTotalRows))
                ? Number(f.sourceTotalRows)
                : null;
              const canSelect = handleSelectYM && year != null && month != null;
              const canDelete = handleDelete && fileId != null;
              const isSelected =
                safeSelectedYM &&
                Number(safeSelectedYM.year) === year &&
                Number(safeSelectedYM.month) === month;

              return (
                <tr
                  key={rowKey}
                  style={{
                    background: isSelected ? 'var(--accent-soft)' : undefined,
                    cursor: canSelect ? 'pointer' : 'default',
                  }}
                  onClick={e => {
                    if (!canSelect || e.target.closest('button')) return;
                    handleSelectYM({ year, month });
                  }}
                >
                  <td>
                    <span className="period-pill num">
                      {year ?? '-'}.{monthLabel}
                    </span>
                  </td>
                  <td className="cell-name">
                    <div className="menu-name">{fileName}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-2)',
                        marginTop: 4,
                        fontWeight: 500,
                      }}
                    >
                      업로드 {uploadedAt ? formatRelative(uploadedAt) : '-'}
                    </div>
                  </td>
                  <td className="num right" style={{ fontWeight: 700 }}>
                    {formatNumber(totalRows)}
                    <span className="unit">건</span>
                  </td>
                  <td className="num right" style={{ color: 'var(--text-3)', fontSize: 12 }}>
                    {sourceTotalRows != null ? `(${formatNumber(sourceTotalRows)}건)` : '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
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
