/**
 * 파괴적 액션 실행함수 권한 가드(defense-in-depth) 구조 테스트.
 * 각 파괴적 함수가 assertActiveAdmin을 호출하는지, 저수준 프리미티브에는
 * 가드가 없는지를 소스 grep으로 검증한다. (role-gating-source.test.mjs 패턴)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

// 함수 본문 시작부터 다음 export(또는 EOF)까지 추출해 그 안에 가드 호출이 있는지 검사
function functionBody(source, fnName) {
  const start = source.indexOf(`function ${fnName}`);
  if (start === -1) return '';
  const after = source.indexOf('\nexport ', start + 1);
  return source.slice(start, after === -1 ? undefined : after);
}

describe('파괴적 액션 권한 가드', () => {
  test('식자재 삭제 함수가 assertActiveAdmin을 호출한다', () => {
    const s = src('lib/ingredient/store.js');
    expect(s).toContain("from '@/lib/auth/guard'");
    expect(functionBody(s, 'deleteIngredient')).toContain('assertActiveAdmin');
    expect(functionBody(s, 'bulkDeleteIngredients')).toContain('assertActiveAdmin');
  });

  test('저수준 DB 프리미티브(crud.js)에는 가드가 없다', () => {
    expect(src('lib/db/crud.js')).not.toContain('assertActiveAdmin');
  });
});
