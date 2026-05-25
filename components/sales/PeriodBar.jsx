'use client';
import { Icon } from '@/components/icons';

/**
 * PeriodBar — 기간 선택 탭 + 기준(A)/비교(B) 표시
 *
 * @param {'yoy'|'mom'|'custom'|'single'} mode
 * @param {(mode) => void} onModeChange
 * @param {{year, month}} periodA
 * @param {{year, month}} periodB
 * @param {Array<{year, month}>} availablePeriods — sales_files 기준 (custom/single 모드용)
 * @param {(side, period) => void} onCustomChange — (side: 'a'|'b')
 */
export function PeriodBar({ mode, onModeChange, periodA, periodB, availablePeriods = [], onCustomChange }) {
  const isCustom = mode === 'custom';
  const isSingle = mode === 'single';

  return (
    <div className="period-bar">
      <div className="period-tabs">
        <button className={mode === 'single' ? 'active' : ''} onClick={() => onModeChange('single')}>순위</button>
        <button className={mode === 'mom' ? 'active' : ''} onClick={() => onModeChange('mom')}>전월</button>
        <button className={mode === 'yoy' ? 'active' : ''} onClick={() => onModeChange('yoy')}>전년 동월</button>
        <button className={mode === 'custom' ? 'active' : ''} onClick={() => onModeChange('custom')}>사용자 지정</button>
      </div>
      <div className="period-disp">
        <div className="period-side">
          <div className="period-label" style={{color: 'var(--accent-text)'}}>
            {isSingle ? '● 선택 년월' : '● 기준 (A)'}
          </div>
          {(isCustom || isSingle) ? (
            <>
              <PeriodSelect value={periodA} options={availablePeriods} onChange={(p) => onCustomChange?.('a', p)} />
              {isSingle && periodA && (
                <div className="period-val" style={{fontSize:12, color:'var(--text-3)', marginTop:4}}>
                  {periodA.year}년 {periodA.month}월
                </div>
              )}
            </>
          ) : (
            <div className="period-val">{formatPeriod(periodA)}</div>
          )}
        </div>
        {!isSingle && (
          <>
            <Icon.chevRight style={{width: 18, height: 18, color: 'var(--text-4)'}}/>
            <div className="period-side">
              <div className="period-label" style={{color: 'var(--text-3)'}}>● 비교 (B)</div>
              {isCustom ? (
                <PeriodSelect value={periodB} options={availablePeriods} onChange={(p) => onCustomChange?.('b', p)} />
              ) : (
                <div className="period-val">{formatPeriod(periodB)}{mode === 'yoy' ? ' (전년 동월)' : ' (전월)'}</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PeriodSelect({ value, options, onChange }) {
  const key = value ? `${value.year}-${value.month}` : '';
  return (
    <select
      className="period-select"
      value={key}
      onChange={(e) => {
        const [y, m] = e.target.value.split('-').map(Number);
        onChange({ year: y, month: m });
      }}
      style={{
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '6px 10px', fontSize: 14, fontWeight: 600,
        color: 'var(--text-1)',
      }}
    >
      {!options.find(o => o.year === value?.year && o.month === value?.month) && (
        <option value={key}>{formatPeriod(value)}</option>
      )}
      {options.map(o => (
        <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
          {formatPeriod(o)}
        </option>
      ))}
    </select>
  );
}

function formatPeriod(p) {
  if (!p || !p.year || !p.month) return '-';
  return `${p.year}년 ${p.month}월`;
}
