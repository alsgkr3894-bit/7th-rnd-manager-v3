import { describe, expect, test } from '@jest/globals';
import { findStoreSchemaIssues } from '../../lib/backup/store-schema.js';
import { validateBackupPayload } from '../../lib/backup/validation.js';
import { DB_VERSION } from '../../lib/db/constants.js';

describe('저장소별 필수 값', () => {
  test('정상 행은 문제 없음, 설정 저장소는 key/flag로 본다', () => {
    expect(
      findStoreSchemaIssues({
        menu_master: [{ id: 1, menuCode: 'A', menuName: '가' }],
        menu_recipes: [{ id: 2, menuCode: 'A', components: [] }],
        settings: [{ key: 'theme' }],
        migration_flags: [{ flag: 'v1' }],
        menu_dev_notes: [{ id: 3 }],
      })
    ).toEqual([]);
  });

  test('빠진 값을 저장소·필드별 행 수로 알린다', () => {
    expect(
      findStoreSchemaIssues({
        menu_master: [
          { id: 1, menuCode: ' ', menuName: '가' },
          { menuCode: 'B', menuName: '나' },
        ],
        price_rows: [{ id: 1, fileId: '3', productCode: 'X' }],
      })
    ).toEqual([
      { store: 'menu_master', field: 'id', rows: 1 },
      { store: 'menu_master', field: 'menuCode', rows: 1 },
      { store: 'price_rows', field: 'fileId', rows: 1 },
    ]);
  });
});

describe('저장 구조 버전', () => {
  const backup = schemaVersion => ({
    version: 'v3',
    ...(schemaVersion ? { schemaVersion } : {}),
    stores: { menu_master: [{ id: 1, menuCode: 'A', menuName: '가' }] },
  });

  test('버전이 없는 예전 백업과 같은 버전은 받는다', () => {
    expect(validateBackupPayload(backup()).summary.schemaVersion).toBeNull();
    expect(validateBackupPayload(backup(DB_VERSION)).summary.schemaIssues).toEqual([]);
  });

  test('더 새로운 구조의 백업은 막는다', () => {
    expect(() => validateBackupPayload(backup(DB_VERSION + 1))).toThrow('더 새로운 앱');
  });
});
