'use client';

import { formatNumber } from '@/lib/format';
import {
  formatBulkPriceAmount,
  getBulkPriceCommitButtonText,
  getBulkPriceDeltaMeta,
  normalizeBulkPricePreview,
} from './bulkPriceModalUtils';

function StatusBadge({ count, color, label }) {
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
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
      }}
    >
      {count} {label}
    </span>
  );
}

function PriceDelta({ oldPrice, newPrice }) {
  const meta = getBulkPriceDeltaMeta({ oldPrice, newPrice });

  return (
    <span style={{ color: meta.color, fontWeight: meta.strong ? 600 : 400, fontSize: meta.strong ? 12 : 11 }}>
      {meta.label}
    </span>
  );
}

function BulkPricePreviewSummary({ fileName, matchedCount, unmatchedCount }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        marginBottom: 12,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{fileName}</span>
      <StatusBadge count={matchedCount} color="var(--accent)" label="매칭" />
      <StatusBadge count={unmatchedCount} color="var(--text-3)" label="미매칭" />
      {matchedCount > 0 && (
        <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>
          매칭된 항목의 <b>priceOverride</b> 필드를 업데이트합니다
        </span>
      )}
    </div>
  );
}

function BulkPriceMatchedTable({ matched }) {
  if (matched.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>
        업데이트 항목 ({matched.length}개)
      </div>
      <div
        style={{
          overflowX: 'auto',
          maxHeight: 320,
          overflowY: 'auto',
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}
      >
        <table className="data-table" style={{ minWidth: 480 }}>
          <thead>
            <tr>
              <th style={{ width: 90 }}>제품코드</th>
              <th>재료명</th>
              <th style={{ width: 110, textAlign: 'right' }}>현재 단가</th>
              <th style={{ width: 110, textAlign: 'right' }}>새 단가</th>
              <th style={{ width: 100, textAlign: 'right' }}>변동</th>
            </tr>
          </thead>
          <tbody>
            {matched.map(item => (
              <tr key={item.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.productCode}</td>
                <td style={{ fontSize: 13 }}>{item.name}</td>
                <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-3)' }}>
                  {formatBulkPriceAmount(item.oldPrice)}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                  {formatBulkPriceAmount(item.newPrice)}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <PriceDelta oldPrice={item.oldPrice} newPrice={item.newPrice} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BulkPriceUnmatchedDetails({ unmatched }) {
  if (unmatched.length === 0) return null;

  return (
    <details style={{ marginBottom: 12 }}>
      <summary
        style={{
          fontSize: 12,
          color: 'var(--text-3)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        마스터에 없는 항목 {unmatched.length}개 (클릭하여 펼치기)
      </summary>
      <div
        style={{
          marginTop: 8,
          padding: '8px 12px',
          background: 'var(--surface-2)',
          borderRadius: 6,
          fontSize: 12,
        }}
      >
        {unmatched.map((item, index) => (
          <div key={index} style={{ color: 'var(--text-3)', lineHeight: 1.8 }}>
            <span style={{ fontFamily: 'monospace' }}>{item.productCode}</span>
            {' — '}
            {formatNumber(item.newPrice)}원
          </div>
        ))}
      </div>
    </details>
  );
}

function BulkPriceNoMatches() {
  return (
    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
      마스터에 매칭되는 항목이 없습니다. 다른 파일을 선택하거나 제품코드를 확인하세요.
    </div>
  );
}

function BulkPricePreviewActions({ matchedCount, committing, onReset, onCommit }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
      <button className="btn" onClick={onReset} disabled={committing}>
        다시 선택
      </button>
      <button
        className="btn primary"
        onClick={onCommit}
        disabled={committing || matchedCount === 0}
      >
        {getBulkPriceCommitButtonText({ matchedCount, committing })}
      </button>
    </div>
  );
}

export function BulkPricePreview({ fileName, preview, committing, onReset, onCommit }) {
  const { matched, unmatched } = normalizeBulkPricePreview(preview);

  return (
    <>
      <BulkPricePreviewSummary
        fileName={fileName}
        matchedCount={matched.length}
        unmatchedCount={unmatched.length}
      />
      <BulkPriceMatchedTable matched={matched} />
      <BulkPriceUnmatchedDetails unmatched={unmatched} />
      {matched.length === 0 && <BulkPriceNoMatches />}
      <BulkPricePreviewActions
        matchedCount={matched.length}
        committing={committing}
        onReset={onReset}
        onCommit={onCommit}
      />
    </>
  );
}
