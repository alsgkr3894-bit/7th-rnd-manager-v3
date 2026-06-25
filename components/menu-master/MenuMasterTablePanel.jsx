'use client';

import { Pagination } from '@/components/ui/Pagination';
import { MenuMasterTableRow } from '@/components/menu-master/MenuMasterTableRow';

const PAGE_SIZE = 60;

export function MenuMasterTablePanel({
  filteredRows,
  pagedRows,
  totalRows,
  recipeSummaryMap,
  isViewer,
  onEdit,
  onDelete,
  page,
  totalPages,
  onPage,
  total,
}) {
  return (
    <div className="card table-card">
      {filteredRows.length === 0 ? (
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
      ) : (
        <div className="table-wrap">
          <table className="data-table stagger-rows">
            <thead>
              <tr>
                <th style={{ width: 145 }}>메뉴코드</th>
                <th>메뉴명</th>
                <th style={{ width: 200 }}>분류 태그</th>
                <th style={{ width: 145 }}>중분류</th>
                <th style={{ width: 60 }}>사이즈</th>
                <th style={{ width: 100, textAlign: 'right' }}>판매가</th>
                <th style={{ width: 120 }}>레시피/원가</th>
                <th style={{ width: 80 }}>상태</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map(row => (
                <MenuMasterTableRow
                  key={row.id}
                  row={row}
                  recipeSummary={recipeSummaryMap.get(row.menuCode)}
                  isViewer={isViewer}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ borderTop: '1px solid var(--divider)' }}>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={onPage}
          total={total}
          pageSize={PAGE_SIZE}
        />
        {totalPages <= 1 && (
          <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-3)' }}>
            {filteredRows.length}개 표시 / 전체 {totalRows.length}개
          </div>
        )}
      </div>
    </div>
  );
}
