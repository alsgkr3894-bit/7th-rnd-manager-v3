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
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

const DRAFT_KEY = 'report_draft_compare';

function safeYear(value, fallback = new Date().getFullYear()) {
  const n = asFiniteNumber(value, null);
  if (n == null || n < 1900 || n > 2999) return fallback;
  return Math.floor(n);
}

function safeMonth(value, fallback = new Date().getMonth() + 1) {
  const n = asFiniteNumber(value, null);
  if (n == null || n < 1 || n > 12) return fallback;
  return Math.floor(n);
}

function safeQuantity(value) {
  return asFiniteNumber(value, 0) ?? 0;
}

function normalizeMode(value) {
  return ['mom', 'yoy', 'custom'].includes(value) ? value : 'mom';
}

function normalizeScope(value) {
  return ['all', 'pizza', 'side'].includes(value) ? value : 'all';
}

function safePercent(value) {
  return asFiniteNumber(value, null);
}

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
    if (draft.mode) setMode(normalizeMode(draft.mode));
    if (draft.scope) setScope(normalizeScope(draft.scope));
    if (draft.yearA) setYearA(safeYear(draft.yearA));
    if (draft.monthA) setMonthA(safeMonth(draft.monthA));
    if (draft.yearB) setYearB(safeYear(draft.yearB));
    if (draft.monthB) setMonthB(safeMonth(draft.monthB));
    if (draft.opts && typeof draft.opts === 'object' && !Array.isArray(draft.opts)) {
      setOpts(o => ({ ...o, ...draft.opts }));
    }
  });

  const [compareResult, setCompareResult] = useState(null);
  const [series, setSeries] = useState([]);
  const [dataError, setDataError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const safeMode = normalizeMode(mode);
  const safeScope = normalizeScope(scope);
  const safeYearA = safeYear(yearA);
  const safeMonthA = safeMonth(monthA);
  const safeYearB = safeYear(yearB);
  const safeMonthB = safeMonth(monthB);
  const safeOpts = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};

  const periodA = { year: safeYearA, month: safeMonthA };
  const periodB =
    safeMode === 'custom' ? { year: safeYearB, month: safeMonthB } : deriveCompareB(periodA, safeMode);

  useEffect(() => {
    let ignore = false;

    setIsLoading(true);
    initDB()
      .then(async () => {
        try {
          const rows = asObjectArray(await safeAll('sales_rows'));
          if (ignore) return;

          if (rows.length === 0) {
            setCompareResult(null);
            setSeries([]);
            setIsLoading(false);
            return;
          }
          const result = buildPeriodCompare(rows, periodA, periodB, {
            groupBy: 'group',
            category: safeScope === 'all' ? null : safeScope,
            topN: 6,
          });
          if (ignore) return;

          setCompareResult(result);

          // 시리즈: 카테고리별 A/B 집계
          const catMap = new Map();
          for (const r of rows) {
            if (r.status !== 'classified') continue;
            // 표·요약(compareResult)과 동일하게 scope로 필터해 차트가 어긋나지 않도록 한다.
            if (safeScope !== 'all' && r.category !== safeScope) continue;
            const cat = asDisplayText(r.category, '기타') || '기타';
            if (!catMap.has(cat)) catMap.set(cat, { a: 0, b: 0 });
            const rowYear = safeYear(r.year, 0);
            const rowMonth = safeMonth(r.month, 0);
            const isA = rowYear === periodA.year && rowMonth === periodA.month;
            const isB = rowYear === periodB.year && rowMonth === periodB.month;
            if (isA) catMap.get(cat).a += safeQuantity(r.quantity);
            if (isB) catMap.get(cat).b += safeQuantity(r.quantity);
          }
          const cats = Array.from(catMap.entries()).filter(([, v]) => v.a > 0 || v.b > 0);
          setSeries(
            cats.length > 0
              ? [
                  { name: `A (${safeMonthA}월)`, data: cats.map(([, v]) => v.a) },
                  { name: `B (${periodB.month}월)`, data: cats.map(([, v]) => v.b) },
              ]
              : []
          );
          setDataError(null);
        } catch (err) {
          if (ignore) return;

          console.error('[compare report]', err);
          setDataError('판매 비교 데이터를 집계하는 중 오류가 발생했어요.');
        } finally {
          if (!ignore) setIsLoading(false);
        }
      })
      .catch(() => {
        if (ignore) return;

        setIsLoading(false);
        setDataError('데이터베이스에 연결할 수 없어요. 판매 데이터를 먼저 업로드해 주세요.');
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeMode, safeScope, safeYearA, safeMonthA, safeYearB, safeMonthB]);

  const compareRows =
    asObjectArray(compareResult?.rows)
      .filter(r => !r.aIsZero && !r.bIsZero)
      .sort((a, b) => Math.abs(safeQuantity(b.pct)) - Math.abs(safeQuantity(a.pct)))
      .slice(0, 6) || [];

  const safeSeries = asObjectArray(series);
  const safeCompareResult =
    compareResult && typeof compareResult === 'object' && !Array.isArray(compareResult)
      ? compareResult
      : null;
  const totalPct = safePercent(safeCompareResult?.totalPct);
  const periodALabel = `${safeYearA}.${String(safeMonthA).padStart(2, '0')}`;
  const periodBLabel = `${periodB.year}.${String(periodB.month).padStart(2, '0')}`;
  const reportMeta = {
    period: `${periodALabel} vs ${periodBLabel}`,
    name: `판매량 비교 보고서 — ${periodALabel} vs ${periodBLabel}`,
    pages: 7,
    options: {
      mode: safeMode,
      scope: safeScope,
      yearA: safeYearA,
      monthA: safeMonthA,
      yearB: safeYearB,
      monthB: safeMonthB,
      opts: safeOpts,
    },
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
              value={safeMode}
              onChange={value => setMode(normalizeMode(value))}
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
                value={safeYearA}
                onChange={e => setYearA(safeYear(e.target.value, safeYearA))}
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
              <select
                className="period-select num"
                value={safeMonthA}
                onChange={e => setMonthA(safeMonth(e.target.value, safeMonthA))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>
                    {m}월
                  </option>
                ))}
              </select>
            </div>
          </OptGroup>

          {safeMode === 'custom' && (
            <OptGroup label="기간 B (비교)">
              <div className="opt-period-row">
                <select
                  className="period-select num"
                  value={safeYearB}
                  onChange={e => setYearB(safeYear(e.target.value, safeYearB))}
                >
                  {[2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>
                      {y}년
                    </option>
                  ))}
                </select>
                <select
                  className="period-select num"
                  value={safeMonthB}
                  onChange={e => setMonthB(safeMonth(e.target.value, safeMonthB))}
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
              value={safeScope}
              onChange={value => setScope(normalizeScope(value))}
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
              value={!!safeOpts.summary}
              onChange={v => upd('summary', v)}
            />
            <Check
              label="카테고리별 비교"
              value={!!safeOpts.catCompare}
              onChange={v => upd('catCompare', v)}
            />
            <Check
              label="순위 이동표 (메뉴별 A→B)"
              value={!!safeOpts.rankShift}
              onChange={v => upd('rankShift', v)}
            />
            <Check
              label="비교 차트 (스택 막대)"
              value={!!safeOpts.chart}
              onChange={v => upd('chart', v)}
            />
            <Check
              label="Winners & Losers 부록"
              value={!!safeOpts.winners}
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
                {safeMode === 'mom' ? '전월 대비' : safeMode === 'yoy' ? '전년 동월' : '사용자 지정'}
              </span>
              <span>·</span>
              <span>
                대상: {safeScope === 'all' ? '전체' : safeScope === 'pizza' ? '피자' : '사이드'}
              </span>
              <span>·</span>
              <span className="mono">
                생성일 {new Date().toLocaleDateString('ko-KR').slice(0, -1).replace(/\. /g, '.')} ·{' '}
                {getProfile().name}
              </span>
            </div>
          </div>

          {safeOpts.summary && (
            <div className="paper-stat-row">
              <div className="paper-stat">
                <div className="paper-stat-label">총 판매량 (A)</div>
                <div className="paper-stat-val num">
                  {safeCompareResult ? fmtShort(safeQuantity(safeCompareResult.totalA)) : '—'}
                </div>
              </div>
              <div className="paper-stat">
                <div className="paper-stat-label">총 판매량 (B)</div>
                <div className="paper-stat-val num">
                  {safeCompareResult ? fmtShort(safeQuantity(safeCompareResult.totalB)) : '—'}
                </div>
              </div>
              <div className="paper-stat">
                <div className="paper-stat-label">증감</div>
                <div
                  className="paper-stat-val num"
                  style={{
                    color:
                      (totalPct ?? 0) >= 0
                        ? 'var(--positive)'
                        : 'var(--negative)',
                  }}
                >
                  {totalPct != null
                    ? `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(1)}%`
                    : '—'}
                </div>
              </div>
            </div>
          )}

          {safeOpts.chart && (
            <div className="paper-section">
              <div className="paper-section-title">카테고리별 판매량 비교</div>
              <div style={{ padding: '8px 0' }}>
                {safeSeries.length > 0 ? (
                  <AreaChart
                    series={safeSeries}
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

          {safeOpts.rankShift && (
            <div className="paper-section">
              <div className="paper-section-title">순위 이동 (TOP 6 미리보기)</div>
              {compareRows.length > 0 ? (
                <table className="paper-table">
                  <thead>
                    <tr>
                      <th>메뉴명</th>
                      <th style={{ width: 100, textAlign: 'right' }}>A ({safeMonthA}월)</th>
                      <th style={{ width: 100, textAlign: 'right' }}>B ({periodB.month}월)</th>
                      <th style={{ width: 80, textAlign: 'right' }}>증감</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map(r => {
                      const pct = safePercent(r.pct) ?? 0;
                      return (
                      <tr key={asDisplayText(r.name, '—')}>
                        <td>{asDisplayText(r.name, '—')}</td>
                        <td className="num right muted">{fmtShort(safeQuantity(r.a))}</td>
                        <td className="num right" style={{ fontWeight: 700 }}>
                          {fmtShort(safeQuantity(r.b))}
                        </td>
                        <td
                          className="num right"
                          style={{
                            color: pct >= 0 ? 'var(--positive)' : 'var(--negative)',
                            fontWeight: 700,
                          }}
                        >
                          {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
                        </td>
                      </tr>
                      );
                    })}
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

          {safeOpts.winners && safeCompareResult && (
            <div className="paper-section">
              <div className="paper-section-title">Winners &amp; Losers (±10% 이상)</div>
              <div className="winners-grid">
                <div className="winner-col">
                  <div className="winner-h" style={{ color: 'var(--positive)' }}>
                    ▲ Winners
                  </div>
                  {asObjectArray(safeCompareResult.topRise)
                    .filter(r => (safePercent(r.pct) ?? 0) >= 10)
                    .map(r => (
                      <div className="winner-row" key={asDisplayText(r.name, '—')}>
                        <span>{asDisplayText(r.name, '—')}</span>
                        <b className="num" style={{ color: 'var(--positive)' }}>
                          +{(safePercent(r.pct) ?? 0).toFixed(1)}%
                        </b>
                      </div>
                    ))}
                  {asObjectArray(safeCompareResult.topRise).filter(
                    r => (safePercent(r.pct) ?? 0) >= 10
                  ).length === 0 && (
                    <div className="muted" style={{ fontSize: 12 }}>
                      해당 없음
                    </div>
                  )}
                </div>
                <div className="winner-col">
                  <div className="winner-h" style={{ color: 'var(--negative)' }}>
                    ▼ Losers
                  </div>
                  {asObjectArray(safeCompareResult.topFall)
                    .filter(r => (safePercent(r.pct) ?? 0) <= -10)
                    .map(r => (
                      <div className="winner-row" key={asDisplayText(r.name, '—')}>
                        <span>{asDisplayText(r.name, '—')}</span>
                        <b className="num" style={{ color: 'var(--negative)' }}>
                          {(safePercent(r.pct) ?? 0).toFixed(1)}%
                        </b>
                      </div>
                    ))}
                  {asObjectArray(safeCompareResult.topFall).filter(
                    r => (safePercent(r.pct) ?? 0) <= -10
                  ).length === 0 && (
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
