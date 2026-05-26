'use client';
import { useState } from 'react';
import ReportBuilderShell, { OptGroup, Seg, Check } from '@/components/report/ReportBuilderShell';
import { fmtKRW } from '@/lib/format';

export default function Page() {
  const [periodMode, setPeriodMode] = useState("month");
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(4);
  const [scope, setScope] = useState("all");
  const [topN, setTopN] = useState(20);
  const [opts, setOpts] = useState({
    catShare:  true,
    rankTable: true,
    prevComp:  true,
    variant:   true,
    costRate:  false,
    summary:   true,
  });
  const upd = (k, v) => setOpts(o => ({ ...o, [k]: v }));

  const periodLabel = periodMode === "year" ? `${year}년` : `${year}년 ${month}월`;

  const topMenus = [];
  const catShares = [];

  return (
    <ReportBuilderShell
      breadcrumb={["보고서센터", "판매량 보고서"]}
      title="판매량 보고서 생성"
      sub="기간·범위·표시 항목을 선택하면 미리보기가 즉시 갱신돼요."
      kind="sales"
      exportNote="PDF / Excel 두 형식으로 동시 저장돼요. 보고서센터 목록에서 다시 받을 수 있어요."
      options={<>
        <OptGroup label="집계 기간">
          <Seg value={periodMode} onChange={setPeriodMode}
            options={[{value:"month",label:"월 단위"},{value:"year",label:"년 단위"}]}/>
          <div className="opt-period-row">
            <select className="period-select num" value={year} onChange={e=>setYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            {periodMode === "month" && (
              <select className="period-select num" value={month} onChange={e=>setMonth(parseInt(e.target.value))}>
                {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
            )}
          </div>
        </OptGroup>

        <OptGroup label="대상 범위">
          <Seg value={scope} onChange={setScope}
            options={[{value:"all",label:"전체"},{value:"pizza",label:"피자만"},{value:"side",label:"사이드만"}]}/>
        </OptGroup>

        <OptGroup label="순위 깊이">
          <Seg value={topN} onChange={setTopN}
            options={[{value:10,label:"TOP 10"},{value:20,label:"TOP 20"},{value:50,label:"전체"}]}/>
        </OptGroup>

        <OptGroup label="포함 섹션">
          <Check label="요약 (총 판매량·평균 원가율)"   value={opts.summary}   onChange={v=>upd("summary",v)}/>
          <Check label="카테고리별 판매 비중 (도넛)"     value={opts.catShare}  onChange={v=>upd("catShare",v)}/>
          <Check label="메뉴 순위표"                     value={opts.rankTable} onChange={v=>upd("rankTable",v)}/>
          <Check label="규격별 (L/R/기타) 세부"           value={opts.variant}   onChange={v=>upd("variant",v)} hint="확장 행으로 표시"/>
          <Check label="전월 대비 증감"                  value={opts.prevComp}  onChange={v=>upd("prevComp",v)}/>
          <Check label="원가율 컬럼"                     value={opts.costRate}  onChange={v=>upd("costRate",v)} hint="35% 초과는 ⚠ 표시"/>
        </OptGroup>

        <OptGroup label="문서 형식">
          <Check label="PDF (보고용 — 상무님)"     value={true} onChange={()=>{}}/>
          <Check label="Excel (원본 데이터)"         value={true} onChange={()=>{}}/>
        </OptGroup>
      </>}

      preview={<>
        <div className="paper-head">
          <div className="paper-eyebrow">7번가피자 본사 · R&amp;D팀</div>
          <h2 className="paper-title">{periodLabel} 판매량 보고서</h2>
          <div className="paper-meta">
            <span>대상: {scope === "all" ? "전체 메뉴" : scope === "pizza" ? "피자" : "사이드"}</span>
            <span>·</span>
            <span>표시: TOP {topN === 50 ? "전체" : topN}</span>
            <span>·</span>
            <span className="mono">생성일 2026.05.22 · 민혁 책임</span>
          </div>
        </div>

        {opts.summary && (
          <div className="paper-stat-row">
            <div className="paper-stat">
              <div className="paper-stat-label">총 판매량</div>
              <div className="paper-stat-val num">—</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">평균 원가율</div>
              <div className="paper-stat-val num">—</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">신규 메뉴</div>
              <div className="paper-stat-val num">—</div>
            </div>
          </div>
        )}

        {opts.catShare && (
          <div className="paper-section">
            <div className="paper-section-title">카테고리별 판매 비중</div>
            <div className="share-stack" style={{marginTop:10}}>
              {catShares.map(c => (
                <div key={c.cat} className="share-seg"
                  style={{flex: c.pct, background: c.color}}
                  title={`${c.cat} ${c.pct}%`}></div>
              ))}
            </div>
            <div className="paper-legend">
              {catShares.map(c => (
                <div className="paper-legend-item" key={c.cat}>
                  <span className="dot" style={{background:c.color}}></span>
                  <span>{c.cat}</span>
                  <span className="num" style={{fontWeight:700}}>{c.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {opts.rankTable && (
          <div className="paper-section">
            <div className="paper-section-title">메뉴 판매량 순위 (TOP 5 미리보기)</div>
            <table className="paper-table">
              <thead>
                <tr>
                  <th style={{width: 40}}>#</th>
                  <th>메뉴명</th>
                  <th style={{width: 100, textAlign:"right"}}>판매량</th>
                  <th style={{width: 90, textAlign:"right"}}>비중</th>
                  {opts.prevComp && <th style={{width: 90, textAlign:"right"}}>전월 대비</th>}
                  {opts.costRate && <th style={{width: 70, textAlign:"right"}}>원가율</th>}
                </tr>
              </thead>
              <tbody>
                {topMenus.map((m, i) => (
                  <tr key={m.name}>
                    <td className="num">{i+1}</td>
                    <td>{m.name}</td>
                    <td className="num right">{fmtKRW(m.qty)}</td>
                    <td className="num right">{m.share}%</td>
                    {opts.prevComp && (
                      <td className="num right" style={{color: m.prevDelta>=0?"var(--positive)":"var(--negative)", fontWeight:700}}>
                        {m.prevDelta>=0?"▲":"▼"} {Math.abs(m.prevDelta).toFixed(1)}%
                      </td>
                    )}
                    {opts.costRate && (
                      <td className="num right">{m.costRate.toFixed(1)}%{m.costRate >= 35 ? " ⚠" : ""}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="paper-pagebreak">— 이하 TOP {topN} 까지 본 보고서에 포함 —</div>
          </div>
        )}

        <div className="paper-foot">
          <span>1 / 8</span>
          <span className="mono">7번가 R&amp;D 플랫폼 · WONPAY 비즈니스</span>
        </div>
      </>}
    />
  );
}
