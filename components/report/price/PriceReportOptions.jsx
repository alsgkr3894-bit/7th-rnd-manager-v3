import { Check, OptGroup, Seg } from '@/components/report/ReportBuilderShell';

function safeDateInput(value, fallback) {
  const text = String(value ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

export function PriceReportOptions({
  periodMode,
  onPeriodMode,
  customFrom,
  onCustomFrom,
  customTo,
  onCustomTo,
  todayStr,
  weekAgoStr,
  opts,
  onOptionChange,
  docFormat,
  onFormatChange,
}) {
  return (
    <>
      <OptGroup label="대상 기간">
        <Seg
          value={periodMode}
          onChange={onPeriodMode}
          options={[
            { value: 'week', label: '이번 주' },
            { value: 'month', label: '이번 달' },
            { value: 'custom', label: '사용자 지정' },
          ]}
        />
        {periodMode === 'custom' && (
          <div className="opt-period-row" style={{ marginTop: 8 }}>
            <input
              type="date"
              className="input"
              value={safeDateInput(customFrom, weekAgoStr)}
              max={safeDateInput(customTo, todayStr)}
              onChange={event => onCustomFrom(event.target.value)}
            />
            <span style={{ color: 'var(--text-3)' }}>~</span>
            <input
              type="date"
              className="input"
              value={safeDateInput(customTo, todayStr)}
              min={safeDateInput(customFrom, weekAgoStr)}
              onChange={event => onCustomTo(event.target.value)}
            />
          </div>
        )}
      </OptGroup>

      <OptGroup label="포함 섹션">
        <Check
          label="전체 식자재 변동 요약"
          value={opts.catSummary}
          onChange={value => onOptionChange('catSummary', value)}
        />
        <Check
          label="원가 영향 메뉴 수"
          value={opts.costImpact}
          onChange={value => onOptionChange('costImpact', value)}
        />
      </OptGroup>

      <OptGroup label="문서 형식">
        <Check label="PDF" value={docFormat.pdf} onChange={value => onFormatChange('pdf', value)} />
        <Check
          label="Excel (.xlsx)"
          value={docFormat.excel}
          onChange={value => onFormatChange('excel', value)}
        />
      </OptGroup>
    </>
  );
}
