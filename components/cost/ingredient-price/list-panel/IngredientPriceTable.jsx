'use client';

import { Pagination } from '@/components/ui/Pagination';
import { MasterRow } from '@/components/cost/ingredient-price/MasterRow';
import { SortableHeader } from '@/components/cost/manage/table-utils';

function IngredientPriceNoResults() {
  return (
    <div
      style={{
        padding: '40px 0',
        textAlign: 'center',
        color: 'var(--text-3)',
        fontSize: 13,
      }}
    >
      조건에 맞는 항목이 없습니다
    </div>
  );
}

function IngredientPriceTableHeader({ priceTable }) {
  return (
    <thead>
      <tr>
        <th style={{ width: 34 }}>
          <input
            type="checkbox"
            checked={priceTable.allPageSelected}
            onChange={priceTable.togglePage}
            style={{ width: 15, height: 15, accentColor: 'var(--accent)' }}
          />
        </th>
        <SortableHeader
          label="제품코드"
          id="code"
          sort={priceTable.sort}
          onSort={priceTable.changeSort}
          style={{ width: 90 }}
        />
        <SortableHeader
          label="제품명"
          id="name"
          sort={priceTable.sort}
          onSort={priceTable.changeSort}
        />
        <SortableHeader
          label="분류"
          id="category"
          sort={priceTable.sort}
          onSort={priceTable.changeSort}
          style={{ width: 96 }}
        />
        <SortableHeader
          label="부가세포함가"
          id="price"
          sort={priceTable.sort}
          onSort={priceTable.changeSort}
          style={{ width: 120, textAlign: 'right' }}
        />
        <th style={{ width: 92 }}>출처</th>
        <th style={{ width: 100 }}>포장단위</th>
        <SortableHeader
          label="개당 단가"
          id="unit"
          sort={priceTable.sort}
          onSort={priceTable.changeSort}
          style={{ width: 120, textAlign: 'right' }}
        />
        <SortableHeader
          label="단가변동"
          id="delta"
          sort={priceTable.sort}
          onSort={priceTable.changeSort}
          style={{ width: 110, textAlign: 'right' }}
        />
        <th style={{ width: 30 }}></th>
        <th style={{ width: 60 }}></th>
      </tr>
    </thead>
  );
}

function IngredientPriceTableRows({ priceTable, readOnly, onRegClick, onInlineSave }) {
  return (
    <tbody>
      {priceTable.paged.map((row, index) => (
        <MasterRow
          key={row.meta?.id ?? row.productCode ?? `row-${index}`}
          r={row}
          onRegClick={() => onRegClick(row)}
          selected={row.meta?.id != null && priceTable.selected.has(row.meta.id)}
          onToggleSelect={() => row.meta?.id != null && priceTable.toggle(row.meta.id)}
          onInlineSave={onInlineSave}
          readOnly={readOnly}
        />
      ))}
    </tbody>
  );
}

function IngredientPriceTableFooter({ filtered, rows, priceTable }) {
  return (
    <div
      style={{
        padding: '8px 16px',
        fontSize: 11,
        color: 'var(--text-3)',
        borderTop: '1px solid var(--divider)',
      }}
    >
      <Pagination
        page={priceTable.page}
        totalPages={priceTable.totalPages}
        onPage={priceTable.goTo}
        total={priceTable.total}
        pageSize={priceTable.pageSize}
      />
      {priceTable.totalPages <= 1 && (
        <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-3)' }}>
          {filtered.length}개 표시 / 전체 {rows.length}개
        </div>
      )}
    </div>
  );
}

export function IngredientPriceTable({
  filtered,
  rows,
  priceTable,
  readOnly,
  onRegClick,
  onInlineSave,
}) {
  return (
    <div className="card table-card content-enter">
      {filtered.length === 0 ? (
        <IngredientPriceNoResults />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <IngredientPriceTableHeader priceTable={priceTable} />
            <IngredientPriceTableRows
              priceTable={priceTable}
              readOnly={readOnly}
              onRegClick={onRegClick}
              onInlineSave={onInlineSave}
            />
          </table>
        </div>
      )}
      <IngredientPriceTableFooter filtered={filtered} rows={rows} priceTable={priceTable} />
    </div>
  );
}
