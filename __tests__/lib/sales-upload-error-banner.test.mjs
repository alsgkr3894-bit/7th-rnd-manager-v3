import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const source = readFileSync(resolve('components/sales/UploadErrorBanner.jsx'), 'utf8');

describe('sales upload error CSV guard', () => {
  test('오류 CSV 다운로드 헤더와 파일명을 고정한다', () => {
    expect(source).toContain("const headers = ['행 번호', '오류 사유', '메뉴명', '값'];");
    expect(source).toContain("downloadCsv([headers, ...data], '업로드오류목록.csv')");
  });
});
