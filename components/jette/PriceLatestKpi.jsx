'use client';
import { formatNumber } from '@/lib/format';

/**
 * PriceLatestKpi — 최신 단가 화면 상단 3카드 (기준일 / 총 갯수 / 파일명)
 */
export function PriceLatestKpi({ latestFile, rows, files, latestFileId, onLatestChange }) {
  const taxCount = rows.filter(r => r.taxType === '과세').length;
  const freeCount = rows.filter(r => r.taxType === '면세').length;

  return (
    <div className="hero-row" style={{marginTop:16}}>
      <div className="card kpi-card">
        <div>
          <div className="label">기준일</div>
          <div className="value num" style={{fontSize:22}}>
            {latestFile?.updateDate || '-'}
          </div>
          <div className="trend">
            <select
              value={latestFileId ?? ''}
              onChange={e => onLatestChange?.(e.target.value ? Number(e.target.value) : null)}
              style={{
                background:'var(--surface-2)', border:'1px solid var(--border)',
                borderRadius:8, padding:'4px 8px', fontSize:12, color:'var(--text-2)',
              }}
            >
              {files.map(f => <option key={f.id} value={f.id}>{f.updateDate}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="card kpi-card">
        <div>
          <div className="label">총 상품 갯수</div>
          <div className="value num">{formatNumber(rows.length)}<span className="unit">개</span></div>
          <div className="trend">
            <span style={{color:'var(--text-3)'}}>
              과세 {formatNumber(taxCount)} · 면세 {formatNumber(freeCount)}
            </span>
          </div>
        </div>
      </div>
      <div className="card kpi-card">
        <div>
          <div className="label">파일명</div>
          <div className="value num" style={{
            fontSize:13, fontWeight:600,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          }}>
            {latestFile?.fileName || '-'}
          </div>
          <div className="trend">
            <span style={{color:'var(--text-3)'}}>
              {latestFile?.uploadedAt ? `업로드 ${new Date(latestFile.uploadedAt).toLocaleString('ko-KR')}` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
