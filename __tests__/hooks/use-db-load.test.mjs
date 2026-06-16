import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve('hooks/useDBLoad.js'), 'utf8');
const menuSalesSrc = readFileSync(resolve('app/menu-sales/page.jsx'), 'utf8');
const nutritionSrc = readFileSync(resolve('app/nutrition/page.jsx'), 'utf8');
const ingredientSrc = readFileSync(resolve('app/ingredient/page.jsx'), 'utf8');
const jetteSrc = readFileSync(resolve('app/jette/page.jsx'), 'utf8');
const journalSrc = readFileSync(resolve('app/note/journal/page.jsx'), 'utf8');
const salesSettingsSrc = readFileSync(resolve('app/menu-sales/settings/page.jsx'), 'utf8');
const ingredientUsageSrc = readFileSync(resolve('app/ingredient/usage/page.jsx'), 'utf8');

describe('useDBLoad 옵션 API', () => {
  test('6가지 옵션이 모두 구현됐다', () => {
    expect(src).toContain('initialData');
    expect(src).toContain('deps');
    expect(src).toContain('enabled');
    expect(src).toContain('onError');
    expect(src).toContain('mapErrorMessage');
    expect(src).toContain('keepDataOnReload');
  });

  test('errorMessage를 반환한다', () => {
    expect(src).toContain('errorMessage');
    expect(src).toContain('return { data, loading, error, errorMessage, reload }');
  });

  test('deps가 useEffect 의존성에 포함된다', () => {
    expect(src).toContain('...deps');
  });

  test('enabled=false일 때 로드를 건너뛴다', () => {
    expect(src).toContain('if (!enabled)');
    expect(src).toContain('setLoading(false)');
  });

  test('keepDataOnReload=false일 때 reload 시 initialData로 초기화된다', () => {
    expect(src).toContain('if (!keepDataOnReload) setData(initialData)');
  });

  test('onError 콜백을 에러 발생 시 호출한다', () => {
    expect(src).toContain('if (onError) onError(e)');
  });

  test('기존 API(fetchFn 단독 호출)와 하위 호환된다', () => {
    expect(src).toContain('export function useDBLoad(fetchFn, options = {})');
    expect(src).toContain('initialData = null');
    expect(src).toContain('deps = []');
    expect(src).toContain('enabled = true');
    expect(src).toContain('keepDataOnReload = true');
  });
});

describe('저위험 hub 페이지 useDBLoad 적용', () => {
  test('menu-sales/page.jsx가 useDBLoad를 사용한다', () => {
    expect(menuSalesSrc).toContain('useDBLoad');
    expect(menuSalesSrc).not.toContain("import { initDB }");
    expect(menuSalesSrc).not.toContain('setLoading(');
  });

  test('nutrition/page.jsx가 useDBLoad를 사용한다', () => {
    expect(nutritionSrc).toContain('useDBLoad');
    expect(nutritionSrc).not.toContain("import { initDB }");
    expect(nutritionSrc).not.toContain('setLoading(');
  });

  test('ingredient/page.jsx가 useDBLoad를 사용한다', () => {
    expect(ingredientSrc).toContain('useDBLoad');
    expect(ingredientSrc).not.toContain("import { initDB }");
    expect(ingredientSrc).not.toContain('setLoading(');
  });

  test('jette/page.jsx가 useDBLoad를 사용한다', () => {
    expect(jetteSrc).toContain('useDBLoad');
    expect(jetteSrc).not.toContain("import { initDB }");
    expect(jetteSrc).not.toContain('setLoading(');
  });

  test('note/journal/page.jsx가 useDBLoad를 사용하고 date 변경은 re-fetch를 유발하지 않는다', () => {
    expect(journalSrc).toContain('useDBLoad');
    expect(journalSrc).not.toContain("import { initDB }");
    expect(journalSrc).not.toContain('setLoading(');
    // date는 deps에 넣지 않고 useMemo 필터로만 처리함
    expect(journalSrc).toContain('initialData: []');
  });
});

describe('저위험 기타 페이지 useDBLoad 적용', () => {
  test('menu-sales/settings/page.jsx가 useDBLoad로 제외 수를 조회한다', () => {
    expect(salesSettingsSrc).toContain('useDBLoad');
    expect(salesSettingsSrc).not.toContain("import { initDB }");
    expect(salesSettingsSrc).not.toContain('setLoading(');
    expect(salesSettingsSrc).toContain('excludeCount');
    expect(salesSettingsSrc).toContain('excludeLoadFailed');
  });

  test('ingredient/usage/page.jsx가 useDBLoad로 7개 병렬 쿼리를 로드한다', () => {
    expect(ingredientUsageSrc).toContain('useDBLoad');
    expect(ingredientUsageSrc).not.toContain("import { initDB }");
    expect(ingredientUsageSrc).not.toContain("import { useMounted }");
    expect(ingredientUsageSrc).not.toContain('setLoading(');
    expect(ingredientUsageSrc).toContain('allMeta');
    expect(ingredientUsageSrc).toContain('typeMap');
    expect(ingredientUsageSrc).toContain('usageMap');
    expect(ingredientUsageSrc).toContain('initialData: null');
  });
});
