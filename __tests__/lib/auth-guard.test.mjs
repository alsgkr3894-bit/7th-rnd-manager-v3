import { beforeEach, describe, expect, jest, test } from '@jest/globals';

let role = 'viewer';

jest.unstable_mockModule('@/lib/auth/accounts', () => ({
  getActiveRole: jest.fn(async () => role),
}));

const { assertActiveAdmin, PermissionDeniedError } = await import('../../lib/auth/guard.js');

describe('assertActiveAdmin', () => {
  beforeEach(() => {
    role = 'viewer';
  });

  test('viewer면 PermissionDeniedError를 throw한다', async () => {
    role = 'viewer';
    await expect(assertActiveAdmin('계정 삭제')).rejects.toThrow(/관리자만/);
    await expect(assertActiveAdmin('계정 삭제')).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  test('admin이면 통과한다 (undefined resolve)', async () => {
    role = 'admin';
    await expect(assertActiveAdmin('계정 삭제')).resolves.toBeUndefined();
  });

  test('PermissionDeniedError는 code=PERMISSION_DENIED와 라벨을 담는다', async () => {
    role = 'viewer';
    try {
      await assertActiveAdmin('데이터 복원');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PermissionDeniedError);
      expect(err.code).toBe('PERMISSION_DENIED');
      expect(err.message).toContain('데이터 복원');
    }
  });
});
