'use client';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { edgeTotalCost, edgeIssues } from '@/lib/cost/edge-dough';

export function EdgeCard({ edge, onEdit, onDelete }) {
  const total = edgeTotalCost(edge);
  const issues = edgeIssues(edge);
  const compCount = edge.components?.length || 0;
  const sizeLabel = edge.size ? ` ${edge.size}` : '';

  return (
    <div
      className="card"
      style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            {edge.edgeType}
            {sizeLabel}
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              color: 'var(--text-3)',
            }}
          >
            {edge.edgeCode}
          </span>
          {compCount === 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 6,
                background: 'var(--warn-soft)',
                color: 'var(--warn)',
              }}
            >
              비어있음
            </span>
          )}
          {compCount > 0 && issues.length > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 6,
                background: 'var(--warn-soft)',
                color: 'var(--warn)',
              }}
            >
              구성 미완료
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
          구성품 {compCount}개
          {issues.length > 0 && compCount > 0 && (
            <span style={{ marginLeft: 8, color: 'var(--warn)' }}>
              · {issues.length}건 확인 필요
            </span>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'right', minWidth: 120 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>총 원가</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: total > 0 ? 'var(--text-1)' : 'var(--text-4)',
            lineHeight: 1.2,
          }}
        >
          {total > 0 ? (
            <>
              {formatNumber(total)}
              <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 2 }}>원</span>
            </>
          ) : (
            '—'
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn sm" onClick={onEdit}>
          <Icon.edit style={{ width: 13, height: 13 }} /> 편집
        </button>
        {onDelete && (
          <button className="btn sm" onClick={onDelete} style={{ color: 'var(--text-3)' }}>
            <Icon.trash style={{ width: 13, height: 13 }} />
          </button>
        )}
      </div>
    </div>
  );
}
