import { formatNumber } from '@/lib/format';
import { asObjectArray } from '@/lib/ui/prop-guards';

export function normalizeBulkPricePreview(preview) {
  return {
    matched: asObjectArray(preview?.matched),
    unmatched: asObjectArray(preview?.unmatched),
  };
}

export function getBulkPricePreviewCounts(preview) {
  const { matched, unmatched } = normalizeBulkPricePreview(preview);
  return { matchedCount: matched.length, unmatchedCount: unmatched.length };
}

export function formatBulkPriceAmount(value) {
  return value != null ? `${formatNumber(value)}원` : '—';
}

export function getBulkPriceDeltaMeta({ oldPrice, newPrice }) {
  if (oldPrice == null) {
    return { label: '신규', color: 'var(--text-3)', strong: false };
  }

  const delta = Number(newPrice) - Number(oldPrice);
  if (!Number.isFinite(delta) || delta === 0) {
    return { label: '변동 없음', color: 'var(--text-3)', strong: false };
  }

  return {
    label: `${delta > 0 ? '+' : ''}${formatNumber(delta)}원`,
    color: delta > 0 ? 'var(--negative, #ef4444)' : 'var(--positive)',
    strong: true,
  };
}

export function getBulkPriceCommitButtonText({ matchedCount, committing }) {
  return committing ? '저장 중…' : `${matchedCount}개 단가 업데이트`;
}
