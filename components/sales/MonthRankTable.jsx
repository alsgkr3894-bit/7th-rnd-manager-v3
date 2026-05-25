'use client';
import { useMemo, useState } from 'react';
import { formatNumber } from '@/lib/format';
import { Icon } from '@/components/icons';

/**
 * MonthRankTable — 중분류 단위 순위 + 클릭 시 사이즈별 상세 펼치기
 *
 * @param {Array} menus — buildGroupRanking 결과 [{ name, category, quantity, sizes: [{ size, quantity, share }] }]
 * @param {Array} categories — ['피자', '사이드', ...]
 * @param {string|null} category — 선택된 카테고리
 * @param {(c) => void} onCategoryChange
 * @param {number} total — 전체 판매량 (비중% 계산용)
 */
export function MonthRankTable({ menus, categories, category, onCategoryChange, total }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  const filtered = useMemo(() => {
    let list = menus;
    if (category) list = list.filter(m => m.category === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q));
    }
    return list;
  }, [menus, category, query]);

  // 비중 기준: 전체 탭이면 전체 total, 카테고리 선택 시 그 카테고리 합계 (검색 무관)
  const shareBase = useMemo(() => {
    if (!category) return total;
    return menus
      .filter(m => m.category === category)
      .reduce((s, m) => s + m.quantity, 0);
  }, [menus, category, total]);

  function toggleExpand(name) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  return (
    <div className="card" style={{marginTop:16}}>
      <div className="card-header">
        <div>
          <div className="card-title">메뉴 판매 순위</div>
          <div className="card-sub">
            중분류 기준 · 행 클릭 시 규격별 상세 펼침 ·{' '}
            {category
              ? <b style={{color:'var(--accent-text)'}}>{category} 내 비중</b>
              : <b style={{color:'var(--accent-text)'}}>전체 중 비중</b>}
          </div>
        </div>
      </div>

      <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:12}}>
        <CategoryChip name="전체" count={menus.length} active={!category} onClick={() => onCategoryChange(null)} />
        {categories.map(c => {
          const cnt = menus.filter(m => m.category === c).length;
          if (cnt === 0) return null;
          return <CategoryChip key={c} name={c} count={cnt} active={category === c} onClick={() => onCategoryChange(c)} />;
        })}
      </div>

      <div style={{position:'relative', marginBottom:12}}>
        <Icon.search style={{
          width:14, height:14, position:'absolute', top:'50%', left:12,
          transform:'translateY(-50%)', color:'var(--text-4)',
        }}/>
        <input
          placeholder="메뉴명 검색"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width:'100%', padding:'8px 12px 8px 32px', borderRadius:8,
            border:'1px solid var(--border)', background:'var(--surface-2)',
            color:'var(--text-1)', fontSize:13,
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{padding:'32px 0', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
          조건에 맞는 메뉴가 없습니다
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:6}}>
          {filtered.map((m, i) => (
            <RankRow
              key={m.name + '__' + m.category}
              rank={i + 1}
              row={m}
              total={shareBase}
              expanded={expanded.has(m.name)}
              onToggle={() => toggleExpand(m.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RankRow({ rank, row, total, expanded, onToggle }) {
  const share = total > 0 ? row.quantity / total : 0;
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 8,
      background: expanded ? 'var(--accent-soft)' : 'var(--surface)',
      transition: 'background 200ms',
    }}>
      <button
        onClick={onToggle}
        style={{
          width:'100%', display:'grid',
          gridTemplateColumns: '50px 1.4fr 90px 110px 1.2fr 80px 30px',
          gap: 12, alignItems: 'center', padding: '14px 12px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-1)', font: 'inherit', textAlign: 'left',
        }}
      >
        <div className="num" style={{fontWeight:700, color:'var(--text-2)'}}>{rank}</div>
        <div style={{fontWeight:700}}>
          {row.name}
          <span style={{
            marginLeft:8, fontSize:11, color:'var(--text-3)', fontWeight:500,
          }}>{row.sizes.length}개 규격</span>
        </div>
        <span className="chip" style={{background:'var(--surface-2)', color:'var(--text-2)', justifySelf:'start'}}>
          {row.category}
        </span>
        <div className="num right" style={{textAlign:'right'}}>
          {formatNumber(row.quantity)}<span className="unit">개</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <div style={{flex:1, height:6, borderRadius:3, background:'var(--surface-2)', overflow:'hidden'}}>
            <div style={{width:`${Math.min(100, share * 100)}%`, height:'100%', background:'var(--accent)'}}/>
          </div>
          <span className="num" style={{fontSize:12, minWidth:42, textAlign:'right'}}>
            {(share * 100).toFixed(1)}%
          </span>
        </div>
        <div></div>
        <Icon.chevDown style={{
          width:16, height:16, color:'var(--text-3)',
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 200ms',
        }}/>
      </button>

      {expanded && (
        <div style={{padding:'4px 12px 14px 62px', borderTop:'1px solid var(--border)'}}>
          <div style={{fontSize:11, color:'var(--text-3)', margin:'8px 0 6px'}}>
            {row.name} · 규격별 판매량
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:4}}>
            {row.sizes.map(s => (
              <div key={s.size} style={{
                display:'grid', gridTemplateColumns:'1fr 1fr 80px 60px',
                gap:12, alignItems:'center', padding:'6px 0', fontSize:13,
              }}>
                <span>
                  {row.name} <span className="chip" style={{
                    background:'var(--surface-2)', color:'var(--text-2)', fontSize:11, marginLeft:6,
                  }}>{s.size}</span>
                </span>
                <div style={{display:'flex', alignItems:'center'}}>
                  <div style={{flex:1, height:6, borderRadius:3, background:'var(--surface-2)', overflow:'hidden'}}>
                    <div style={{width:`${Math.min(100, s.share * 100)}%`, height:'100%', background:'var(--accent)'}}/>
                  </div>
                </div>
                <div className="num" style={{textAlign:'right', fontWeight:600}}>
                  {formatNumber(s.quantity)}<span className="unit">개</span>
                </div>
                <div className="num" style={{textAlign:'right', color:'var(--text-3)', fontSize:12}}>
                  {(s.share * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryChip({ name, count, active, onClick }) {
  return (
    <button
      className="chip"
      onClick={onClick}
      style={{
        cursor:'pointer', border:'none',
        background: active ? 'var(--accent)' : 'var(--surface-2)',
        color: active ? '#fff' : 'var(--text-2)',
        fontWeight: 600,
        display:'inline-flex', alignItems:'center', gap:6,
      }}
    >
      {name}
      <span style={{
        background: active ? 'rgba(255,255,255,0.2)' : 'var(--surface)',
        color: active ? '#fff' : 'var(--text-3)',
        padding:'1px 6px', borderRadius:10, fontSize:11, fontWeight:700,
      }}>{count}</span>
    </button>
  );
}
