'use client';

import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import {
  priceFileLabel,
  syncApplyButtonLabel,
  syncSummaryItems,
  syncSummaryToneStyle,
} from './syncBaseQtyModalUtils';

function SummaryBadge({ item }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        ...syncSummaryToneStyle(item.tone),
      }}
    >
      {item.label}
    </span>
  );
}

function SyncSummary({ plan, selectedFile }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      {selectedFile && (
        <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4 }}>
          {priceFileLabel(selectedFile)}
        </span>
      )}
      {syncSummaryItems(plan).map(item => (
        <SummaryBadge key={item.key} item={item} />
      ))}
    </div>
  );
}

function ChangesTable({ changes }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>
        업데이트 항목 ({changes.length}개)
      </div>
      <div
        style={{
          overflowX: 'auto',
          maxHeight: 300,
          overflowY: 'auto',
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}
      >
        <table className="data-table" style={{ minWidth: 460 }}>
          <thead>
            <tr>
              <th style={{ width: 90 }}>제품코드</th>
              <th>재료명</th>
              <th style={{ width: 90, textAlign: 'right' }}>현재 기준수량</th>
              <th style={{ width: 90, textAlign: 'right' }}>새 기준수량</th>
              <th style={{ width: 50 }}>단위</th>
            </tr>
          </thead>
          <tbody>
            {changes.map(change => (
              <tr key={change.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{change.productCode}</td>
                <td style={{ fontSize: 13 }}>{change.name}</td>
                <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-3)' }}>
                  {change.oldQty != null ? formatNumber(change.oldQty) : '—'}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    fontWeight: 700,
                    fontSize: 13,
                    color: 'var(--accent)',
                  }}
                >
                  {formatNumber(change.newQty)}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{change.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyChanges() {
  return (
    <div
      style={{
        padding: '28px 0',
        textAlign: 'center',
        color: 'var(--text-3)',
        fontSize: 13,
        marginBottom: 16,
      }}
    >
      <Icon.check
        style={{
          width: 28,
          height: 28,
          opacity: 0.4,
          marginBottom: 8,
          display: 'block',
          margin: '0 auto 8px',
        }}
      />
      변경이 필요한 항목이 없습니다.
      <br />
      <span style={{ fontSize: 12 }}>모든 항목의 기준수량이 이미 최신입니다.</span>
    </div>
  );
}

export function SyncBaseQtyPreview({ plan, selectedFile, applying, onReset, onApply }) {
  const changes = plan?.changes || [];

  return (
    <>
      <SyncSummary plan={plan} selectedFile={selectedFile} />
      {changes.length > 0 ? <ChangesTable changes={changes} /> : <EmptyChanges />}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button type="button" className="btn" onClick={onReset} disabled={applying}>
          다시 선택
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={onApply}
          disabled={applying || changes.length === 0}
        >
          {syncApplyButtonLabel(plan, applying)}
        </button>
      </div>
    </>
  );
}
