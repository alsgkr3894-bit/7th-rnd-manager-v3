'use client';
import { useState, useMemo, useEffect } from 'react';

const CAT_COLORS = {
  '피자':   { bg:'#EFF6FF', color:'#1D4ED8' },
  '1인피자':{ bg:'#FFF7ED', color:'#C2410C' },
  '사이드': { bg:'#F0FDF4', color:'#15803D' },
};
const USAGE_CATS = ['전체', '피자', '사이드', '1인피자'];

export function UsageView({ rows, usageMap, usageCat, setUsageCat, usageSort, setUsageSort }) {
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => { setExpanded(new Set()); }, [usageCat]);

  const usageRows = useMemo(() => {
    const { byCode = new Map(), byName = new Map() } = usageMap;
    const normStr = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, '');

    return rows.map((r, idx) => {
      const code     = r.meta?.productCode || r.productCode || '';
      const dispName = r.masterName || r.productName || '';

      const fromCode   = (code ? byCode.get(code) : null) || new Map();
      const fromMaster = byName.get(normStr(r.masterName   || '')) || new Map();
      const fromProd   = byName.get(normStr(r.productName  || '')) || new Map();
      const menuMap = new Map([...fromProd, ...fromMaster, ...fromCode]);

      if (!menuMap.size) return { code, name: dispName, count: 0, menus: [] };

      const menus = [...menuMap.entries()]
        .filter(([, cat]) => usageCat === '전체' || cat === usageCat)
        .map(([menuName, cat]) => ({ menuName, cat }))
        .sort((a, b) => a.menuName.localeCompare(b.menuName, 'ko'));

      const uid = code || `_idx_${idx}`;
      return { uid, code, name: dispName, count: menus.length, menus };
    }).filter(r => r.count > 0);
  }, [rows, usageMap, usageCat]);

  const sorted = useMemo(() => {
    const arr = [...usageRows];
    if (usageSort === 'count_desc') arr.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
    else if (usageSort === 'count_asc') arr.sort((a, b) => a.count - b.count || a.name.localeCompare(b.name, 'ko'));
    else arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    return arr;
  }, [usageRows, usageSort]);

  const totalUsed = useMemo(
    () => new Set(usageRows.flatMap(r => r.menus.map(m => m.menuName))).size,
    [usageRows]
  );

  function toggle(code) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  return (
    <>
      <div style={{ display:'flex', gap:12, marginBottom:10, fontSize:12, color:'var(--text-3)', alignItems:'center' }}>
        <span>사용 식자재 <b style={{color:'var(--text-1)'}}>{sorted.length}</b>개</span>
        <span>·</span>
        <span>해당 메뉴 <b style={{color:'var(--text-1)'}}>{totalUsed}</b>개</span>
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:8 }}>
        <div style={{ display:'flex', gap:4 }}>
          {USAGE_CATS.map(c => (
            <button key={c} className={'chip' + (usageCat === c ? ' active' : '')}
              onClick={() => setUsageCat(c)}>{c}</button>
          ))}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--text-3)', fontWeight:600 }}>정렬</span>
          <select
            value={usageSort}
            onChange={e => setUsageSort(e.target.value)}
            style={{ fontSize:12, padding:'4px 8px', borderRadius:6,
              border:'1px solid var(--border)', background:'var(--surface)',
              color:'var(--text-1)', cursor:'pointer' }}>
            <option value="count_desc">많이 쓰는 순</option>
            <option value="count_asc">적게 쓰는 순</option>
            <option value="name_asc">이름 순</option>
          </select>
        </div>
      </div>

      <div className="card table-card">
        {sorted.length === 0 ? (
          <div style={{ padding:'40px 0', textAlign:'center', color:'var(--text-3)', fontSize:13 }}>
            등록된 레시피가 없거나 해당 카테고리에 사용된 재료가 없습니다
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width:36 }}>순위</th>
                <th>식자재명</th>
                <th style={{ width:80 }}>제품코드</th>
                <th style={{ width:90, textAlign:'center' }}>사용 메뉴수</th>
                <th>메뉴 목록</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => {
                const open = expanded.has(r.uid);
                const SHOW = 4;
                const visible = open ? r.menus : r.menus.slice(0, SHOW);
                const more    = r.menus.length - SHOW;
                return (
                  <tr key={r.uid}>
                    <td style={{ textAlign:'center', color:'var(--text-4)', fontSize:12 }}>{idx + 1}</td>
                    <td style={{ fontWeight:600, fontSize:13 }}>{r.name}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)', fontFamily:'monospace' }}>{r.code || '—'}</td>
                    <td style={{ textAlign:'center' }}>
                      <span style={{
                        display:'inline-block', minWidth:32, padding:'2px 8px',
                        borderRadius:99, fontWeight:700, fontSize:13,
                        background: r.count >= 8 ? '#DBEAFE' : r.count >= 4 ? '#D1FAE5' : 'var(--surface-2)',
                        color:      r.count >= 8 ? '#1D4ED8' : r.count >= 4 ? '#065F46' : 'var(--text-2)',
                      }}>
                        {r.count}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, alignItems:'center' }}>
                        {visible.map(m => {
                          const cs = CAT_COLORS[m.cat] || { bg:'var(--surface-2)', color:'var(--text-3)' };
                          return (
                            <span key={m.menuName} style={{
                              fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99,
                              background: cs.bg, color: cs.color, whiteSpace:'nowrap',
                            }}>
                              {m.menuName}
                            </span>
                          );
                        })}
                        {!open && more > 0 && (
                          <button onClick={() => toggle(r.uid)}
                            style={{ fontSize:11, color:'var(--accent)', border:0, background:'none',
                              cursor:'pointer', padding:'2px 4px', fontWeight:600 }}>
                            +{more}개 더보기
                          </button>
                        )}
                        {open && r.menus.length > SHOW && (
                          <button onClick={() => toggle(r.uid)}
                            style={{ fontSize:11, color:'var(--text-3)', border:0, background:'none',
                              cursor:'pointer', padding:'2px 4px' }}>
                            접기
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div style={{ padding:'8px 16px', fontSize:11, color:'var(--text-3)', borderTop:'1px solid var(--divider)' }}>
          {sorted.length}개 식자재 표시 · {usageCat !== '전체' ? `${usageCat} 필터 중` : '전체 카테고리'}
        </div>
      </div>
    </>
  );
}
