import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const systemSrc = readFileSync(resolve('app/settings/system/page.jsx'), 'utf8');
const systemUISrc = readFileSync(resolve('app/settings/system/_SystemSettingsUI.jsx'), 'utf8');
const systemPrimitivesSrc = readFileSync(
  resolve('app/settings/system/_system-settings/primitives.jsx'),
  'utf8'
);
const accountSrc = readFileSync(resolve('app/settings/account/page.jsx'), 'utf8');
const accountUISrc = readFileSync(resolve('app/settings/account/_AccountSettingsUI.jsx'), 'utf8');

const src = readFileSync(resolve('hooks/useDBLoad.js'), 'utf8');
const menuSalesSrc = readFileSync(resolve('app/menu-sales/page.jsx'), 'utf8');
const nutritionSrc = readFileSync(resolve('app/nutrition/page.jsx'), 'utf8');
const ingredientSrc = readFileSync(resolve('app/ingredient/page.jsx'), 'utf8');
const jetteSrc = readFileSync(resolve('app/jette/page.jsx'), 'utf8');
const journalSrc = readFileSync(resolve('app/note/journal/page.jsx'), 'utf8');
const salesSettingsSrc = readFileSync(resolve('app/menu-sales/settings/page.jsx'), 'utf8');
const ingredientUsageSrc = readFileSync(resolve('app/ingredient/usage/page.jsx'), 'utf8');
const marginDataSrc = readFileSync(resolve('app/cost/margin/useMarginData.js'), 'utf8');
const ingredientPriceSrc = readFileSync(resolve('hooks/useIngredientPriceData.js'), 'utf8');
const backupSrc = readFileSync(resolve('app/settings/backup/page.jsx'), 'utf8');
const restoreSrc = readFileSync(resolve('app/settings/restore/page.jsx'), 'utf8');
const menuMasterSrc = readFileSync(resolve('app/menu-master/page.jsx'), 'utf8');
const nutritionMenuSrc = readFileSync(resolve('app/nutrition/menu/page.jsx'), 'utf8');
const reportCostSrc = readFileSync(resolve('app/report/cost/page.jsx'), 'utf8');
const menuMasterActionsSrc = readFileSync(
  resolve('app/menu-master/useMenuMasterActions.js'),
  'utf8'
);
const ingredientManageDataSrc = readFileSync(
  resolve('app/ingredient/manage/useIngredientManageData.js'),
  'utf8'
);

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
    expect(menuSalesSrc).not.toContain('import { initDB }');
    expect(menuSalesSrc).not.toContain('setLoading(');
  });

  test('nutrition/page.jsx가 useDBLoad를 사용한다', () => {
    expect(nutritionSrc).toContain('useDBLoad');
    expect(nutritionSrc).not.toContain('import { initDB }');
    expect(nutritionSrc).not.toContain('setLoading(');
  });

  test('ingredient/page.jsx가 useDBLoad를 사용한다', () => {
    expect(ingredientSrc).toContain('useDBLoad');
    expect(ingredientSrc).not.toContain('import { initDB }');
    expect(ingredientSrc).not.toContain('setLoading(');
  });

  test('jette/page.jsx가 useDBLoad를 사용한다', () => {
    expect(jetteSrc).toContain('useDBLoad');
    expect(jetteSrc).not.toContain('import { initDB }');
    expect(jetteSrc).not.toContain('setLoading(');
  });

  test('note/journal/page.jsx가 useDBLoad를 사용하고 date 변경은 re-fetch를 유발하지 않는다', () => {
    expect(journalSrc).toContain('useDBLoad');
    expect(journalSrc).not.toContain('import { initDB }');
    expect(journalSrc).not.toContain('setLoading(');
    // date는 deps에 넣지 않고 useMemo 필터로만 처리함
    expect(journalSrc).toContain('initialData: []');
    expect(journalSrc).not.toContain('onError: console.error');
    expect(journalSrc).toContain("console.error('[note/journal] load failed'");
  });

  test('note/journal/page.jsx 빈 상태 작성 버튼은 viewer에서 비활성화된다', () => {
    expect(journalSrc).toContain("from '@/hooks/useCurrentRole'");
    expect(journalSrc).toContain('const canEdit = roleReady && isAdmin');
    expect(journalSrc).toContain("if (canEdit) router.push('/note/write')");
    expect(journalSrc).toContain('disabled={!canEdit}');
  });
});

