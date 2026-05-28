'use client';
import { useState, useEffect } from 'react';
import ReportBuilderShell, { OptGroup, Seg, Check } from '@/components/report/ReportBuilderShell';
import { fmtKRW, fmtShort } from '@/lib/format';
import { AreaChart } from '@/components/charts/AreaChart';
import { initDB } from '@/lib/db/init';
import { getShipmentFiles, getShipmentRowsByFileId } from '@/lib/shipment/store-files';
import { aggregateShipmentRows } from '@/lib/shipment/aggregate';
import { getManagedProducts } from '@/lib/shipment/store-managed';
import { useDraftRestore } from '@/lib/report/useDraftRestore';
import { getProfile } from '@/lib/profile';

const DRAFT_KEY = 'report_draft_shipment';

export default function Page() {
  const periodMode = 'month';
  const [shipYear,  setShipYear]  = useState(new Date().getFullYear());
  const [shipMonth, setShipMonth] = useState(new Date().getMonth() + 1);
  const [type, setType] = useState('all');
  const [opts, setOpts] = useState({
    chart:      true,
    catSummary: true,
    fullList:   true,
    delta:      true,
  });
  const upd = (k, v) => setOpts(o => ({ ...o, [k]: v }));
  const [docFormat, setDocFormat] = useState({ pdf: true, excel: false });
  const updFmt = (k, v) => setDocFormat(f => ({ ...f, [k]: v }));

  const [aggRows,    setAggRows]    = useState([]);
  const [series,     setSeries]     = useState([]);
  const [seriesLabels, setSeriesLabels] = useState([]);
  const [fileLabel,  setFileLabel]  = useState('—');
  const [availYears, setAvailYears] = useState([]);
  const [dataError,  setDataError]  = useState(null);
  const [isLoading,  setIsLoading]  = useState(true);

  useDraftRestore(DRAFT_KEY, draft => {
    if (draft.shipYear)   setShipYear(draft.shipYear);
    if (draft.shipMonth)  setShipMonth(draft.shipMonth);
    if (draft.type)       setType(draft.type);
    if (draft.opts)       setOpts(o => ({ ...o, ...draft.opts }));
  });

  useEffect(() => {
    setIsLoading(true);
    initDB().then(async () => {
      try {
        const files = await getShipmentFiles();
        if (files.length === 0) { setIsLoading(false); return; }
        const sorted = [...files].sort((a, b) => a.uploadedAt > b.uploadedAt ? -1 : 1);

        // 업로드된 연도 목록 추출
        const years = [...new Set(sorted.map(f => parseInt(f.uploadedAt?.slice(0,4) || new Date().getFullYear())))].sort((a,b)=>b-a);
        setAvailYears(years);

        const targetPrefix = `${shipYear}-${String(shipMonth).padStart(2,'0')}`;
        const target = sorted.find(f => f.uploadedAt?.startsWith(targetPrefix)) || sorted[0];
        setFileLabel(target.periodLabel || target.uploadedAt?.slice(0, 7) || '최신');

        const managedProducts = await getManagedProducts();

        const rows = await getShipmentRowsByFileId(target.id);
        const agg  = aggregateShipmentRows(rows, managedProducts);
        setAggRows(agg);

        // 최근 파일로 추이 시리즈 (최대 7개)
        const recent = sorted.slice(0, 7).reverse();
        const labels = recent.map(f =>
          f.year && f.month ? `${f.year}.${String(f.month).padStart(2, '0')}` : (f.periodLabel || '—')
        );
        const allRows = await Promise.all(recent.map(f => getShipmentRowsByFileId(f.id)));
        const managedData = [];
        const genericData = [];
        for (const r of allRows) {
          const a = aggregateShipmentRows(r, managedProducts);
          managedData.push(a.filter(x => x.productType === 'exclusive').reduce((s, x) => s + x.totalQuantity, 0));
          genericData.push(a.filter(x => x.productType !== 'exclusive').reduce((s, x) => s + x.totalQuantity, 0));
        }
        if (managedData.some(v => v > 0) || genericData.some(v => v > 0)) {
          setSeries([
            { name: '관리품목', data: managedData },
            { name: '범용상품', data: genericData },
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

  const filtered = type === 'all'     ? aggRows
    : type === 'managed' ? aggRows.filter(r => r.productType === 'exclusive')
    : aggRows.filter(r => r.productType !== 'exclusive');

  const totalQty   = filtered.reduce((s, r) => s + r.totalQuantity, 0);
  const managedQty = aggRows.filter(r => r.productType === 'exclusive').reduce((s, r) => s + r.totalQuantity, 0);
  const genericQty = aggRows.filter(r => r.productType !== 'exclusive').reduce((s, r) => s + r.totalQuantity, 0);

  const managed = [...filtered].filter(r => r.productType === 'exclusive').sort((a, b) => b.totalQuantity - a.totalQuantity);
  const generic = [...filtered].filter(r => r.productType !== 'exclusive').sort((a, b) => b.totalQuantity - a.totalQuantity);

  const todayLabel = new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace(/\.$/, '');
  const reportMeta = {
    kind: 'shipment', period: fileLabel,
    name: `${fileLabel} 제때 출고량 보고서`,
    options: { periodMode, shipYear, shipMonth, type, opts },
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
      sub="대상 제품 출고량 — 카테고리·분류별로 요약돼요."
      kind="shipment"
      reportMeta={reportMeta}
      dataError={dataError}
      isLoading={isLoading}
      docFormat={docFormat}
      options={<>
        <OptGroup label="집계 기간">
          <div className="opt-period-row">
            <select className="period-select num" value={shipYear}
              onChange={e => setShipYear(parseInt(e.target.value, 10))}>
              {(availYears.length > 0 ? availYears : [2024, 2025, 2026]).map(y =>
                <option key={y} value={y}>{y}년</option>)}
            </select>
            <select className="period-select num" value={shipMonth}
              onChange={e => setShipMonth(parseInt(e.target.value, 10))}>
              {Array.from({length:12}, (_, i) => i + 1).map(m =>
                <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
        </OptGroup>

        <OptGroup label="대상 분류">
          <Seg value={type} onChange={setType}
            options={[
              { value: 'all',     label: '전체' },
              { value: 'managed', label: '관리품목' },
              { value: 'common',  label: '범용상품' },
            ]}/>
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
            <span>대상: {type === 'all' ? '전체' : type === 'managed' ? '관리품목' : '범용상품'}</span>
            <span>·</span>
            <span>제품 {filtered.length}개</span>
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
            <div className="paper-stat-label">관리품목</div>
            <div className="paper-stat-val num">{managedQty > 0 ? fmtShort(managedQty) : '—'}</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">범용상품</div>
            <div className="paper-stat-val num">{genericQty > 0 ? fmtShort(genericQty) : '—'}</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">제품 수</div>
            <div className="paper-stat-val num">{filtered.length || '—'}</div>
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
              <div className="paper-legend-item"><span className="dot" style={{background:'#1D766F'}}/><span>관리품목</span><span className="num muted">{fmtShort(managedQty)}</span></div>
              <div className="paper-legend-item"><span className="dot" style={{background:'#7C3AED'}}/><span>범용상품</span><span className="num muted">{fmtShort(genericQty)}</span></div>
            </div>
          </div>
        )}

        {/* ── 관리품목 전체 목록 ── */}
        {opts.fullList && managed.length > 0 && (
          <div className="paper-section paper-cat-section">
            <div className="paper-section-title" style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:10,height:10,borderRadius:'50%',background:'#1D766F',display:'inline-block',flexShrink:0}}/>
              관리품목 출고 현황
              <span className="num muted" style={{fontSize:11,marginLeft:'auto'}}>합계 {fmtShort(managedQty)}</span>
            </div>
            <ItemTable items={managed} maxQty={managed[0]?.totalQuantity || 1}/>
          </div>
        )}

        {/* ── 범용상품 전체 목록 ── */}
        {opts.fullList && generic.length > 0 && (
          <div className="paper-section paper-cat-section">
            <div className="paper-section-title" style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:10,height:10,borderRadius:'50%',background:'#7C3AED',display:'inline-block',flexShrink:0}}/>
              범용상품 출고 현황
              <span className="num muted" style={{fontSize:11,marginLeft:'auto'}}>합계 {fmtShort(genericQty)}</span>
            </div>
            <ItemTable items={generic} maxQty={generic[0]?.totalQuantity || 1}/>
          </div>
        )}

        {filtered.length === 0 && !isLoading && (
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
