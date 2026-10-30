import { describe, expect, test } from '@jest/globals';
import { withToday } from '../../app/note/market/marketUtils.js';

// 2026-10-30: 새 기록 기본 유형이 '시장조사'로 바뀐 뒤, 유형이 비어 있던 이전 기록을 고치기만 해도
// 유형이 '시장분석' → '시장조사'로 바뀌던 것을 막는다.
describe('시장조사 폼 — 이전 기록의 유형 유지', () => {
  test('유형이 비어 있던 저장된 기록을 고칠 때는 이전 기본 유형(시장분석)을 쓴다', () => {
    expect(withToday({ id: 7, title: '옛 기록', type: '' }).type).toBe('시장분석');
    expect(withToday({ id: 7, title: '옛 기록' }).type).toBe('시장분석');
  });

  test('새 기록은 새 기본 유형(시장조사)이다', () => {
    expect(withToday().type).toBe('시장조사');
    expect(withToday({}).type).toBe('시장조사');
  });

  test('유형이 있던 기록은 그대로다', () => {
    expect(withToday({ id: 3, type: '올해트렌드' }).type).toBe('올해트렌드');
  });
});
