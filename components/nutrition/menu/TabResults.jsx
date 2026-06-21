'use client';
import { useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { NutritionResultRow } from './NutritionResultRow';
import { ResultsToolbar } from './ResultsToolbar';
import { NUTRITION_FIELDS, calcAllResults } from '@/lib/nutrition/values/store';
import { downloadCsv } from '@/lib/download';
import { resolveNutritionGroup, NUTRITION_GROUP_ORDER } from '@/lib/nutrition/menu-group';
import { asDisplayText, asObjectArray, asRecord } from '@/lib/ui/prop-guards';

const PAGE_SIZE = 100;

const GROUP_HEADER_STYLE = {
  fontWeight: 800,
  fontSize: 11,
  color: 'var(--text-4)',
  background: 'var(--surface-2)',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};

export function TabResults({ menus, rawMap, edgeMap, compositions, menuMasters, menuSearch = '' }) {
  const [filterMenu, setFilterMenu] = useState('전체');
  const [filterDerived, setFilterDerived] = useState('전체');
  const [missingOnly, setMissingOnly] = useState(false);
  const safeMenus = useMemo(() => asObjectArray(menus), [menus]);
  const safeCompositions = useMemo(() => asObjectArray(compositions), [compositions]);
  const safeMenuMasters = useMemo(() => asObjectArray(menuMasters), [menuMasters]);
  const safeRawMap = asRecord(rawMap);
  const safeEdgeMap = asRecord(edgeMap);
  const searchText = asDisplayText(menuSearch).trim().toLowerCase();

  const masterByCode = useMemo(
    () => Object.fromEntries(safeMenuMasters.map(m => [m.menuCode, m])),
    [safeMenuMasters]
  );

  const results = useMemo(
    () =>
      calcAllResults({
        menus: safeMenus,
        rawMap: safeRawMap,
        edgeMap: safeEdgeMap,
        compositions: safeCompositions,
        masterByCode,
      }),
    [safeMenus, safeRawMap, safeEdgeMap, safeCompositions, masterByCode]
  );

  const menuNames = useMemo(
    () => ['전체', ...safeMenus.map(m => m.menuName), ...safeCompositions.map(c => c.menuName)],
    [safeMenus, safeCompositions]
  );

  const filtered = useMemo(() => {
    let r = results;
    if (searchText) {
      r = r.filter(row =>
        [
          row.menuName,
          row.menuCode,
          row.baseMenuName,
          row.baseMenuCode,
          row.crustType,
          row.isDerived ? '파생' : '기본',
        ]
          .map(value => asDisplayText(value).toLowerCase())
          .some(value => value.includes(searchText))
      );
    }
    if (filterMenu !== '전체') r = r.filter(x => x.menuName === filterMenu);
    if (filterDerived === '기본') r = r.filter(x => !x.isDerived);
    if (filterDerived === '파생') r = r.filter(x => x.isDerived);
    if (missingOnly) r = r.filter(isMissingResult);
    return r;
  }, [results, searchText, filterMenu, filterDerived, missingOnly]);

  // 그룹 헤더 삽입용 — menuCode 단위로 그룹을 추적
  const allMenusForGroup = useMemo(
    () => [...safeMenus, ...safeCompositions],
    [safeMenus, safeCompositions]
  );
  const menuGroupMap = useMemo(() => {
    const map = {};
    allMenusForGroup.forEach(m => {
      map[m.menuCode] = resolveNutritionGroup(m, masterByCode);
    });
    return map;
  }, [allMenusForGroup, masterByCode]);

  const { page, goTo, totalPages, paged, total } = usePagination(filtered, PAGE_SIZE);

  const hasData = filtered.some(r => r.kcal);
  const hasRows = filtered.length > 0;

  function exportCsv() {
    const headers = [
      '메뉴명',
      '베이스 메뉴',
      '크러스트 타입',
      '구분',
      ...NUTRITION_FIELDS.map(f => `${f.label}(${f.unit})`),
    ];
    const rows = filtered.map(r => [
      r.menuName || '',
      r.baseMenuName || '',
      r.crustType || '',
      r.isDerived ? '파생' : '기본',
      ...NUTRITION_FIELDS.map(f => (isMissingResult(r) ? '' : (r[f.key] ?? ''))),
    ]);
    downloadCsv(
      [headers, ...rows],
      missingOnly ? '영양성분_누락메뉴.csv' : '영양성분_계산결과.csv'
    );
  }

  // 현재 페이지 행들에 그룹 헤더 삽입 (그룹 헤더는 페이지 단위로 다시 시작)
  const tableRows = useMemo(() => {
    if (filterMenu !== '전체') return paged.map(r => ({ type: 'data', row: r }));
    const result = [];
    let lastGroup = null;
    paged.forEach(r => {
      const g = menuGroupMap[r.menuCode] || '기타';
      if (g !== lastGroup) {
        result.push({ type: 'group', label: g });
        lastGroup = g;
      }
      result.push({ type: 'data', row: r });
    });
    return result;
  }, [paged, filterMenu, menuGroupMap]);

  return (
    <div style={{ marginTop: 20 }}>
      <ResultsToolbar
        filterMenu={filterMenu}
        onFilterMenu={setFilterMenu}
        menuNames={menuNames}
        filterDerived={filterDerived}
        onFilterDerived={setFilterDerived}
        missingOnly={missingOnly}
        onToggleMissingOnly={() => setMissingOnly(v => !v)}
        onExportCsv={exportCsv}
        exportDisabled={filtered.length === 0}
      />

      {!hasRows || (!hasData && !missingOnly) ? (
        <div className="card" style={{ display: 'grid', placeItems: 'center', minHeight: 180 }}>
          <div style={{ textAlign: 'center', color: 'var(--text-4)' }}>
            <Icon.beaker style={{ width: 28, height: 28 }} />
            <div style={{ marginTop: 8, fontSize: 13 }}>
              {missingOnly
                ? '조건에 맞는 누락 메뉴가 없어요'
                : '베이스 영양성분과 엣지 설정을 완료하면 계산 결과가 표시돼요'}
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
                      {f.label}
                      <br />
                      <span style={{ fontWeight: 400, color: 'var(--text-4)', fontSize: 10 }}>
                        ({f.unit})
                      </span>
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
                          <span style={{ padding: '2px 14px', display: 'block' }}>
                            {item.label}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                  const r = item.row;
                  return (
                    <NutritionResultRow
                      key={`${r.menuCode || r.menuName || 'row'}-${asDisplayText(r.crustType, '—')}-${i}`}
                      row={r}
                      isEmpty={isMissingResult(r)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ borderTop: '1px solid var(--divider)' }}>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={goTo}
              total={total}
              pageSize={PAGE_SIZE}
            />
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
