'use client';
import { useState, useEffect } from 'react';
import ReportBuilderShell, { OptGroup, Seg, Check } from '@/components/report/ReportBuilderShell';
import { downloadCsv } from '@/lib/download';
import { fmtKRW, pad } from '@/lib/format';
import { Icon } from '@/components/icons';
import { initDB } from '@/lib/db/init';
import { getAllMenuPrices } from '@/lib/cost/menu-price/store';
import { useDraftRestore } from '@/lib/report/useDraftRestore';
import { getProfile } from '@/lib/profile';

const matchEdge = (cat) => cat === '엣지' || cat === '엣지&도우' || cat === '엣지 & 도우';

const CAT_META = {
  '피자':     { id: 'pizza',    color: '#3182F6', note: 'L 규격 기준' },
  '1인피자':  { id: 'personal', color: '#10B981', note: '단일 규격 · 점심 회전율 메뉴' },
  '사이드':   { id: 'side',     color: '#F59E0B', note: '소스 · 추가 토핑 제외' },
  '세트박스': { id: 'set',      color: '#EC4899', note: '구성품 원가 합산' },
  '엣지':     { id: 'edge',     color: '#8B5CF6', note: '기본 도우 대비 추가 원가' },
};
const CAT_KEYS = ['피자', '1인피자', '사이드', '세트박스', '엣지'];

const DRAFT_KEY = 'report_draft_cost';

