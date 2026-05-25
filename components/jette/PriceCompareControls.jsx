'use client';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';

/**
 * PriceCompareControls — 기준/최신 날짜 선택 + 안내 배너
 *
 * @param {Array} files — getPriceFiles 결과 (최신순)
 * @param {number} baseFileId
 * @param {number} latestFileId
 * @param {(id) => void} onBaseChange / onLatestChange
 * @param {{ up, down, total }} summary — 인상/인하 카운트
 */
export function PriceCompareControls({ files, baseFileId, latestFileId, onBaseChange, onLatestChange, summary }) {
  if (files.length === 0) return null;

  const latest = files.find(f => f.id === latestFileId);
  const base   = files.find(f => f.id === baseFileId);

  return (
    <>
      <div className="info-banner info-accent" style={{marginTop:16}}>
        <div className="info-banner-ico" style={{background:'var(--accent-soft)', color:'var(--accent-text)'}}>
          <Icon.alert style={{width:16,height:16}}/>
        </div>
        <div>
          {latest ? (
            <>
              <b>최신 제때 단가: {latest.updateDate}</b>
              {base && summary && (
                <> · 이전 단가({base.updateDate}) 대비 인상 {formatNumber(summary.up)}개 / 인하 {formatNumber(summary.down)}개</>
              )}
              {!base && ' · 이전 비교 대상 없음 (모두 신규)'}
            </>
          ) : (
            <b>비교할 단가 파일을 선택하세요</b>
          )}
        </div>
      </div>

      <div className="period-bar" style={{marginTop:16}}>
        <div className="period-tabs" style={{fontSize:12, color:'var(--text-3)', padding:'8px 12px'}}>
          비교 날짜 선택
        </div>
        <div className="period-disp">
          <DateSide
            label="● 기준 (이전)"
            color="var(--text-3)"
            files={files}
            value={baseFileId}
            onChange={onBaseChange}
            allowNull
          />
          <Icon.chevRight style={{width: 18, height: 18, color: 'var(--text-4)'}}/>
          <DateSide
            label="● 최신"
            color="var(--accent-text)"
            files={files}
            value={latestFileId}
            onChange={onLatestChange}
          />
        </div>
      </div>
    </>
  );
}

function DateSide({ label, color, files, value, onChange, allowNull }) {
  return (
    <div className="period-side">
      <div className="period-label" style={{color}}>{label}</div>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
        style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 10px', fontSize: 14, fontWeight: 600,
          color: 'var(--text-1)',
        }}
      >
        {allowNull && <option value="">(없음)</option>}
        {files.map(f => (
          <option key={f.id} value={f.id}>{f.updateDate}</option>
        ))}
      </select>
    </div>
  );
}
