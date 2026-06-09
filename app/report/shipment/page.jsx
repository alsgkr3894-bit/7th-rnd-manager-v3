'use client';
import { useState, useEffect } from 'react';
import ReportBuilderShell, { OptGroup, Check } from '@/components/report/ReportBuilderShell';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { fmtShort, formatNumber } from '@/lib/format';
import { AreaChart } from '@/components/charts/AreaChart';
import { initDB } from '@/lib/db/init';
import { getShipmentFiles, getShipmentRowsByFileId } from '@/lib/shipment/store-files';
import { aggregateShipmentRows } from '@/lib/shipment/aggregate';
import { getManagedProducts, seedManagedProductsIfEmpty } from '@/lib/shipment/store-managed';
import { useDraftRestore } from '@/hooks/useDraftRestore';
import { getProfile } from '@/lib/profile';
import {
  asDisplayText,
  asFiniteNumber,
  asObjectArray,
} from '@/lib/ui/prop-guards';

const DRAFT_KEY = 'report_draft_shipment';

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

function safeAmount(value) {
  return asFiniteNumber(value, 0) ?? 0;
}

function safeProductName(product) {
  return (
    asDisplayText(product.normalizedProductName) ||
    asDisplayText(product.productName) ||
    '—'
  );
}

function ItemTable({ items, maxQty }) {
  const safeItems = asObjectArray(items);
  const safeMaxQty = Math.max(0, safeQuantity(maxQty));

  return (
    <table className="paper-table">
      <thead>
        <tr>
          <th style={{ width: 36 }}>#</th>
          <th>제품명</th>
          <th style={{ width: 90, textAlign: 'right' }}>출고량</th>
          <th style={{ width: 100, textAlign: 'right' }}>출고금액</th>
        </tr>
      </thead>
      <tbody>
        {safeItems.map((p, i) => {
          const totalQuantity = safeQuantity(p.totalQuantity);
          const totalAmount = safeAmount(p.totalAmount);
          const pct =
            safeMaxQty > 0 ? Math.min(100, Math.max(0, (totalQuantity / safeMaxQty) * 100)) : 0;
          const isManaged = !!p.isManaged;
          const productCode = asDisplayText(p.productCode);
          const productName = safeProductName(p);

          return (
            <tr
              key={productCode || `${productName}-${i}`}
              style={isManaged ? { background: 'var(--warn-soft)' } : undefined}
            >
              <td className="num">{i + 1}</td>
              <td style={isManaged ? { borderLeft: '3px solid #D97706' } : undefined}>
                <div
                  style={{
                    marginBottom: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  <span>{productName}</span>
                  {isManaged && (
                    <span
                      style={{
                        background: '#D97706',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                    >
                      관리품목
                    </span>
                  )}
                </div>
                <div
                  style={{
                    height: 4,
                    background: 'var(--surface-2)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: isManaged ? '#D97706' : 'var(--accent)',
                      borderRadius: 2,
                      opacity: 0.6,
                    }}
                  />
                </div>
              </td>
              <td className="num right">{formatNumber(totalQuantity)}</td>
              <td className="num right muted">{formatNumber(totalAmount)}원</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function Page() {
  const periodMode = 'month';
  const [shipYear, setShipYear] = useState(new Date().getFullYear());
  const [shipMonth, setShipMonth] = useState(new Date().getMonth() + 1);
  const [opts, setOpts] = useState({
    scope: 'all', // all | exclusive | generic — 표시 범위
    chart: true,
    catSummary: true,
    amountSummary: true,
    fullList: true,
    notShippedList: true, // 금월 미출고 품목 리스트
  });
  const upd = makeFieldUpdater(setOpts);
  const [docFormat, setDocFormat] = useState({ pdf: true, excel: false });
  const updFmt = makeFieldUpdater(setDocFormat);

  const [aggRows, setAggRows] = useState([]);
  const [regProducts, setRegProducts] = useState([]); // 등록된 대상 제품(마스터) — 총 상품수 산출용
  const [series, setSeries] = useState([]);
  const [seriesLabels, setSeriesLabels] = useState([]);
  const [fileLabel, setFileLabel] = useState('—');
  const [availPeriods, setAvailPeriods] = useState([]); // [{ year, month }]
  const [dataError, setDataError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useDraftRestore(DRAFT_KEY, draft => {
    if (draft.shipYear) setShipYear(safeYear(draft.shipYear));
    if (draft.shipMonth) setShipMonth(safeMonth(draft.shipMonth));
    if (draft.opts && typeof draft.opts === 'object' && !Array.isArray(draft.opts)) {
      setOpts(o => ({ ...o, ...draft.opts }));
    }
  });

  useEffect(() => {
    // StrictMode 이중 마운트·빠른 월 변경 시 무거운 로드가 겹쳐 DB 조회가 느려지지 않도록
    // 가드. 폐기된 실행은 setState·후속 작업을 건너뛴다.
    let ignore = false;
    setIsLoading(true);
    initDB()
      .then(async () => {
        try {
          await seedManagedProductsIfEmpty();

          const files = asObjectArray(await getShipmentFiles());
          if (ignore) return;
          if (files.length === 0) {
            setIsLoading(false);
            return;
          }

          // 파일을 월 단위로 그룹핑 (같은 월의 파일은 합산 대상)
          const monthMap = new Map();
          for (const f of files) {
            const yearValue = safeYear(f.year, 0);
            const monthValue = safeMonth(f.month, 0);
            if (!yearValue || !monthValue) continue;
            const key = `${yearValue}-${monthValue}`;
            if (!monthMap.has(key)) {
              monthMap.set(key, { year: yearValue, month: monthValue, files: [] });
            }
            monthMap.get(key).files.push(f);
          }
          // files는 이미 년월 내림차순 → monthMap 삽입 순서도 최신순
          const monthList = [...monthMap.values()];
          // year/month 없는 파일만 있으면 monthList가 빈 배열 → 빠른 종료
          if (monthList.length === 0) {
            setIsLoading(false);
            return;
          }
          setAvailPeriods(monthList.map(m => ({ year: m.year, month: m.month })));

          // 선택 월이 없으면 최신 월로 자동 맞춤 (early return 없이 그대로 로드)
          const selectedYear = safeYear(shipYear);
          const selectedMonth = safeMonth(shipMonth);
          const targetMonth = monthMap.get(`${selectedYear}-${selectedMonth}`) || monthList[0];
          if (targetMonth.year !== selectedYear || targetMonth.month !== selectedMonth) {
            setShipYear(targetMonth.year);
            setShipMonth(targetMonth.month);
            // state만 보정하고 계속 진행 — targetMonth 기준으로 로드
          }

          setFileLabel(`${targetMonth.year}년 ${targetMonth.month}월`);

          const managedProducts = asObjectArray(await getManagedProducts());
          if (ignore) return;
          setRegProducts(managedProducts);

          // 선택 월의 모든 파일 행 합산
          const targetRows = asObjectArray(
            (await Promise.all(targetMonth.files.map(f => getShipmentRowsByFileId(f.id)))).flat()
          );
          if (ignore) return;
          setAggRows(aggregateShipmentRows(targetRows, managedProducts));

          // 추이 차트: 최대 7개월, 각 월 전체 파일 합산
          const recentMonths = monthList.slice(0, 7).reverse(); // 오래된 달부터
          const labels = recentMonths.map(m => `${m.year}.${String(m.month).padStart(2, '0')}`);
          const monthlyRows = await Promise.all(
            recentMonths.map(async m => {
              const chunks = await Promise.all(m.files.map(f => getShipmentRowsByFileId(f.id)));
              return asObjectArray(chunks.flat());
            })
          );
          if (ignore) return;
          const exclusiveData = [];
          const genericData = [];
          for (const rows of monthlyRows) {
            const a = aggregateShipmentRows(rows, managedProducts);
            exclusiveData.push(
              a
                .filter(x => x.productType === 'exclusive')
                .reduce((s, x) => s + safeQuantity(x.totalQuantity), 0)
            );
            genericData.push(
              a
                .filter(x => x.productType !== 'exclusive')
                .reduce((s, x) => s + safeQuantity(x.totalQuantity), 0)
            );
          }
          if (exclusiveData.some(v => v > 0) || genericData.some(v => v > 0)) {
            setSeries([
              { name: '전용상품', data: exclusiveData },
              { name: '범용상품', data: genericData },
            ]);
            setSeriesLabels(labels);
          } else {
            setSeries([]);
            setSeriesLabels(labels);
          }
          setDataError(null);
        } catch (err) {
          if (ignore) return;
          console.error('[shipment report]', err);
          setDataError('출고량 데이터를 불러오는 중 오류가 발생했어요.');
        } finally {
          if (!ignore) setIsLoading(false);
        }
      })
      .catch(() => {
        if (ignore) return;
        setIsLoading(false);
        setDataError('데이터베이스에 연결할 수 없어요. 출고 파일을 먼저 업로드해 주세요.');
      });
    return () => {
      ignore = true;
    };
  }, [shipYear, shipMonth]);

  const safeAggRows = asObjectArray(aggRows);
  const safeRegProducts = asObjectArray(regProducts);
  const safeSeries = asObjectArray(series);
  const safeSeriesLabels = Array.isArray(seriesLabels)
    ? seriesLabels.map(label => asDisplayText(label)).filter(Boolean)
    : [];
  const safeAvailPeriods = asObjectArray(availPeriods)
    .map(p => ({ year: safeYear(p.year, 0), month: safeMonth(p.month, 0) }))
    .filter(p => p.year && p.month);
  const safeShipYear = safeYear(shipYear);
  const safeShipMonth = safeMonth(shipMonth);
  const safeOpts = opts && typeof opts === 'object' && !Array.isArray(opts) ? opts : {};

  const byQtyDesc = (a, b) => safeQuantity(b.totalQuantity) - safeQuantity(a.totalQuantity);
  const sumQty = list => asObjectArray(list).reduce((s, r) => s + safeQuantity(r.totalQuantity), 0);
  const sumAmt = list => asObjectArray(list).reduce((s, r) => s + safeAmount(r.totalAmount), 0);

  // 전용 / 범용(전체) 으로 분리. 관리품목은 범용 안에서 표시로만 구분(별도 시트 X)
  const exclusive = [...safeAggRows].filter(r => r.productType === 'exclusive').sort(byQtyDesc);
  const genericAll = [...safeAggRows].filter(r => r.productType !== 'exclusive').sort(byQtyDesc);
  const managed = genericAll.filter(r => r.isManaged); // 관리품목 체크 (요약·표시용)

  const totalQty = sumQty(safeAggRows);
  const exclusiveQty = sumQty(exclusive);
  const genericQty = sumQty(genericAll); // 범용 전체
  const managedQty = sumQty(managed);

  // 등록된(마스터) 범용상품·관리품목 개수 — 출고 여부와 무관한 등록 기준
  const regGeneric = safeRegProducts.filter(p => p.productType !== 'exclusive');
  const regGenericCount = regGeneric.length; // 예: 82 (등록된 범용상품)
  const regManagedCount = regGeneric.filter(p => p.isManaged).length; // 예: 37 (그중 관리품목)
  const shippedGenericCount = genericAll.length; // 예: 63 (이번 달 실제 출고된 품목)

  // 출고금액 합계 (총 / 전용 / 범용)
  const totalAmt = sumAmt(safeAggRows);
  const exclusiveAmt = sumAmt(exclusive);
  const genericAmt = sumAmt(genericAll);
  const managedAmt = sumAmt(managed);

  // 표시 범위 (전체 / 전용만 / 범용만)
  const scope = ['all', 'exclusive', 'generic'].includes(safeOpts.scope) ? safeOpts.scope : 'all';
  const showExclusive = scope !== 'generic';
  const showGeneric = scope !== 'exclusive';

  // 출고량/금액은 축약 없이 정확한 전체 숫자로 표시
  const qtyTxt = v => {
    const n = safeQuantity(v);
    return n ? formatNumber(n) : '—';
  };
  const amtTxt = v => {
    const n = safeAmount(v);
    return n ? `${formatNumber(n)}원` : '—';
  };

  // 범위에 따른 요약 통계 카드 구성
  const qtyStats =
    scope === 'exclusive'
      ? [
          ['전용상품 출고량', exclusiveQty],
          ['전용상품 수', exclusive.length, true],
        ]
      : scope === 'generic'
        ? [
            [`범용상품 ${safeShipMonth}월 출고량`, genericQty],
            ['범용상품 총 상품수', regGenericCount, true],
            [`${safeShipMonth}월 출고 제품수`, shippedGenericCount, true],
            ['관리품목수', regManagedCount, true],
          ]
        : [
            ['총 출고량', totalQty],
            ['전용상품', exclusiveQty],
            ['범용상품', genericQty],
            ['관리품목', managedQty],
          ];

  const amtStats =
    scope === 'exclusive'
      ? [['전용상품 출고금액', exclusiveAmt]]
      : scope === 'generic'
        ? [['범용상품 출고금액', genericAmt]]
        : [
            ['총 출고금액', totalAmt],
            ['전용상품 출고금액', exclusiveAmt],
            ['범용상품 출고금액', genericAmt],
            ['관리품목 출고금액', managedAmt],
          ];

  // 금월 미출고 품목 — 등록(마스터)됐으나 이번 달 출고 데이터에 없는 제품 (표시범위 반영)
  const shippedCodes = new Set();
  const shippedNorms = new Set();
  for (const r of safeAggRows) {
    const productCode = asDisplayText(r.productCode);
    const normalizedProductName = asDisplayText(r.normalizedProductName);
    if (productCode) shippedCodes.add(productCode);
    if (normalizedProductName) shippedNorms.add(normalizedProductName);
  }
  const isShipped = p =>
    (asDisplayText(p.productCode) && shippedCodes.has(asDisplayText(p.productCode))) ||
    (asDisplayText(p.normalizedProductName) &&
      shippedNorms.has(asDisplayText(p.normalizedProductName)));
  const typeLabel = p =>
    p.productType === 'exclusive' ? '전용' : p.isManaged ? '관리품목' : '범용';
  const notShipped = safeRegProducts
    .filter(p =>
      scope === 'exclusive'
        ? p.productType === 'exclusive'
        : scope === 'generic'
          ? p.productType !== 'exclusive'
          : true
    )
    .filter(p => !isShipped(p))
    .sort((a, b) =>
      safeProductName(a).localeCompare(safeProductName(b), 'ko')
    );

  // 차트 series를 범위에 맞게 필터 (색상도 매칭)
  const SERIES_COLOR = { 전용상품: '#1D766F', 범용상품: '#7C3AED' };
  const chartSeries = safeSeries.filter(
    s => (s.name === '전용상품' && showExclusive) || (s.name === '범용상품' && showGeneric)
  );
  const chartColors = chartSeries.map(s => SERIES_COLOR[s.name]);

  const todayLabel = new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');
  const reportMeta = {
    kind: 'shipment',
    period: fileLabel,
    name: `${fileLabel} 제때 출고량 보고서`,
    options: { periodMode, shipYear: safeShipYear, shipMonth: safeShipMonth, opts: safeOpts },
  };

  return (
    <ReportBuilderShell
      breadcrumb={['보고서센터', '제때 출고량 보고서']}
      title="제때 출고량 보고서 생성"
      sub="전용상품·범용(관리)품목 출고량을 분류별로 요약해요."
      kind="shipment"
      reportMeta={reportMeta}
      dataError={dataError}
      isLoading={isLoading}
      docFormat={docFormat}
      options={
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
            <Check label="Excel" value={docFormat.excel} onChange={v => updFmt('excel', v)} />
          </OptGroup>
        </>
      }
      preview={
        <>
          {/* ── 헤더 ── */}
          <div className="paper-head">
            <div className="paper-eyebrow">7번가피자 본사 · 제때상품관리</div>
            <h2 className="paper-title">{fileLabel} 제때 출고량 보고서</h2>
            <div className="paper-meta">
              <span>
                {showExclusive && `전용상품 ${exclusive.length}개`}
                {showExclusive && showGeneric && ' · '}
                {showGeneric &&
                  `범용상품 ${genericAll.length}개${managed.length > 0 ? ` (관리품목 ${managed.length}개)` : ''}`}
              </span>
              <span>·</span>
              <span className="mono">
                생성일 {todayLabel} · {getProfile().name}
              </span>
            </div>
          </div>

          {/* ── 요약 통계 (출고량) — 표시 범위에 맞춰 정확한 숫자로 ── */}
          <div className="paper-stat-row">
            {qtyStats.map(([label, val, isCount]) => (
              <div className="paper-stat" key={label}>
                <div className="paper-stat-label">{label}</div>
                <div className="paper-stat-val num">
                  {isCount ? `${formatNumber(val)}개` : qtyTxt(val)}
                </div>
              </div>
            ))}
          </div>

          {/* ── 출고금액 요약 ── */}
          {safeOpts.amountSummary && (
            <div className="paper-stat-row">
              {amtStats.map(([label, val]) => (
                <div className="paper-stat" key={label}>
                  <div className="paper-stat-label">{label}</div>
                  <div className="paper-stat-val num">{amtTxt(val)}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── 추이 차트 ── */}
          {safeOpts.chart && (
            <div className="paper-section">
              <div className="paper-section-title">
                월별 출고량 추이 (최근 {safeSeriesLabels.length || 7}개월)
              </div>
              <div style={{ padding: '8px 0' }}>
                {chartSeries.length > 0 ? (
                  <AreaChart
                    series={chartSeries}
                    labels={safeSeriesLabels}
                    colors={chartColors}
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
              <div className="paper-legend">
                {showExclusive && (
                  <div className="paper-legend-item">
                    <span className="dot" style={{ background: '#1D766F' }} />
                    <span>전용상품</span>
                    <span className="num muted">{qtyTxt(exclusiveQty)}</span>
                  </div>
                )}
                {showGeneric && (
                  <div className="paper-legend-item">
                    <span className="dot" style={{ background: '#7C3AED' }} />
                    <span>범용상품</span>
                    <span className="num muted">{qtyTxt(genericQty)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 전용상품 목록 ── */}
          {showExclusive && safeOpts.fullList && exclusive.length > 0 && (
            <div className="paper-section paper-cat-section">
              <div
                className="paper-section-title"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#1D766F',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                전용상품 출고 현황
                <span className="num muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
                  합계 {qtyTxt(exclusiveQty)}
                </span>
              </div>
              <ItemTable items={exclusive} maxQty={exclusive[0]?.totalQuantity || 1} />
            </div>
          )}

          {/* ── 범용상품 목록 (관리품목은 한 시트 안에서 색·배지로 구분) ── */}
          {showGeneric && safeOpts.fullList && genericAll.length > 0 && (
            <div className="paper-section paper-cat-section">
              <div
                className="paper-section-title"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#7C3AED',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                범용상품 출고 현황
                {managed.length > 0 && (
                  <span
                    className="muted"
                    style={{
                      fontWeight: 400,
                      fontSize: 11,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    (
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: '#D97706',
                      }}
                    />
                    관리품목 {managed.length}개 · {qtyTxt(managedQty)})
                  </span>
                )}
                <span className="num muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
                  합계 {qtyTxt(genericQty)}
                </span>
              </div>
              <ItemTable items={genericAll} maxQty={genericAll[0]?.totalQuantity || 1} />
            </div>
          )}

          {/* ── 금월 미출고 품목 (등록됐으나 이번 달 출고 없음) ── */}
          {safeOpts.notShippedList && notShipped.length > 0 && (
            <div className="paper-section paper-cat-section">
              <div
                className="paper-section-title"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#9CA3AF',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                {safeShipMonth}월 미출고 품목
                <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>
                  (등록됐으나 이번 달 출고 없음)
                </span>
                <span className="num muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
                  {notShipped.length}개
                </span>
              </div>
              <table className="paper-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>제품명</th>
                    <th style={{ width: 90 }}>분류</th>
                    <th style={{ width: 110 }}>제품코드</th>
                  </tr>
                </thead>
                <tbody>
                  {notShipped.map((p, i) => (
                    <tr key={asDisplayText(p.productCode) || `${safeProductName(p)}-${i}`}>
                      <td className="num">{i + 1}</td>
                      <td>{safeProductName(p)}</td>
                      <td>
                        <span className="muted" style={{ fontSize: 11 }}>
                          {typeLabel(p)}
                        </span>
                      </td>
                      <td className="num muted" style={{ fontSize: 11 }}>
                        {asDisplayText(p.productCode, '—') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {safeAggRows.length === 0 && !isLoading && (
            <div
              style={{
                height: 80,
                display: 'grid',
                placeItems: 'center',
                color: 'var(--text-4)',
                fontSize: 13,
              }}
            >
              출고 데이터가 없어요. 출고 파일을 먼저 업로드해 주세요.
            </div>
          )}

          <div className="paper-foot">
            <span className="muted" style={{ fontSize: 11 }}>
              7번가 R&amp;D 플랫폼
            </span>
          </div>
        </>
      }
    />
  );
}
