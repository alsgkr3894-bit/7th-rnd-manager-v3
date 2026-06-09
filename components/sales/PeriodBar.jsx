'use client';
import { formatPeriodKor } from '@/lib/format';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const MODE_TABS = [
  { id: 'single', label: '월별 순위' },
  { id: 'mom',    label: '전월 대비' },
  { id: 'yoy',    label: '전년 동월' },
  { id: 'custom', label: '직접 지정' },
];
const MODE_IDS = new Set(MODE_TABS.map(tab => tab.id));

export function PeriodBar({ mode, onModeChange, periodA, periodB, availablePeriods = [], onCustomChange }) {
  const requestedMode = asDisplayText(mode, 'single');
  const safeMode = MODE_IDS.has(requestedMode) ? requestedMode : 'single';
  const isCustom = safeMode === 'custom';
  const isSingle = safeMode === 'single';
  const safePeriods = asObjectArray(availablePeriods).filter(isValidPeriod);
  const handleModeChange = typeof onModeChange === 'function' ? onModeChange : () => {};
  const handleCustomChange = typeof onCustomChange === 'function' ? onCustomChange : () => {};

  return (
    <div className="period-bar">
      {/* 모드 탭 */}
      <div className="period-tabs">
        {MODE_TABS.map(t => (
          <button
            key={t.id}
            className={safeMode === t.id ? 'active' : ''}
            onClick={() => handleModeChange(t.id)}
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
          options={safePeriods}
          onChange={p => handleCustomChange('a', p)}
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
              options={safePeriods}
              onChange={p => handleCustomChange('b', p)}
              hint={!isCustom ? (safeMode === 'yoy' ? '전년 동월' : '전월') : null}
            />
          </>
        )}
      </div>
    </div>
  );
}

function PeriodSlot({ badge, badgeColor, label, period, editable, options, onChange, hint }) {
  const safeBadge = asDisplayText(badge);
  const safeBadgeColor = asDisplayText(badgeColor, 'var(--text-3)');
  const safeLabel = asDisplayText(label);
  const safeHint = asDisplayText(hint);

  return (
    <div className="period-slot">
      <div className="period-slot-head">
        <span className="period-badge" style={{ background: safeBadgeColor + '22', color: safeBadgeColor }}>{safeBadge}</span>
        <span className="period-slot-label">{safeLabel}</span>
      </div>
      {editable ? (
        <PeriodSelect value={period} options={options} onChange={onChange} />
      ) : (
        <div className="period-slot-val">
          {formatPeriodKor(period)}
          {safeHint && <span className="period-slot-hint">{safeHint}</span>}
        </div>
      )}
    </div>
  );
}

function PeriodSelect({ value, options, onChange }) {
  const safeOptions = asObjectArray(options).filter(isValidPeriod);
  const key = isValidPeriod(value) ? periodKey(value) : '';
  const handleChange = typeof onChange === 'function' ? onChange : () => {};

  return (
    <select
      className="period-select"
      value={key}
      onChange={e => {
        const [y, m] = e.target.value.split('-').map(Number);
        if (Number.isFinite(y) && Number.isFinite(m)) {
          handleChange({ year: y, month: m });
        }
      }}
    >
      {!key ? (
        <option value="">-</option>
      ) : !safeOptions.find(o => periodKey(o) === key) && (
        <option value={key}>{formatPeriodKor(value)}</option>
      )}
      {safeOptions.map(o => (
        <option key={periodKey(o)} value={periodKey(o)}>
          {formatPeriodKor(o)}
        </option>
      ))}
    </select>
  );
}

function isValidPeriod(period) {
  const year = period?.year;
  const month = period?.month;

  return Boolean(
    period
      && typeof period === 'object'
      && year != null
      && month != null
      && asDisplayText(year).trim() !== ''
      && asDisplayText(month).trim() !== ''
      && Number.isFinite(Number(year))
      && Number.isFinite(Number(month)),
  );
}

function periodKey(period) {
  return `${Number(period.year)}-${Number(period.month)}`;
}
