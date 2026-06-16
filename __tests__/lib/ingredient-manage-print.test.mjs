import { describe, expect, test } from '@jest/globals';
import { buildIngredientManagePrintHtml } from '../../lib/ingredient/manage-print.js';

describe('ingredient manage print html', () => {
  test('현재 식자재 필터 결과를 PDF 출력 HTML로 만든다', () => {
    const html = buildIngredientManagePrintHtml(
      [
        {
          productCode: 'ING-001',
          ingredientName: '토마토소스',
          category: '소스류',
          scope: '범용',
          baseQuantity: 1000,
          baseUnitType: 'g',
          priceWithTax: 12000,
          origin: [{ displayName: '토마토', country: '국내산' }],
          allergens: ['대두', '밀'],
          manufacturer: '테스트제조',
          tags: ['소스', '피자'],
          jetteLinked: true,
        },
      ],
      {
        filters: { category: '소스류', tag: '피자', search: '토마토' },
        managedCount: 1,
        priceDate: '2026-06-16',
        totalCount: 3,
        title: '식자재관리',
      }
    );

    expect(html).toContain('식자재 관리 목록');
    expect(html).toContain('ING-001');
    expect(html).toContain('토마토소스');
    expect(html).toContain('분류: 소스류');
    expect(html).toContain('#피자');
    expect(html).toContain('검색: 토마토');
    expect(html).toContain('토마토 국내산');
    expect(html).toContain('대두, 밀');
    expect(html).toContain('window.print()');
  });

  test('HTML 특수문자를 escape한다', () => {
    const html = buildIngredientManagePrintHtml([
      {
        productCode: '<BAD>',
        ingredientName: '소스 & 치즈',
        category: 'A>B',
      },
    ]);

    expect(html).toContain('&lt;BAD&gt;');
    expect(html).toContain('소스 &amp; 치즈');
    expect(html).toContain('A&gt;B');
    expect(html).not.toContain('<BAD>');
  });
});
