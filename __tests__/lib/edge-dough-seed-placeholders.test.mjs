import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  EDGE_DOUGH_SEED,
  edgeSeedKey,
  missingEdgeSeedRows,
  seedPlaceholderEdges,
} from '../../lib/cost/edge-dough/template.js';

const edgeCardSource = readFileSync(resolve('components/cost/edge-dough/EdgeCard.jsx'), 'utf8');
const edgeRowSource = readFileSync(
  resolve('components/cost/edge-dough/EdgeComponentRow.jsx'),
  'utf8'
);
const commonEdgesSource = readFileSync(
  resolve('components/cost/manage/CommonEdgesView.jsx'),
  'utf8'
);

describe('edge dough seed placeholders', () => {
  test('thin dough L is part of the required master seed and is detected when missing', () => {
    expect(EDGE_DOUGH_SEED.map(edgeSeedKey)).toContain('씬도우|L');

    const existingWithoutThin = EDGE_DOUGH_SEED.filter(seed => seed.edgeType !== '씬도우');
    const missing = missingEdgeSeedRows(existingWithoutThin);

    expect(missing).toEqual([
      expect.objectContaining({
        edgeType: '씬도우',
        size: 'L',
        edgeCode: 'ED-TH-L',
      }),
    ]);
  });

  test('missing seed rows are rendered as non-persisted placeholders', () => {
    const placeholders = seedPlaceholderEdges([]);

    expect(placeholders).toHaveLength(EDGE_DOUGH_SEED.length);
    expect(placeholders).toContainEqual(
      expect.objectContaining({
        edgeType: '씬도우',
        size: 'L',
        __seedPlaceholder: true,
        __key: 'seed:씬도우|L',
      })
    );
    expect(placeholders.some(edge => Object.prototype.hasOwnProperty.call(edge, 'id'))).toBe(false);
  });

  test('edge management UI exposes missing seeds without making them selectable for delete', () => {
    expect(commonEdgesSource).toContain('seedPlaceholderEdges(edges)');
    expect(commonEdgesSource).toContain('기본 ${missingSeedCount}개 미등록');
    expect(commonEdgesSource).toContain('!edge.__seedPlaceholder && edge.id != null');
    expect(edgeCardSource).toContain('미등록 시드');
  });

  test('edge cards and component rows display computed zero or negative amounts', () => {
    expect(edgeCardSource).toContain('hasDisplayableTotal');
    expect(edgeCardSource).toContain('total < 0');
    expect(edgeCardSource).toContain('{hasDisplayableTotal ? (');
    expect(edgeCardSource).not.toContain('{total > 0 ? (');

    expect(edgeRowSource).toContain('hasSubtotal');
    expect(edgeRowSource).toContain('{hasSubtotal ? `${formatNumber(Math.round(subtotal))}원` :');
    expect(edgeRowSource).not.toContain('subtotal !== 0');
  });
});
