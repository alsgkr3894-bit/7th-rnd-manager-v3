'use client';
import { formatNumber } from '@/lib/format';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { UnmatchedResolveForm } from '../UnmatchedResolveForm';

export function UnmatchedIssueRow({
  issue,
  expanded,
  busy,
  checked,
  canEdit = false,
  onCheck,
  onToggle,
  onSubmit,
}) {
  const safeIssue = issue && typeof issue === 'object' ? issue : {};
  const issueId = safeIssue.id;
  const canResolve = safeIssue.status === 'open' && issueId != null;
  const year = asDisplayText(safeIssue.year, '-');
  const month = asDisplayText(safeIssue.month);
  const monthLabel = month ? month.padStart(2, '0') : '--';
  const rawMenuName = asDisplayText(safeIssue.representativeRawMenuName, '-');
  const normalizedMenuName = asDisplayText(safeIssue.normalizedMenuName, '-');
  const totalQuantity = Number.isFinite(Number(safeIssue.totalQuantity))
    ? Number(safeIssue.totalQuantity)
    : 0;
  const affectedRowCount = Number.isFinite(Number(safeIssue.affectedRowCount))
    ? Number(safeIssue.affectedRowCount)
    : 0;
  const handleCheck = typeof onCheck === 'function' ? onCheck : undefined;
  const handleToggle = typeof onToggle === 'function' ? onToggle : undefined;

  return (
    <>
      <tr>
        <td>
          {canResolve && (
            <input
              type="checkbox"
              checked={Boolean(checked)}
              onChange={handleCheck}
              disabled={!canEdit}
            />
          )}
        </td>
        <td>
          <span className="period-pill num">
            {year}.{monthLabel}
          </span>
        </td>
        <td className="cell-name">
          <div className="menu-name">{rawMenuName}</div>
        </td>
        <td className="cell-name">
          <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{normalizedMenuName}</span>
        </td>
        <td className="num right">
          {formatNumber(totalQuantity)}
          <span className="unit">개</span>
        </td>
        <td className="num right">{formatNumber(affectedRowCount)}</td>
        <td>
          {safeIssue.status === 'open' ? (
            <span
              className="chip"
              style={{ background: 'var(--negative-soft)', color: 'var(--negative)' }}
            >
              미해결
            </span>
          ) : (
            <span
              className="chip"
              style={{ background: 'var(--positive-soft)', color: 'var(--positive)' }}
            >
              해결됨
            </span>
          )}
        </td>
        <td style={{ textAlign: 'right' }}>
          {canResolve && (
            <button
              className="btn sm primary"
              onClick={handleToggle}
              disabled={busy || (!canEdit && !expanded)}
            >
              {expanded ? '닫기' : '해결'}
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} style={{ padding: 0 }}>
            <UnmatchedResolveForm
              issue={safeIssue}
              onSubmit={onSubmit}
              onCancel={handleToggle}
              busy={busy}
              canEdit={canEdit}
            />
          </td>
        </tr>
      )}
    </>
  );
}