describe('저위험 기타 페이지 useDBLoad 적용', () => {
  test('menu-sales/settings/page.jsx가 useDBLoad로 제외 수를 조회한다', () => {
    expect(salesSettingsSrc).toContain('useDBLoad');
    expect(salesSettingsSrc).not.toContain('import { initDB }');
    expect(salesSettingsSrc).not.toContain('setLoading(');
    expect(salesSettingsSrc).toContain('excludeCount');
    expect(salesSettingsSrc).toContain('excludeLoadFailed');
  });

  test('ingredient/usage/page.jsx가 useDBLoad로 7개 병렬 쿼리를 로드한다', () => {
    expect(ingredientUsageSrc).toContain('useDBLoad');
    expect(ingredientUsageSrc).not.toContain('import { initDB }');
    expect(ingredientUsageSrc).not.toContain('import { useMounted }');
    expect(ingredientUsageSrc).not.toContain('setLoading(');
    expect(ingredientUsageSrc).toContain('allMeta');
    expect(ingredientUsageSrc).toContain('typeMap');
    expect(ingredientUsageSrc).toContain('usageMap');
    expect(ingredientUsageSrc).toContain('initialData: null');
  });
});

describe('고위험 단계 1: settings/restore', () => {
  test('settings/restore가 useDBLoad로 store 통계를 로드하고 ready를 파생한다', () => {
    expect(restoreSrc).toContain('useDBLoad');
    expect(restoreSrc).not.toContain('initDB,');
    expect(restoreSrc).not.toContain('setReady(');
    expect(restoreSrc).not.toContain('setCurrentStats(');
    expect(restoreSrc).toContain('ready = currentStats !== null');
    expect(restoreSrc).toContain('reloadStats');
  });
});

describe('고위험 단계 2: settings/account', () => {
  test('settings/account가 useDBLoad로 계정 목록을 로드하고 reload로 갱신한다', () => {
    expect(accountSrc).toContain('useDBLoad');
    expect(accountSrc).not.toContain('useCallback');
    expect(accountSrc).not.toContain('import { initDB }');
    expect(accountSrc).not.toContain('await loadAccounts');
    expect(accountSrc).toContain('reloadAccounts');
    expect(accountSrc).toContain('accountData');
  });
});

describe('고위험 단계 3: menu-master + useIngredientManageData', () => {
  test('menu-master page가 useDBLoad를 사용하고 mountedRef·initDB를 제거했다', () => {
    expect(menuMasterSrc).toContain('useDBLoad');
    expect(menuMasterSrc).not.toContain('useMounted');
    expect(menuMasterSrc).not.toContain('import { initDB }');
    expect(menuMasterSrc).not.toContain('useCallback');
    expect(menuMasterSrc).toContain('reload');
  });

  test('useMenuMasterActions가 reload를 사용하고 mountedRef를 제거했다', () => {
    expect(menuMasterActionsSrc).not.toContain('mountedRef');
    expect(menuMasterActionsSrc).not.toContain('await load()');
    expect(menuMasterActionsSrc).toContain('reload()');
  });

  test('useIngredientManageData가 useDBLoad를 사용하고 mountedRef·initDB를 제거했다', () => {
    expect(ingredientManageDataSrc).toContain('useDBLoad');
    expect(ingredientManageDataSrc).not.toContain('initDB');
    expect(ingredientManageDataSrc).not.toContain('useCallback');
    expect(ingredientManageDataSrc).toContain('setRows');
    expect(ingredientManageDataSrc).toContain('initialData: null');
  });
});

describe('고위험 단계 4: nutrition/menu', () => {
  test('nutrition/menu page가 useDBLoad 9개 쿼리 번들을 사용하고 mountedRef·initDB를 제거했다', () => {
    expect(nutritionMenuSrc).toContain('useDBLoad');
    expect(nutritionMenuSrc).not.toContain('useMounted');
    expect(nutritionMenuSrc).not.toContain('import { initDB }');
    expect(nutritionMenuSrc).not.toContain('useCallback');
    expect(nutritionMenuSrc).toContain('reload');
    expect(nutritionMenuSrc).toContain('duplicateDiagnostics');
    expect(nutritionMenuSrc).toContain('menuMasterDiagnostics');
  });
});

describe('고위험 단계 5: report/cost', () => {
  test('report/cost page가 useDBLoad를 사용하고 ignore·loadedCtxRef·initDB를 제거했다', () => {
    expect(reportCostSrc).toContain('useDBLoad');
    expect(reportCostSrc).not.toContain('import { initDB }');
    expect(reportCostSrc).not.toContain('ignore');
    expect(reportCostSrc).not.toContain('loadedCtxRef');
    expect(reportCostSrc).toContain('keepDataOnReload');
    expect(reportCostSrc).toContain('mapErrorMessage');
    // includeEdge 재계산은 useMemo로
    expect(reportCostSrc).toContain('opts.includeEdge');
  });
});

