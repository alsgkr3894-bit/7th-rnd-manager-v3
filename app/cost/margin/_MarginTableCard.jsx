'use client';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { Pagination } from '@/components/ui/Pagination';
import { MarginTableHeader } from '@/components/cost/margin/MarginTableHeader';
import { MarginRow } from '@/components/cost/margin/MarginRow';

export function MarginTableCard({
  rows,
  sortedFiltered,
  edgeFiltered,
  tableSections,
  sortKey,
  sortDir,
  sizeLabels,
  hasAdjustment,
  viewMode,
  warnPct,
  critPct,
  activePlatform,
  discount,
  discType,
  discVal,
  onSort,
  onToggleHide,
  canEdit = false,
  page,
  goTo,
  totalPages,
  total,
  pageSize,
}) {
  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon-wrap">
          <Icon.doc style={{ width: 32, height: 32 }} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>등록된 메뉴가 없어요</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
          원가 계산 탭에서 레시피를 먼저 등록해주세요
        </div>
      </div>
    );
  }

  return (
    <div className="card table-card">
      {sortedFiltered.length === 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table stagger-rows margin-table">
            <thead>
              <MarginTableHeader
                sizeLabels={sizeLabels}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
                hasAdjustment={hasAdjustment}
                viewMode={viewMode}
              />
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={99}
                  style={{
                    padding: '32px 0',
                    textAlign: 'center',
                    color: 'var(--text-3)',
                    fontSize: 13,
                  }}
                >
                  조건에 맞는 메뉴가 없습니다
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        tableSections.map((section, index) => (
          <div
            key={section.id}
            className={`margin-section margin-section-${section.id}`}
            data-first={index === 0 ? 'true' : undefined}
          >
            <div className="margin-section-header">
              <div className="margin-section-title">
                <span className="margin-section-marker" aria-hidden="true" />
                <strong>{section.title}</strong>
              </div>
              <div className="margin-section-meta">
                <span>{section.rows.length}개</span>
                <span>{section.sizeLabels.join(' / ')}</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table stagger-rows margin-table">
                <thead>
                  <MarginTableHeader
                    sizeLabels={section.sizeLabels}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    hasAdjustment={hasAdjustment}
                    viewMode={viewMode}
                  />
                </thead>
                <tbody>
                  {section.rows.map(r => (
                    <MarginRow
                      key={r.id}
                      r={r}
                      sizeLabels={section.sizeLabels}
                      activePlatform={activePlatform}
                      discount={discount}
                      hasAdjustment={hasAdjustment}
                      viewMode={viewMode}
                      warnPct={warnPct}
                      critPct={critPct}
                      onToggleHide={onToggleHide}
                      canEdit={canEdit}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPage={goTo}
        total={total}
        pageSize={pageSize}
      />
      <div
        style={{
          padding: '8px 16px',
          fontSize: 11,
          color: 'var(--text-3)',
          borderTop: '1px solid var(--divider)',
        }}
      >
        {edgeFiltered.length}개 메뉴
        {rows.length !== edgeFiltered.length && ` (전체 ${rows.length}개)`}
        {hasAdjustment && (
          <span style={{ marginLeft: 8, color: 'var(--accent)' }}>
            · {activePlatform.id !== 'default' ? activePlatform.name : ''}
            {activePlatform.id !== 'default' && discount ? ' + ' : ''}
            {discount
              ? discType === 'pct'
                ? `${discount.value}% 할인`
                : `${formatNumber(discount.value)}원 할인`
              : ''}{' '}
            적용 중
          </span>
        )}
      </div>
    </div>
  );
}
