'use client';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { RankRow } from './RankRow';

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
