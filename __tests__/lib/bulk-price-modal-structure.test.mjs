import { describe, expect, test } from '@jest/globals';
import {
  formatBulkPriceAmount,
  getBulkPriceCommitButtonText,
  getBulkPriceDeltaMeta,
  getBulkPricePreviewCounts,
  normalizeBulkPricePreview,
} from '../../components/cost/ingredient-price/bulk-price/bulkPriceModalUtils.js';

describe('bulk price modal structure', () => {
  test('helpers keep preview counts, amount formatting, delta labels, and action text stable', () => {
    const preview = {
      matched: [
        { id: 1, productCode: 'A', oldPrice: 1000, newPrice: 1200 },
        { id: 2, productCode: 'B', oldPrice: null, newPrice: 700 },
      ],
      unmatched: [{ productCode: 'Z', newPrice: 900 }],
    };

    expect(normalizeBulkPricePreview(null)).toEqual({ matched: [], unmatched: [] });
    expect(getBulkPricePreviewCounts(preview)).toEqual({ matchedCount: 2, unmatchedCount: 1 });
    expect(formatBulkPriceAmount(null)).toBe('—');
    expect(formatBulkPriceAmount(1234)).toBe('1,234원');
    expect(getBulkPriceDeltaMeta({ oldPrice: null, newPrice: 1000 })).toMatchObject({
      label: '신규',
      strong: false,
    });
    expect(getBulkPriceDeltaMeta({ oldPrice: 1000, newPrice: 1200 })).toMatchObject({
      label: '+200원',
      strong: true,
    });
    expect(getBulkPriceDeltaMeta({ oldPrice: 1200, newPrice: 1000 })).toMatchObject({
      label: '-200원',
      strong: true,
    });
    expect(getBulkPriceDeltaMeta({ oldPrice: 1000, newPrice: 1000 })).toMatchObject({
      label: '변동 없음',
      strong: false,
    });
    expect(getBulkPriceCommitButtonText({ matchedCount: 2, committing: false })).toBe(
      '2개 단가 업데이트'
    );
    expect(getBulkPriceCommitButtonText({ matchedCount: 2, committing: true })).toBe('저장 중…');
  });
});
