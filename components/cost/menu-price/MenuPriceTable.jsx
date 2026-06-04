'use client';
import { MenuPriceRow } from './MenuPriceRow';
import { Pagination } from '@/components/ui/Pagination';
import { SortButton } from '@/components/ui/SortButton';
import {
  SelectionToolbar,
  SortableHeader,
  sortButtonOptions,
  useCostManageTable,
} from '@/components/cost/manage/table-utils';

const SORT_OPTIONS = [
  { id: 'code', label: '메뉴코드', key: r => r.menuCode },
  { id: 'category', label: '분류', key: r => r.category },
  { id: 'name', label: '메뉴명', key: r => r.menuName },
  { id: 'size', label: '규격', key: r => r.size },
  { id: 'price', label: '판매가', key: r => r.price ?? -1 },
];

export function MenuPriceTable({
  rows, deletePending, onEdit, onDeleteStart, onDeleteCancel, onDeleteConfirm,
  onInlineSave,
}) {
  const table = useCostManageTable(rows, {
    sortOptions: SORT_OPTIONS,
    initialSort: { id: 'category', dir: 'asc' },
    getRowId: row => row.id,
  });

  if (rows.length === 0) {
    return (
      <div className="card table-card" style={{padding:'40px 0', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
        조건에 맞는 항목이 없습니다
      </div>
    );
  }

  return (
    <div className="card table-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', padding: '10px 12px', borderBottom: '1px solid var(--divider)' }}>
        <SortButton
          value={table.sort?.id}
          options={sortButtonOptions(SORT_OPTIONS, table.sort)}
          onChange={table.changeSort}
        />
        <SelectionToolbar
          selectedCount={table.selected.size}
          confirming={table.confirmingDelete}
          noun="판매가"
          onAskDelete={() => table.setConfirmingDelete(true)}
          onConfirmDelete={async () => {
            await Promise.all(Array.from(table.selected).map(id => onDeleteConfirm(id)));
            table.clearSelection();
          }}
          onCancel={table.clearSelection}
        />
      </div>
      <div style={{overflowX:'auto'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:34}}>
                <input
                  type="checkbox"
                  checked={table.allPageSelected}
                  onChange={table.togglePage}
                  style={{ width: 15, height: 15, accentColor: 'var(--accent)' }}
                />
              </th>
              <SortableHeader label="메뉴코드" id="code" sort={table.sort} onSort={table.changeSort} style={{width:110}} />
              <SortableHeader label="분류" id="category" sort={table.sort} onSort={table.changeSort} style={{width:88}} />
              <SortableHeader label="메뉴명" id="name" sort={table.sort} onSort={table.changeSort} />
              <SortableHeader label="규격" id="size" sort={table.sort} onSort={table.changeSort} style={{width:72}} />
              <SortableHeader label="판매가" id="price" sort={table.sort} onSort={table.changeSort} style={{width:120, textAlign:'right'}} />
              <th>비고</th>
              <th style={{width:84}}/>
            </tr>
          </thead>
          <tbody>
            {table.paged.map(r => (
              <MenuPriceRow
                key={r.id}
                r={r}
                deletePending={deletePending === r.id}
                onEdit={() => onEdit(r)}
                onDeleteStart={() => onDeleteStart(r.id)}
                onDeleteCancel={onDeleteCancel}
                onDeleteConfirm={() => onDeleteConfirm(r.id)}
                selected={table.selected.has(r.id)}
                onToggleSelect={() => table.toggle(r.id)}
                onInlineSave={onInlineSave}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div style={{padding:'8px 16px', fontSize:11, color:'var(--text-3)', borderTop:'1px solid var(--divider)'}}>
        <Pagination page={table.page} totalPages={table.totalPages} onPage={table.goTo} total={table.total} pageSize={table.pageSize} />
        {table.totalPages <= 1 && `총 ${rows.length}개`}
      </div>
    </div>
  );
}
