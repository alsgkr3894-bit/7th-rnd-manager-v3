'use client';
import { useState, useEffect } from 'react';
import ReportBuilderShell, { OptGroup, Check } from '@/components/report/ReportBuilderShell';
import { fmtKRW, fmtShort } from '@/lib/format';
import { AreaChart } from '@/components/charts/AreaChart';
import { initDB } from '@/lib/db/init';
import { getShipmentFiles, getShipmentRowsByFileId } from '@/lib/shipment/store-files';
import { aggregateShipmentRows } from '@/lib/shipment/aggregate';
import { getManagedProducts, seedManagedProductsIfEmpty } from '@/lib/shipment/store-managed';
import { useDraftRestore } from '@/lib/report/useDraftRestore';
import { getProfile } from '@/lib/profile';

const DRAFT_KEY = 'report_draft_shipment';

export default function Page() {
  const periodMode = 'month';
  const [shipYear,  setShipYear]  = useState(new Date().getFullYear());
  const [shipMonth, setShipMonth] = useState(new Date().getMonth() + 1);
  const [opts, setOpts] = useState({
    chart:      true,
    catSummary: true,
    fullList:   true,
  });
  const upd = (k, v) => setOpts(o => ({ ...o, [k]: v }));
  const [docFormat, setDocFormat] = useState({ pdf: true, excel: false });
  const updFmt = (k, v) => setDocFormat(f => ({ ...f, [k]: v }));

  const [aggRows,      setAggRows]      = useState([]);
  const [series,       setSeries]       = useState([]);
  const [seriesLabels, setSeriesLabels] = useState([]);
  const [fileLabel,    setFileLabel]    = useState('—');
  const [availPeriods, setAvailPeriods] = useState([]); // [{ year, month }]
  const [dataError,    setDataError]    = useState(null);
  const [isLoading,    setIsLoading]    = useState(true);

  useDraftRestore(DRAFT_KEY, draft => {
    if (draft.shipYear)  setShipYear(draft.shipYear);
    if (draft.shipMonth) setShipMonth(draft.shipMonth);
    if (draft.opts)      setOpts(o => ({ ...o, ...draft.opts }));
  });

  useEffect(() => {
    setIsLoading(true);
    initDB().then(async () => {
      try {
        await seedManagedProductsIfEmpty();

        const files = await getShipmentFiles();
        if (files.length === 0) { setIsLoading(false); return; }

        // 파일을 월 단위로 그룹핑 (같은 월의 파일은 합산 대상)
        const monthMap = new Map();
        for (const f of files) {
          if (!f.year || !f.month) continue;
          const key = `${f.year}-${f.month}`;
          if (!monthMap.has(key)) monthMap.set(key, { year: f.year, month: f.month, files: [] });
          monthMap.get(key).files.push(f);
        }
        // files는 이미 년월 내림차순 → monthMap 삽입 순서도 최신순
        const monthList = [...monthMap.values()];
        // year/month 없는 파일만 있으면 monthList가 빈 배열 → 빠른 종료
        if (monthList.length === 0) { setIsLoading(false); return; }
        setAvailPeriods(monthList.map(m => ({ year: m.year, month: m.month })));

        // 선택 월이 없으면 최신 월로 자동 맞춤 (early return 없이 그대로 로드)
        const targetMonth = monthMap.get(`${shipYear}-${shipMonth}`) || monthList[0];
        if (targetMonth.year !== shipYear || targetMonth.month !== shipMonth) {
          setShipYear(targetMonth.year);
          setShipMonth(targetMonth.month);
          // state만 보정하고 계속 진행 — targetMonth 기준으로 로드
        }

        setFileLabel(`${targetMonth.year}년 ${targetMonth.month}월`);

        const managedProducts = await getManagedProducts();

        // 선택 월의 모든 파일 행 합산
        const targetRows = (await Promise.all(
          targetMonth.files.map(f => getShipmentRowsByFileId(f.id))
        )).flat();
        setAggRows(aggregateShipmentRows(targetRows, managedProducts));

        // 추이 차트: 최대 7개월, 각 월 전체 파일 합산
        const recentMonths = monthList.slice(0, 7).reverse(); // 오래된 달부터
        const labels = recentMonths.map(m => `${m.year}.${String(m.month).padStart(2, '0')}`);
        const monthlyRows = await Promise.all(
          recentMonths.map(async m => {
            const chunks = await Promise.all(m.files.map(f => getShipmentRowsByFileId(f.id)));
            return chunks.flat();
          })
        );
        const exclusiveData = [];
        const genericData   = [];
        for (const rows of monthlyRows) {
          const a = aggregateShipmentRows(rows, managedProducts);
          exclusiveData.push(a.filter(x => x.productType === 'exclusive').reduce((s, x) => s + x.totalQuantity, 0));
          genericData.push(a.filter(x => x.productType !== 'exclusive').reduce((s, x) => s + x.totalQuantity, 0));
        }
        if (exclusiveData.some(v => v > 0) || genericData.some(v => v > 0)) {
          setSeries([
            { name: '전용상품',      data: exclusiveData },
            { name: '범용(관리)품목', data: genericData   },
          ]);
          setSeriesLabels(labels);
        }
        setDataError(null);
      } catch (err) {
        console.error('[shipment report]', err);
        setDataError('출고량 데이터를 불러오는 중 오류가 발생했어요.');
      } finally {
        setIsLoading(false);
      }
    }).catch(() => {
      setIsLoading(false);
      setDataError('데이터베이스에 연결할 수 없어요. 출고 파일을 먼저 업로드해 주세요.');
    });
  }, [shipYear, shipMonth]);

  // 두 분류 항상 함께 표시
  const exclusive = [...aggRows].filter(r => r.productType === 'exclusive').sort((a, b) => b.totalQuantity - a.totalQuantity);
  const generic   = [...aggRows].filter(r => r.productType !== 'exclusive').sort((a, b) => b.totalQuantity - a.totalQuantity);

  const totalQty     = aggRows.reduce((s, r) => s + r.totalQuantity, 0);
  const exclusiveQty = exclusive.reduce((s, r) => s + r.totalQuantity, 0);
  const genericQty   = generic.reduce((s, r) => s + r.totalQuantity, 0);

  const todayLabel = new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');
  const reportMeta = {
    kind: 'shipment', period: fileLabel,
    name: `${fileLabel} 제때 출고량 보고서`,
    options: { periodMode, shipYear, shipMonth, opts },
  };

  const ItemTable = ({ items, maxQty }) => (
    <table className="paper-table">
      <thead>
        <tr>
          <th style={{width:36}}>#</th>
          <th>제품명</th>
          <th style={{width:90,textAlign:'right'}}>출고량</th>
          <th style={{width:100,textAlign:'right'}}>출고금액</th>
        </tr>
      </thead>
      <tbody>
        {items.map((p, i) => {
          const pct = maxQty > 0 ? (p.totalQuantity / maxQty) * 100 : 0;
          return (
            <tr key={p.productCode || p.productName}>
              <td className="num">{i + 1}</td>
              <td>
                <div style={{marginBottom:2}}>{p.normalizedProductName || p.productName}</div>
                <div style={{height:4,background:'var(--surface-2)',borderRadius:2,overflow:'hidden'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:'var(--accent)',borderRadius:2,opacity:0.6}}/>
                </div>
              </td>
              <td className="num right">{fmtShort(p.totalQuantity)}</td>
              <td className="num right muted">{fmtKRW(p.totalAmount)}원</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

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
      options={<>
        <OptGroup label="집계 기간">
          {availPeriods.length > 0 ? (
            <select
              className="period-select num"
              value={`${shipYear}-${shipMonth}`}
              onChange={e => {
                const [y, m] = e.target.value.split('-');
                setShipYear(parseInt(y, 10));
                setShipMonth(parseInt(m, 10));
              }}
            >
              {availPeriods.map(p => (
                <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                  {p.year}년 {p.month}월
                </option>
              ))}
            </select>
          ) : (
            <div style={{fontSize:12,color:'var(--text-3)'}}>업로드된 데이터가 없어요</div>
          )}
        </OptGroup>

        <OptGroup label="포함 섹션">
          <Check label="월별 출고량 추이 차트" value={opts.chart}      onChange={v=>upd('chart',v)}/>
          <Check label="분류별 합계"           value={opts.catSummary} onChange={v=>upd('catSummary',v)}/>
          <Check label="전체 제품 목록"        value={opts.fullList}   onChange={v=>upd('fullList',v)}/>
        </OptGroup>

        <OptGroup label="문서 형식">
          <Check label="PDF"   value={docFormat.pdf}   onChange={v=>updFmt('pdf',v)}/>
          <Check label="Excel" value={docFormat.excel} onChange={v=>updFmt('excel',v)}/>
        </OptGroup>
      </>}

      preview={<>
        {/* ── 헤더 ── */}
        <div className="paper-head">
          <div className="paper-eyebrow">7번가피자 본사 · 제때상품관리</div>
          <h2 className="paper-title">{fileLabel} 제때 출고량 보고서</h2>
          <div className="paper-meta">
            <span>전용상품 {exclusive.length}개 · 범용(관리)품목 {generic.length}개</span>
            <span>·</span>
            <span className="mono">생성일 {todayLabel} · {getProfile().name}</span>
          </div>
        </div>

        {/* ── 요약 통계 ── */}
        <div className="paper-stat-row">
          <div className="paper-stat">
            <div className="paper-stat-label">총 출고량</div>
            <div className="paper-stat-val num">{totalQty > 0 ? fmtShort(totalQty) : '—'}</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">전용상품</div>
            <div className="paper-stat-val num">{exclusiveQty > 0 ? fmtShort(exclusiveQty) : '—'}</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">범용(관리)품목</div>
            <div className="paper-stat-val num">{genericQty > 0 ? fmtShort(genericQty) : '—'}</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">총 제품 수</div>
            <div className="paper-stat-val num">{aggRows.length || '—'}</div>
          </div>
        </div>

        {/* ── 추이 차트 ── */}
        {opts.chart && (
          <div className="paper-section">
            <div className="paper-section-title">월별 출고량 추이 (최근 {seriesLabels.length || 7}개월)</div>
            <div style={{padding:'8px 0'}}>
              {series.length > 0 ? (
                <AreaChart series={series} labels={seriesLabels} colors={['#1D766F','#7C3AED']} height={180} formatY={fmtShort}/>
              ) : (
                <div style={{height:180,display:'grid',placeItems:'center',color:'var(--text-4)',fontSize:13}}>데이터 없음</div>
              )}
            </div>
            <div className="paper-legend">
              <div className="paper-legend-item"><span className="dot" style={{background:'#1D766F'}}/><span>전용상품</span><span className="num muted">{fmtShort(exclusiveQty)}</span></div>
              <div className="paper-legend-item"><span className="dot" style={{background:'#7C3AED'}}/><span>범용(관리)품목</span><span className="num muted">{fmtShort(genericQty)}</span></div>
            </div>
          </div>
        )}

        {/* ── 전용상품 목록 ── */}
        {opts.fullList && exclusive.length > 0 && (
          <div className="paper-section paper-cat-section">
            <div className="paper-section-title" style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:10,height:10,borderRadius:'50%',background:'#1D766F',display:'inline-block',flexShrink:0}}/>
              전용상품 출고 현황
              <span className="num muted" style={{fontSize:11,marginLeft:'auto'}}>합계 {fmtShort(exclusiveQty)}</span>
            </div>
            <ItemTable items={exclusive} maxQty={exclusive[0]?.totalQuantity || 1}/>
          </div>
        )}

        {/* ── 범용(관리)품목 목록 ── */}
        {opts.fullList && generic.length > 0 && (
          <div className="paper-section paper-cat-section">
            <div className="paper-section-title" style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:10,height:10,borderRadius:'50%',background:'#7C3AED',display:'inline-block',flexShrink:0}}/>
              범용(관리)품목 출고 현황
              <span className="num muted" style={{fontSize:11,marginLeft:'auto'}}>합계 {fmtShort(genericQty)}</span>
            </div>
            <ItemTable items={generic} maxQty={generic[0]?.totalQuantity || 1}/>
          </div>
        )}

        {aggRows.length === 0 && !isLoading && (
          <div style={{height:80,display:'grid',placeItems:'center',color:'var(--text-4)',fontSize:13}}>
            출고 데이터가 없어요. 출고 파일을 먼저 업로드해 주세요.
          </div>
        )}

        <div className="paper-foot">
          <span className="muted" style={{fontSize:11}}>7번가 R&amp;D 플랫폼 · WONPAY 비즈니스</span>
        </div>
      </>}
    />
  );
}
