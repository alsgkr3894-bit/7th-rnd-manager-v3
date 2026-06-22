import { describe, expect, test } from '@jest/globals';
import { normalizeCostUploadLogRetentionDays } from '../../lib/cost/shared/store.js';

describe('cost upload log retention guards', () => {
  test('정상 보관일은 0 이상 정수로 정규화한다', () => {
    expect(normalizeCostUploadLogRetentionDays(0)).toBe(0);
    expect(normalizeCostUploadLogRetentionDays(30.8)).toBe(30);
    expect(normalizeCostUploadLogRetentionDays('45')).toBe(45);
  });

  test('음수·비정상 보관일은 기본 90일로 닫는다', () => {
    expect(normalizeCostUploadLogRetentionDays(-1)).toBe(90);
    expect(normalizeCostUploadLogRetentionDays('bad')).toBe(90);
    expect(normalizeCostUploadLogRetentionDays(Infinity)).toBe(90);
  });
});
