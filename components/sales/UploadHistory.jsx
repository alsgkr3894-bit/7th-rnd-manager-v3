'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { formatNumber, formatRelative } from '@/lib/format';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/**
 * UploadHistory — 업로드 이력 테이블 (개별 삭제 지원)
 *
 * @param {Array} files
 * @param {(fileId, year, month) => Promise<void>} onDelete
 */
export function UploadHistory({ files, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const safeFiles = asObjectArray(files);
  const handleDeleteFile = typeof onDelete === 'function' ? onDelete : null;

  async function handleDelete(file, rowKey) {
    if (!handleDeleteFile) return;
    const fileId = file?.id;
    setBusyId(rowKey);
    try {
      await handleDeleteFile(fileId, file.year, file.month);
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  }

  if (safeFiles.length === 0) {
    return (
      <div className="card" style={{ marginTop: 8 }}>
        <div className="card-header" style={{ borderBottom: 'none' }}>
          <div>
            <div className="card-title">업로드 이력</div>
            <div className="card-sub">월별로 1건씩 유지됩니다</div>
          </div>
        </div>
        <div className="empty-state" style={{ margin: '0 22px 22px' }}>
          <Icon.upload style={{ width: 36, height: 36, color: 'var(--text-4)' }} />
          <div className="empty-title">업로드 이력이 비어있어요</div>
          <div className="empty-sub">위에서 새 파일을 업로드해보세요.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div className="card-header">
        <div>
          <div className="card-title">업로드 이력</div>
          <div className="card-sub">월별로 1건씩 유지됩니다 · 행을 직접 삭제할 수 있어요</div>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 110 }}>적용 년월</th>
              <th>파일명 / 업로드 시각</th>
              <th style={{ width: 120, textAlign: 'right' }}>처리 건수</th>
              <th style={{ width: 160 }}></th>
            </tr>
          </thead>
          <tbody>
            {safeFiles.map((f, index) => {
              const rowKey = asDisplayText(f.id, `file-${index}`);
              const canDelete = handleDeleteFile && f.id != null;
              const year = asDisplayText(f.year, '-');
              const month = asDisplayText(f.month);
              const monthLabel = month ? month.padStart(2, '0') : '--';
              const fileName = asDisplayText(f.fileName, '(이름 없음)');
              const uploadedAt = asDisplayText(f.uploadedAt);
              const isBusy = busyId === rowKey;
              const isConfirming = confirmId === rowKey;

              return (
                <tr key={rowKey}>
                  <td>
                    <span className="period-pill num">
                      {year}.{monthLabel}
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
                  <td className="num right">
                    {formatNumber(f.totalRows ?? 0)}
                    <span className="unit">건</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isConfirming ? (
                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--negative)' }}>삭제할까요?</span>
                        <button
                          className="btn sm"
                          onClick={() => setConfirmId(null)}
                          disabled={isBusy}
                        >
                          취소
                        </button>
                        <button
                          className="btn sm"
                          style={{
                            background: 'var(--negative)',
                            color: '#fff',
                            borderColor: 'var(--negative)',
                          }}
                          onClick={() => handleDelete(f, rowKey)}
                          disabled={isBusy || !canDelete}
                        >
                          {isBusy ? '삭제 중...' : '삭제'}
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn sm"
                        onClick={() => setConfirmId(rowKey)}
                        style={{ color: 'var(--negative)' }}
                        disabled={!canDelete}
                      >
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
