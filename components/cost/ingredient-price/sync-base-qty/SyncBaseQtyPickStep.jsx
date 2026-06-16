'use client';

import { priceFileLabel } from './syncBaseQtyModalUtils';

export function SyncBaseQtyPickStep({
  files,
  fileId,
  phase,
  onFileId,
  onPreview,
  onClose,
}) {
  const isComputing = phase === 'computing';

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
          제때 단가 파일 선택
        </label>
        {files.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '12px 0' }}>
            업로드된 제때 단가 파일이 없습니다.
          </div>
        ) : (
          <select
            value={fileId ?? ''}
            onChange={event => onFileId(Number(event.target.value))}
            disabled={isComputing}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: 13,
              color: 'var(--text)',
            }}
          >
            {files.map(file => (
              <option key={file.id} value={file.id}>
                {priceFileLabel(file)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn" onClick={onClose} disabled={isComputing}>
          취소
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={onPreview}
          disabled={!fileId || files.length === 0 || isComputing}
        >
          {isComputing ? '계산 중…' : '프리뷰 보기'}
        </button>
      </div>
    </>
  );
}
