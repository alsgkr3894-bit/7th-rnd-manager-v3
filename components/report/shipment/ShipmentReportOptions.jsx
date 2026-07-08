'use client';
import { OptGroup, Check } from '@/components/report/ReportBuilderShell';
import { safeMonth, safeYear } from '@/lib/report/period';

export function ShipmentReportOptions({
  safeAvailPeriods,
  safeShipYear,
  safeShipMonth,
  scope,
  setShipYear,
  setShipMonth,
  upd,
  updFmt,
  docFormat,
  safeOpts,
}) {
  return (
    <>
      <OptGroup label="집계 기간">
        {safeAvailPeriods.length > 0 ? (
          <>
            <select
              className="period-select num"
              value={`${safeShipYear}-${safeShipMonth}`}
              onChange={e => {
                const [y, m] = e.target.value.split('-');
                const nextYear = safeYear(y, safeShipYear);
                const nextMonth = safeMonth(m, safeShipMonth);
                setShipYear(nextYear);
                setShipMonth(nextMonth);
              }}
            >
              {safeAvailPeriods.map(p => (
                <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                  {p.year}년 {p.month}월
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              {(() => {
                const lm = new Date();
                lm.setDate(1);
                lm.setMonth(lm.getMonth() - 1);
                const lmY = lm.getFullYear();
                const lmM = lm.getMonth() + 1;
                const tmY = new Date().getFullYear();
                const tmM = new Date().getMonth() + 1;
                const hasLm = safeAvailPeriods.some(p => p.year === lmY && p.month === lmM);
                const hasTm = safeAvailPeriods.some(p => p.year === tmY && p.month === tmM);
                return (
                  <>
                    <button
                      className="btn sm"
                      disabled={!hasLm}
                      onClick={() => {
                        setShipYear(lmY);
                        setShipMonth(lmM);
                      }}
                    >
                      지난달
                    </button>
                    <button
                      className="btn sm"
                      disabled={!hasTm}
                      onClick={() => {
                        setShipYear(tmY);
                        setShipMonth(tmM);
                      }}
                    >
                      이번달
                    </button>
                  </>
                );
              })()}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>업로드된 데이터가 없어요</div>
        )}
      </OptGroup>

      <OptGroup label="표시 범위">
        <select
          className="period-select"
          value={scope}
          onChange={e => upd('scope', e.target.value)}
        >
          <option value="all">전체</option>
          <option value="exclusive">전용</option>
          <option value="generic">범용(관리)</option>
        </select>
      </OptGroup>

      <OptGroup label="포함 섹션">
        <Check
          label="월별 출고량 추이 차트"
          value={!!safeOpts.chart}
          onChange={v => upd('chart', v)}
        />
        <Check
          label="분류별 합계"
          value={!!safeOpts.catSummary}
          onChange={v => upd('catSummary', v)}
        />
        <Check
          label="출고금액 요약(총·전용·범용)"
          value={!!safeOpts.amountSummary}
          onChange={v => upd('amountSummary', v)}
        />
        <Check
          label="전체 제품 목록"
          value={!!safeOpts.fullList}
          onChange={v => upd('fullList', v)}
        />
        <Check
          label="금월 미출고 품목 목록"
          value={!!safeOpts.notShippedList}
          onChange={v => upd('notShippedList', v)}
        />
      </OptGroup>

      <OptGroup label="문서 형식">
        <Check label="PDF" value={docFormat.pdf} onChange={v => updFmt('pdf', v)} />
        <Check label="Excel (.xlsx)" value={docFormat.excel} onChange={v => updFmt('excel', v)} />
      </OptGroup>
    </>
  );
}
