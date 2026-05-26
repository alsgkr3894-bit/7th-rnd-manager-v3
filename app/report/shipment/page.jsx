'use client';
import { useState } from 'react';
import ReportBuilderShell, { OptGroup, Seg, Check } from '@/components/report/ReportBuilderShell';
import { fmtKRW, fmtShort } from '@/lib/format';
import { AreaChart } from '@/components/charts/AreaChart';

export default function Page() {
  const [periodMode, setPeriodMode] = useState("month");
  const [type, setType] = useState("all");
  const [opts, setOpts] = useState({
    chart:      true,
    catSummary: true,
    topList:    true,
    delta:      true,
  });
  const upd = (k, v) => setOpts(o => ({ ...o, [k]: v }));

  const topShipped = [];
  const series = [];

  return (
    <ReportBuilderShell
      breadcrumb={["보고서센터", "제때 출고량 보고서"]}
      title="제때 출고량 보고서 생성"
      sub="대상 제품 출고량 — 카테고리·분류별로 요약돼요."
      kind="shipment"
      exportNote="대상 제품 목록은 제때상품관리 → 설정 페이지에서 변경할 수 있어요."
      options={<>
        <OptGroup label="집계 기간">
          <Seg value={periodMode} onChange={setPeriodMode}
            options={[
              {value:"week",  label:"주 단위"},
              {value:"month", label:"월 단위"},
              {value:"quart", label:"분기 단위"},
            ]}/>
          <div className="opt-period-row">
            <select className="period-select num" defaultValue={2026}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select className="period-select num" defaultValue={5}>
              {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
        </OptGroup>

        <OptGroup label="대상 분류">
          <Seg value={type} onChange={setType}
            options={[
              {value:"all",     label:"전체"},
              {value:"managed", label:"관리품목"},
              {value:"common",  label:"범용상품"},
            ]}/>
        </OptGroup>

        <OptGroup label="포함 섹션">
          <Check label="월별 출고량 추이 차트"   value={opts.chart}      onChange={v=>upd("chart",v)}/>
          <Check label="카테고리별 합계"          value={opts.catSummary} onChange={v=>upd("catSummary",v)}/>
          <Check label="상위 출고 제품 TOP 10"    value={opts.topList}    onChange={v=>upd("topList",v)}/>
          <Check label="전월 대비 증감"            value={opts.delta}      onChange={v=>upd("delta",v)}/>
        </OptGroup>
      </>}

      preview={<>
        <div className="paper-head">
          <div className="paper-eyebrow">7번가피자 본사 · 제때상품관리</div>
          <h2 className="paper-title">2026년 4월 제때 출고량 보고서</h2>
          <div className="paper-meta">
            <span>대상: {type === "all" ? "전체" : type === "managed" ? "관리품목" : "범용상품"}</span>
            <span>·</span>
            <span>23개 제품</span>
            <span>·</span>
            <span className="mono">생성일 2026.05.22 · 민혁 책임</span>
          </div>
        </div>

        <div className="paper-stat-row">
          <div className="paper-stat">
            <div className="paper-stat-label">총 출고량</div>
            <div className="paper-stat-val num">—</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">관리품목</div>
            <div className="paper-stat-val num">—</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">범용상품</div>
            <div className="paper-stat-val num">—</div>
          </div>
        </div>

        {opts.chart && (
          <div className="paper-section">
            <div className="paper-section-title">월별 출고량 추이 (최근 7개월)</div>
            <div style={{padding: "8px 0"}}>
              {series.length > 0 ? (
                <AreaChart series={series} labels={[]} colors={["#1D766F", "#7C3AED"]} height={200} formatY={fmtShort}/>
              ) : (
                <div style={{height:200,display:'grid',placeItems:'center',color:'var(--text-4)',fontSize:13}}>데이터 없음</div>
              )}
            </div>
            <div className="paper-legend">
              <div className="paper-legend-item"><span className="dot" style={{background:"#1D766F"}}></span><span>관리품목</span></div>
              <div className="paper-legend-item"><span className="dot" style={{background:"#7C3AED"}}></span><span>범용상품</span></div>
            </div>
          </div>
        )}

        {opts.topList && (
          <div className="paper-section">
            <div className="paper-section-title">상위 출고 제품 (TOP 5 미리보기)</div>
            <table className="paper-table">
              <thead>
                <tr>
                  <th style={{width: 40}}>#</th>
                  <th>제품명</th>
                  <th style={{width: 80}}>카테고리</th>
                  <th style={{width: 110, textAlign:"right"}}>출고량</th>
                  {opts.delta && <th style={{width: 90, textAlign:"right"}}>전월 대비</th>}
                </tr>
              </thead>
              <tbody>
                {topShipped.map((p, i) => (
                  <tr key={p.name}>
                    <td className="num">{i+1}</td>
                    <td>{p.name}</td>
                    <td className="muted">{p.cat}</td>
                    <td className="num right">{fmtKRW(p.total)}건</td>
                    {opts.delta && (
                      <td className="num right" style={{color:"var(--positive)", fontWeight:700}}>▲ {p.delta.toFixed(1)}%</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="paper-foot">
          <span>1 / 5</span>
          <span className="mono">7번가 R&amp;D 플랫폼 · WONPAY 비즈니스</span>
        </div>
      </>}
    />
  );
}
