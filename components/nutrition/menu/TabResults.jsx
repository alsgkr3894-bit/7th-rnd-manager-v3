'use client';
import { useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { NUTRITION_FIELDS, calcAllResults } from '@/lib/nutrition/values/store';
import { downloadCsv } from '@/lib/download';
import { resolveNutritionGroup, NUTRITION_GROUP_ORDER } from '@/lib/nutrition/menu-group';

const GROUP_HEADER_STYLE = {
  fontWeight: 800, fontSize: 11, color: 'var(--text-4)',
  background: 'var(--surface-2)', letterSpacing: '0.05em',
  textTransform: 'uppercase',
};

export function TabResults({ menus, rawMap, edgeMap, compositions, toppings, menuMasters }) {
  const [filterMenu,    setFilterMenu]    = useState('전체');
  const [filterDerived, setFilterDerived] = useState('전체');
  const [missingOnly,   setMissingOnly]   = useState(false);

  const masterByCode = useMemo(
    () => Object.fromEntries((menuMasters || []).map(m => [m.menuCode, m])),
    [menuMasters]
  );

  const toppingMap = useMemo(() => {
    const m = {};
    toppings.forEach(t => { m[t.toppingCode] = t; });
    return m;
  }, [toppings]);

  const results = useMemo(
    () => calcAllResults({ menus, rawMap, edgeMap, compositions, toppingMap, masterByCode }),
    [menus, rawMap, edgeMap, compositions, toppingMap, masterByCode]
  );

  const menuNames = useMemo(
    () => ['전체', ...menus.map(m => m.menuName), ...compositions.map(c => c.menuName)],
    [menus, compositions]
  );

  const filtered = useMemo(() => {
    let r = results;
    if (filterMenu    !== '전체') r = r.filter(x => x.menuName === filterMenu);
    if (filterDerived === '기본')  r = r.filter(x => !x.isDerived);
    if (filterDerived === '파생')  r = r.filter(x => x.isDerived);
    if (missingOnly) r = r.filter(isMissingResult);
    return r;
  }, [results, filterMenu, filterDerived, missingOnly]);

  // 그룹 헤더 삽입용 — menuCode 단위로 그룹을 추적
  const allMenusForGroup = useMemo(() => [...menus, ...compositions], [menus, compositions]);
  const menuGroupMap = useMemo(() => {
    const map = {};
    allMenusForGroup.forEach(m => {
      map[m.menuCode] = resolveNutritionGroup(m, masterByCode);
    });
    return map;
  }, [allMenusForGroup, masterByCode]);

  const hasData = filtered.some(r => r.kcal);
  const hasRows = filtered.length > 0;

  function exportCsv() {
    const headers = ['메뉴명', '베이스 메뉴', '크러스트 타입', '구분', ...NUTRITION_FIELDS.map(f => `${f.label}(${f.unit})`)];
    const rows = filtered.map(r => [
      r.menuName || '',
      r.baseMenuName || '',
      r.crustType || '',
      r.isDerived ? '파생' : '기본',
      ...NUTRITION_FIELDS.map(f => isMissingResult(r) ? '' : (r[f.key] ?? '')),
    ]);
    downloadCsv([headers, ...rows], missingOnly ? '영양성분_누락메뉴.csv' : '영양성분_계산결과.csv');
  }

  // filtered 행들에 그룹 헤더 삽입
  const tableRows = useMemo(() => {
    if (filterMenu !== '전체') return filtered.map(r => ({ type: 'data', row: r }));
    const result = [];
    let lastGroup = null;
    filtered.forEach(r => {
      const g = menuGroupMap[r.menuCode] || '기타';
      if (g !== lastGroup) {
        result.push({ type: 'group', label: g });
        lastGroup = g;
      }
      result.push({ type: 'data', row: r });
    });
    return result;
  }, [filtered, filterMenu, menuGroupMap]);

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 160 }} value={filterMenu} onChange={e => setFilterMenu(e.target.value)}>
          {menuNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {['전체', '기본', '파생'].map(v => (
          <button key={v} className={'chip ' + (filterDerived === v ? 'active' : '')} onClick={() => setFilterDerived(v)}>{v}</button>
        ))}
        <button className={'chip ' + (missingOnly ? 'active' : '')} onClick={() => setMissingOnly(v => !v)}>
          입력 누락만
        </button>
        <button className="btn sm" onClick={exportCsv} disabled={filtered.length === 0}>
          CSV 내보내기
        </button>
        <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent-text)', background: 'var(--accent-soft)', padding: '3px 10px', borderRadius: 12 }}>
          100g 기준
        </span>
      </div>

      {!hasRows || (!hasData && !missingOnly) ? (
        <div className="card" style={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
          <div style={{ textAlign: 'center', color: 'var(--text-4)' }}>
            <Icon.beaker style={{ width: 28, height: 28 }} />
            <div style={{ marginTop: 8, fontSize: 13 }}>
              {missingOnly ? '조건에 맞는 누락 메뉴가 없어요' : '베이스 영양성분과 엣지 설정을 완료하면 계산 결과가 표시돼요'}
            </div>
          </div>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="data-table" style={{ minWidth: 1000 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 140 }}>메뉴명</th>
                  <th style={{ width: 110 }}>크러스트 타입</th>
                  {NUTRITION_FIELDS.map(f => (
                    <th key={f.key} style={{ textAlign: 'right', width: 80 }}>
                      {f.label}<br />
                      <span style={{ fontWeight: 400, color: 'var(--text-4)', fontSize: 10 }}>({f.unit})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((item, i) => {
                  if (item.type === 'group') {
                    return (
                      <tr key={`g-${i}`}>
                        <td colSpan={2 + NUTRITION_FIELDS.length} style={GROUP_HEADER_STYLE}>
                          <span style={{ padding: '2px 14px', display: 'block' }}>{item.label}</span>
                        </td>
                      </tr>
                    );
                  }
                  const r = item.row;
                  const isEmpty = isMissingResult(r);
                  return (
                    <tr key={i} style={{ opacity: isEmpty ? 0.35 : 1 }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.menuName}</div>
                        {r.isDerived && <div style={{ fontSize: 11, color: 'var(--text-4)' }}>↳ {r.baseMenuName}</div>}
                      </td>
                      <td>
                        <span style={{
                          fontSize: 12, padding: '2px 8px', borderRadius: 20,
                          background: r.crustType.includes('치즈') ? '#fff4e0' : r.crustType.includes('골드') ? '#fff9e0' : 'var(--surface-2)',
                          color: r.crustType.includes('치즈') ? '#b06800' : r.crustType.includes('골드') ? '#8a7000' : 'var(--text-2)',
                        }}>
                          {r.crustType}
                        </span>
                      </td>
                      {NUTRITION_FIELDS.map(f => (
                        <td key={f.key} className="right">{isEmpty ? '—' : (r[f.key] ?? '—')}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-4)' }}>
        총 {filtered.length}행 (전체 {results.length}행)
      </div>
    </div>
  );
}

function isMissingResult(row) {
  return !row.kcal && !row.protein;
}
