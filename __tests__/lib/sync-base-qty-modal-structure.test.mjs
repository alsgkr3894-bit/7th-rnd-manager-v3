import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  priceFileLabel,
  syncApplyButtonLabel,
  syncSummaryItems,
  syncSummaryToneStyle,
} from '../../components/cost/ingredient-price/sync-base-qty/syncBaseQtyModalUtils.js';

const modalSource = readFileSync(
  resolve('components/cost/ingredient-price/SyncBaseQtyModal.jsx'),
  'utf8'
);
const noticeSource = readFileSync(
  resolve('components/cost/ingredient-price/sync-base-qty/SyncBaseQtyNotice.jsx'),
  'utf8'
);
const pickSource = readFileSync(
  resolve('components/cost/ingredient-price/sync-base-qty/SyncBaseQtyPickStep.jsx'),
  'utf8'
);
const previewSource = readFileSync(
  resolve('components/cost/ingredient-price/sync-base-qty/SyncBaseQtyPreview.jsx'),
  'utf8'
);
const doneSource = readFileSync(
  resolve('components/cost/ingredient-price/sync-base-qty/SyncBaseQtyDone.jsx'),
  'utf8'
);
const errorSource = readFileSync(
  resolve('components/cost/ingredient-price/sync-base-qty/SyncBaseQtyError.jsx'),
  'utf8'
);

describe('sync base quantity modal structure', () => {
  test('modal delegates notice, pick, preview, done, and error rendering', () => {
    expect(modalSource).toContain('<SyncBaseQtyNotice');
    expect(modalSource).toContain('<SyncBaseQtyPickStep');
    expect(modalSource).toContain('<SyncBaseQtyPreview');
    expect(modalSource).toContain('<SyncBaseQtyDone');
    expect(modalSource).toContain('<SyncBaseQtyError');
    expect(modalSource).toContain('buildSyncPlan');
    expect(modalSource).toContain('applySyncPlan');
    expect(modalSource).not.toContain('<Icon.check');
    expect(modalSource).not.toContain('formatNumber');
    expect(modalSource).not.toContain('업데이트 항목');
    expect(modalSource).not.toContain('제때 단가 파일 선택');
    expect(modalSource.split('\n').length).toBeLessThanOrEqual(160);

    expect(noticeSource).toContain('export function SyncBaseQtyNotice');
    expect(noticeSource).toContain('기준수량(포장단위)');
    expect(pickSource).toContain('export function SyncBaseQtyPickStep');
    expect(pickSource).toContain('제때 단가 파일 선택');
    expect(previewSource).toContain('export function SyncBaseQtyPreview');
    expect(previewSource).toContain('function ChangesTable');
    expect(previewSource).toContain('업데이트 항목');
    expect(doneSource).toContain('export function SyncBaseQtyDone');
    expect(errorSource).toContain('export function SyncBaseQtyError');
  });

  test('display helpers keep labels and summary badges stable', () => {
    const plan = { changes: [{}, {}], unchanged: 3, unmatched: 4, unsupported: 5 };

    expect(priceFileLabel({ id: 3 })).toBe('파일 #3');
    expect(priceFileLabel({ fileName: '단가.xlsx', updateDate: '2026-06-01' })).toBe(
      '단가.xlsx (2026-06-01)'
    );
    expect(syncSummaryItems(plan).map(item => item.label)).toEqual([
      '2 변경',
      '3 동일',
      '4 미매칭',
      '5 단위 미확정',
    ]);
    expect(syncApplyButtonLabel(plan, false)).toBe('2개 기준수량 업데이트');
    expect(syncApplyButtonLabel({ changes: [] }, false)).toBe('변경 없음');
    expect(syncApplyButtonLabel(plan, true)).toBe('저장 중…');
    expect(syncSummaryToneStyle('warn').color).toBe('var(--warn)');
  });
});
