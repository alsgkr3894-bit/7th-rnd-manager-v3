import { describe, expect, test } from '@jest/globals';
import { getTouchDistance, normalizePinchScale } from '../../hooks/usePinchZoom.js';

describe('getTouchDistance', () => {
  test('두 터치 사이의 거리를 계산한다', () => {
    expect(getTouchDistance([{ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 }])).toBe(5);
  });

  test('터치가 부족하거나 거리가 0이면 null을 반환한다', () => {
    expect(getTouchDistance([{ clientX: 0, clientY: 0 }])).toBeNull();
    expect(getTouchDistance([{ clientX: 1, clientY: 1 }, { clientX: 1, clientY: 1 }])).toBeNull();
  });
});

describe('normalizePinchScale', () => {
  test('핀치 배율을 1과 4 사이로 제한한다', () => {
    expect(normalizePinchScale(2, 300, 100)).toBe(4);
    expect(normalizePinchScale(2, 25, 100)).toBe(1);
  });

  test('비정상 거리값은 기본 배율로 복구한다', () => {
    expect(normalizePinchScale(2, 100, 0)).toBe(1);
    expect(normalizePinchScale(2, Infinity, 100)).toBe(1);
  });
});
