/**
 * lib/ingredient/store.js — cost_ingredients 공개 API facade
 *
 * 레코드 구조:
 *   id            autoIncrement PK
 *   ingredientName 재료명 (직접 입력 or 제때 productName)
 *   productCode    제때 제품코드 (null = 수동 등록)
 *   category       메인 분류 1개 (예: '토핑재료', '엣지', '사이드')
 *   tags           서브 해시태그 배열 (예: ['육가공류', '수산류'])
 *   manufacturer   제조사
 *   discontinued   단종 여부
 *   baseQuantity   포장단위 수량
 *   baseUnitType   단위 (g | 개)
 *   taxType        '과세' | '면세'
 *   priceOverride  수동 단가(부가세포함) — 제때 연동 없을 때 사용
 *   note           비고
 *   isManual       true = 수동 등록
 *   isSeeded       true = (레거시) 마스터 시드에서 자동 등록됐던 이력
 *   updatedAt      ISO
 *
 *   (deprecated, backward compat) categories: string[] — category + tags 합본
 *
 * 구현은 각 책임 파일에 분산됨:
 *   normalize.js     — 정규화 순수 함수 (normalizeOrigin·normalizeTags·buildRecord 등)
 *   crud.js          — 조회·추가·수정 (getAllIngredients·addIngredient·upsertIngredientMeta 등)
 *   destructive.js   — 숨김·복원·삭제·초기화·일괄변경
 *   import.js        — 벌크 임포트 (엑셀 마스터파일)
 *   dedupe-repair.js — 제품코드 중복 진단·수리
 */

// 외부(UI·테스트)가 store.js에서 import하던 모든 함수를 re-export
export { findMissingRefs, validateCompositeRefs } from './composite-refs';
export { productCodeKey, buildIngredientProductCodeDuplicateDiagnostics } from './product-code';

export {
  getAllIngredients,
  getIngredientMetaMap,
  addIngredient,
  updateIngredient,
  setIngredientPriceManualConfirmed,
  upsertIngredientMeta,
} from './crud';

export {
  previewIngredientDelete,
  excludeIngredientByCode,
  restoreIngredientByCode,
  bulkDeleteIngredients,
  deleteIngredient,
  removeCategoryFromAll,
  removeTagFromAll,
  removeManyTagsFromAll,
  renameCategoryInAll,
  renameTagInAll,
  bulkSetDiscontinued,
  bulkSetCategory,
  bulkSetOriginAllergenNone,
  resetAllIngredients,
} from './destructive';

export { bulkImportIngredients } from './import';

export { replaceIngredientProductCode, previewIngredientProductReplace } from './product-replace';

export {
  getIngredientProductCodeDuplicateDiagnostics,
  repairIngredientProductCodeDuplicates,
  getIngredientHealthSummary,
} from './dedupe-repair';
