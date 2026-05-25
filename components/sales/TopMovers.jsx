'use client';
import { Icon } from '@/components/icons';

/**
 * TopMovers — 증가율 / 감소율 TOP 3 (양쪽 데이터 모두 있는 메뉴 중)
 */
export function TopMovers({ topRise, topFall }) {
  return (
    <div className="mid-row" style={{marginTop:16}}>
      <MoverCard
        title="TOP 상승 메뉴"
        sub="피자 · 사이드 · 1인피자 · 양 기간 모두 판매 있는 메뉴만"
        icon={<Icon.arrowUp style={{width:16, height:16, color:'var(--positive)'}}/>}
        items={topRise}
        color="var(--positive)"
        arrow="▲"
      />
      <MoverCard
        title="TOP 하락 메뉴"
        sub="피자 · 사이드 · 1인피자 · 양 기간 모두 판매 있는 메뉴만"
        icon={<Icon.arrowDown style={{width:16, height:16, color:'var(--negative)'}}/>}
        items={topFall}
        color="var(--negative)"
        arrow="▼"
      />
    </div>
  );
}

function MoverCard({ title, sub, icon, items, color, arrow }) {
  return (
    <div className="card">
      <div className="card-header" style={{marginBottom:12}}>
        <div>
          <div className="card-title">{title}</div>
          <div className="card-sub">{sub}</div>
        </div>
        {icon}
      </div>
      {items.length === 0 ? (
        <div style={{padding:'24px 0', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
          비교 가능한 메뉴가 없습니다
        </div>
      ) : (
        <div className="rank-list">
          {items.map((r, i) => (
            <div className="rank-row" key={r.name}>
              <div className="rank-num num" style={{background: 'transparent', color}}>{i + 1}</div>
              <div className="rank-name">{r.name}</div>
              <div className="num" style={{fontWeight: 800, color, whiteSpace: 'nowrap'}}>
                {arrow} {Math.abs(r.pct).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
