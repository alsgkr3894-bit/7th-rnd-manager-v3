import { showToast } from '@/components/Toast';
import { restoreRecord, hasStore } from '@/lib/db';
import { getManagedProducts, addManagedProduct, updateManagedProduct } from '@/lib/shipment';
import { TYPE_LABEL } from '@/components/jette/managed-products-constants';
import { assertActiveAdmin } from '@/lib/auth/guard';

export const MANAGE_VIEW_KEYS = new Set([
  'manage',
  'price',
  'issues',
  'settings',
  'suppliers',
  'report',
]);

export function normalizeManageView(value) {
  return MANAGE_VIEW_KEYS.has(value) ? value : 'manage';
}

export function readInitialManageView() {
  if (typeof window === 'undefined') return 'manage';
  return normalizeManageView(new URLSearchParams(window.location.search).get('view'));
}

// 알림·통합 검색·원가 화면의 링크가 한 번 전달하고 마는 파라미터. 적용한 뒤 주소에서 지운다.
const MANAGE_LINK_PARAM_KEYS = ['catFilter', 'query', 'highlight', 'productCode'];

export function pickManageLinkQuery(searchParams) {
  const picked = new URLSearchParams();
  for (const key of MANAGE_LINK_PARAM_KEYS) {
    const value = searchParams.get(key);
    if (value) picked.set(key, value);
  }
  return picked.toString();
}

export function removeManageLinkParams(url) {
  MANAGE_LINK_PARAM_KEYS.forEach(key => url.searchParams.delete(key));
  return url;
}

// 제때 이슈/대체 연결 매칭에 쓰는 productCode 정규화(대소문자·공백 무시).
export function productCodeKey(rowOrCode) {
  const value = rowOrCode && typeof rowOrCode === 'object' ? rowOrCode.productCode : rowOrCode;
  return String(value || '')
    .trim()
    .toUpperCase();
}

// scope 라벨('전용'/'범용'/'범용관리') → productType 코드
const scopeToType = label =>
  Object.keys(TYPE_LABEL).find(code => TYPE_LABEL[code] === label) || null;

// 제때 연동 항목의 전용/범용을 제때 관리품목(ref_shipment_products.productType)에 반영
export async function syncManagedScope(target, scopeLabel) {
  const productType = scopeToType(scopeLabel);
  if (!target.productCode || !productType) return;
  await assertActiveAdmin('식자재 제때 범위 동기화');
  const managed = await getManagedProducts();
  const existing = managed.find(p => p.productCode === target.productCode);
  if (existing) {
    if (existing.productType !== productType)
      await updateManagedProduct({ id: existing.id, productType });
  } else {
    await addManagedProduct({
      productCode: target.productCode,
      productName: target.productName || target.ingredientName || '',
      productType,
    });
  }
}

export async function restoreDeletedIngredientBackup(backup) {
  // id 없는 레코드를 put하면 autoIncrement가 새 id를 할당해 원본을 잃는다.
  if (!backup?.ingredient?.id) return;
  await assertActiveAdmin('식자재 삭제 실행취소');
  await restoreRecord('cost_ingredients', backup.ingredient);
  // cascade로 삭제됐던 legacy 알레르기 링크도 함께 복원(있고 store가 존재할 때만).
  const links = Array.isArray(backup.deletedAllergenLinks) ? backup.deletedAllergenLinks : [];
  if (links.length > 0 && hasStore('nutrition_allergy_links')) {
    for (const link of links) {
      if (link?.id != null) await restoreRecord('nutrition_allergy_links', link);
    }
  }
}

const MAX_FAILED_NAMES = 5;

/** 사용자가 다시 찾을 수 있는 이름 — 제품코드 우선, 없으면(수동 식자재) 식자재명 */
function restoreTargetName(backup) {
  const item = backup?.ingredient;
  return item?.productCode || item?.ingredientName || item?.productName || `ID ${item?.id}`;
}

/** 일괄 실행취소 — 일부가 실패해도 나머지는 계속 복구하고, 실패한 항목을 알려 준다 */
export async function restoreDeletedIngredientBackups(backups) {
  const failed = [];
  for (const backup of backups) {
    try {
      await restoreDeletedIngredientBackup(backup);
    } catch (err) {
      console.warn('[ingredient] 삭제 실행취소 실패', restoreTargetName(backup), err);
      failed.push(restoreTargetName(backup));
    }
  }
  if (failed.length > 0) {
    const shown = failed.slice(0, MAX_FAILED_NAMES).join(', ');
    const rest = failed.length - MAX_FAILED_NAMES;
    throw new Error(
      `${failed.length}개 항목 복구 실패: ${shown}${rest > 0 ? ` 외 ${rest}개` : ''}`
    );
  }
}

export function warnIngredientCascadeFailures(records) {
  const count = records.reduce((sum, rec) => sum + (rec?.cascadeErrors?.length || 0), 0);
  if (count > 0) {
    showToast(`삭제는 완료됐지만 연관 데이터 정리 ${count}건을 확인해야 합니다.`, 'warn', 7000);
  }
}

export function buildBulkDeleteToast(removed, failures) {
  if (failures.length === 0) return { message: `${removed.length}개 삭제됨`, type: 'ok' };
  if (removed.length === 0) return { message: `${failures.length}개 삭제 실패`, type: 'error' };
  return {
    message: `${removed.length}개 삭제됨 · ${failures.length}개 실패`,
    type: 'warn',
  };
}
