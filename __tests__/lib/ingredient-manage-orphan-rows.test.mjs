import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = readFileSync(resolve('app/ingredient/manage/useIngredientManageData.js'), 'utf8');

// isManual/isSeeded 게이트가 있으면 "제때 연동으로 만들어졌지만 최신 가격파일에서
// 코드가 사라진" 레코드가 관리 화면 어디에도 뜨지 않는다 — 단종 처리해도 대체 연결
// 버튼에 닿을 방법이 없어진다(회귀 방지).
describe('식자재관리 데이터 로드 — 사라진 제때 연동 레코드도 목록에 남긴다', () => {
  test('orphanMetaRows가 isManual/isSeeded로 걸러내지 않는다', () => {
    expect(src).not.toContain('(meta.isManual || meta.isSeeded) &&');
    expect(src).toContain('const orphanMetaRows = allMeta');
    expect(src).toContain(
      '.filter(meta => !meta.productCode || !priceCodeSet.has(meta.productCode))'
    );
  });

  test('코드가 있었는데 최신 파일에 없으면 jetteMissing으로 표시한다', () => {
    expect(src).toContain('buildMetaOnlyRow(meta, { jetteMissing: !!meta.productCode })');
  });

  test('가격파일이 아예 없을 때도 meta 레코드를 게이트 없이 보여준다', () => {
    expect(src).toContain(
      'rows: allMeta.map(meta => buildMetaOnlyRow(meta, { jetteMissing: false }))'
    );
  });
});
