import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LABEL_COLS } from '../../lib/nutrition/label/_utils.js';

const allSummarySrc = readFileSync(resolve('app/cost/all-summary/allSummaryUtils.js'), 'utf-8');
const marginSrc = readFileSync(resolve('lib/cost/margin/export-rows.js'), 'utf-8');
const reportListSrc = readFileSync(resolve('lib/report/report-list-utils.js'), 'utf-8');
const labelExportSrc = readFileSync(resolve('lib/nutrition/label/export.js'), 'utf-8');

describe('CSV/XLSX 컬럼 순서 고정', () => {
  test('전메뉴원가종합 CSV: 메뉴명→카테고리→원가→판매가→원가율 순서', () => {
    const idx = col => allSummarySrc.indexOf(col);
    expect(idx('메뉴명')).toBeLessThan(idx('카테고리'));
    expect(idx('카테고리')).toBeLessThan(idx('원가'));
    expect(idx('원가')).toBeLessThan(idx('판매가'));
    expect(idx('판매가')).toBeLessThan(idx('원가율'));
  });

  test('전메뉴원가종합 CSV: 헤더 5개가 배열 리터럴로 정의됨', () => {
    expect(allSummarySrc).toContain("['메뉴명', '카테고리', '원가', '판매가', '원가율']");
  });

  test('원가마진표 XLSX: 카테고리가 첫 번째 컬럼', () => {
    expect(marginSrc).toMatch(/headers\s*=\s*\[\s*['"]카테고리['"]/);
  });

  test('원가마진표 XLSX: 메뉴명이 두 번째 컬럼', () => {
    // 배열에서 카테고리 다음에 메뉴명이 위치함
    const menuIdx = marginSrc.indexOf("'메뉴명'");
    const catIdx = marginSrc.indexOf("'카테고리'");
    expect(catIdx).toBeGreaterThan(-1);
    expect(menuIdx).toBeGreaterThan(catIdx);
  });

  test('보고서 목록 XLSX: ID·유형·제목·대상기간·작성자·생성일 포함', () => {
    expect(reportListSrc).toContain('ID:');
    expect(reportListSrc).toContain('유형:');
    expect(reportListSrc).toContain('제목:');
    expect(reportListSrc).toContain('작성자:');
    expect(reportListSrc).toContain('생성일:');
    expect(reportListSrc).toContain('조회수:');
    expect(reportListSrc).toContain('즐겨찾기:');
  });

  test('영양성분표 LABEL_COLS: 1회중량→열량→당류→단백질→포화지방→나트륨 순서', () => {
    const keys = LABEL_COLS.map(c => c.key);
    expect(keys).toEqual(['weight', 'kcal', 'sugar', 'protein', 'fat', 'sodium']);
  });

  // 2026-09-22 단일 시트 양식(통합 문서3.xlsx): Pizza 블록은 Pizza(메뉴·크러스트 2열) → 영양 그룹
  // L/R 쌍 → 함유 알레르기, 단순 표는 제목(=메뉴명 열) → 영양 컬럼 → 함유 알레르기 순서.
  test('영양성분표 엑셀: Pizza 블록 메뉴·크러스트→영양 그룹(L/R)→함유알레르기 순서', () => {
    const pizzaIdx = labelExportSrc.indexOf("['Pizza', ''");
    const groupIdx = labelExportSrc.indexOf('...groups.flatMap(g => [g.label');
    const allergenIdx = labelExportSrc.indexOf('ALLERGEN_HEADER]');

    expect(pizzaIdx).toBeGreaterThan(-1);
    expect(pizzaIdx).toBeLessThan(groupIdx);
    expect(groupIdx).toBeLessThan(allergenIdx);
  });

  test('영양성분표 엑셀: 일반 표 제목→영양 컬럼→함유알레르기 순서', () => {
    expect(labelExportSrc).toContain(
      '[title, ...cols.map(col => col.label), ...(allergen ? [ALLERGEN_HEADER] : [])]'
    );
  });

  test('makeFileNameWithBrand 헬퍼가 download.js에서 export됨', () => {
    const downloadSrc = readFileSync(resolve('lib/download.js'), 'utf-8');
    expect(downloadSrc).toContain('export function makeFileNameWithBrand');
  });
});
