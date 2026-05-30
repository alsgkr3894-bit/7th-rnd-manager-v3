'use client';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';

/**
 * CompareSummary — 비교 요약 3카드 (총 판매량 / 신규 / 단종)
 */
export function CompareSummary({ compare }) {
  if (!compare) return null;
  const { totalA, totalB, totalDiff, totalPct, newMenus, droppedMenus, periodA, periodB } = compare;

  return (
    <div className="hero-row" style={{marginTop:16}}>
      {/* 총 판매량 비교 */}
      <div className="card kpi-card">
        <div>
          <div className="label">총 판매량 비교</div>
          <div className="value num">{formatNumber(totalA)}<span className="unit">개</span></div>
          <div className="trend">
            {totalPct == null ? (
              <span style={{color: 'var(--text-4)'}}>비교 데이터 없음</span>
            ) : (
              <span className={totalPct >= 0 ? 'up' : 'down'}>
                {totalPct >= 0
                  ? <Icon.arrowUp   style={{width:12,height:12,display:'inline',verticalAlign:'-2px'}}/>
                  : <Icon.arrowDown style={{width:12,height:12,display:'inline',verticalAlign:'-2px'}}/>}
                {' '}{totalPct >= 0 ? '+' : ''}{totalPct.toFixed(1)}%
                <span style={{color:'var(--text-4)', marginLeft:6}}>
                  ({totalDiff >= 0 ? '+' : ''}{formatNumber(totalDiff)}개)
                </span>
              </span>
            )}
          </div>
        </div>
        <div style={{fontSize:12, color:'var(--text-3)', marginTop:8}}>
          {formatNumber(totalB)}개 → <b style={{color:'var(--text-1)'}}>{formatNumber(totalA)}개</b>
        </div>
      </div>

      {/* 신규 메뉴 */}
      <MovementCard
        label="신규 출시 메뉴"
        count={newMenus.length}
        color="var(--positive)"
        desc={`${formatPeriod(periodB)}에 없던 메뉴`}
        items={newMenus.slice(0, 3)}
        prefix="+"
      />

      {/* 단종 메뉴 */}
      <MovementCard
        label="단종·중단 메뉴"
        count={droppedMenus.length}
        color="var(--negative)"
        desc={`${formatPeriod(periodA)}에 판매 없음`}
        items={droppedMenus.slice(0, 3)}
        prefix="−"
        useFieldB
      />
    </div>
  );
}

function MovementCard({ label, count, color, desc, items, prefix, useFieldB }) {
  return (
    <div className="card kpi-card">
      <div>
        <div className="label">{label}</div>
        <div className="value num" style={{color}}>{count}<span className="unit">개</span></div>
        <div className="trend">
          <span style={{color: 'var(--text-3)'}}>{desc}</span>
        </div>
      </div>
      <div style={{marginTop:12, display:'flex', flexDirection:'column', gap:6}}>
        {items.length === 0 ? (
          <div style={{fontSize: 12, color: 'var(--text-4)'}}>해당 메뉴 없음</div>
        ) : items.map(m => (
          <div key={m.name} style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            fontSize: 12, color: 'var(--text-2)',
          }}>
            <span title={m.name} style={{
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%',
            }}>{m.name}</span>
            <span className="num" style={{color, fontWeight:700}}>
              {prefix}{formatNumber(useFieldB ? m.b : m.a)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPeriod(p) {
  if (!p) return '-';
  return `${p.year}년 ${p.month}월`;
}
