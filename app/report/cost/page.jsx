'use client';
import { useState } from 'react';
import ReportBuilderShell, { OptGroup, Seg, Check } from '@/components/report/ReportBuilderShell';
import { fmtKRW } from '@/lib/format';
import { Icon } from '@/components/icons';

const COST_BY_CATEGORY = {
  pizza: {
    label: "피자", color: "#3182F6",
    note: "L 규격 기준 · 엣지 4종 평균 반영",
    menus: [
      { name: "슈퍼콤비네이션 L", cost: 8200,  sale: 32900, rate: 24.9 },
      { name: "포테이토피자 L",   cost: 11420, sale: 29900, rate: 38.2 },
      { name: "불고기피자 L",     cost: 8720,  sale: 30900, rate: 28.2 },
      { name: "고르곤졸라 L",     cost: 12480, sale: 33900, rate: 36.8 },
      { name: "새우파티 L",       cost: 12400, sale: 34900, rate: 35.5 },
    ],
  },
  personal: {
    label: "1인피자", color: "#10B981",
    note: "단일 규격 · 점심 회전율 메뉴",
    menus: [
      { name: "콤비 1인",      cost: 4260, sale: 14900, rate: 28.6 },
      { name: "포테이토 1인",  cost: 4500, sale: 14900, rate: 30.2 },
      { name: "불고기 1인",    cost: 4090, sale: 14900, rate: 27.4 },
      { name: "치즈 1인",      cost: 3640, sale: 13900, rate: 26.2 },
    ],
  },
  side: {
    label: "사이드", color: "#F59E0B",
    note: "소스 · 추가 토핑 제외",
    menus: [
      { name: "오븐스파게티",  cost: 2430, sale: 7900, rate: 30.8 },
      { name: "치즈스틱",      cost: 1660, sale: 6900, rate: 24.1 },
      { name: "치킨윙",        cost: 3680, sale: 9900, rate: 37.2 },
      { name: "감자튀김",      cost: 1080, sale: 4900, rate: 22.0 },
    ],
  },
  set: {
    label: "세트박스", color: "#EC4899",
    note: "구성품 원가 합산 — 박스·콜라 포함",
    menus: [
      { name: "패밀리박스 L",   cost: 12570, sale: 42900, rate: 29.3 },
      { name: "더블박스 L",     cost: 12260, sale: 38900, rate: 31.5 },
      { name: "커플박스 R",     cost: 8910,  sale: 26900, rate: 33.1 },
    ],
  },
  edge: {
    label: "엣지 & 도우", color: "#8B5CF6",
    note: "기본 도우 대비 추가 원가",
    menus: [
      { name: "치즈크러스트 L",     cost: 3470, sale: 8500, rate: 40.8 },
      { name: "골드스윗크러스트 L", cost: 3700, sale: 8500, rate: 43.5 },
      { name: "씬도우 L",           cost: 1820, sale: 8000, rate: 22.8 },
    ],
  },
};

