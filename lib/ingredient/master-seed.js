// INGREDIENT_MASTER_SEED은 더 이상 UI 시드 액션(마스터 시드 버튼)에서 쓰이지 않지만,
// __tests__/lib/sales-seed-data.test.mjs가 참조 데이터 정합성(제품코드 중복 등)을 계속 검증하므로 유지한다.
export {
  INGREDIENT_MASTER_SEED,
  SEED_MAIN_CATEGORIES,
  SEED_HASH_TAGS,
} from './data/master-seed.js';
