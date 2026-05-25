'use client';
import { formatNumber } from '@/lib/format';

/**
 * CategoryDetailGrid — 카테고리별 판매 비중 카드 그리드
 *
 * 디자인:
 *   - 상단 가로 바 차트 (카테고리 색상 비중)
 *   - 카드 그리드 (4열) — 카테고리당 1카드
 *     - 카테고리명 + 비중%
 *     - 총 판매량
 *     - TOP 3 메뉴 (순위 + 메뉴명 + 판매량)
 *
 * @param {{ total, categories: [...] }} detail
 * @param {(category) => void} onCategoryClick
 */
export function CategoryDetailGrid({ detail, onCategoryClick }) {
  if (!detail || detail.total === 0) {
    return (
      <div className="card" style={{padding:'40px 0', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
        해당 월에 판매 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="card" style={{marginTop:16}}>
      <div className="card-header">
        <div>
          <div className="card-title">카테고리별 판매 비중</div>
          <div className="card-sub">상위 카테고리 · 카테고리별 TOP 3</div>
        </div>
        <div style={{fontSize:12, color:'var(--text-3)'}}>
          총 <b className="num" style={{color:'var(--text-1)'}}>{formatNumber(detail.total)}</b>개
        </div>
      </div>

      {/* 가로 바 차트 — 카테고리 비중 */}
      <div style={{
        display:'flex', height:10, borderRadius:6, overflow:'hidden',
        background:'var(--surface-2)', marginBottom:20,
      }}>
        {detail.categories.map(c => (
          <div key={c.name}
            title={`${c.name} ${(c.share * 100).toFixed(1)}%`}
            style={{width: `${c.share * 100}%`, background: c.color}}
          />
        ))}
      </div>

      {/* 카드 그리드 */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))',
        gap:12,
      }}>
        {detail.categories.map(c => (
          <CategoryCard key={c.name} cat={c} onClick={onCategoryClick} />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({ cat, onClick }) {
  const clickable = typeof onClick === 'function';
  return (
    <button
      onClick={() => clickable && onClick(cat.name)}
      disabled={!clickable}
      style={{
        padding:'14px 16px',
        border:'1px solid var(--border)', borderRadius:10,
        background:'var(--surface-2)', textAlign:'left',
        font:'inherit', color:'var(--text-1)',
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6}}>
        <span style={{display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:700}}>
          <span style={{width:8, height:8, borderRadius:'50%', background: cat.color}}/>
          {cat.name}
        </span>
        <span className="num" style={{fontSize:13, fontWeight:700}}>{(cat.share * 100).toFixed(1)}%</span>
      </div>
      <div className="num" style={{fontSize:20, fontWeight:800, marginBottom:8}}>
        {formatNumber(cat.value)}<span className="unit" style={{fontSize:13, opacity:0.6}}>개</span>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:3}}>
        {cat.topMenus.length === 0 ? (
          <div style={{fontSize:12, color:'var(--text-4)'}}>판매 기록 없음</div>
        ) : cat.topMenus.map((m, i) => (
          <div key={m.name} style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            fontSize:12, color:'var(--text-2)',
          }}>
            <span style={{display:'flex', gap:6, minWidth:0, alignItems:'baseline'}}>
              <span className="num" style={{color:'var(--text-4)', minWidth:10}}>{i + 1}</span>
              <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140}}>
                {m.name}
              </span>
            </span>
            <span className="num" style={{fontWeight:600}}>{formatNumber(m.quantity)}</span>
          </div>
        ))}
      </div>
    </button>
  );
}