export default function Page() {
  const [periodMode, setPeriodMode] = useState("month");
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(4);
  const [riskThreshold, setRiskThreshold] = useState(35);
  const [cats, setCats] = useState({ pizza: true, personal: true, side: true, set: true, edge: true });
  const [opts, setOpts] = useState({ summary: true, catTable: true, perCategory: true, riskList: true, salePrice: true });
  const updCat = (k, v) => setCats(s => ({ ...s, [k]: v }));
  const updOpt = (k, v) => setOpts(s => ({ ...s, [k]: v }));

  const periodLabel = periodMode === "year" ? `${year}년` : `${year}년 ${month}월`;
  const activeCats = Object.entries(COST_BY_CATEGORY).filter(([k]) => cats[k]);
  const catStats = activeCats.map(([k, c]) => {
    const rates = c.menus.map(m => m.rate);
    const avg = rates.reduce((s,v)=>s+v,0) / rates.length;
    const risk = c.menus.filter(m => m.rate >= riskThreshold).length;
    return { id: k, ...c, avg, min: Math.min(...rates), max: Math.max(...rates), risk, count: c.menus.length };
  });
  const allMenus = activeCats.flatMap(([_, c]) => c.menus);
  const totalCount = allMenus.length;
  const allAvg = totalCount ? allMenus.reduce((s,m)=>s+m.rate,0) / totalCount : 0;
  const allRisk = allMenus.filter(m => m.rate >= riskThreshold).length;
  const allMaxRate = totalCount ? Math.max(...allMenus.map(m=>m.rate)) : 0;
  const riskMenus = activeCats.flatMap(([_, c]) =>
    c.menus.filter(m => m.rate >= riskThreshold).map(m => ({ ...m, catLabel: c.label, catColor: c.color }))
  ).sort((a, b) => b.rate - a.rate);

  return (
    <ReportBuilderShell
      breadcrumb={["보고서센터", "원가계산 보고서"]}
      title="원가계산 보고서 생성"
      sub="5개 카테고리(피자·1인피자·사이드·세트박스·엣지&도우)의 종합 원가를 한 장에 모아요."
      kind="cost"
      exportNote="제때 단가는 보고서 생성 시점으로 고정돼요. 이후 단가 변동은 다음 보고서에 반영됩니다."
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
          <Check label="PDF (보고용 — 상무님)"  value={true} onChange={()=>{}}/>
          <Check label="Excel (원본 데이터)"     value={true} onChange={()=>{}}/>
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
            <span className="mono">단가 기준 2026.05.21 · 민혁 책임</span>
          </div>
        </div>

        {opts.summary && (
          <div className="paper-stat-row" style={{gridTemplateColumns:"repeat(4, 1fr)"}}>
            <div className="paper-stat">
              <div className="paper-stat-label">대상 메뉴</div>
              <div className="paper-stat-val num">{totalCount}<span className="unit">개</span></div>
              <div className="paper-stat-foot">{activeCats.length}개 카테고리</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">평균 원가율</div>
              <div className="paper-stat-val num">{allAvg.toFixed(1)}<span className="unit">%</span></div>
              <div className="paper-stat-foot">전 카테고리 가중평균</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">위험 메뉴</div>
              <div className="paper-stat-val num" style={{color:"var(--warn)"}}>{allRisk}<span className="unit">개</span></div>
              <div className="paper-stat-foot">{riskThreshold}% 초과</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">최고 원가율</div>
              <div className="paper-stat-val num" style={{color:"var(--negative)"}}>{allMaxRate.toFixed(1)}<span className="unit">%</span></div>
              <div className="paper-stat-foot">단일 메뉴 기준</div>
            </div>
          </div>
        )}

        {opts.catTable && (
          <div className="paper-section">
            <div className="paper-section-title">카테고리별 종합 비교</div>
            <div className="cost-bars">
              {catStats.map(c => {
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
                      <b>{c.avg.toFixed(1)}<span className="unit">%</span></b>
                      <span className="muted" style={{fontSize:11, marginLeft:4}}>({c.min.toFixed(1)}~{c.max.toFixed(1)})</span>
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
                    <td className="num right" style={{fontWeight:800}}>{c.avg.toFixed(1)}%</td>
                    <td className="num right">{c.min.toFixed(1)}% ~ {c.max.toFixed(1)}%</td>
                    <td className="num right">{c.risk > 0 ? <span style={{color:"var(--warn)",fontWeight:800}}>{c.risk}개 ⚠</span> : <span className="muted">0개</span>}</td>
                    <td className="muted" style={{fontSize:11}}>{c.note}</td>
                  </tr>
                ))}
                <tr style={{background:"var(--surface-2)"}}>
                  <td style={{fontWeight:800}}>합계</td>
                  <td className="num right" style={{fontWeight:800}}>{totalCount}</td>
                  <td className="num right" style={{fontWeight:800}}>{allAvg.toFixed(1)}%</td>
                  <td className="num right muted">—</td>
                  <td className="num right" style={{fontWeight:800,color:"var(--warn)"}}>{allRisk}개</td>
                  <td className="muted" style={{fontSize:11}}>전 카테고리 기준</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {opts.perCategory && catStats.map(c => (
          <div className="paper-section" key={c.id}>
            <div className="paper-section-title" style={{borderBottomColor:c.color,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
                <span className="dot" style={{width:10,height:10,borderRadius:3,background:c.color}}></span>
                {c.label} 종합 원가 (상위 5개)
              </span>
              <span className="muted" style={{fontSize:11,fontWeight:600}}>
                평균 <b className="num" style={{color:"var(--text-1)"}}>{c.avg.toFixed(1)}%</b> · 위험 {c.risk}개
              </span>
            </div>
            <table className="paper-table">
              <thead>
                <tr>
                  <th style={{width:36}}>#</th>
                  <th>메뉴명</th>
                  <th style={{width:100,textAlign:"right"}}>원가</th>
                  {opts.salePrice && <th style={{width:100,textAlign:"right"}}>판매가</th>}
                  <th style={{width:90,textAlign:"right"}}>원가율</th>
                  <th style={{width:36}}></th>
                </tr>
              </thead>
              <tbody>
                {c.menus.slice(0, 5).map((m, i) => {
                  const risk = m.rate >= riskThreshold;
                  return (
                    <tr key={m.name}>
                      <td className="num">{i+1}</td>
                      <td>{m.name}</td>
                      <td className="num right">{fmtKRW(m.cost)}원</td>
                      {opts.salePrice && <td className="num right muted">{fmtKRW(m.sale)}원</td>}
                      <td className="num right" style={{fontWeight:risk?800:600,color:risk?"var(--warn)":"var(--text-1)"}}>
                        {m.rate.toFixed(1)}%
                      </td>
                      <td>{risk && <span style={{color:"var(--warn)"}}>⚠</span>}</td>
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
                  <th style={{width:100,textAlign:"right"}}>원가</th>
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
                    <td className="num right">{fmtKRW(m.cost)}원</td>
                    <td className="num right muted">{fmtKRW(m.sale)}원</td>
                    <td className="num right" style={{fontWeight:800,color:"var(--warn)"}}>{m.rate.toFixed(1)}% ⚠</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="paper-pagebreak" style={{color:"var(--warn)"}}>
              총 {riskMenus.length}개 메뉴 — 단가 협상 · 판매가 조정 · 토핑 감량 검토 권장
            </div>
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
