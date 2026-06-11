'use client';
import { useState, useMemo, useEffect, Fragment } from 'react';
import { SCOPE_STYLES } from '@/lib/ingredient/constants';
import { printUsageReport } from '@/lib/cost/usage-print';
import { getUsageMenuCounts, getUsageRowsMenuCounts } from '@/lib/cost/usage-counts';

const TIER_LABEL = ['많이 쓰는 재료 (8개 이상)', '보통 (4–7개)', '적게 쓰는 재료 (1–3개)'];
const tierOf = count => (count >= 8 ? 0 : count >= 4 ? 1 : 2);

const CAT_COLORS = {
  피자: { bg: '#EFF6FF', color: '#1D4ED8' },
  '1인피자': { bg: '#FFF7ED', color: '#C2410C' },
  사이드: { bg: '#F0FDF4', color: '#15803D' },
};
const USAGE_CATS = ['전체', '피자', '사이드', '1인피자'];

export function UsageView({ rows, usageMap, usageCat, setUsageCat, usageSort, setUsageSort }) {
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    setExpanded(new Set());
  }, [usageCat]);

  const usageRows = useMemo(() => {
    const { byCode = new Map(), byName = new Map() } = usageMap;
    const normStr = s => (s || '').trim().toLowerCase().replace(/\s+/g, '');

    return rows
      .map((r, idx) => {
        const code = r.meta?.productCode || r.productCode || '';
        const dispName = r.masterName || r.productName || '';

        const fromCode = (code ? byCode.get(code) : null) || new Map();
        const fromMaster = byName.get(normStr(r.masterName || '')) || new Map();
        const fromProd = byName.get(normStr(r.productName || '')) || new Map();
        const menuMap = new Map([...fromProd, ...fromMaster, ...fromCode]);

        if (!menuMap.size) return { code, name: dispName, count: 0, menus: [] };

        const menus = [...menuMap.entries()]
          .filter(([, cat]) => usageCat === '전체' || cat === usageCat)
          .map(([menuName, cat]) => ({ menuName, cat }))
          .sort((a, b) => a.menuName.localeCompare(b.menuName, 'ko'));

        const uid = code || `_idx_${idx}`;
        const menuCounts = getUsageMenuCounts(menus);
        return {
          uid,
          code,
          name: dispName,
          scope: r.scope || null,
          count: menuCounts.total,
          pizzaCount: menuCounts.pizza,
          sideCount: menuCounts.side,
          menus,
        };
      })
      .filter(r => r.count > 0);
  }, [rows, usageMap, usageCat]);

  const sorted = useMemo(() => {
    const arr = [...usageRows];
    if (usageSort === 'count_desc')
      arr.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
    else if (usageSort === 'count_asc')
      arr.sort((a, b) => a.count - b.count || a.name.localeCompare(b.name, 'ko'));
    else arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    return arr;
  }, [usageRows, usageSort]);

  const menuCounts = useMemo(() => getUsageRowsMenuCounts(sorted), [sorted]);

  function toggle(code) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 10,
          fontSize: 12,
          color: 'var(--text-3)',
          alignItems: 'center',
        }}
      >
        <span>
          사용 식자재 <b style={{ color: 'var(--text-1)' }}>{sorted.length}</b>개
        </span>
        <span>·</span>
        <span>
          해당 메뉴 <b style={{ color: 'var(--text-1)' }}>{menuCounts.total}</b>개
        </span>
        <span>·</span>
        <span>
          피자메뉴 <b style={{ color: 'var(--text-1)' }}>{menuCounts.pizza}</b>개
        </span>
        <span>·</span>
        <span>
          사이드메뉴 <b style={{ color: 'var(--text-1)' }}>{menuCounts.side}</b>개
        </span>
      </div>

      <div
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {USAGE_CATS.map(c => (
            <button
              key={c}
              className={'chip' + (usageCat === c ? ' active' : '')}
              onClick={() => setUsageCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn sm" onClick={() => setExpanded(new Set(sorted.map(r => r.uid)))}>
            모두 펼치기
          </button>
          <button className="btn sm" onClick={() => setExpanded(new Set())}>
            모두 접기
          </button>
          <button className="btn sm" onClick={() => printUsageReport(sorted, usageCat)}>
            PDF 출력
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginLeft: 4 }}>
            정렬
          </span>
          <select
            value={usageSort}
            onChange={e => setUsageSort(e.target.value)}
            style={{
              fontSize: 12,
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-1)',
              cursor: 'pointer',
            }}
          >
            <option value="count_desc">많이 쓰는 순</option>
            <option value="count_asc">적게 쓰는 순</option>
            <option value="name_asc">이름 순</option>
          </select>
        </div>
      </div>

      <div className="card table-card">
        {sorted.length === 0 ? (
          <div
            style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}
          >
            등록된 레시피가 없거나 해당 카테고리에 사용된 재료가 없습니다
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>순위</th>
                <th>식자재명</th>
                <th style={{ width: 80 }}>제품코드</th>
                <th style={{ width: 90, textAlign: 'center' }}>사용 메뉴수</th>
                <th style={{ width: 112, textAlign: 'center' }}>피자/사이드</th>
                <th>메뉴 목록</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => {
                const open = expanded.has(r.uid);
                const SHOW = 4;
                const visible = open ? r.menus : r.menus.slice(0, SHOW);
                const more = r.menus.length - SHOW;
                const byCount = usageSort === 'count_desc' || usageSort === 'count_asc';
                const tier = tierOf(r.count);
                const showTier = byCount && (idx === 0 || tierOf(sorted[idx - 1].count) !== tier);
                const sc = r.scope ? SCOPE_STYLES[r.scope] : null;
                return (
                  <Fragment key={r.uid}>
                    {showTier && (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            padding: '7px 12px',
                            background: 'var(--surface-2)',
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--text-3)',
                            borderTop: '1px solid var(--divider)',
                          }}
                        >
                          {TIER_LABEL[tier]}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                        {idx + 1}
                      </td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>
                        {r.name}
                        {r.scope && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 8,
                              color: sc?.color || 'var(--text-3)',
                              background: sc?.bg || 'var(--surface-2)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {r.scope}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                        {r.code || '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            minWidth: 32,
                            padding: '2px 8px',
                            borderRadius: 99,
                            fontWeight: 700,
                            fontSize: 13,
                            background:
                              r.count >= 8
                                ? '#DBEAFE'
                                : r.count >= 4
                                  ? '#D1FAE5'
                                  : 'var(--surface-2)',
                            color:
                              r.count >= 8 ? '#1D4ED8' : r.count >= 4 ? '#065F46' : 'var(--text-2)',
                          }}
                        >
                          {r.count}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            flexDirection: 'column',
                            gap: 2,
                            alignItems: 'stretch',
                            minWidth: 76,
                            fontSize: 11,
                            color: 'var(--text-3)',
                          }}
                        >
                          <span>
                            피자 <b style={{ color: 'var(--text-1)' }}>{r.pizzaCount || 0}</b>
                          </span>
                          <span>
                            사이드 <b style={{ color: 'var(--text-1)' }}>{r.sideCount || 0}</b>
                          </span>
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 4,
                            alignItems: 'center',
                          }}
                        >
                          {visible.map(m => {
                            const cs = CAT_COLORS[m.cat] || {
                              bg: 'var(--surface-2)',
                              color: 'var(--text-3)',
                            };
                            return (
                              <span
                                key={m.menuName}
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: 99,
                                  background: cs.bg,
                                  color: cs.color,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {m.menuName}
                              </span>
                            );
                          })}
                          {!open && more > 0 && (
                            <button
                              onClick={() => toggle(r.uid)}
                              style={{
                                fontSize: 11,
                                color: 'var(--accent)',
                                border: 0,
                                background: 'none',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                fontWeight: 600,
                              }}
                            >
                              +{more}개 더보기
                            </button>
                          )}
                          {open && r.menus.length > SHOW && (
                            <button
                              onClick={() => toggle(r.uid)}
                              style={{
                                fontSize: 11,
                                color: 'var(--text-3)',
                                border: 0,
                                background: 'none',
                                cursor: 'pointer',
                                padding: '2px 4px',
                              }}
                            >
                              접기
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
        <div
          style={{
            padding: '8px 16px',
            fontSize: 11,
            color: 'var(--text-3)',
            borderTop: '1px solid var(--divider)',
          }}
        >
          {sorted.length}개 식자재 표시 ·{' '}
          {usageCat !== '전체' ? `${usageCat} 필터 중` : '전체 카테고리'}
        </div>
      </div>
    </>
  );
}
