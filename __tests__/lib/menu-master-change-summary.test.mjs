import { describe, expect, test } from '@jest/globals';
import { summarizeMenuMasterChange } from '../../lib/menu-master/change-summary.js';

describe('summarizeMenuMasterChange', () => {
  test('신규 등록 — mode가 insert면 항상 등록 문구', () => {
    expect(
      summarizeMenuMasterChange(null, { menuName: '슈퍼콤비 L', price: 19900 }, 'insert')
    ).toBe('등록: 슈퍼콤비 L');
  });

  test('previous가 없으면(예: 최초 저장) insert가 아니어도 등록으로 취급', () => {
    expect(
      summarizeMenuMasterChange(null, { menuName: '슈퍼콤비 L', price: 19900 }, 'update')
    ).toBe('등록: 슈퍼콤비 L');
  });

  test('판매가 변경 — 이전/이후 판매가를 화살표로 보여준다', () => {
    const prev = { menuName: '슈퍼콤비 L', price: 18900 };
    const next = { menuName: '슈퍼콤비 L', price: 19900 };
    expect(summarizeMenuMasterChange(prev, next, 'update')).toBe(
      '판매가 18,900→19,900: 슈퍼콤비 L'
    );
  });

  test('이름 변경 — 판매가가 그대로면 이름 변경 문구', () => {
    const prev = { menuName: '슈퍼콤비네이션 L', price: 19900 };
    const next = { menuName: '슈퍼콤비 L', price: 19900 };
    expect(summarizeMenuMasterChange(prev, next, 'update')).toBe(
      '이름 변경: 슈퍼콤비네이션 L→슈퍼콤비 L'
    );
  });

  test('판매가·이름 둘 다 그대로면 일반 수정 문구', () => {
    const prev = { menuName: '슈퍼콤비 L', price: 19900 };
    const next = { menuName: '슈퍼콤비 L', price: 19900 };
    expect(summarizeMenuMasterChange(prev, next, 'update')).toBe('수정: 슈퍼콤비 L');
  });

  test('판매가 변경이 이름 변경보다 우선한다(둘 다 바뀐 경우)', () => {
    const prev = { menuName: 'A', price: 1000 };
    const next = { menuName: 'B', price: 2000 };
    expect(summarizeMenuMasterChange(prev, next, 'update')).toBe('판매가 1,000→2,000: B');
  });

  test('가격이 null→값 또는 값→null이면 가격 변동으로 취급하지 않는다(수정 문구)', () => {
    const prev = { menuName: 'A', price: null };
    const next = { menuName: 'A', price: 1000 };
    expect(summarizeMenuMasterChange(prev, next, 'update')).toBe('수정: A');
  });
});
