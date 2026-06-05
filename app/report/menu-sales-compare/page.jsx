'use client';
import { useState, useEffect } from 'react';
import ReportBuilderShell, { OptGroup, Seg, Check } from '@/components/report/ReportBuilderShell';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { fmtShort } from '@/lib/format';
import { AreaChart } from '@/components/charts/AreaChart';
import { initDB } from '@/lib/db/init';
import { buildPeriodCompare, deriveCompareB } from '@/lib/sales/compare';
import { safeAll } from '@/lib/stats/_helpers';
import { useDraftRestore } from '@/hooks/useDraftRestore';
import { getProfile } from '@/lib/profile';

const DRAFT_KEY = 'report_draft_compare';

export default function Page() {
  const [mode, setMode] = useState('mom');
  const [scope, setScope] = useState('all');
  const [yearA, setYearA] = useState(2026);
  const [monthA, setMonthA] = useState(3);
  const [yearB, setYearB] = useState(2026);
  const [monthB, setMonthB] = useState(4);

  const [opts, setOpts] = useState({
    summary: true,
    catCompare: true,
    rankShift: true,
    chart: true,
    winners: true,
  });
  const upd = makeFieldUpdater(setOpts);

  useDraftRestore(DRAFT_KEY, draft => {
    if (draft.mode) setMode(draft.mode);
    if (draft.scope) setScope(draft.scope);
    if (draft.yearA) setYearA(draft.yearA);
    if (draft.monthA) setMonthA(draft.monthA);
    if (draft.yearB) setYearB(draft.yearB);
    if (draft.monthB) setMonthB(draft.monthB);
    if (draft.opts) setOpts(o => ({ ...o, ...draft.opts }));
  });

  const [compareResult, setCompareResult] = useState(null);
  const [series, setSeries] = useState([]);
  const [dataError, setDataError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const periodA = { year: yearA, month: monthA };
  const periodB =
    mode === 'custom' ? { year: yearB, month: monthB } : deriveCompareB(periodA, mode);

  useEffect(() => {
    setIsLoading(true);
    initDB()
      .then(async () => {
        try {
          const rows = await safeAll('sales_rows');
          if (rows.length === 0) {
            setIsLoading(false);
            return;
          }
          const result = buildPeriodCompare(rows, periodA, periodB, {
            groupBy: 'group',
            category: scope === 'all' ? null : scope,
            topN: 6,
          });
          setCompareResult(result);

          // 시리즈: 카테고리별 A/B 집계
          const catMap = new Map();
          for (const r of rows) {
            if (r.status !== 'classified') continue;
            // 표·요약(compareResult)과 동일하게 scope로 필터해 차트가 어긋나지 않도록 한다.
            if (scope !== 'all' && r.category !== scope) continue;
            const cat = r.category || '기타';
            if (!catMap.has(cat)) catMap.set(cat, { a: 0, b: 0 });
            const isA = r.year === periodA.year && r.month === periodA.month;
            const isB = r.year === periodB.year && r.month === periodB.month;
            if (isA) catMap.get(cat).a += Number(r.quantity) || 0;
            if (isB) catMap.get(cat).b += Number(r.quantity) || 0;
          }
          const cats = Array.from(catMap.entries()).filter(([, v]) => v.a > 0 || v.b > 0);
          if (cats.length > 0) {
            setSeries([
              { name: `A (${monthA}월)`, data: cats.map(([, v]) => v.a) },
              { name: `B (${periodB.month}월)`, data: cats.map(([, v]) => v.b) },
            ]);
          }
          setDataError(null);
        } catch (err) {
          console.error('[compare report]', err);
          setDataError('판매 비교 데이터를 집계하는 중 오류가 발생했어요.');
        } finally {
          setIsLoading(false);
        }
      })
      .catch(() => {
        setIsLoading(false);
        setDataError('데이터베이스에 연결할 수 없어요. 판매 데이터를 먼저 업로드해 주세요.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, scope, yearA, monthA, yearB, monthB]);

  const compareRows =
    compareResult?.rows
      ?.filter(r => !r.aIsZero && !r.bIsZero)
      .sort((a, b) => Math.abs(b.pct ?? 0) - Math.abs(a.pct ?? 0))
      .slice(0, 6) || [];

  const periodALabel = `${yearA}.${String(monthA).padStart(2, '0')}`;
  const periodBLabel = `${periodB.year}.${String(periodB.month).padStart(2, '0')}`;
  const reportMeta = {
    period: `${periodALabel} vs ${periodBLabel}`,
    name: `판매량 비교 보고서 — ${periodALabel} vs ${periodBLabel}`,
    pages: 7,
    options: { mode, scope, yearA, monthA, yearB, monthB, opts },
  };

  return (
    <ReportBuilderShell
      breadcrumb={['보고서센터', '판매량 비교 보고서']}
      title="판매량 비교 보고서 생성"
      sub="두 기간을 나란히 — 메뉴별 순위 이동·증감을 한눈에."
      kind="compare"
      exportNote="비교 모드를 바꾸면 A·B 기간 라벨이 자동으로 갱신돼요."
      reportMeta={reportMeta}
      dataError={dataError}
      isLoading={isLoading}
      options={
        <>
          <OptGroup label="비교 모드">
            <Seg
              value={mode}
              onChange={setMode}
              options={[
                { value: 'mom', label: '전월 대비' },
                { value: 'yoy', label: '전년 동월' },
                { value: 'custom', label: '사용자 지정' },
              ]}
            />
          </OptGroup>

          <OptGroup label="기간 A (기준)">
            <div className="opt-period-row">
              <select
                className="period-select num"
                value={yearA}
                onChange={e => setYearA(parseInt(e.target.value))}
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
              <select
                className="period-select num"
                value={monthA}
                onChange={e => setMonthA(parseInt(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>
                    {m}월
                  </option>
                ))}
              </select>
            </div>
          </OptGroup>

          {mode === 'custom' && (
            <OptGroup label="기간 B (비교)">
              <div className="opt-period-row">
                <select
                  className="period-select num"
                  value={yearB}
                  onChange={e => setYearB(parseInt(e.target.value))}
                >
                  {[2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>
                      {y}년
                    </option>
                  ))}
                </select>
                <select
                  className="period-select num"
                  value={monthB}
                  onChange={e => setMonthB(parseInt(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>
                      {m}월
                    </option>
                  ))}
                </select>
              </div>
            </OptGroup>
          )}

          <OptGroup label="대상 범위">
            <Seg
              value={scope}
              onChange={setScope}
              options={[
                { value: 'all', label: '전체' },
                { value: 'pizza', label: '피자' },
                { value: 'side', label: '사이드' },
              ]}
            />
          </OptGroup>

          <OptGroup label="포함 섹션">
            <Check
              label="요약 (총 판매량·증감)"
              value={opts.summary}
              onChange={v => upd('summary', v)}
            />
            <Check
              label="카테고리별 비교"
              value={opts.catCompare}
              onChange={v => upd('catCompare', v)}
            />
            <Check
              label="순위 이동표 (메뉴별 A→B)"
              value={opts.rankShift}
              onChange={v => upd('rankShift', v)}
            />
            <Check
              label="비교 차트 (스택 막대)"
              value={opts.chart}
              onChange={v => upd('chart', v)}
            />
            <Check
              label="Winners & Losers 부록"
              value={opts.winners}
              onChange={v => upd('winners', v)}
              hint="±10% 이상 변동"
            />
          </OptGroup>
        </>
      }
      preview={
        <>
          <div className="paper-head">
            <div className="paper-eyebrow">7번가피자 본사 · R&amp;D팀</div>
            <h2 className="paper-title">
              판매량 비교 보고서 — {periodALabel} vs {periodBLabel}
            </h2>
            <div className="paper-meta">
              <span>
                비교 모드:{' '}
                {mode === 'mom' ? '전월 대비' : mode === 'yoy' ? '전년 동월' : '사용자 지정'}
              </span>
              <span>·</span>
              <span>대상: {scope === 'all' ? '전체' : scope === 'pizza' ? '피자' : '사이드'}</span>
              <span>·</span>
              <span className="mono">
                생성일 {new Date().toLocaleDateString('ko-KR').slice(0, -1).replace(/\. /g, '.')} ·{' '}
                {getProfile().name}
              </span>
            </div>
          </div>

          {opts.summary && (
            <div className="paper-stat-row">
              <div className="paper-stat">
                <div className="paper-stat-label">총 판매량 (A)</div>
                <div className="paper-stat-val num">
                  {compareResult ? fmtShort(compareResult.totalA) : '—'}
                </div>
              </div>
              <div className="paper-stat">
                <div className="paper-stat-label">총 판매량 (B)</div>
                <div className="paper-stat-val num">
                  {compareResult ? fmtShort(compareResult.totalB) : '—'}
                </div>
              </div>
              <div className="paper-stat">
                <div className="paper-stat-label">증감</div>
                <div
                  className="paper-stat-val num"
                  style={{
                    color:
                      (compareResult?.totalPct ?? 0) >= 0 ? 'var(--positive)' : 'var(--negative)',
                  }}
                >
                  {compareResult?.totalPct != null
                    ? `${compareResult.totalPct >= 0 ? '+' : ''}${compareResult.totalPct.toFixed(1)}%`
                    : '—'}
                </div>
              </div>
            </div>
          )}

          {opts.chart && (
            <div className="paper-section">
              <div className="paper-section-title">카테고리별 판매량 비교</div>
              <div style={{ padding: '8px 0' }}>
                {series.length > 0 ? (
                  <AreaChart
                    series={series}
                    labels={[]}
                    colors={['#7C3AED', '#3182F6']}
                    height={180}
                    formatY={fmtShort}
                  />
                ) : (
                  <div
                    style={{
                      height: 180,
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--text-4)',
                      fontSize: 13,
                    }}
                  >
                    데이터 없음
                  </div>
                )}
              </div>
            </div>
          )}

          {opts.rankShift && (
            <div className="paper-section">
              <div className="paper-section-title">순위 이동 (TOP 6 미리보기)</div>
              {compareRows.length > 0 ? (
                <table className="paper-table">
                  <thead>
                    <tr>
                      <th>메뉴명</th>
                      <th style={{ width: 100, textAlign: 'right' }}>A ({monthA}월)</th>
                      <th style={{ width: 100, textAlign: 'right' }}>B ({periodB.month}월)</th>
                      <th style={{ width: 80, textAlign: 'right' }}>증감</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map(r => (
                      <tr key={r.name}>
                        <td>{r.name}</td>
                        <td className="num right muted">{fmtShort(r.a)}</td>
                        <td className="num right" style={{ fontWeight: 700 }}>
                          {fmtShort(r.b)}
                        </td>
                        <td
                          className="num right"
                          style={{
                            color: (r.pct ?? 0) >= 0 ? 'var(--positive)' : 'var(--negative)',
                            fontWeight: 700,
                          }}
                        >
                          {(r.pct ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(r.pct ?? 0).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div
                  style={{
                    height: 60,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--text-4)',
                    fontSize: 13,
                  }}
                >
                  데이터 없음
                </div>
              )}
            </div>
          )}

          {opts.winners && compareResult && (
            <div className="paper-section">
              <div className="paper-section-title">Winners &amp; Losers (±10% 이상)</div>
              <div className="winners-grid">
                <div className="winner-col">
                  <div className="winner-h" style={{ color: 'var(--positive)' }}>
                    ▲ Winners
                  </div>
                  {(compareResult.topRise || [])
                    .filter(r => (r.pct ?? 0) >= 10)
                    .map(r => (
                      <div className="winner-row" key={r.name}>
                        <span>{r.name}</span>
                        <b className="num" style={{ color: 'var(--positive)' }}>
                          +{(r.pct ?? 0).toFixed(1)}%
                        </b>
                      </div>
                    ))}
                  {(compareResult.topRise || []).filter(r => (r.pct ?? 0) >= 10).length === 0 && (
                    <div className="muted" style={{ fontSize: 12 }}>
                      해당 없음
                    </div>
                  )}
                </div>
                <div className="winner-col">
                  <div className="winner-h" style={{ color: 'var(--negative)' }}>
                    ▼ Losers
                  </div>
                  {(compareResult.topFall || [])
                    .filter(r => (r.pct ?? 0) <= -10)
                    .map(r => (
                      <div className="winner-row" key={r.name}>
                        <span>{r.name}</span>
                        <b className="num" style={{ color: 'var(--negative)' }}>
                          {(r.pct ?? 0).toFixed(1)}%
                        </b>
                      </div>
                    ))}
                  {(compareResult.topFall || []).filter(r => (r.pct ?? 0) <= -10).length === 0 && (
                    <div className="muted" style={{ fontSize: 12 }}>
                      해당 없음
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="paper-foot">
            <span>1 / 7</span>
            <span className="mono">7번가 R&amp;D 플랫폼</span>
          </div>
        </>
      }
    />
  );
}
