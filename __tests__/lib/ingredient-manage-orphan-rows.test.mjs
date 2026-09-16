import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { isGhostIngredientMeta } from '../../lib/ingredient/normalize.js';

const src = readFileSync(resolve('app/ingredient/manage/useIngredientManageData.js'), 'utf8');

describe('고스트(코드·이름 모두 없는) 메타 행은 목록에서 숨긴다', () => {
  test('isGhostIngredientMeta — 코드도 이름도 비어 있을 때만 true', () => {
    expect(isGhostIngredientMeta({ productCode: '', ingredientName: '' })).toBe(true);
    expect(isGhostIngredientMeta({ productCode: '  ', ingredientName: ' \t' })).toBe(true);
    expect(isGhostIngredientMeta({ productCode: null, ingredientName: undefined })).toBe(true);
    expect(isGhostIngredientMeta({})).toBe(true);
    expect(isGhostIngredientMeta(null)).toBe(true);
    // 코드만 있거나 이름만 있으면 정상 행(orphan/jetteMissing 흐름이 처리)
    expect(isGhostIngredientMeta({ productCode: 'CC1', ingredientName: '' })).toBe(false);
    expect(isGhostIngredientMeta({ productCode: '', ingredientName: '수동 재료' })).toBe(false);
  });

  test('allMeta 로드 시점에 한 번 걸러 가격파일 유무 양쪽 분기와 참조 진단에 모두 적용된다', () => {
    expect(src).toContain("import { isGhostIngredientMeta } from '@/lib/ingredient/normalize'");
    expect(src).toContain(
      'getAllIngredients().then(list => list.filter(meta => !isGhostIngredientMeta(meta)))'
    );
  });
});

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
