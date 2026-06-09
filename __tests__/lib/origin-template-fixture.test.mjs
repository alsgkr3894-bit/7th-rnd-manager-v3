import { describe, expect, test } from '@jest/globals';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const TEMPLATE_PATH = fileURLToPath(new URL('../../public/templates/원산지_템플릿.xlsx', import.meta.url));

describe('origin template fixture', () => {
  test('원산지 템플릿 파일과 주요 시트 구조가 유지된다', () => {
    expect(existsSync(TEMPLATE_PATH)).toBe(true);

    const workbook = XLSX.readFile(TEMPLATE_PATH);

    expect(workbook.SheetNames).toEqual([
      '원산지정보',
      '원산지표지판',
      '원산지표지판 (냉장고부착용)',
    ]);
  });

  test('원산지 표지판 헤더가 실데이터 QA 기준과 맞는다', () => {
    const workbook = XLSX.readFile(TEMPLATE_PATH);
    const storeRows = XLSX.utils.sheet_to_json(workbook.Sheets['원산지표지판'], {
      header: 1,
      blankrows: false,
    });
    const fridgeRows = XLSX.utils.sheet_to_json(workbook.Sheets['원산지표지판 (냉장고부착용)'], {
      header: 1,
      blankrows: false,
    });

    expect(storeRows[1]).toEqual(['표시품목', '원산지', '메뉴명']);
    expect(fridgeRows[1]).toEqual(['음식명', '표시품목', '원산지']);
  });
});
