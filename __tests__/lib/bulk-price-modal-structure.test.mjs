import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  formatBulkPriceAmount,
  getBulkPriceCommitButtonText,
  getBulkPriceDeltaMeta,
  getBulkPricePreviewCounts,
  normalizeBulkPricePreview,
} from '../../components/cost/ingredient-price/bulk-price/bulkPriceModalUtils.js';

const modalSource = readFileSync(
  resolve('components/cost/ingredient-price/BulkPriceModal.jsx'),
  'utf8'
);
const previewSource = readFileSync(
  resolve('components/cost/ingredient-price/bulk-price/BulkPricePreview.jsx'),
  'utf8'
);
const dropzoneSource = readFileSync(
  resolve('components/cost/ingredient-price/bulk-price/BulkPriceIdleDropzone.jsx'),
  'utf8'
);
const doneSource = readFileSync(
  resolve('components/cost/ingredient-price/bulk-price/BulkPriceDoneState.jsx'),
  'utf8'
);
const errorSource = readFileSync(
  resolve('components/cost/ingredient-price/bulk-price/BulkPriceErrorBanner.jsx'),
  'utf8'
);

describe('bulk price modal structure', () => {
  test('BulkPriceModal keeps flow orchestration and delegates visual states', () => {
    expect(modalSource).toContain('<BulkPriceFormatHint');
    expect(modalSource).toContain('<BulkPriceIdleDropzone');
    expect(modalSource).toContain('<BulkPriceParsingState');
    expect(modalSource).toContain('<BulkPricePreview');
    expect(modalSource).toContain('<BulkPriceDoneState');
    expect(modalSource).toContain('<BulkPriceErrorBanner');
    expect(modalSource).toContain('readSpreadsheetFile');
    expect(modalSource).toContain('commitBulkPrice');
    expect(modalSource).not.toContain('<UploadDropzone');
    expect(modalSource).not.toContain('<table');
    expect(modalSource).not.toContain('<details');
    expect(modalSource).not.toContain('function StatusBadge');
    expect(modalSource).not.toContain('function PriceDelta');
    expect(modalSource.split('\n').length).toBeLessThanOrEqual(160);

    expect(previewSource).toContain('export function BulkPricePreview');
    expect(previewSource).toContain('function BulkPriceMatchedTable');
    expect(previewSource).toContain('function BulkPriceUnmatchedDetails');
    expect(previewSource).toContain('업데이트 항목');
    expect(dropzoneSource).toContain('export function BulkPriceIdleDropzone');
    expect(dropzoneSource).toContain('<UploadDropzone');
    expect(doneSource).toContain('export function BulkPriceDoneState');
    expect(doneSource).toContain('단가 업데이트 완료');
    expect(errorSource).toContain('export function BulkPriceErrorBanner');
  });

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
