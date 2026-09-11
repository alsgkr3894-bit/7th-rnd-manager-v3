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
 * PriceLatestKpi — 최신 단가 화면 상단 KPI.
 * 기준일/총 갯수/직전 대비 변동은 .hero-row(3열 그리드, home-hero.css에서 공유)에,
 * 파일명은 그 아래 별도 카드로 — .hero-row는 홈 등 다른 화면과 그리드 열 수를
 * 공유하는 전역 클래스라 4번째 카드를 억지로 끼워 넣지 않는다.
 */
export function PriceLatestKpi({
  latestFile,
  rows = [],
  files = [],
  latestFileId,
  onLatestChange,
  prevFile = null,
  priceChangeSummary = null,
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
  const prevUpdateDate = asDisplayText(prevFile?.updateDate, '-');

  return (
    <>
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
            <div className="label">직전 대비 변동</div>
            {!prevFile ? (
              <>
                <div className="value num" style={{ fontSize: 22, color: 'var(--text-3)' }}>
                  -
                </div>
                <div className="trend">
                  <span style={{ color: 'var(--text-3)' }}>비교할 이전 파일이 없습니다</span>
                </div>
              </>
            ) : (
              <>
                <div className="value num" style={{ fontSize: 22 }}>
                  {formatNumber(priceChangeSummary?.changed?.length ?? 0)}
                  <span className="unit">개</span>
                </div>
                <div className="trend">
                  <span style={{ color: 'var(--text-3)' }}>
                    인상 {formatNumber(priceChangeSummary?.up ?? 0)} · 인하{' '}
                    {formatNumber(priceChangeSummary?.down ?? 0)} · 신규{' '}
                    {formatNumber(priceChangeSummary?.added ?? 0)} · 삭제{' '}
                    {formatNumber(priceChangeSummary?.removed ?? 0)} (직전 {prevUpdateDate})
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card kpi-card" style={{ marginTop: 12 }}>
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
    </>
  );
}
