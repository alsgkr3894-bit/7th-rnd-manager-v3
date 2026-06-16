'use client';
import { SearchBox } from '@/components/ui/SearchBox';
import { printUsageReport } from '@/lib/cost/usage-print';
import { USAGE_CATS } from './usage-display-utils';

export function IngredientUsageControls({
  displayRows,
  usageCat,
  onUsageCat,
  menuSearch,
  onMenuSearch,
  menuCounts,
  showHidden,
  showUnused,
  onlyOne,
  onExpandAll,
  onCollapseAll,
  onExportCsv,
}) {
  return (
    <>
      <div style={{ margin: '10px 0 0' }}>
        <SearchBox
          value={menuSearch}
          onChange={onMenuSearch}
          placeholder={
            showUnused ? '식자재명·제품코드 검색' : '메뉴명으로 사용 식자재 찾기 (예: 페퍼로니)'
          }
        />
      </div>

      <div className="usage-action-row" style={{ marginBottom: 8 }}>
        <button className="btn sm" onClick={onExpandAll}>
          모두 펼치기
        </button>
        <button className="btn sm" onClick={onCollapseAll}>
          모두 접기
        </button>
        <button className="btn sm" onClick={() => printUsageReport(displayRows, usageCat)}>
          PDF 출력
        </button>
        <button className="btn sm" onClick={onExportCsv} disabled={displayRows.length === 0}>
          엑셀로 내보내기
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
          margin: '0 0 8px',
        }}
      >
        <div className="usage-chip-row">
          {USAGE_CATS.map(category => (
            <button
              key={category}
              className={'chip' + (usageCat === category ? ' active' : '')}
              onClick={() => onUsageCat(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
        해당 메뉴 <b style={{ color: 'var(--text-1)' }}>{menuCounts.total}</b>개
        <span style={{ marginLeft: 8 }}>
          · 피자메뉴 <b style={{ color: 'var(--text-1)' }}>{menuCounts.pizza}</b>개
        </span>
        <span style={{ marginLeft: 8 }}>
          · 사이드메뉴 <b style={{ color: 'var(--text-1)' }}>{menuCounts.side}</b>개
        </span>
        {showHidden && (
          <span style={{ marginLeft: 8, color: 'var(--accent)' }}>· 숨김 항목만 표시 중</span>
        )}
        {showUnused && (
          <span style={{ marginLeft: 8, color: 'var(--accent)' }}>· 미사용 식자재만 표시 중</span>
        )}
        {onlyOne && (
          <span style={{ marginLeft: 8, color: 'var(--warn)' }}>· 1개 사용만 표시 중</span>
        )}
      </div>
    </>
  );
}

export function IngredientUsageExcludedMenus({
  showUnused,
  excludedMenus,
  onRestoreMenu,
  onRestoreAllMenus,
}) {
  if (showUnused || excludedMenus.size === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        padding: '8px 10px',
        marginBottom: 8,
        borderRadius: 8,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>
        목록 제외 메뉴 {excludedMenus.size}개
      </span>
      {[...excludedMenus].map(name => (
        <span
          key={name}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 6px 2px 8px',
            borderRadius: 99,
            background: 'var(--surface)',
            color: 'var(--text-2)',
            border: '1px solid var(--border)',
          }}
        >
          {name}
          <button
            onClick={() => onRestoreMenu(name)}
            title="다시 목록에 표시"
            style={{
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--accent)',
              padding: 0,
              lineHeight: 1,
              fontSize: 13,
              display: 'inline-flex',
            }}
          >
            ↺
          </button>
        </span>
      ))}
      <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={onRestoreAllMenus}>
        전체 복원
      </button>
    </div>
  );
}
