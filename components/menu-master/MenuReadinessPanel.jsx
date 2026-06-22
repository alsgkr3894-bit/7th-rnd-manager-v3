'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { READINESS_DIMS, OVERALL_LABEL, DIM_STATUS_LABEL } from '@/lib/menu-master/readiness';

/**
 * MenuReadinessPanel — 메뉴별 출시 준비 상태 표
 *
 * @param {Map} readinessMap - buildMenuReadinessMap() 결과
 * @param {string} [catFilter] - 카테고리 필터
 */
export function MenuReadinessPanel({
  readinessMap = new Map(),
  loading = false,
  catFilter,
  isViewer = false,
  onEdit,
}) {
  const router = useRouter();
  const [filter, setFilter] = useState('all'); // 'all' | 'ok' | 'warn' | 'missing' | 'unknown'
  const [searchQ, setSearchQ] = useState('');

  const entries = useMemo(() => {
    let list = [...readinessMap.values()];
    if (catFilter && catFilter !== 'all') {
      list = list.filter(e => e.menu?.category === catFilter);
    }
    if (filter !== 'all') {
      list = list.filter(e => e.overall === filter);
    }
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(
        e => e.menuCode?.toLowerCase().includes(q) || e.menu?.menuName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [readinessMap, catFilter, filter, searchQ]);

  const counts = useMemo(() => {
    const all = [...readinessMap.values()];
    return {
      ok: all.filter(e => e.overall === 'ok').length,
      warn: all.filter(e => e.overall === 'warn').length,
      missing: all.filter(e => e.overall === 'missing').length,
      unknown: all.filter(e => e.overall === 'unknown').length,
    };
  }, [readinessMap]);

  if (loading) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
        출시 준비 상태 계산 중…
      </div>
    );
  }

  if (readinessMap.size === 0) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
        출시 준비 상태를 계산할 메뉴가 없습니다
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 필터 툴바 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className={'chip' + (filter === 'all' ? ' active' : '')}
          onClick={() => setFilter('all')}
        >
          전체 {readinessMap.size}
        </button>
        <button
          className={'chip' + (filter === 'ok' ? ' active' : '')}
          onClick={() => setFilter('ok')}
          style={filter !== 'ok' ? { color: 'var(--positive)' } : undefined}
        >
          ✅ 출시 가능 {counts.ok}
        </button>
        <button
          className={'chip' + (filter === 'warn' ? ' active' : '')}
          onClick={() => setFilter('warn')}
          style={filter !== 'warn' ? { color: 'var(--warn)' } : undefined}
        >
          ⚠️ 확인 필요 {counts.warn}
        </button>
        <button
          className={'chip' + (filter === 'missing' ? ' active' : '')}
          onClick={() => setFilter('missing')}
          style={filter !== 'missing' ? { color: 'var(--negative)' } : undefined}
        >
          ❌ 미작성 {counts.missing}
        </button>
        {counts.unknown > 0 && (
          <button
            className={'chip' + (filter === 'unknown' ? ' active' : '')}
            onClick={() => setFilter('unknown')}
          >
            ❓ 확인 불가 {counts.unknown}
          </button>
        )}
        <input
          type="search"
          placeholder="메뉴 검색"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          style={{
            marginLeft: 'auto',
            padding: '4px 10px',
            fontSize: 12,
            border: '1px solid var(--divider)',
            borderRadius: 6,
            background: 'var(--surface)',
            color: 'var(--text)',
            width: 160,
          }}
        />
      </div>

      {/* 테이블 */}
      <div className="card table-card" style={{ overflow: 'auto' }}>
        {entries.length === 0 ? (
          <div
            style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}
          >
            조건에 맞는 메뉴가 없습니다
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>메뉴코드</th>
                <th>메뉴명</th>
                <th>종합</th>
                {READINESS_DIMS.map(dim => (
                  <th key={dim.id} style={{ minWidth: 80, textAlign: 'center' }}>
                    {dim.label}
                  </th>
                ))}
                <th style={{ width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const { menuCode, menu, dims, overall } = entry;
                const ov = OVERALL_LABEL[overall] || OVERALL_LABEL.unknown;
                return (
                  <tr key={menuCode}>
                    <td style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                      {menuCode}
                    </td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>
                      {menu?.menuName || menuCode}
                      {menu?.category && (
                        <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 6 }}>
                          {menu.category}
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: ov.color }}>
                        {ov.text}
                      </span>
                    </td>
                    {READINESS_DIMS.map(dim => {
                      const d = dims[dim.id] || { status: 'unknown' };
                      const ds = DIM_STATUS_LABEL[d.status] || DIM_STATUS_LABEL.unknown;
                      return (
                        <td
                          key={dim.id}
                          style={{ textAlign: 'center', cursor: dim.href ? 'pointer' : 'default' }}
                          onClick={() =>
                            dim.href &&
                            router.push(`${dim.href}?menuCode=${encodeURIComponent(menuCode)}`)
                          }
                          title={d.detail || dim.label}
                        >
                          <span style={{ fontSize: 14 }}>{ds.icon}</span>
                          {d.detail && d.status !== 'ok' && (
                            <div style={{ fontSize: 10, color: ds.color, marginTop: 1 }}>
                              {d.detail.length > 14 ? d.detail.slice(0, 12) + '…' : d.detail}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td>
                      <button
                        className="btn"
                        style={{ fontSize: 11, padding: '2px 8px' }}
                        onClick={() => onEdit?.(menu)}
                        disabled={isViewer}
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
