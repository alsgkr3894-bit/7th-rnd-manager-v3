'use client';
import { Icon } from '@/components/icons';
import { SearchBox } from '@/components/ui/SearchBox';
import { formatNumber } from '@/lib/format';
import { MENU_RECIPE_SUMMARY_STATUS } from '@/lib/menu-master/recipe-summary';

export function RecipeMasterTable({ loading, rows, search, onSearch, onEdit }) {
  return (
    <section className="card table-card" style={{ marginTop: 16 }}>
      <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <SearchBox value={search} onChange={onSearch} placeholder="메뉴코드·메뉴명·카테고리 검색" />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>
          {rows.length}건
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: 940 }}>
          <thead>
            <tr>
              <th style={{ width: 140 }}>메뉴코드</th>
              <th>메뉴명</th>
              <th style={{ width: 150 }}>분류</th>
              <th style={{ width: 90 }}>상태</th>
              <th style={{ width: 100 }}>원가</th>
              <th style={{ width: 90 }}>구성품</th>
              <th style={{ width: 90 }}>알레르기</th>
              <th style={{ width: 90 }}>원산지</th>
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <EmptyRow>불러오는 중…</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow>표시할 메뉴가 없습니다</EmptyRow>
            ) : (
              rows.map(row => (
                <tr key={row.menu.menuCode}>
                  <td className="mono">{row.menu.menuCode}</td>
                  <td style={{ fontWeight: 700 }}>{row.menu.menuName}</td>
                  <td>{row.menu.category}</td>
                  <td>
                    <RecipeStatus row={row} />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {row.cost > 0 ? `${formatNumber(row.cost)}원` : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>{row.components.length}</td>
                  <td style={{ textAlign: 'center' }}>{row.allergenCount}</td>
                  <td style={{ textAlign: 'center' }}>{row.originCount}</td>
                  <td>
                    <button className="btn sm" onClick={() => onEdit(row)}>
                      <Icon.edit style={{ width: 13, height: 13 }} /> 편집
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecipeStatus({ row }) {
  const summaryStatus = row.summary?.status;
  const needsCheck =
    summaryStatus === MENU_RECIPE_SUMMARY_STATUS.NEEDS_PRICE ||
    summaryStatus === MENU_RECIPE_SUMMARY_STATUS.NEEDS_QUANTITY;
  const label = needsCheck
    ? summaryStatus === MENU_RECIPE_SUMMARY_STATUS.NEEDS_PRICE
      ? '단가 확인'
      : '수량 확인'
    : row.components.length > 0
      ? '작성완료'
      : row.recipe
        ? '생성됨'
        : '미생성';
  const color = needsCheck
    ? 'var(--warn)'
    : row.components.length > 0
      ? 'var(--accent)'
      : 'var(--text-3)';
  return <span style={{ fontSize: 12, fontWeight: 800, color }}>{label}</span>;
}

function EmptyRow({ children }) {
  return (
    <tr>
      <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-4)' }}>
        {children}
      </td>
    </tr>
  );
}
