'use client';
import { formatNumber } from '@/lib/format';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

function formatUploadedAt(value) {
  if (value == null) return '';
  const raw =
    typeof value === 'string' || typeof value === 'number' || value instanceof Date
      ? value
      : asDisplayText(value);
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : `업로드 ${date.toLocaleString('ko-KR')}`;
}

/**
 * PriceLatestKpi — 최신 단가 화면 상단 3카드 (기준일 / 총 갯수 / 파일명)
 */
export function PriceLatestKpi({
  latestFile,
  rows = [],
  files = [],
  latestFileId,
  onLatestChange,
}) {
  const safeLatestFile = latestFile && typeof latestFile === 'object' ? latestFile : {};
  const safeRows = asObjectArray(rows);
  const safeFiles = asObjectArray(files);
  const taxCount = safeRows.filter(r => r.taxType === '과세').length;
  const freeCount = safeRows.filter(r => r.taxType === '면세').length;
  const handleLatestChange = typeof onLatestChange === 'function' ? onLatestChange : () => {};
  const updateDate = asDisplayText(safeLatestFile.updateDate, '-');
  const fileName = asDisplayText(safeLatestFile.fileName, '-');
  const uploadedAt = formatUploadedAt(safeLatestFile.uploadedAt);

  return (
    <div className="hero-row" style={{ marginTop: 16 }}>
      <div className="card kpi-card">
        <div>
          <div className="label">기준일</div>
          <div className="value num" style={{ fontSize: 22 }}>
            {updateDate}
          </div>
          <div className="trend">
            <select
              value={latestFileId ?? ''}
              onChange={e => {
                const id = Number(e.target.value);
                handleLatestChange(Number.isSafeInteger(id) && id > 0 ? id : null);
              }}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '4px 8px',
                fontSize: 12,
                color: 'var(--text-2)',
              }}
            >
              {safeFiles.map((f, index) => {
                const id = asDisplayText(f.id, `file-${index}`);
                return (
                  <option key={id} value={id}>
                    {asDisplayText(f.updateDate, '-')}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>
      <div className="card kpi-card">
        <div>
          <div className="label">총 상품 갯수</div>
          <div className="value num">
            {formatNumber(safeRows.length)}
            <span className="unit">개</span>
          </div>
          <div className="trend">
            <span style={{ color: 'var(--text-3)' }}>
              과세 {formatNumber(taxCount)} · 면세 {formatNumber(freeCount)}
            </span>
          </div>
        </div>
      </div>
      <div className="card kpi-card">
        <div>
          <div className="label">파일명</div>
          <div
            className="value num"
            style={{
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {fileName}
          </div>
          <div className="trend">
            <span style={{ color: 'var(--text-3)' }}>{uploadedAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
