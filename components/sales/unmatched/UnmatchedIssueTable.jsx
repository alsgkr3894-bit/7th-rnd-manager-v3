'use client';
import { Pagination } from '@/components/ui/Pagination';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { UnmatchedIssueRow } from './UnmatchedIssueRow';

export function UnmatchedIssueTable({
  pagedIssues,
  openIssuesCount,
  allOpenSelected,
  selected,
  openId,
  busyId,
  page,
  totalPages,
  total,
  onPage,
  canEdit = false,
  onToggleAll,
  onToggleSelected,
  onToggleRow,
  onResolveSingle,
}) {
  return (
    <>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  checked={openIssuesCount > 0 && allOpenSelected}
                  onChange={onToggleAll}
                  disabled={!canEdit}
                />
              </th>
              <th style={{ width: 110 }}>월</th>
              <th>대표 메뉴명 (원본)</th>
              <th>정규화 후</th>
              <th style={{ width: 110, textAlign: 'right' }}>총 수량</th>
              <th style={{ width: 100, textAlign: 'right' }}>영향 행</th>
              <th style={{ width: 100 }}>상태</th>
              <th style={{ width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {pagedIssues.map((issue, index) => {
              const issueId = issue.id;
              const hasIssueId = issueId != null;
              const issueKey = asDisplayText(issueId, `issue-${index}`);

              return (
                <UnmatchedIssueRow
                  key={issueKey}
                  issue={issue}
                  expanded={hasIssueId && openId === issueId}
                  busy={hasIssueId && busyId === issueId}
                  checked={hasIssueId && selected.has(issueId)}
                  canEdit={canEdit}
                  onCheck={() => onToggleSelected(issueId)}
                  onToggle={() => onToggleRow(issueId)}
                  onSubmit={(actionType, actionData) =>
                    onResolveSingle(issue, actionType, actionData)
                  }
                />
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ borderTop: '1px solid var(--divider)' }}>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={onPage}
          total={total}
          pageSize={50}
        />
      </div>
    </>
  );
}
