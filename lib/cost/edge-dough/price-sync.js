/**
 * lib/cost/edge-dough/price-sync.js — 엣지·도우 구성품 단가 자동 입력 (순수)
 *
 * 구성품의 단가는 식자재 관리의 최신 단가(unitPriceMap)에서 가져온다. unitPriceMap의 키는
 * 제품코드가 있으면 제품코드, 없는 수동 식자재는 String(id)다(lib/recipe buildUnitPriceMap).
 * 엣지 화면은 제품코드로만 찾아서, 코드가 없는 수동 식자재(예: 해남고구마무스)는 단가를 못
 * 가져와 손으로 입력한 값(11원)이 남았다 — 실제 최신 단가는 10.5원/g(10,450원÷1kg, 소수 1자리 정책)이었다.
 *
 * 공통묶음 편집기(components/cost/recipe-groups/editor/groupEditorUtils.js)와 같은 규칙을 쓴다:
 * 구성품 productCode = 제품코드 || String(id).
 */
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/** unitPriceMap 키 — 제품코드, 없으면 식자재 id */
export function ingredientPriceKey(meta) {
  const code = asDisplayText(meta?.productCode).trim();
  if (code) return code;
  return meta?.id != null ? String(meta.id) : '';
}

/** 식자재를 골랐을 때 구성품에 채울 값 (단가는 최신 단가가 있을 때만) */
export function edgePatchForIngredient(meta, unitPriceMap) {
  const key = ingredientPriceKey(meta);
  const info = key && unitPriceMap instanceof Map ? unitPriceMap.get(key) : null;
  const patch = {
    ingredientName: meta?.ingredientName || '',
    productCode: key || null,
    unit: info?.baseUnitType || meta?.baseUnitType || 'g',
  };
  if (info?.unitPrice != null) patch.unitPrice = String(info.unitPrice);
  return patch;
}

function normName(value) {
  return asDisplayText(value).trim().toLowerCase().replace(/\s+/g, '');
}

/** 코드가 빈 옛 구성품을 이름으로 식자재에 연결한다. 이름이 겹치면(모호) 연결하지 않는다. */
function findMetaByName(allMeta, name) {
  const target = normName(name);
  if (!target) return null;
  const matches = allMeta.filter(
    meta => !meta?.discontinued && !meta?.excluded && normName(meta?.ingredientName) === target
  );
  return matches.length === 1 ? matches[0] : null;
}

/**
 * 편집 화면을 열 때 기존 구성품의 단가를 최신 식자재 단가로 맞춘다.
 * - 제품코드(또는 id 키)가 있으면 그 키로, 코드가 빈 구성품은 이름이 하나로 특정될 때 연결해서 조회
 * - 최신 단가를 못 찾으면 저장돼 있던 값을 그대로 둔다(지우지 않는다)
 * @returns {{ components: object[], changed: number }} changed = 단가가 바뀐 구성품 수
 */
export function refreshEdgeComponentPrices(components, allMeta, unitPriceMap) {
  const metas = asObjectArray(allMeta);
  const upm = unitPriceMap instanceof Map ? unitPriceMap : new Map();
  let changed = 0;

  const next = asObjectArray(components).map(component => {
    let key = asDisplayText(component.productCode).trim();
    let linked = null;
    if (!key) {
      linked = findMetaByName(metas, component.ingredientName);
      key = ingredientPriceKey(linked);
    }
    const info = key ? upm.get(key) : null;
    if (!info || info.unitPrice == null) return component;

    const updated = { ...component };
    if (linked) updated.productCode = key;
    const current = Number(component.unitPrice);
    if (!Number.isFinite(current) || Math.abs(current - info.unitPrice) > 1e-9) {
      updated.unitPrice = info.unitPrice;
      changed += 1;
    } else if (!linked) {
      return component;
    }
    return updated;
  });

  return { components: next, changed };
}
