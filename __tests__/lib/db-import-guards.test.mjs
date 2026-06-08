import { describe, expect, test } from '@jest/globals';
import { importAll } from '../../lib/db/operations.js';

describe('importAll 구조 방어', () => {
  test('store 값이 배열이 아니면 복원을 건너뛰고 오류로 보고한다', async () => {
    const result = await importAll({ stores: { settings: {} } });

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([
      { store: 'settings', error: 'store 데이터가 배열이 아닙니다.' },
    ]);
  });

  test('store 배열에 객체가 아닌 레코드가 있으면 해당 store 복원을 건너뛴다', async () => {
    const result = await importAll({ stores: { settings: [{ id: 'ok' }, null, 'bad'] } });

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([
      { store: 'settings', error: 'store 레코드가 객체가 아닙니다. index: 1, 2' },
    ]);
  });
});
