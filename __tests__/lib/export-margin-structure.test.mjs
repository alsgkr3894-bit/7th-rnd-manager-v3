import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const marginExportSrc = readFileSync(resolve('lib/cost/margin/export.js'), 'utf-8');
const printWindowSrc = readFileSync(resolve('lib/print/window-print.js'), 'utf-8');

describe('원가마진표 XLSX 내보내기 구조 (P3 컬럼 고정)', () => {
  test('exportMarginExcel 함수가 존재한다', () => {
    expect(marginExportSrc).toContain('export async function exportMarginExcel');
  });

  test('워크북을 생성해 원가마진표 시트로 저장한다', () => {
    expect(marginExportSrc).toContain('loadXlsx');
    expect(marginExportSrc).toContain('XLSX.utils.book_new');
    expect(marginExportSrc).toContain('XLSX.utils.aoa_to_sheet');
    expect(marginExportSrc).toContain("appendMarginSheet(XLSX, wb, '원가마진표'");
    expect(marginExportSrc).toContain('XLSX.writeFile');
  });

  test('카테고리별 시트를 추가하고 엑셀 시트명 제한을 처리한다', () => {
    expect(marginExportSrc).toContain('groupRowsByCategory');
    expect(marginExportSrc).toContain('safeSheetName');
    expect(marginExportSrc).toContain('MAX_SHEET_NAME_LENGTH');
    expect(marginExportSrc).toContain(
      'for (const [category, categoryRows] of groupRowsByCategory(rows))'
    );
  });

  test('카테고리 시트는 피자 L/R, 사이드·1인피자 단일 규격만 출력한다', () => {
    expect(marginExportSrc).toContain("const LR_SIZE_LABELS = ['L', 'R']");
    expect(marginExportSrc).toContain("'1인피자'");
    expect(marginExportSrc).toContain("'사이드'");
    expect(marginExportSrc).toContain('buildCategorySheetModel');
    expect(marginExportSrc).toContain('isLrCategory(category)');
    expect(marginExportSrc).toContain('isSingleCategory(category)');
    expect(marginExportSrc).toContain('normalizeSingleSizeRows');
  });

  test('필수 헤더 컬럼(메뉴명·카테고리)이 고정 순서로 포함된다', () => {
    expect(marginExportSrc).toContain("'메뉴명'");
    expect(marginExportSrc).toContain("'카테고리'");
    // 메뉴명이 카테고리보다 먼저 나와야 한다
    const menuIdx = marginExportSrc.indexOf("'메뉴명'");
    const catIdx = marginExportSrc.indexOf("'카테고리'");
    expect(menuIdx).toBeLessThan(catIdx);
  });

  test('원가·판매가·원가율 컬럼이 sizeLabels 기반으로 동적 생성된다', () => {
    expect(marginExportSrc).toContain("sizeLabels.map(l => l + ' 원가')");
    expect(marginExportSrc).toContain("sizeLabels.map(l => l + ' 판매가')");
  });

  test('makeFileNameWithBrand를 사용해 브랜드명이 포함된 파일명을 생성한다', () => {
    expect(marginExportSrc).toContain('makeFileNameWithBrand');
    expect(marginExportSrc).toContain("'원가마진표'");
    expect(marginExportSrc).toContain("'xlsx'");
  });
});

describe('팝업 인쇄 차단 시 사용자 안내 (P3 출력 실패 안내)', () => {
  test('openPrintWindow가 팝업 차단 시 showToast로 사용자에게 안내한다', () => {
    expect(printWindowSrc).toContain('showToast');
    expect(printWindowSrc).toContain('팝업이 차단되었습니다');
  });

  test('openPrintWindow가 팝업 차단 시 false를 반환한다', () => {
    expect(printWindowSrc).toContain('return false');
  });

  test('openPrintWindow가 성공 시 true를 반환한다', () => {
    expect(printWindowSrc).toContain('return true');
  });
});
