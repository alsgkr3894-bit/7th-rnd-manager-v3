import { describe, expect, test } from '@jest/globals';
import { buildNutritionLabelPrintHtml } from '../../lib/nutrition/label/print.js';

describe('buildNutritionLabelPrintHtml', () => {
  test('통합 인쇄 HTML에 조각 기준 피자 페이지와 음료 용량 헤더를 포함한다', () => {
    const html = buildNutritionLabelPrintHtml({
      pizzaSheet: [],
      pizzaSliceSheet: [
        {
          menuName: '테스트 피자',
          rows: [{
            crustLabel: '석쇠',
            side: 'L',
            slice: 8,
            servingLabel: '1조각',
            weight: 100,
            kcal: 200,
            sugar: 10,
            protein: 20,
            satFat: 4,
            sodium: 300,
            allergen: '밀',
          }],
        },
      ],
      toppingSheet: [],
      sideSheet: [],
      setHalfSheet: [],
      beverageSheet: [{ menuName: '콜라', weight: 355, kcal: 140, sugar: 35, protein: 0, satFat: 0, sodium: 15, allergen: '' }],
    });

    expect(html).toContain('영양성분표 — 피자 (조각 기준)');
    expect(html).toContain('<th>조각수</th>');
    expect(html).toContain('<th>용량(ml)</th>');
    expect(html).toContain('테스트 피자');
  });

  test('메뉴명과 알레르기 텍스트를 HTML escape한다', () => {
    const html = buildNutritionLabelPrintHtml({
      pizzaSheet: [
        {
          menuName: '피자 <script>',
          rows: [{
            crustLabel: '석쇠',
            side: 'L',
            weight: 150,
            kcal: 250,
            sugar: 10,
            protein: 12,
            satFat: 5,
            sodium: 400,
            allergen: '밀 & 우유',
          }],
        },
      ],
      pizzaSliceSheet: [],
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

    expect(html).toContain('영양성분표 — 피자 (조각 기준)');
    expect(html).toContain('콜라');
    expect(html).toContain('<span class="dash">—</span>');
    expect(html).not.toContain('행 없음</td>');
  });
});