export default function Page() {
  const [periodMode, setPeriodMode] = useState("month");
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [riskThreshold, setRiskThreshold] = useState(35);
  const [cats, setCats] = useState({ pizza: true, personal: true, side: true, set: true, edge: true });
  const [opts, setOpts] = useState({ summary: true, catTable: true, perCategory: true, riskList: true, salePrice: true });
  const updCat = (k, v) => setCats(s => ({ ...s, [k]: v }));
  const updOpt = (k, v) => setOpts(s => ({ ...s, [k]: v }));
  const [docFormat, setDocFormat] = useState({ pdf: true, excel: false });
  const updFmt = (k, v) => setDocFormat(f => ({ ...f, [k]: v }));

  const [dataError, setDataError] = useState(null);

  // DB 데이터
  const [costByCategory, setCostByCategory] = useState({
    pizza:    { label: '피자',      color: '#3182F6', note: 'L 규격 기준',                    menus: [] },
    personal: { label: '1인피자',  color: '#10B981', note: '단일 규격 · 점심 회전율 메뉴',   menus: [] },
    side:     { label: '사이드',   color: '#F59E0B', note: '소스 · 추가 토핑 제외',           menus: [] },
    set:      { label: '세트박스', color: '#EC4899', note: '구성품 원가 합산',               menus: [] },
    edge:     { label: '엣지 & 도우', color: '#8B5CF6', note: '기본 도우 대비 추가 원가',  menus: [] },
  });

  const [isLoading, setIsLoading] = useState(true);

  useDraftRestore(DRAFT_KEY, draft => {
    if (draft.periodMode) setPeriodMode(draft.periodMode);
    if (draft.year) setYear(draft.year);
    if (draft.month) setMonth(draft.month);
    if (draft.riskThreshold) setRiskThreshold(draft.riskThreshold);
    if (draft.cats) setCats(c => ({ ...c, ...draft.cats }));
    if (draft.opts) setOpts(o => ({ ...o, ...draft.opts }));
  });

  useEffect(() => {
    setIsLoading(true);
    initDB().then(async () => {
      try {
        const prices = await getAllMenuPrices();
        if (prices.length === 0) { setIsLoading(false); return; }

        const updated = { ...costByCategory };
        for (const catLabel of CAT_KEYS) {
          const meta = CAT_META[catLabel];
          if (!meta) continue;
          const catPrices = prices.filter(p => catLabel === '엣지' ? matchEdge(p.category) : p.category === catLabel);
          updated[meta.id] = {
            ...updated[meta.id],
            menus: catPrices.map(p => ({
              name: p.size && p.size !== '단일' ? `${p.menuName} ${p.size}` : p.menuName,
              cost: 0,
              sale: p.price || 0,
              rate: 0,
            })),
          };
        }
        setCostByCategory(updated);
        setDataError(null);
      } catch (err) {
        console.error('[cost report]', err);
        setDataError('메뉴 가격 데이터를 불러오는 중 오류가 발생했어요.');
      } finally {
        setIsLoading(false);
      }
    }).catch(() => { setIsLoading(false); setDataError('데이터베이스에 연결할 수 없어요. 데이터를 먼저 업로드해 주세요.'); });
  }, []);

  const periodLabel = periodMode === "year" ? `${year}년` : `${year}년 ${month}월`;
  const activeCats = Object.entries(costByCategory).filter(([k]) => cats[k]);
  const catStats = activeCats.map(([k, c]) => {
    const withRate = c.menus.filter(m => m.rate > 0);
    const rates = withRate.map(m => m.rate);
    const avg = rates.length ? rates.reduce((s,v)=>s+v,0) / rates.length : 0;
    const risk = c.menus.filter(m => m.rate >= riskThreshold).length;
    return { id: k, ...c, avg, min: rates.length ? Math.min(...rates) : 0, max: rates.length ? Math.max(...rates) : 0, risk, count: c.menus.length };
  });
  const allMenus = activeCats.flatMap(([_, c]) => c.menus);
  const totalCount = allMenus.length;
  const allAvg = totalCount ? allMenus.reduce((s,m)=>s+m.rate,0) / totalCount : 0;
  const allRisk = allMenus.filter(m => m.rate >= riskThreshold).length;
  const allMaxRate = totalCount ? Math.max(...allMenus.map(m=>m.rate)) : 0;
  const riskMenus = activeCats.flatMap(([_, c]) =>
    c.menus.filter(m => m.rate >= riskThreshold).map(m => ({ ...m, catLabel: c.label, catColor: c.color }))
  ).sort((a, b) => b.rate - a.rate);
  const reportMeta = { period: periodLabel, name: `${periodLabel} 원가계산 종합 보고서`, pages: 9, options: { periodMode, year, month, riskThreshold, cats, opts } };

  const handleExcelExport = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
    const periodPart = periodLabel.replace(/(\d+)년 (\d+)월/, (_, y, m) => `${y}년${m.padStart(2,'0')}월`);
    const fileName = `7번가피자_${periodPart} 원가계산보고서_${dateStr}.csv`;
    const rows = [
      ['카테고리', '메뉴명', '원가(원)', '원가율(%)'],
      ...activeCats.flatMap(([_, c]) => c.menus.map(m => [c.label, m.name, m.cost, m.rate])),
    ];
    downloadCsv(rows, fileName);
  };

  return (
    <ReportBuilderShell
      breadcrumb={["보고서센터", "원가계산 보고서"]}
      title="원가계산 보고서 생성"
      sub="5개 카테고리(피자·1인피자·사이드·세트박스·엣지&도우)의 종합 원가를 한 장에 모아요."
      kind="cost"
      exportNote="제때 단가는 보고서 생성 시점으로 고정돼요. 이후 단가 변동은 다음 보고서에 반영됩니다."
      reportMeta={reportMeta}
      dataError={dataError}
      isLoading={isLoading}
      docFormat={docFormat}
      onExcelExport={handleExcelExport}
      options={<>
        <OptGroup label="집계 기준 기간">
          <Seg value={periodMode} onChange={setPeriodMode}
            options={[{value:"month",label:"월 단위"},{value:"year",label:"년 단위"}]}/>
          <div className="opt-period-row">
            <select className="period-select num" value={year} onChange={e=>setYear(parseInt(e.target.value))}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            {periodMode === "month" && (
              <select className="period-select num" value={month} onChange={e=>setMonth(parseInt(e.target.value))}>
                {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
            )}
          </div>
        </OptGroup>

        <OptGroup label="포함 카테고리" hint="체크된 카테고리만 종합 원가표에 포함돼요">
          <Check label="피자 종합 원가"     value={cats.pizza}    onChange={v=>updCat("pizza",v)}/>
          <Check label="1인피자 종합 원가"  value={cats.personal} onChange={v=>updCat("personal",v)}/>
          <Check label="사이드 종합 원가"   value={cats.side}     onChange={v=>updCat("side",v)}/>
          <Check label="세트박스 종합 원가" value={cats.set}      onChange={v=>updCat("set",v)}/>
          <Check label="엣지 & 도우 원가"   value={cats.edge}     onChange={v=>updCat("edge",v)}/>
        </OptGroup>

        <OptGroup label="위험 메뉴 기준" hint="이 원가율을 초과하는 메뉴는 ⚠ 표시">
          <div className="threshold-bar">
            <input type="range" min="25" max="50" step="1"
              value={riskThreshold} onChange={e=>setRiskThreshold(parseInt(e.target.value))}/>
            <div className="threshold-val num" style={{minWidth:64, color:"var(--warn)"}}>{riskThreshold}<span className="unit">%↑</span></div>
          </div>
        </OptGroup>

        <OptGroup label="포함 섹션">
          <Check label="요약 (평균 원가율·위험 메뉴 수)"   value={opts.summary}     onChange={v=>updOpt("summary",v)}/>
          <Check label="카테고리별 종합 비교표"            value={opts.catTable}    onChange={v=>updOpt("catTable",v)}/>
          <Check label="카테고리별 메뉴 상세 (5개씩)"      value={opts.perCategory} onChange={v=>updOpt("perCategory",v)}/>
          <Check label="판매가 컬럼 표시"                 value={opts.salePrice}   onChange={v=>updOpt("salePrice",v)}/>
          <Check label="위험 메뉴 부록 (원가율 높은 순)"   value={opts.riskList}    onChange={v=>updOpt("riskList",v)}/>
        </OptGroup>

        <OptGroup label="문서 형식">
          <Check label="PDF"                value={docFormat.pdf}   onChange={v => updFmt('pdf', v)}/>
          <Check label="Excel (원본 데이터)" value={docFormat.excel} onChange={v => updFmt('excel', v)}/>
        </OptGroup>
      </>}

      preview={<>
        <div className="paper-head">
          <div className="paper-eyebrow">7번가피자 본사 · 원가관리</div>
          <h2 className="paper-title">{periodLabel} 원가계산 종합 보고서</h2>
          <div className="paper-meta">
            <span>대상: {activeCats.length}개 카테고리 · {totalCount}개 메뉴</span>
            <span>·</span>
            <span>위험 기준 {riskThreshold}%↑</span>
            <span>·</span>
            <span className="mono">단가 기준 {new Date().toLocaleDateString('ko-KR').slice(0,-1)} · {getProfile().name}</span>
          </div>
        </div>

        {opts.summary && (
          <div className="paper-stat-row" style={{gridTemplateColumns:"repeat(4, 1fr)"}}>
            <div className="paper-stat">
              <div className="paper-stat-label">대상 메뉴</div>
              <div className="paper-stat-val num">{totalCount > 0 ? totalCount : '—'}<span className="unit">{totalCount > 0 ? '개' : ''}</span></div>
              <div className="paper-stat-foot">{activeCats.length}개 카테고리</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">평균 원가율</div>
              <div className="paper-stat-val num">{allAvg > 0 ? allAvg.toFixed(1) : '—'}<span className="unit">{allAvg > 0 ? '%' : ''}</span></div>
              <div className="paper-stat-foot">전 카테고리 가중평균</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">위험 메뉴</div>
              <div className="paper-stat-val num" style={{color:"var(--warn)"}}>{allRisk}</div>
              <div className="paper-stat-foot">{riskThreshold}% 초과</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">최고 원가율</div>
              <div className="paper-stat-val num" style={{color:"var(--negative)"}}>{allMaxRate > 0 ? allMaxRate.toFixed(1) : '—'}<span className="unit">{allMaxRate > 0 ? '%' : ''}</span></div>
              <div className="paper-stat-foot">단일 메뉴 기준</div>
            </div>
          </div>
        )}

        {opts.catTable && (
          <div className="paper-section">
            <div className="paper-section-title">카테고리별 종합 비교</div>
            {catStats.some(c => c.count > 0) ? (
              <>
                <div className="cost-bars">
                  {catStats.filter(c => c.count > 0).map(c => {
                    const w = (c.avg / 50) * 100;
                    return (
                      <div key={c.id} className="cost-bar-row">
                        <div className="cost-bar-label">
                          <span className="dot" style={{background: c.color}}></span>
                          <span>{c.label}</span>
                        </div>
                        <div className="cost-bar-track">
                          <div className="cost-bar-fill" style={{width:`${Math.min(w,100)}%`, background: c.color}}></div>
                          <div className="cost-bar-threshold" style={{left:`${(riskThreshold/50)*100}%`}} title={`위험 기준 ${riskThreshold}%`}></div>
                        </div>
                        <div className="cost-bar-val num">
                          {c.avg > 0
                            ? <><b>{c.avg.toFixed(1)}<span className="unit">%</span></b><span className="muted" style={{fontSize:11, marginLeft:4}}>({c.min.toFixed(1)}~{c.max.toFixed(1)})</span></>
                            : <span className="muted">원가 미등록</span>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
                <table className="paper-table" style={{marginTop:14}}>
                  <thead>
                    <tr>
                      <th>카테고리</th>
                      <th style={{width:70, textAlign:"right"}}>메뉴 수</th>
                      <th style={{width:90, textAlign:"right"}}>평균 원가율</th>
                      <th style={{width:120, textAlign:"right"}}>최저 ~ 최고</th>
                      <th style={{width:80, textAlign:"right"}}>위험</th>
                      <th>비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catStats.map(c => (
                      <tr key={c.id}>
                        <td><span style={{display:"inline-flex",alignItems:"center",gap:6}}><span className="dot" style={{width:8,height:8,borderRadius:"50%",background:c.color}}></span><b>{c.label}</b></span></td>
                        <td className="num right">{c.count}</td>
                        <td className="num right" style={{fontWeight:800}}>{c.avg > 0 ? `${c.avg.toFixed(1)}%` : '—'}</td>
                        <td className="num right">{c.avg > 0 ? `${c.min.toFixed(1)}% ~ ${c.max.toFixed(1)}%` : '—'}</td>
                        <td className="num right">{c.risk > 0 ? <span style={{color:"var(--warn)",fontWeight:800}}>{c.risk}개 ⚠</span> : <span className="muted">0개</span>}</td>
                        <td className="muted" style={{fontSize:11}}>{c.note}</td>
                      </tr>
                    ))}
                    <tr style={{background:"var(--surface-2)"}}>
                      <td style={{fontWeight:800}}>합계</td>
                      <td className="num right" style={{fontWeight:800}}>{totalCount}</td>
                      <td className="num right" style={{fontWeight:800}}>{allAvg > 0 ? `${allAvg.toFixed(1)}%` : '—'}</td>
                      <td className="num right muted">—</td>
                      <td className="num right" style={{fontWeight:800,color:"var(--warn)"}}>{allRisk}개</td>
                      <td className="muted" style={{fontSize:11}}>전 카테고리 기준</td>
                    </tr>
                  </tbody>
                </table>
              </>
            ) : (
              <div style={{height:60,display:'grid',placeItems:'center',color:'var(--text-4)',fontSize:13}}>원가계산 → 판매가 등록 후 표시돼요</div>
            )}
          </div>
        )}

        {opts.perCategory && catStats.filter(c => c.count > 0).map(c => (
          <div className="paper-section" key={c.id}>
            <div className="paper-section-title" style={{borderBottomColor:c.color,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
                <span className="dot" style={{width:10,height:10,borderRadius:3,background:c.color}}></span>
                {c.label} 종합 원가 (상위 5개)
              </span>
              <span className="muted" style={{fontSize:11,fontWeight:600}}>
                {c.avg > 0 ? <>평균 <b className="num" style={{color:"var(--text-1)"}}>{c.avg.toFixed(1)}%</b> · 위험 {c.risk}개</> : '원가 미등록'}
              </span>
            </div>
            <table className="paper-table">
              <thead>
                <tr>
                  <th style={{width:36}}>#</th>
                  <th>메뉴명</th>
                  {opts.salePrice && <th style={{width:100,textAlign:"right"}}>판매가</th>}
                  <th style={{width:90,textAlign:"right"}}>원가율</th>
                </tr>
              </thead>
              <tbody>
                {c.menus.slice(0, 5).map((m, i) => {
                  const risk = m.rate >= riskThreshold;
                  return (
                    <tr key={m.name}>
                      <td className="num">{i+1}</td>
                      <td>{m.name}</td>
                      {opts.salePrice && <td className="num right muted">{m.sale > 0 ? `${fmtKRW(m.sale)}원` : '—'}</td>}
                      <td className="num right" style={{fontWeight:risk?800:600,color:risk?"var(--warn)":"var(--text-1)"}}>
                        {m.rate > 0 ? `${m.rate.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {opts.riskList && riskMenus.length > 0 && (
          <div className="paper-section">
            <div className="paper-section-title" style={{borderBottomColor:"var(--warn)"}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
                <Icon.alert style={{width:14,height:14,color:"var(--warn)"}}/>
                위험 메뉴 부록 (원가율 {riskThreshold}% 초과)
              </span>
            </div>
            <table className="paper-table">
              <thead>
                <tr>
                  <th style={{width:36}}>#</th>
                  <th>메뉴명</th>
                  <th style={{width:90}}>카테고리</th>
                  <th style={{width:100,textAlign:"right"}}>판매가</th>
                  <th style={{width:90,textAlign:"right"}}>원가율</th>
                </tr>
              </thead>
              <tbody>
                {riskMenus.map((m, i) => (
                  <tr key={m.name}>
                    <td className="num">{i+1}</td>
                    <td style={{fontWeight:700}}>{m.name}</td>
                    <td><span style={{display:"inline-flex",alignItems:"center",gap:6}}><span className="dot" style={{width:6,height:6,borderRadius:"50%",background:m.catColor}}></span>{m.catLabel}</span></td>
                    <td className="num right muted">{m.sale > 0 ? `${fmtKRW(m.sale)}원` : '—'}</td>
                    <td className="num right" style={{fontWeight:800,color:"var(--warn)"}}>{m.rate.toFixed(1)}% ⚠</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="paper-foot">
          <span>1 / 9</span>
          <span className="mono">7번가 R&amp;D 플랫폼 · WONPAY 비즈니스</span>
        </div>
      </>}
    />
  );
}
