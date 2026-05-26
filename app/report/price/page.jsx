'use client';
import { useState } from 'react';
import ReportBuilderShell, { OptGroup, Seg, Check } from '@/components/report/ReportBuilderShell';
import { fmtKRW } from '@/lib/format';

export default function Page() {
  const [periodMode, setPeriodMode] = useState("week");
  const [threshold, setThreshold] = useState(3);
  const [opts, setOpts] = useState({
    changedOnly: true,
    history7:    true,
    costImpact:  true,
    catSummary:  true,
    unlinked:    false,
  });
  const upd = (k, v) => setOpts(o => ({ ...o, [k]: v }));

  const changes = [];

  return (
    <ReportBuilderShell
      breadcrumb={["보고서센터", "제때 가격 보고서"]}
      title="제때 가격 보고서 생성"
      sub="제때 단가 변동 — 임계값을 넘는 품목만 자동 추출돼요."
      kind="price"
      exportNote="주간 보고서는 매주 월요일 09:00 자동 생성됩니다. (예약 설정에서 변경)"
      options={<>
        <OptGroup label="대상 기간">
          <Seg value={periodMode} onChange={setPeriodMode}
            options={[
              {value:"week",  label:"이번 주"},
              {value:"month", label:"이번 달"},
              {value:"custom",label:"사용자 지정"},
            ]}/>
          {periodMode === "custom" && (
            <div className="opt-period-row" style={{marginTop:8}}>
              <input type="date" className="input" defaultValue="2026-05-14"/>
              <span style={{color:"var(--text-3)"}}>~</span>
              <input type="date" className="input" defaultValue="2026-05-21"/>
            </div>
          )}
        </OptGroup>

        <OptGroup label="변동률 임계값" hint="이 비율 이상 변동된 품목만 포함">
          <div className="threshold-bar">
            <input type="range" min="0" max="10" step="0.5"
              value={threshold} onChange={e=>setThreshold(parseFloat(e.target.value))}/>
            <div className="threshold-val num" style={{minWidth:64}}>±{threshold}<span className="unit">%</span></div>
          </div>
        </OptGroup>

        <OptGroup label="포함 섹션">
          <Check label="변동 품목만 (변동 없음 제외)"      value={opts.changedOnly} onChange={v=>upd("changedOnly",v)}/>
          <Check label="카테고리별 변동 요약"               value={opts.catSummary}  onChange={v=>upd("catSummary",v)}/>
          <Check label="최근 7회 단가 추이 (스파크라인)"    value={opts.history7}    onChange={v=>upd("history7",v)}/>
          <Check label="원가 영향 — 영향 받는 메뉴 수"      value={opts.costImpact}  onChange={v=>upd("costImpact",v)}/>
          <Check label="미연동 품목 부록"                  value={opts.unlinked}    onChange={v=>upd("unlinked",v)} hint="단가표에 등록 안 된 재료"/>
        </OptGroup>

        <OptGroup label="배포 채널">
          <Check label="PDF 첨부 — 카톡 (상무님 그룹)"  value={true}  onChange={()=>{}}/>
          <Check label="이메일 자동 발송"               value={false} onChange={()=>{}}/>
        </OptGroup>
      </>}

      preview={<>
        <div className="paper-head">
          <div className="paper-eyebrow">7번가피자 본사 · 제때 단가 관리</div>
          <h2 className="paper-title">제때 가격 변동 보고서 (2026.05.14 ~ 05.21)</h2>
          <div className="paper-meta">
            <span>임계값: ±{threshold}%</span>
            <span>·</span>
            <span>변동 품목 {changes.length}건</span>
            <span>·</span>
            <span className="mono">생성일 2026.05.22 · 민혁 책임</span>
          </div>
        </div>

        <div className="paper-stat-row">
          <div className="paper-stat">
            <div className="paper-stat-label">인상</div>
            <div className="paper-stat-val num">—</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">인하</div>
            <div className="paper-stat-val num">—</div>
          </div>
          <div className="paper-stat">
            <div className="paper-stat-label">영향 메뉴 (합)</div>
            <div className="paper-stat-val num">—</div>
          </div>
        </div>

        {opts.catSummary && (
          <div className="paper-section">
            <div className="paper-section-title">카테고리별 변동 요약</div>
            <table className="paper-table">
              <thead>
                <tr>
                  <th>카테고리</th>
                  <th style={{width: 80, textAlign:"right"}}>품목 수</th>
                  <th style={{width: 80, textAlign:"right"}}>인상</th>
                  <th style={{width: 80, textAlign:"right"}}>인하</th>
                  <th style={{width: 100, textAlign:"right"}}>평균 변동</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>치즈</td><td className="num right">2</td><td className="num right" style={{color:"var(--negative)"}}>2</td><td className="num right">0</td><td className="num right" style={{color:"var(--negative)"}}>+5.6%</td></tr>
                <tr><td>토핑</td><td className="num right">2</td><td className="num right" style={{color:"var(--negative)"}}>2</td><td className="num right">0</td><td className="num right" style={{color:"var(--negative)"}}>+5.9%</td></tr>
                <tr><td>야채</td><td className="num right">1</td><td className="num right">0</td><td className="num right" style={{color:"var(--positive)"}}>1</td><td className="num right" style={{color:"var(--positive)"}}>−5.2%</td></tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="paper-section">
          <div className="paper-section-title">변동 품목 상세</div>
          <table className="paper-table">
            <thead>
              <tr>
                <th style={{width:70}}>코드</th>
                <th>제품명</th>
                <th style={{width:90, textAlign:"right"}}>이전</th>
                <th style={{width:90, textAlign:"right"}}>현재</th>
                <th style={{width:90, textAlign:"right"}}>변동률</th>
                {opts.history7 && <th style={{width:80}}>추이</th>}
                {opts.costImpact && <th style={{width:80, textAlign:"right"}}>영향 메뉴</th>}
              </tr>
            </thead>
            <tbody>
              {changes.map(c => {
                const pct = ((c.curr - c.prev) / c.prev) * 100;
                return (
                  <tr key={c.code}>
                    <td className="muted mono">{c.code}</td>
                    <td>{c.name}</td>
                    <td className="num right muted">{fmtKRW(c.prev)}</td>
                    <td className="num right" style={{fontWeight:800}}>{fmtKRW(c.curr)}</td>
                    <td className="num right" style={{color: pct>0?"var(--negative)":"var(--positive)", fontWeight:700}}>
                      {pct>0?"▲":"▼"} {Math.abs(pct).toFixed(1)}%
                    </td>
                    {opts.history7 && (
                      <td>
                        <svg width="64" height="20" viewBox="0 0 64 20">
                          <path d={pct>0
                            ? "M2 14 L14 13 L26 12 L38 10 L50 9 L62 6"
                            : "M2 8 L14 9 L26 9 L38 10 L50 11 L62 13"}
                            fill="none" stroke={pct>0?"var(--negative)":"var(--positive)"} strokeWidth="1.5"/>
                        </svg>
                      </td>
                    )}
                    {opts.costImpact && (
                      <td className="num right">{c.impactMenus}개</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="paper-foot">
          <span>1 / 6</span>
          <span className="mono">7번가 R&amp;D 플랫폼 · WONPAY 비즈니스</span>
        </div>
      </>}
    />
  );
}
