import { describe, expect, test } from '@jest/globals';
import { normalizeClickMaxAge, normalizeClickPoint } from '../../lib/ui/click-origin.js';

describe('normalizeClickPoint', () => {
  test('포인터 좌표와 타임스탬프를 숫자로 정규화한다', () => {
    expect(normalizeClickPoint({ clientX: '10', clientY: 20 }, 1000)).toEqual({
      x: 10,
      y: 20,
      t: 1000,
    });
  });

  test('비정상 포인터 좌표는 null로 처리한다', () => {
    expect(normalizeClickPoint({ clientX: Infinity, clientY: 20 }, 1000)).toBeNull();
    expect(normalizeClickPoint(null, 1000)).toBeNull();
  });
});

describe('normalizeClickMaxAge', () => {
  test('0 이상의 숫자형 값만 최근 클릭 허용 시간으로 사용한다', () => {
    expect(normalizeClickMaxAge(0)).toBe(0);
    expect(normalizeClickMaxAge('250')).toBe(250);
  });

  test('음수와 비정상 값은 fallback으로 복구한다', () => {
    expect(normalizeClickMaxAge(-1, 1500)).toBe(1500);
    expect(normalizeClickMaxAge('bad', 1500)).toBe(1500);
  });
});
