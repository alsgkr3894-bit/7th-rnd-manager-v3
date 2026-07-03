import { describe, expect, test } from '@jest/globals';
import { buildNutritionLabelPrintHtml } from '../../lib/nutrition/label/print.js';

describe('buildNutritionLabelPrintHtml', () => {
  test('통합 인쇄 HTML에 포스터형 피자 표와 음료 용량 헤더를 포함한다', () => {
    const html = buildNutritionLabelPrintHtml({
      pizzaSheet: [
        {
          menuName: '테스트 피자 L',
          rows: [
            {
              crustLabel: '석쇠',
              side: 'L',
              weight: 150,
              kcal: 333,
              sugar: 12,
              protein: 21,
              fat: 5,
              sodium: 410,
              allergen: '밀',
            },
          ],
        },
      ],
      pizzaSliceSheet: [
        {
          menuName: '테스트 피자 L',
          rows: [
            {
              crustLabel: '석쇠',
              side: 'L',
              slice: 8,
              servingLabel: '1조각',
              weight: 100,
              kcal: 200,
              sugar: 10,
              protein: 20,
              fat: 4,
              sodium: 300,
              allergen: '밀',
            },
          ],
        },
      ],
      toppingSheet: [],
      sideSheet: [],
      setHalfSheet: [],
      beverageSheet: [
        {
          menuName: '콜라',
          weight: 355,
          kcal: 140,
          sugar: 35,
          protein: 0,
          fat: 0,
          sodium: 15,
          allergen: '',
        },
      ],
    });

    expect(html).not.toContain('Nutritive components &amp; Origin');
    expect(html).not.toContain('제품 영양성분 &amp; 원산지 정보');
    expect(html).not.toContain('background: #d21922');
    expect(html).toContain('<th colspan="12">150g 기준</th>');
    expect(html).toContain('<th colspan="16">조각 기준</th>');
    expect(html).toContain('<th colspan="2">열량(kcal/150g)</th>');
    expect(html).toContain('<th colspan="2">1회 조각수</th>');
    expect(html).toContain('<th>총량(ml)</th>');
    expect(html).toContain('333');
    expect(html).toContain('포화지방');
    expect(html).not.toContain('조지방');
    expect(html).toContain('테스트 피자');
    expect(html).not.toContain('테스트 피자 L</td>');
  });

  test('메뉴명과 알레르기 텍스트를 HTML escape한다', () => {
    const html = buildNutritionLabelPrintHtml({
      pizzaSheet: [],
      pizzaSliceSheet: [
        {
          menuName: '피자 <script>',
          rows: [
            {
              crustLabel: '석쇠',
              side: 'L',
              slice: 8,
              servingLabel: '1조각',
              weight: 150,
              kcal: 250,
              sugar: 10,
              protein: 12,
              fat: 5,
              sodium: 400,
              allergen: '밀 & 우유',
            },
          ],
        },
      ],
      toppingSheet: [],
      sideSheet: [],
      setHalfSheet: [],
      beverageSheet: [],
    });

    expect(html).toContain('피자 &lt;script&gt;');
    expect(html).toContain('밀 &amp; 우유');
    expect(html).not.toContain('피자 <script>');
  });

  test('배열이 아닌 시트와 잘못된 행은 빈 본문으로 안전하게 처리한다', () => {
    const html = buildNutritionLabelPrintHtml({
      pizzaSheet: null,
      pizzaSliceSheet: [{ menuName: '행 없음', rows: null }, 'bad'],
      toppingSheet: {},
      sideSheet: [],
      setHalfSheet: null,
      beverageSheet: [{ menuName: '콜라', weight: null, kcal: '', allergen: null }],
    });

    expect(html).not.toContain('Nutritive components &amp; Origin');
    expect(html).toContain('콜라');
    expect(html).toContain('>—</td>');
    expect(html).not.toContain('행 없음</td>');
  });
});
