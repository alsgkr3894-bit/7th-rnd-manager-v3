import { describe, expect, test } from '@jest/globals';
import {
  backupSourceMetadataOf,
  buildBackupSourceMetadata,
  isBackupSourceMismatch,
} from '../../lib/backup/brand-source.js';
import { dbNameFor } from '../../lib/db/constants.js';

describe('backup brand source metadata', () => {
  test('백업 생성용 source brand metadata를 만든다', () => {
    expect(buildBackupSourceMetadata('pizza-lab')).toMatchObject({
      sourceBrandId: 'pizza-lab',
      sourceBrandName: 'pizza-lab',
      sourceDbName: dbNameFor('pizza-lab'),
      sharedDbName: dbNameFor('main'),
    });
  });

  test('구형 brandId/brandName metadata도 source metadata로 읽는다', () => {
    expect(
      backupSourceMetadataOf({
        brandId: 'main',
        brandName: '7번가피자',
      })
    ).toMatchObject({
      sourceBrandId: 'main',
      sourceBrandName: '7번가피자',
      hasSourceBrand: true,
    });
  });

  test('source와 target 브랜드가 다르면 mismatch로 표시한다', () => {
    expect(isBackupSourceMismatch({ sourceBrandId: 'main' }, 'brand-b')).toBe(true);
    expect(isBackupSourceMismatch({ sourceBrandId: 'main' }, 'main')).toBe(false);
    expect(isBackupSourceMismatch({}, 'main')).toBe(false);
  });
});