describe('중위험 페이지·훅 useDBLoad 적용', () => {
  test('useMarginData가 useDBLoad를 사용하고 platforms는 localStorage 직접 로드한다', () => {
    expect(marginDataSrc).toContain('useDBLoad');
    expect(marginDataSrc).not.toContain('import { initDB }');
    expect(marginDataSrc).not.toContain('import { useMounted }');
    expect(marginDataSrc).not.toContain('setLoading(');
    expect(marginDataSrc).not.toContain('useCallback');
    // platforms는 loadPlatforms()로 직접 초기화
    expect(marginDataSrc).toContain('useState(loadPlatforms)');
    expect(marginDataSrc).toContain('initialData: []');
  });

  test('useIngredientPriceData가 useDBLoad를 사용하고 mountedRef를 제거했다', () => {
    expect(ingredientPriceSrc).toContain('useDBLoad');
    expect(ingredientPriceSrc).not.toContain('import { initDB }');
    expect(ingredientPriceSrc).not.toContain('import { useMounted }');
    expect(ingredientPriceSrc).not.toContain('mountedRef');
    expect(ingredientPriceSrc).not.toContain('setLoading(');
    expect(ingredientPriceSrc).toContain('fileInfo');
    expect(ingredientPriceSrc).toContain('initialData: null');
  });

  test('settings/backup가 useDBLoad로 store 통계를 로드하고 ready를 파생한다', () => {
    expect(backupSrc).toContain('useDBLoad');
    expect(backupSrc).not.toContain('import { initDB,');
    expect(backupSrc).not.toContain('initDB,');
    expect(backupSrc).not.toContain('setReady(');
    expect(backupSrc).not.toContain('setStats(');
    // ready는 stats !== null 파생
    expect(backupSrc).toContain('ready = stats !== null');
    expect(backupSrc).toContain('collectStoreStats');
  });

  test('settings/system page가 useDBLoad를 사용하고 useMounted·initDB·useEffect를 제거했다', () => {
    expect(systemSrc).toContain('useDBLoad');
    expect(systemSrc).not.toContain('import { initDB');
    expect(systemSrc).not.toContain('useMounted');
    expect(systemSrc).not.toContain('mountedRef');
    expect(systemSrc).not.toContain('setReady(');
    expect(systemSrc).not.toContain('setStats(');
    expect(systemSrc).not.toContain('setStorageEst(');
    expect(systemSrc).not.toContain('refreshStats');
    // reload alias 사용
    expect(systemSrc).toContain('reloadStats');
    // ready는 statsData 파생
    expect(systemSrc).toContain('ready = statsData !== null');
  });

  test('settings/system _SystemSettingsUI가 8개 컴포넌트를 모두 export한다', () => {
    expect(systemUISrc).toContain("from './_system-settings/primitives'");
    expect(systemPrimitivesSrc).toContain('export function SettingsGroup');
    expect(systemPrimitivesSrc).toContain('export function SettingsRow');
    expect(systemPrimitivesSrc).toContain('export function Segmented');
    expect(systemPrimitivesSrc).toContain('export function StaticValue');
    expect(systemPrimitivesSrc).toContain('export function StatusValue');
    expect(systemPrimitivesSrc).toContain('export function DangerConfirm');
    expect(systemPrimitivesSrc).toContain('export function InfoCell');
    expect(systemPrimitivesSrc).toContain('export function StorageUsageBar');
  });

  test('settings/account page가 _AccountSettingsUI에서 4개 컴포넌트를 import하고 인라인 JSX를 제거했다', () => {
    expect(accountSrc).toContain('_AccountSettingsUI');
    expect(accountSrc).toContain('AccountProfileCard');
    expect(accountSrc).toContain('AccountSessionCard');
    expect(accountSrc).toContain('AccountMembersCard');
    expect(accountSrc).toContain('AccountPermissionsMatrix');
    // 권한 매트릭스 상수는 UI 파일로 이동됨
    expect(accountSrc).not.toContain("'관리자', '에디터', '조회자', 'API'");
    expect(accountSrc).not.toContain('PERMISSIONS');
    // ROLE_COLORS는 UI 파일로 이동됨
    expect(accountSrc).not.toContain('ROLE_COLORS');
  });

  test('settings/account 삭제 확인 대상이 사라지면 confirm 상태를 닫는다', () => {
    expect(accountSrc).toContain('deleteConfirmId == null');
    expect(accountSrc).toContain('!accounts.some(account => account.id === deleteConfirmId)');
    expect(accountSrc).toContain('setDeleteConfirmId(null)');
    expect(accountSrc).toContain('"undefined 계정 삭제" 표시를 막고 닫는다');
  });

  test('settings/account _AccountSettingsUI가 4개 컴포넌트를 모두 export한다', () => {
    // barrel 또는 직접 정의 형태 둘 다 허용
    expect(accountUISrc).toContain('AccountProfileCard');
    expect(accountUISrc).toContain('AccountSessionCard');
    expect(accountUISrc).toContain('AccountMembersCard');
    expect(accountUISrc).toContain('AccountPermissionsMatrix');
  });
});
