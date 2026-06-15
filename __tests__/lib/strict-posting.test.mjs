import { describe, expect, test } from '@jest/globals';
import {
  buildStrictPostingMessage,
  collectStrictPostingIssues,
} from '@/lib/report/strict-posting';

describe('strict posting guards', () => {
  test('수량은 있는데 단가가 없는 구성품만 발행 차단 대상으로 수집한다', () => {
    const issues = collectStrictPostingIssues([
      {
        menuCode: 'P-001-L',
        menuName: '테스트 피자',
        size: 'L',
        categoryLabel: '피자',
        components: [
          { productCode: 'OK', ingredientName: '수동단가', quantity: 10, unitPrice: 2.5 },
          { productCode: 'NO', ingredientName: '단가누락', quantity: 5, unitPrice: null },
          { productCode: 'ZERO-QTY', ingredientName: '수량없음', quantity: 0, unitPrice: null },
        ],
      },
      null,
    ]);

    expect(issues).toEqual([
      {
        menuCode: 'P-001-L',
        menuName: '테스트 피자',
        size: 'L',
        categoryLabel: '피자',
        productCode: 'NO',
        ingredientName: '단가누락',
        quantity: 5,
        unit: 'g',
        reason: '단가 없음',
      },
    ]);
  });

  test('사용자 메시지는 대표 항목과 남은 건수를 요약한다', () => {
    const message = buildStrictPostingMessage(
      [
        { menuName: 'A', ingredientName: '치즈' },
        { menuName: 'B', ingredientName: '소스' },
        { menuName: 'C', ingredientName: '토핑' },
      ],
      2
    );

    expect(message).toBe('미연동 재료 3건이 있어 보고서 생성을 막았습니다: A/치즈, B/소스 외 1건');
  });
});
