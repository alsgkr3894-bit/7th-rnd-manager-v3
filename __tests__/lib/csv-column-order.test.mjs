import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LABEL_COLS } from '../../lib/nutrition/label/_utils.js';

const allSummarySrc = readFileSync(resolve('app/cost/all-summary/allSummaryUtils.js'), 'utf-8');
const marginSrc = readFileSync(resolve('lib/cost/margin/export.js'), 'utf-8');
const reportListSrc = readFileSync(resolve('lib/report/report-list-utils.js'), 'utf-8');
const labelExportSrc = readFileSync(resolve('lib/nutrition/label/export.js'), 'utf-8');

describe('CSV/XLSX 컬럼 순서 고정', () => {
  test('전메뉴원가종합 CSV: 메뉴명→카테고리→원가→판매가→원가율 순서', () => {
    const idx = (col) => allSummarySrc.indexOf(col);
    expect(idx('메뉴명')).toBeLessThan(idx('카테고리'));
    expect(idx('카테고리')).toBeLessThan(idx('원가'));
    expect(idx('원가')).toBeLessThan(idx('판매가'));
    expect(idx('판매가')).toBeLessThan(idx('원가율'));
  });

  test('전메뉴원가종합 CSV: 헤더 5개가 배열 리터럴로 정의됨', () => {
    expect(allSummarySrc).toContain("['메뉴명', '카테고리', '원가', '판매가', '원가율']");
  });

  test('원가마진표 CSV: 메뉴명이 첫 번째 컬럼', () => {
    expect(marginSrc).toMatch(/headers\s*=\s*\[\s*['"]메뉴명['"]/);
  });

  test('원가마진표 CSV: 카테고리가 두 번째 컬럼', () => {
    // 배열에서 메뉴명 다음에 카테고리가 위치함
    const menuIdx = marginSrc.indexOf("'메뉴명'");
    const catIdx = marginSrc.indexOf("'카테고리'");
    expect(menuIdx).toBeGreaterThan(-1);
    expect(catIdx).toBeGreaterThan(menuIdx);
  });

  test('보고서 목록 XLSX: ID·유형·제목·대상기간·작성자·생성일 포함', () => {
    expect(reportListSrc).toContain("ID:");
    expect(reportListSrc).toContain("유형:");
    expect(reportListSrc).toContain("제목:");
    expect(reportListSrc).toContain("작성자:");
    expect(reportListSrc).toContain("생성일:");
    expect(reportListSrc).toContain("조회수:");
    expect(reportListSrc).toContain("즐겨찾기:");
  });

  test('영양성분표 LABEL_COLS: 1회중량→열량→당류→단백질→조지방→나트륨 순서', () => {
    const keys = LABEL_COLS.map(c => c.key);
    expect(keys).toEqual(['weight', 'kcal', 'sugar', 'protein', 'fat', 'sodium']);
  });

  test('영양성분표 엑셀: 피자 시트 메뉴명→크러스트→사이드→HEADERS→함유알레르기 순서', () => {
    expect(labelExportSrc).toContain("['메뉴명', '크러스트', '사이드', ...HEADERS, '함유알레르기']");
  });

  test('영양성분표 엑셀: 사이드 시트 메뉴명→HEADERS→함유알레르기 순서', () => {
    expect(labelExportSrc).toContain("['메뉴명', ...HEADERS, '함유알레르기']");
  });

  test('makeFileNameWithBrand 헬퍼가 download.js에서 export됨', () => {
    const downloadSrc = readFileSync(resolve('lib/download.js'), 'utf-8');
    expect(downloadSrc).toContain('export function makeFileNameWithBrand');
  });
});
