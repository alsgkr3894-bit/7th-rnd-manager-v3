'use client';
import { useState } from 'react';
import ReportBuilderShell, { OptGroup, Seg, Check } from '@/components/report/ReportBuilderShell';
import { fmtKRW, fmtShort } from '@/lib/format';
import { AreaChart } from '@/components/charts/AreaChart';

export default function Page() {
  const [mode, setMode] = useState("mom");
  const [scope, setScope] = useState("all");
  const [opts, setOpts] = useState({
    summary:    true,
    catCompare: true,
    rankShift:  true,
    chart:      true,
    winners:    true,
  });
  const upd = (k, v) => setOpts(o => ({ ...o, [k]: v }));

  const compareRows = [];
  const series = [];

  return (
    <ReportBuilderShell
      breadcrumb={["보고서센터", "판매량 비교 보고서"]}
      title="판매량 비교 보고서 생성"
      sub="두 기간을 나란히 — 메뉴별 순위 이동·증감을 한눈에."
      kind="compare"
      exportNote="비교 모드를 바꾸면 A·B 기간 라벨이 자동으로 갱신돼요."
      options={<>
        <OptGroup label="비교 모드">
          <Seg value={mode} onChange={setMode}
            options={[
              {value:"mom",    label:"전월 대비"},
              {value:"yoy",    label:"전년 동월"},
              {value:"custom", label:"사용자 지정"},
            ]}/>
        </OptGroup>

        <OptGroup label="기간 A (기준)">
          <div className="opt-period-row">
            <select className="period-select num" defaultValue={2026}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select className="period-select num" defaultValue={3}>
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
        </OptGroup>

        <OptGroup label="기간 B (비교)">
          <div className="opt-period-row">
            <select className="period-select num" defaultValue={2026}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select className="period-select num" defaultValue={4}>
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
        </OptGroup>

        <OptGroup label="대상 범위">
          <Seg value={scope} onChange={setScope}
            options={[{value:"all",label:"전체"},{value:"pizza",label:"피자"},{value:"side",label:"사이드"}]}/>
        </OptGroup>

        <OptGroup label="포함 섹션">
          <Check label="요약 (총 판매량·증감)"            value={opts.summary}    onChange={v=>upd("summary",v)}/>
          <Check label="카테고리별 비교"                   value={opts.catCompare} onChange={v=>upd("catCompare",v)}/>
          <Check label="순위 이동표 (메뉴별 A→B)"          value={opts.rankShift}  onChange={v=>upd("rankShift",v)}/>
          <Check label="비교 차트 (스택 막대)"             value={opts.chart}      onChange={v=>upd("chart",v)}/>
          <Check label="Winners & Losers 부록"             value={opts.winners}    onChange={v=>upd("winners",v)} hint="±10% 이상 변동"/>
        </OptGroup>
      </>}

      preview={<>
        <div className="paper-head">
          <div className="paper-eyebrow">7번가피자 본사 · R&amp;D팀</div>
          <h2 className="paper-title">판매량 비교 보고서 — 2026.03 vs 2026.04</h2>
          <div className="paper-meta">
            <span>비교 모드: {mode === "mom" ? "전월 대비" : mode === "yoy" ? "전년 동월" : "사용자 지정"}</span>
            <span>·</span>
            <span>대상: {scope === "all" ? "전체" : scope === "pizza" ? "피자" : "사이드"}</span>
            <span>·</span>
            <span className="mono">생성일 2026.05.22 · 민혁 책임</span>
          </div>
        </div>

        {opts.summary && (
          <div className="paper-stat-row">
            <div className="paper-stat">
              <div className="paper-stat-label">총 판매량 (A)</div>
              <div className="paper-stat-val num">—</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">총 판매량 (B)</div>
              <div className="paper-stat-val num">—</div>
            </div>
            <div className="paper-stat">
              <div className="paper-stat-label">증감</div>
              <div className="paper-stat-val num">—</div>
            </div>
          </div>
        )}

        {opts.chart && (
          <div className="paper-section">
            <div className="paper-section-title">카테고리별 판매량 비교</div>
            <div style={{padding: "8px 0"}}>
              {series.length > 0 ? (
                <AreaChart series={series} labels={[]} colors={["#7C3AED","#3182F6","#F59E0B"]} height={180} formatY={fmtShort}/>
              ) : (
                <div style={{height:180,display:'grid',placeItems:'center',color:'var(--text-4)',fontSize:13}}>데이터 없음</div>
              )}
            </div>
            <div className="paper-legend">
              <div className="paper-legend-item"><span className="dot" style={{background:"#7C3AED"}}></span><span>피자</span></div>
              <div className="paper-legend-item"><span className="dot" style={{background:"#3182F6"}}></span><span>사이드</span></div>
              <div className="paper-legend-item"><span className="dot" style={{background:"#F59E0B"}}></span><span>엣지&amp;도우</span></div>
            </div>
          </div>
        )}

        {opts.rankShift && (
          <div className="paper-section">
            <div className="paper-section-title">순위 이동 (TOP 6 미리보기)</div>
            <table className="paper-table">
              <thead>
                <tr>
                  <th>메뉴명</th>
                  <th style={{width: 100, textAlign:"right"}}>A (3월)</th>
                  <th style={{width: 100, textAlign:"right"}}>B (4월)</th>
                  <th style={{width: 80, textAlign:"right"}}>증감</th>
                  <th style={{width: 100, textAlign:"center"}}>순위 이동</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map(r => {
                  const shift = r.rankA - r.rankB;
                  return (
                    <tr key={r.name}>
                      <td>{r.name}</td>
                      <td className="num right muted">{fmtKRW(r.a)}</td>
                      <td className="num right" style={{fontWeight:700}}>{fmtKRW(r.b)}</td>
                      <td className="num right" style={{color: r.delta>=0?"var(--positive)":"var(--negative)", fontWeight:700}}>
                        {r.delta>=0?"▲":"▼"} {Math.abs(r.delta).toFixed(1)}%
                      </td>
                      <td className="center">
                        <span className="mono" style={{fontSize:12, color:"var(--text-3)"}}>{r.rankA}위 → {r.rankB}위</span>
                        {shift !== 0 && (
                          <span style={{marginLeft:6,fontWeight:800,fontSize:12,color:shift>0?"var(--positive)":"var(--negative)"}}>
                            {shift>0 ? "▲"+shift : "▼"+Math.abs(shift)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {opts.winners && (
          <div className="paper-section">
            <div className="paper-section-title">Winners &amp; Losers (±10% 이상)</div>
            <div className="winners-grid">
              <div className="winner-col">
                <div className="winner-h" style={{color:"var(--positive)"}}>▲ Winners</div>
                <div className="winner-row"><span>고르곤졸라</span><b className="num" style={{color:"var(--positive)"}}>+11.8%</b></div>
                <div className="winner-row"><span>치즈볼 (신규)</span><b className="num" style={{color:"var(--positive)"}}>NEW</b></div>
                <div className="winner-row"><span>트러플 페퍼로니</span><b className="num" style={{color:"var(--positive)"}}>+24.3%</b></div>
              </div>
              <div className="winner-col">
                <div className="winner-h" style={{color:"var(--negative)"}}>▼ Losers</div>
                <div className="winner-row"><span>치즈크러스트</span><b className="num" style={{color:"var(--negative)"}}>−14.2%</b></div>
                <div className="winner-row"><span>골드스윗</span><b className="num" style={{color:"var(--negative)"}}>−16.0%</b></div>
                <div className="winner-row"><span>할라피뇨 (단독)</span><b className="num" style={{color:"var(--negative)"}}>폐기 검토</b></div>
              </div>
            </div>
          </div>
        )}

        <div className="paper-foot">
          <span>1 / 7</span>
          <span className="mono">7번가 R&amp;D 플랫폼 · WONPAY 비즈니스</span>
        </div>
      </>}
    />
  );
}
