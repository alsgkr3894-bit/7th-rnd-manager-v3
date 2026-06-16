import Link from 'next/link';
import { Pagination } from '@/components/ui/Pagination';
import { formatNumber } from '@/lib/format';
import { costRateColor } from '@/lib/cost/rate-color';
import { MENU_MASTER_ROUTE } from '@/lib/cost/routes';

export function AllSummaryTable({
  rows,
  page,
  totalPages,
  onPage,
  total,
  filteredCount,
  category,
  pageSize,
}) {
  return (
    <div className="card table-card">
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table stagger-rows">
          <thead>
            <tr>
              <th style={{ minWidth: 160 }}>메뉴명</th>
              <th style={{ minWidth: 90 }}>카테고리</th>
              <th style={{ minWidth: 100, textAlign: 'right' }}>원가 (첫 사이즈)</th>
              <th style={{ minWidth: 100, textAlign: 'right' }}>판매가</th>
              <th style={{ minWidth: 90, textAlign: 'right' }}>원가율</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <AllSummaryTableRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ borderTop: '1px solid var(--divider)' }}>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={onPage}
          total={total}
          pageSize={pageSize}
        />
        {totalPages <= 1 && (
          <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-3)' }}>
            {filteredCount}개 메뉴 표시
            {category !== '전체' && ` · ${category} 필터 적용 중`}
          </div>
        )}
      </div>
    </div>
  );
}

function AllSummaryTableRow({ row }) {
  return (
    <tr>
      <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{row.menuName}</td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <span className="chip">{row.rawCategory || row.category}</span>
      </td>
      <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>
        {row.cost != null ? (
          `${formatNumber(row.cost)}원`
        ) : (
          <Link
            href={MENU_MASTER_ROUTE}
            style={{
              color: 'var(--accent)',
              fontSize: 12,
              textDecoration: 'underline',
            }}
            title="메뉴 마스터에서 레시피 작성"
          >
            레시피 미등록
          </Link>
        )}
      </td>
      <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>
        {row.sellingPrice != null ? `${formatNumber(row.sellingPrice)}원` : '—'}
      </td>
      <td style={{ textAlign: 'right' }}>
        {row.costRate != null ? (
          <span style={{ fontWeight: 700, color: costRateColor(row.costRate) }}>
            {row.costRate.toFixed(1)}%
          </span>
        ) : (
          <span style={{ color: 'var(--text-4)' }}>—</span>
        )}
      </td>
    </tr>
  );
}
