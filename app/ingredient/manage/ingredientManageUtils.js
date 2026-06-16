import { showToast } from '@/components/Toast';
import { restoreRecord } from '@/lib/db';
import { getManagedProducts, addManagedProduct, updateManagedProduct } from '@/lib/shipment';
import { TYPE_LABEL } from '@/components/jette/managed-products-constants';

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

// scope 라벨('전용'/'범용'/'범용관리') → productType 코드
const scopeToType = label =>
  Object.keys(TYPE_LABEL).find(code => TYPE_LABEL[code] === label) || null;

// 제때 연동 항목의 전용/범용을 제때 관리품목(ref_shipment_products.productType)에 반영
export async function syncManagedScope(target, scopeLabel) {
  const productType = scopeToType(scopeLabel);
  if (!target.productCode || !productType) return;
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
  if (!backup?.ingredient) return;
  await restoreRecord('cost_ingredients', backup.ingredient);
}

export async function restoreDeletedIngredientBackups(backups) {
  const failures = [];
  for (const backup of backups) {
    try {
      await restoreDeletedIngredientBackup(backup);
    } catch (err) {
      failures.push(err);
    }
  }
  if (failures.length > 0) {
    throw new Error(`${failures.length}개 항목 복구 실패`);
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
