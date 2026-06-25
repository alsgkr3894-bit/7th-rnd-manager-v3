'use client';

import { Icon } from '@/components/icons';
import { PIZZA_SUB_CATEGORY_OPTIONS } from '@/lib/cost/menu-price';
import { MENU_CATEGORY } from '@/lib/menu-categories';

export function MenuMasterFilterPanel({
  rows,
  activeRows,
  discontinuedRows,
  testRows,
  statusFilter,
  onStatusFilter,
  catFilter,
  onCatFilter,
  subFilter,
  onSubFilter,
  search,
  onSearch,
  displayCategories,
  catCounts,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 600 }}>
          상태
        </span>
        {[
          { id: 'all', label: `전체 ${rows.length}` },
          { id: 'active', label: `활성 ${activeRows.length}` },
          { id: 'discontinued', label: `단종 ${discontinuedRows.length}` },
          { id: 'test', label: `테스트 ${testRows.length}` },
        ].map(t => (
          <button
            key={t.id}
            className={'chip' + (statusFilter === t.id ? ' active' : '')}
            onClick={() => {
              onStatusFilter(t.id);
              onCatFilter('all');
            }}
          >
            {t.label}
          </button>
        ))}
        <div className="filter-search" style={{ width: 220, marginLeft: 'auto' }}>
          <Icon.search style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="코드·메뉴명 검색"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 600 }}>
          분류
        </span>
        <button
          className={'chip' + (catFilter === 'all' ? ' active' : '')}
          onClick={() => {
            onCatFilter('all');
            onSubFilter('all');
          }}
        >
          전체 {catCounts.all}
        </button>
        {displayCategories.map(
          c =>
            catCounts[c] > 0 && (
              <button
                key={c}
                className={'chip' + (catFilter === c ? ' active' : '')}
                onClick={() => {
                  onCatFilter(c);
                  onSubFilter('all');
                }}
              >
                {c} {catCounts[c]}
              </button>
            )
        )}
      </div>

      {catFilter === MENU_CATEGORY.PIZZA && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4, fontWeight: 600 }}>
            중분류
          </span>
          <button
            className={'chip' + (subFilter === 'all' ? ' active' : '')}
            onClick={() => onSubFilter('all')}
          >
            전체
          </button>
          {PIZZA_SUB_CATEGORY_OPTIONS.map(option => (
            <button
              key={option.code}
              className={'chip' + (subFilter === option.label ? ' active' : '')}
              onClick={() => onSubFilter(option.label)}
            >
              {option.code} {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
