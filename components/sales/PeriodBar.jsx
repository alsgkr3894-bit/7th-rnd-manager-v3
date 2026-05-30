'use client';
import { formatPeriodKor } from '@/lib/format';

const MODE_TABS = [
  { id: 'single', label: '월별 순위' },
  { id: 'mom',    label: '전월 대비' },
  { id: 'yoy',    label: '전년 동월' },
  { id: 'custom', label: '직접 지정' },
];

export function PeriodBar({ mode, onModeChange, periodA, periodB, availablePeriods = [], onCustomChange }) {
  const isCustom = mode === 'custom';
  const isSingle = mode === 'single';

  return (
    <div className="period-bar">
      {/* 모드 탭 */}
      <div className="period-tabs">
        {MODE_TABS.map(t => (
          <button
            key={t.id}
            className={mode === t.id ? 'active' : ''}
            onClick={() => onModeChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 기간 표시 */}
      <div className="period-disp">
        <PeriodSlot
          badge="A"
          badgeColor="var(--accent)"
          label={isSingle ? '선택 월' : '기준'}
          period={periodA}
          editable={isCustom || isSingle}
          options={availablePeriods}
          onChange={p => onCustomChange?.('a', p)}
        />

        {!isSingle && (
          <>
            <div className="period-vs">vs</div>
            <PeriodSlot
              badge="B"
              badgeColor="var(--text-3)"
              label="비교"
              period={periodB}
              editable={isCustom}
              options={availablePeriods}
              onChange={p => onCustomChange?.('b', p)}
              hint={!isCustom ? (mode === 'yoy' ? '전년 동월' : '전월') : null}
            />
          </>
        )}
      </div>
    </div>
  );
}

function PeriodSlot({ badge, badgeColor, label, period, editable, options, onChange, hint }) {
  return (
    <div className="period-slot">
      <div className="period-slot-head">
        <span className="period-badge" style={{ background: badgeColor + '22', color: badgeColor }}>{badge}</span>
        <span className="period-slot-label">{label}</span>
      </div>
      {editable ? (
        <PeriodSelect value={period} options={options} onChange={onChange} />
      ) : (
        <div className="period-slot-val">
          {formatPeriodKor(period)}
          {hint && <span className="period-slot-hint">{hint}</span>}
        </div>
      )}
    </div>
  );
}

function PeriodSelect({ value, options, onChange }) {
  const key = value ? `${value.year}-${value.month}` : '';
  return (
    <select
      className="period-select"
      value={key}
      onChange={e => {
        const [y, m] = e.target.value.split('-').map(Number);
        onChange({ year: y, month: m });
      }}
    >
      {!options.find(o => o.year === value?.year && o.month === value?.month) && (
        <option value={key}>{formatPeriodKor(value)}</option>
      )}
      {options.map(o => (
        <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
          {formatPeriodKor(o)}
        </option>
      ))}
    </select>
  );
}

