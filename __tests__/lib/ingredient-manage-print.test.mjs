import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildIngredientManagePrintHtml,
  buildIngredientPhotoCardHtml,
} from '../../lib/ingredient/manage-print.js';

const facadeSource = readFileSync(resolve('lib/ingredient/manage-print.js'), 'utf8');
const formattersSource = readFileSync(resolve('lib/ingredient/manage-print/formatters.js'), 'utf8');
const tableSource = readFileSync(resolve('lib/ingredient/manage-print/table-report.js'), 'utf8');
const photoSource = readFileSync(resolve('lib/ingredient/manage-print/photo-report.js'), 'utf8');

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

  test('사진 카드 출력은 scope 순서와 페이지당 2개 레이아웃을 유지한다', () => {
    const html = buildIngredientPhotoCardHtml(
      [
        {
          productCode: 'B',
          ingredientName: '범용재료',
          scope: '범용',
          photos: [{ type: 'packaging', data: 'data:image/png;base64,b' }],
        },
        {
          productCode: 'A',
          ingredientName: '전용재료',
          scope: '전용',
          photos: [{ type: 'detail', data: 'data:image/png;base64,a' }],
        },
        {
          productCode: 'C',
          ingredientName: '미지정재료',
          scope: '',
        },
      ],
      { filters: { category: 'all' }, totalCount: 3, priceDate: '2026-06-16' }
    );

    expect(html).toContain('식자재 관리 목록 (사진)');
    expect(html).toContain('포장사진');
    expect(html).toContain('상세정보');
    expect(html).toContain('scope-jeonhyong');
    expect(html).toContain('scope-beomyong');
    expect(html).toContain('page break');
    expect(html.indexOf('전용재료')).toBeLessThan(html.indexOf('범용재료'));
    expect(html).toContain('Promise.all(waits)');
  });

  test('manage-print facade delegates table, photo, and formatter responsibilities', () => {
    expect(facadeSource).toContain("from './manage-print/table-report'");
    expect(facadeSource).toContain("from './manage-print/photo-report'");
    expect(facadeSource).not.toContain('buildIngredientManageTableRows');
    expect(facadeSource).not.toContain('buildIngredientPhotoCardPages');

    expect(formattersSource).toContain('export function rowName');
    expect(formattersSource).toContain('export function unitLabel');
    expect(formattersSource).toContain('export function filterLabel');
    expect(formattersSource).toContain('export function scopeBadgeHtml');
    expect(formattersSource).toContain('ALLERGEN_SEED');

    expect(tableSource).toContain('export function buildIngredientManagePrintHtml');
    expect(tableSource).toContain('export function buildIngredientManageTableRows');
    expect(tableSource).toContain('buildIngredientManagePrintMeta');
    expect(tableSource).toContain('getPrimaryIngredientPhoto');

    expect(photoSource).toContain('export function buildIngredientPhotoCardHtml');
    expect(photoSource).toContain('export function buildIngredientPhotoCardPages');
    expect(photoSource).toContain('export function sortIngredientPhotoRowsByScope');
    expect(photoSource).toContain('getIngredientPhoto');
  });
});
