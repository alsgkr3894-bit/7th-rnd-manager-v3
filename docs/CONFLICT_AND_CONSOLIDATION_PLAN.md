# 충돌 가능성·모듈 통합 후보 종합본

> 기준일: 2026-06-15  
> 기준 경로: `/Users/lmh/Documents/Codex/7th-rnd-manager-v3`  
> 목적: 사이트 전체에서 기능 충돌 가능성, 데이터 기준 불일치, 이름/책임 중복, 합칠 수 있는 모듈을 찾고 실행 플랜까지 한곳에 정리한다.  
> 작업 방식: 코드 수정 없이 현재 워크트리 기준으로 `app`, `components`, `hooks`, `lib`, `scripts`, `docs`, `README.md`, `ARCHITECTURE.md`를 스캔했다.

---

## 1. 확인 범위와 스캔 결과

이번 점검은 이전 감사 문서(`SITE_AUDIT_REPORT.md`, `docs/PROJECT_CODEBASE_AUDIT.md`, `docs/PROJECT_STRUCTURE_AUDIT_2026-06-14.md`, `docs/DEFERRED_WORK.md`, `docs/SITE_IMPROVEMENT_BACKLOG.md`)의 내용에 더해 현재 파일을 다시 확인했다.

| 항목 | 결과 | 의미 |
|---|---:|---|
| `app/**/page.jsx` 라우트 | 55개 | 화면 수가 많아 내비게이션/QA drift 관리 필요 |
| 메뉴에 직접 노출된 href | 40개 | 직접 노출되지 않는 정적 route 16개 확인 |
| 메뉴 href 중 실제 route 없음 | 0개 | 죽은 메뉴 링크는 없음 |
| 중복 export 이름 후보 | 12개 | 일부는 통합 후보, 일부는 통합 금지 |
| `store.js` 파일 | 18개 | store 명명은 정상이나 도메인 간 cascade 정책이 중요 |
| 600줄 이상 파일 | 27개 | 리팩터링 후보가 많음, 기능 변경과 분리 필요 |

현재 워크트리는 이미 다수 수정/미추적 파일이 있다. 구현 단계에서는 사용자 변경을 되돌리지 말고, 착수 전 `git diff -- <target>`로 해당 파일의 변경 의도를 먼저 확인해야 한다.

---

## 2. 우선순위 요약

| 우선순위 | 항목 | 판단 |
|---|---|---|
| P1 | 식자재 사용현황과 영양/원산지의 식자재-메뉴 매핑 기준 불일치 | 같은 질문에 화면마다 답이 달라질 수 있음 |
| P1 | 레시피 소스 이중화(`cost_recipes` vs detail 4종) | 보고서/마진/사용현황/영양 자동집계의 기준 고정 필요 |
| P1 | 메뉴마스터와 판매가 양방향 동기화 | 어느 쪽이 주 데이터인지 정책이 흔들리면 덮어쓰기 위험 |
| P1 | 백업 localStorage 복원이 `nutrition` 선택에 묶임 | 전역 설정이 백업 파일에 있어도 선택 복원에서 빠질 수 있음 |
| P1 | 멀티 브랜드 백업 source metadata 부재 | 다른 브랜드 백업을 현재 브랜드 DB에 복원해도 코드상 검증이 없음 |
| P1 | 삭제/복원 cascade 원자성 | 노트 체인은 구현 완료; 메뉴/식자재/백업 복원은 일부 삭제·복원만 반영될 수 있음 |
| P1 | 노트 삭제가 parentId 전체 체인과 UI state를 완전히 다루지 않음 | 구현 완료; 신규 undo 경로 추가 시 실패 toast 유지 필요 |
| P2 | 엣지 관리 화면 중복 | `/cost/edge-dough`와 `/cost/recipe?tab=edges`가 같은 데이터를 편집 |
| P2 | 메뉴 판매량 redirect route가 허브 카드에 그대로 노출 | 같은 기능이 여러 화면처럼 보임 |
| P2 | 모바일 원가 primary route가 데스크톱과 다름 | 모바일은 `/cost/pizza`, 데스크톱은 `/cost/recipe` 중심으로 진입 |
| P2 | 시스템 설정 store/localStorage/no-op 토글 분리 | 백업 범위와 홈/상단 알림 설정은 구현 완료; 자동화 토글 일부는 실제 로직 연결 필요 |
| P2 | 영양 메뉴가 메뉴마스터 밖에서 생성 가능 | 메뉴마스터 단일 기준 정책과 충돌 가능 |
| P2 | `cost_recipes` menuCode base/full 정책 불명확 | legacy fallback과 detail recipe 매칭 기준이 흔들릴 수 있음 |
| P2 | 식자재 삭제 안전장치가 화면별로 다름 | 구현 완료; 신규 삭제 진입점 추가 시 공통 undo/cascade 경고 흐름 유지 필요 |
| P2 | 카테고리 판정 함수 중복 | `isPizzaCategory` 이름이 3곳에서 다른 의미로 사용됨 |
| P2 | 백업 localStorage 키 파일 위치 | 전역 백업 설정이 `lib/nutrition` 아래에 있음 |
| P2 | 보고서 비교 route 노출 기준 drift | `KIND_META`/허브에는 있으나 사이드바에는 없음 |
| P2 | CSS primitive selector가 여러 파일에 분산 | `.btn`, `.card` 같은 전역 스타일이 import 순서에 민감 |
| P2 | 대형 파일 분해 | 유지보수성 문제, 단 기능 안정화 후 진행 |
| P3 | 계정 store와 활성 계정 key 범위 | 전역/브랜드별 계정 정책 명시 필요 |
| P3 | 무음 실패 catch 허용 목록 부재 | 무시 가능한 실패와 노출해야 할 실패가 섞여 있음 |
| P3 | 이름만 같은 export/컴포넌트 | 통합 대신 명명 정리 또는 그대로 유지 |

---

## 3. 상세 발견 사항

### 3.1 식자재 사용현황과 영양/원산지 매핑 기준 불일치

**구현 상태**

- 구현 완료: `81d6fa3 refactor: unify ingredient usage mapping`
- 제품별 사용현황과 식자재 상세 사용 메뉴가 `buildIngredientMenuMap()` 기준을 공유한다.
- 직접 레시피, 공통묶음, 엣지, 파생메뉴 식자재 연결을 같은 기준으로 포함한다.
- 기존 피자/사이드 보조 카운트는 유지하고, 총 사용 메뉴 수는 통합 매핑 기준으로 계산한다.

**관련 파일**

- `app/ingredient/usage/page.jsx`
- `lib/cost/ingredient-price-helpers.js`
- `lib/cost/ingredient-menu-map.js`
- `lib/cost/usage-counts.js`
- `app/nutrition/origin/page.jsx`
- `app/nutrition/allergen/page.jsx`
- `app/nutrition/export/OriginResult.jsx`
- `app/nutrition/export/NutritionLabelResult.jsx`

**현재 상태**

- `app/ingredient/usage/page.jsx`는 피자, 1인피자, 사이드, 구형 레시피만 읽는다.
- `buildIngredientUsageMap()`은 세트 레시피, 공통묶음, 엣지, 파생메뉴를 포함하지 않는다.
- 반면 `buildIngredientMenuMap()`은 detail 레시피, 구형 레시피, 공통묶음, 엣지, 파생메뉴까지 포함하는 더 넓은 매핑 정책을 이미 갖고 있다.
- `lib/cost/usage-counts.js`는 현재 피자/사이드만 별도 집계한다.

**충돌 가능성**

- 같은 식자재가 영양/원산지 화면에서는 사용 중으로 잡히고, 제품별 사용현황에서는 미사용처럼 보일 수 있다.
- 세트 구성품이 사용현황에서 누락될 수 있다.
- 엣지/공통묶음 재료가 원산지/알레르기에는 반영되지만 식자재 사용현황에는 빠질 수 있다.

**통합 방향**

- `buildIngredientUsageMap()`을 `buildIngredientMenuMap()` 기반 adapter로 바꾼다.
- 사용현황 페이지도 `menuMaster`, `setRecs`, `groups`, `edges`, `compositions`를 함께 로드한다.
- 카운트는 기존 `pizza`, `side`를 유지하면서 `set`, `other`를 추가하거나, UI가 준비되기 전에는 `total`만 정확히 고정한다.

**테스트**

- 세트 레시피 구성품이 사용현황에 포함된다.
- 공통묶음 default category가 해당 메뉴 전체에 반영된다.
- `expandInMargin=false` 엣지는 사용현황에서도 제외된다.
- 파생메뉴의 `ingredientCodes`가 사용 메뉴로 잡힌다.
- 기존 피자/1인피자/사이드 카운트는 회귀하지 않는다.

---

### 3.2 레시피 기준 데이터 이중화

**구현 상태**

- 구현 완료: `0c72c95`, `4767b9e`, `9d68970`, `ad04fd7`
- 새 단일 저장소 `menu_recipes`를 기준으로 메뉴마스터, 레시피마스터, 원가/마진/보고서, 제품별 사용현황, 원산지/알레르기/영양 출력이 연결됐다.
- 구형 `cost_recipes`와 카테고리별 detail store schema/backup 범위, 출력/집계 fallback, detail bridge API는 제거됐다.
- 현재 테스트는 canonical-only 기준과 구형 store 제거를 검증한다.

**관련 파일**

- `lib/recipe/store.js`
- `lib/cost/shared/createDetailStore.js`
- `lib/cost/pizza-detail/store.js`
- `lib/cost/personal-detail/store.js`
- `lib/cost/side-detail/store.js`
- `lib/cost/set-detail/store.js`
- `lib/cost/recipe-source-precedence.js`
- `lib/report/build-cost-report.js`
- `app/cost/recipe/page.jsx`
- `app/cost/recipe-master/page.jsx`

**현재 상태**

- 레시피 입력/조회 기준은 `menu_recipes` 단일 저장소다.
- 구형 `cost_recipes`, `cost_pizza_detail`, `cost_personal_detail`, `cost_side_detail`, `cost_set_detail` store는 schema/backup 범위에서 제거됐다.
- `recipe-master`와 메뉴마스터는 `menu_recipes`를 우선 저장·조회한다.

**충돌 가능성**

- 한 메뉴가 `cost_recipes`와 detail store 양쪽에 있으면 화면마다 다른 레시피를 볼 수 있다.
- 빈 skeleton detail 레시피가 있으면 구형 레시피 fallback을 막지 않아야 하는데, 이 규칙이 모든 사용처에 일관되게 적용되어야 한다.
- `/cost/recipe`와 `/cost/recipe-master`가 둘 다 "레시피"를 다루므로 사용자 관점의 역할 구분이 필요하다.

**통합 방향**

- 정책 이름을 명확히 정한다: `detail recipes are authoritative, cost_recipes is legacy fallback`.
- 모든 사용처가 `recipe-source-precedence.js`를 거쳐 판단하게 한다.
- `cost_recipes`는 당장 삭제하지 않고 읽기/fallback/마이그레이션 대상으로 남긴다.
- `/cost/recipe-master`는 메뉴마스터 연동형 표준 입력, `/cost/recipe`는 기존 원가 레시피/묶음/엣지 작업대로 문구를 분리한다.

**테스트**

- detail 레시피에 구성품이 있으면 같은 메뉴의 `cost_recipes`는 제외된다.
- detail 레시피가 빈 skeleton이면 `cost_recipes` fallback이 유지된다.
- 보고서, 마진표, 사용현황, 영양/원산지 자동집계가 같은 precedence 결과를 쓴다.

---

### 3.3 메뉴마스터와 판매가 동기화 정책 충돌

**구현 상태**

- 구현 완료: `7742193 fix: keep menu master authoritative for price sync`
- 판매가 테이블 변경으로 기존 메뉴마스터의 메뉴명, 분류, 규격, 상태, 메모, 숨김, 원산지 제외, 표시순서가 덮이지 않도록 제한했다.
- 판매가 쪽 신규 menuCode는 `source: price-sync`로 메뉴마스터에 생성하고, 기존 menuCode는 가격만 갱신한다.
- 판매가 입력의 중복 menuCode는 마지막 행만 반영하되 `duplicateMenuCodes` 진단으로 반환한다.

**관련 파일**

- `lib/menu-master/index.js`
- `lib/menu-master/store.js`
- `lib/cost/menu-price/store.js`
- `app/menu-master/page.jsx`
- `app/cost/ingredient-price/page.jsx`
- `app/cost/margin/page.jsx`

**현재 상태**

- `lib/menu-master/index.js` 주석은 "메뉴 마스터가 모든 모듈의 메인 데이터 소스"라고 설명한다.
- `syncMenuMasterFromPrices()`는 판매가 행에서 신규 메뉴 생성과 가격 갱신만 수행한다.
- `pushMasterToPrices()`는 메뉴마스터에서 판매가 mirror를 갱신하며, 단종 메뉴는 판매가 mirror에서 제거한다.

**충돌 가능성**

- 판매가 일괄 업로드가 메뉴명/카테고리/size/price를 메뉴마스터에 다시 밀어 넣을 수 있다.
- 메뉴마스터에서 상태, 노트, 표시순서 등을 수정한 뒤 판매가 sync가 의도치 않게 일부 필드를 덮을 수 있다.
- `source` 필드가 있으나 정책 enforcement가 충분히 명시적이지 않다.

**통합 방향**

- 메뉴 identity 기준은 `menu_master`로 고정한다.
- `cost_selling_prices`는 가격 mirror로 제한한다.
- 판매가 업로드에서 메뉴마스터에 새 메뉴를 만들 수는 있어도, 기존 메뉴의 운영 필드(`status`, `note`, `hidden`, `excludeFromOrigin`, `displayOrder`)는 절대 덮지 않는다.
- sync 결과를 UI에 표시한다: 신규 생성, 가격만 갱신, 충돌 후보.

**테스트**

- 기존 메뉴마스터의 `status`, `note`, `hidden`, `displayOrder`가 가격 업로드 후 보존된다.
- 메뉴마스터에서 discontinued 처리한 메뉴가 판매가 mirror에서 제거된다.
- menuCode 중복은 마지막 행으로 조용히 덮지 않고 진단된다.

---

### 3.4 엣지 관리 화면 중복

**구현 상태**

- 구현 완료: `4a7152f refactor: redirect legacy edge dough route`
- `/cost/recipe?tab=edges`를 엣지 관리 primary route로 고정했다.
- `/cost/edge-dough`는 기존 북마크 호환용 redirect route로만 유지한다.
- `COST_COMMON_EDGES_ROUTE`가 `/cost/recipe?tab=edges`를 가리키고, 사이드바에 `/cost/edge-dough`가 직접 노출되지 않는지 테스트한다.

**관련 파일**

- `app/cost/edge-dough/page.jsx`
- `components/cost/manage/CommonManageView.jsx`
- `app/cost/recipe/page.jsx`
- `app/cost/manage/page.jsx`
- `lib/cost/edge-dough/store.js`

**현재 상태**

- `/cost/recipe?tab=edges`는 `CommonManageView` 안에서 `cost_edge_dough` store를 편집하는 primary route다.
- `/cost/edge-dough`는 `/cost/recipe?tab=edges`로 redirect한다.
- `/cost/manage`는 `/cost/recipe?tab=groups`로 redirect한다.

**충돌 가능성**

- 같은 데이터를 두 화면에서 편집할 수 있어 QA/문서/사용자 안내가 갈라진다.
- 한쪽에서 추가한 UX 개선이 다른 화면에 반영되지 않을 수 있다.

**통합 방향**

- 1안: `/cost/recipe?tab=edges`를 주 화면으로 정하고 `/cost/edge-dough`는 redirect한다.
- 2안: `/cost/edge-dough`를 주 화면으로 정하고 `/cost/recipe` 탭은 링크/요약만 둔다.
- 추천은 1안이다. 묶음 관리와 엣지 관리가 원가 레시피 작업대 안에 붙어 있어 사용 흐름이 자연스럽다.

**테스트**

- 기존 `/cost/edge-dough` 북마크가 깨지지 않는다.
- 엣지 저장/삭제/시드/초기화가 주 화면에서만 QA된다.

---

### 3.5 메뉴 판매량 redirect route가 허브 카드에 노출

**구현 상태**

- 구현 완료: `6c87b23 feat: consolidate menu sales analysis routes`, `7fda5b8 feat: align sales navigation entrypoints`
- `/menu-sales` 허브는 `/menu-sales/rank-compare` 단일 분석 카드만 노출한다.
- `/menu-sales/rank`, `/menu-sales/compare`는 호환 redirect route로만 유지하며 허브와 검색 팔레트에는 직접 노출하지 않는다.

**관련 파일**

- `app/menu-sales/page.jsx`
- `app/menu-sales/rank/page.jsx`
- `app/menu-sales/compare/page.jsx`
- `app/menu-sales/rank-compare/page.jsx`

**현재 상태**

- `/menu-sales/rank`와 `/menu-sales/compare`는 `/menu-sales/rank-compare`로 redirect한다.
- `/menu-sales` 허브와 검색 팔레트는 `순위 및 비교` 단일 분석 route만 노출한다.

**충돌 가능성**

- 사용자는 세 개의 다른 분석 화면이 있다고 기대하지만 실제로는 같은 통합 화면으로 이동한다.
- QA에서는 redirect route와 실제 목적지를 별도로 다뤄야 한다.

**통합 방향**

- 허브에는 `/menu-sales/rank-compare` 카드 하나만 남긴다.
- redirect route는 하위 호환용으로 유지하되, 메뉴/허브/문서에는 직접 노출하지 않는다.
- QA에는 redirect route를 "호환 route"로 분류한다.

---

### 3.6 카테고리 판정 함수 이름 충돌

**구현 상태**

- 구현 완료: `3381fef refactor: clarify pizza category helpers`
- 실제 정책 판정 기준은 `lib/menu-master/category-policy.js`로 유지한다.
- `lib/menu-categories.js`는 `isMenuCategoryPizzaVariant()`를 새 명확한 이름으로 제공하고, 기존 `isPizzaCategory`는 deprecated alias로 유지한다.
- `lib/nutrition/crust-config.js`는 `isNutritionPizzaCategory()`를 새 명확한 이름으로 제공하고, 기존 `isPizzaCategory`는 deprecated alias로 유지한다.

**관련 파일**

- `lib/menu-master/category-policy.js`
- `lib/menu-categories.js`
- `lib/nutrition/crust-config.js`
- `lib/cost/margin/matching.js`
- `lib/recipe-master/sync.js`

**현재 상태**

- 실제 정책용 `isPizzaCategory`는 `lib/menu-master/category-policy.js`에 있다.
- `lib/menu-categories.js`와 `lib/nutrition/crust-config.js`의 기존 `isPizzaCategory`는 하위 호환 alias다.
- `category-policy.js`는 정책 판정 함수다.
- `menu-categories.js`는 상수/정렬과 피자 변형 목록을 갖는다.
- `nutrition/crust-config.js`는 nutrition용으로 `category-policy`를 감싼다.

**충돌 가능성**

- 같은 이름을 import했는데 includePersonal 여부나 하위분류 처리 결과가 달라질 수 있다.
- 신규 코드가 어느 함수를 써야 하는지 헷갈린다.

**통합 방향**

- 실제 판정 함수는 `lib/menu-master/category-policy.js`로 집중한다.
- `lib/menu-categories.js`는 `MENU_CATEGORY`, `getMenuCodeRank` 중심으로 축소한다.
- nutrition wrapper는 `isNutritionPizzaCategory`처럼 이름을 바꿔 의미를 드러낸다.

**테스트**

- `피자`, `피자/신메뉴`, `1인피자`, `세트박스`, `소스`, `파스타`, `음료`, `추가토핑` 판정 fixture를 둔다.

---

### 3.7 백업 localStorage 키 파일 위치와 책임

**구현 상태**

- 구현 완료: `f284f1b refactor: move localStorage backup keys`
- localStorage 백업/복원 키의 기준 파일을 `lib/backup/local-storage-keys.js`로 이동했다.
- `lib/nutrition/backup-keys.js`는 기존 import 호환을 위한 deprecated re-export만 유지한다.
- 백업/복원 코드와 테스트는 새 `lib/backup` 경로를 직접 참조한다.

**관련 파일**

- `lib/nutrition/backup-keys.js`
- `lib/backup/local-storage-keys.js`
- `lib/db/backup.js`
- `lib/note/keys.js`

**현재 상태**

- `lib/backup/local-storage-keys.js`가 영양, 노트, 원가, 식자재, 홈, 제때, 전역 설정 localStorage 키를 관리한다.
- `lib/db/backup.js`와 복원 화면은 `lib/backup/local-storage-keys.js`에서 localStorage helper를 import한다.
- `lib/nutrition/backup-keys.js`는 하위 호환 re-export만 남아 있다.

**충돌 가능성**

- 신규 전역 설정을 추가하는 사람이 nutrition 폴더를 찾아야 한다.
- 백업 책임이 nutrition 모듈에 있는 것처럼 보인다.

**통합 방향**

- 새 위치: `lib/backup/local-storage-keys.js`.
- 기존 `lib/nutrition/backup-keys.js`는 하위 호환 re-export만 남기거나, 참조를 모두 변경한 뒤 deprecated 주석을 둔다.
- `PERSISTENT_LS_KEYS`는 `lib/note/keys.js`의 `KEYS`와 수동 중복이 있으므로 장기적으로 영속/임시 분류 metadata를 둔다.

**테스트**

- 기존 `nutrition-backup-keys.test.mjs`를 새 경로 기준으로 갱신한다.
- unknown key, non-string value, storage access failure 동작 유지.

---

### 3.8 legacy 알레르기 링크 store

**구현 상태**

- 구현 완료: `99d9cbc6 feat: B-3 Phase 2 — nutrition_allergy_links store 제거 (DB v20)`
- 신규 DB schema는 `nutrition_allergy_links`를 생성하지 않는다.
- v20 마이그레이션은 기존 `nutrition_allergy_links` store가 있으면 삭제한다.
- 식자재 삭제 cascade의 `deleteAllergenLinksByIngredient()`는 구형 DB/테스트 호환을 위해 남아 있지만, store가 없으면 no-op으로 종료한다.
- 회귀 테스트는 `nutrition-schema-allergy-links`와 `nutrition-allergen-links`에서 신규 생성 차단, 기존 store 삭제, no-op 안전성을 확인한다.

**관련 파일**

- `lib/db/constants.js`
- `lib/db/module-stores.js`
- `lib/db/schema/nutrition.js`
- `lib/nutrition/allergen/store.js`
- `lib/ingredient/store.js`
- `lib/nutrition/migrate-to-ingredient.js`

**현재 상태**

- `nutrition_allergy_links`는 운영 schema와 store 목록에서 제거됐다.
- 실제 알레르기 기준은 `cost_ingredients.allergens`로 이동한 상태다.
- `deleteAllergenLinksByIngredient()`는 store가 없으면 no-op 하도록 안전하게 작성되어 있다.

**통합 방향**

- 유지 방향: 새 알레르기 기준은 `cost_ingredients.allergens`로 고정한다.
- 구형 백업/테스트 호환용 삭제 helper는 store 존재 여부를 확인하는 no-op 가드를 유지한다.
- 신규 코드에서 `nutrition_allergy_links`를 source of truth로 다시 참조하지 않는다.

**테스트**

- 완료: 신규 schema에서 legacy store를 만들지 않는다.
- 완료: 기존 DB v20 마이그레이션에서 legacy store를 삭제한다.
- 완료: legacy store가 없어도 식자재 삭제가 실패하지 않는다.

---

### 3.9 삭제/복원 cascade 원자성

**구현 상태**

- 부분 구현 완료: `3bcd997 fix: delete full note child chains`, `9a565dd fix: surface note undo restore failures`
- 노트 삭제는 parentId 하위 체인을 재귀 수집해 한 트랜잭션에서 삭제한다.
- 노트 삭제 직후 UI state도 삭제된 전체 id 기준으로 제거한다.
- 노트 삭제 실행취소는 `restoreRecord()` 실패를 숨기지 않고 실패 건수를 toast로 노출한다.
- 남은 범위: 메뉴마스터/식자재 도메인 간 cascade와 백업 복원 store별 교체를 전체 preview/repair 정책으로 확장하는 작업.

**관련 파일**

- `lib/menu-master/store.js`
- `lib/ingredient/store.js`
- `lib/note/store.js`
- `lib/db/backup.js`

**현재 상태**

- 메뉴마스터 삭제는 `menu_master` 삭제 후 판매가, 구형 레시피, 영양 참조를 별도 단계로 정리한다.
- 식자재 삭제는 `cost_ingredients` 삭제 후 영양값, legacy 알레르기 링크를 별도 단계로 정리한다.
- 노트 삭제는 parentId 하위 체인 전체를 같은 트랜잭션에서 삭제하고, undo 실패를 사용자에게 노출한다.
- 백업 복원은 store별 `replaceStore()` 순차 실행이다.

**충돌 가능성**

- 중간 실패 시 일부 store만 정리된다.
- 메뉴/식자재 cascade 실패 시 일부 store만 정리될 수 있다.
- 복원 중 일부 store만 교체될 수 있다.

**통합 방향**

- 삭제 전 `delete preview plan`을 만든다: 삭제 대상 store, 레코드 수, rollback 가능 여부.
- 같은 DB 안에서 묶을 수 있는 store는 단일 `runTransaction([...stores], 'readwrite')`로 묶는다.
- dynamic import가 필요한 도메인 간 cascade는 실패를 명시적으로 반환하고 repair action을 제공한다.
- 완료: 노트 삭제는 descendant collector를 재사용하고 undo 실패를 표시한다.
- 복원은 전체 사전 검증 후 실행하고, 실패 store를 복원 결과 화면에서 강하게 표시한다.

---

### 3.10 내비게이션과 route 분류

**구현 상태**

- 구현 완료: `823f539 refactor: centralize route classification`
- `lib/navigation/route-classification.js`에서 정적 route를 `sidebar`, `hub`, `redirect`, `internal-flow`, `dynamic-detail`로 분류한다.
- `scripts/full-rt.mjs`는 하드코딩 route 배열 대신 route 분류표에서 main/china4/direct-entry QA route를 파생한다.
- 회귀 테스트는 route 중복, legacy redirect target, runtime QA route 파생 기준을 확인한다.

**관련 파일**

- `lib/menu.js`
- `app/cost/page.jsx`
- `app/menu-sales/page.jsx`
- `lib/navigation/route-classification.js`
- `scripts/full-rt.mjs`

**현재 상태**

메뉴에 직접 노출되지 않는 정적 route 16개:

| route | 분류 | 조치 |
|---|---|---|
| `/cost` | 허브 | 유지 |
| `/cost/all-summary` | 원가 상세 | 원가 허브/문서에는 노출 유지 |
| `/cost/edge-dough` | 중복 편집 후보 | redirect 또는 주 화면 결정 |
| `/cost/manage` | redirect | 호환 route로 분류 |
| `/cost/personal` | 원가 상세 | 허브 노출로 충분 |
| `/cost/set` | 원가 상세 | 허브 노출로 충분 |
| `/cost/side` | 원가 상세 | 허브 노출로 충분 |
| `/ingredient` | 허브 | 유지 |
| `/jette` | 허브 | 유지 |
| `/menu-sales` | 허브 | 유지 |
| `/menu-sales/compare` | redirect | 허브 카드 제거 |
| `/menu-sales/rank` | redirect | 허브 카드 제거 |
| `/note/sample/write` | 작성 flow | 유지 |
| `/nutrition` | 허브 | 유지 |
| `/report/menu-sales-compare` | 내부 보고서 flow | 보고서 허브 내부 카드 확인 |
| `/settings` | redirect | 호환 route로 분류 |

**통합 방향**

- 완료: route를 `sidebar`, `hub`, `redirect`, `internal-flow`, `dynamic-detail`로 명시 분류한다.
- 완료: `scripts/full-rt.mjs`와 테스트가 이 분류를 공유한다.
- 유지 방향: 신규 정적 route 추가 시 `ROUTE_CLASSIFICATIONS`에 분류와 runtime QA 포함 여부를 먼저 등록한다.

---

## 4. 합쳐도 되는 것 / 합치면 안 되는 것

### 합쳐도 되는 것

| 후보 | 통합 방향 |
|---|---|
| `buildIngredientUsageMap` + `buildIngredientMenuMap` | 후자를 단일 매핑 정책으로 삼고 사용현황용 adapter만 둔다 |
| 카테고리 판정 함수 | `category-policy.js` 중심으로 통합 |
| localStorage 백업 키 | `lib/backup/local-storage-keys.js`로 이동 |
| 메뉴 판매량 rank/compare redirect 카드 | 허브에서 통합 카드 하나만 노출 |
| 엣지 편집 화면 | `/cost/recipe?tab=edges` 또는 `/cost/edge-dough` 중 하나만 primary |
| route 분류 | 메뉴/QA/문서가 같은 route classification을 사용 |

### 합치면 안 되거나 신중해야 하는 것

| 후보 | 이유 |
|---|---|
| `lib/nutrition/crust-config.js`와 `lib/cost/edge-dough/*` | nutrition의 L/R 포함 엣지 코드와 cost의 edgeType 체계가 다르다고 코드 주석에 명시되어 있음 |
| `components/cost/ingredient-price/BulkPriceModal.jsx`와 `components/cost/menu-price/BulkPriceModal.jsx` | 이름은 같지만 다루는 데이터와 workflow가 다름. 기존 문서에도 통합 미구현으로 분류됨 |
| `components/sales/UploadDropzone.jsx`와 `components/ui/UploadDropzone.jsx` | 이미 sales wrapper가 ui 공통 컴포넌트를 감싼 구조라 중복 구현이 아님. 이름만 `SalesUploadDropzone`로 바꾸면 더 명확함 |
| `lib/nutrition/values/store.js`의 `CRUST_TYPES` re-export | 기존 import 경로 호환용. 바로 제거하면 호출부 변경이 커짐 |
| `Field` 같은 로컬 작은 컴포넌트 | 이름만 같고 범위가 좁음. 통합 효과 낮음 |
| `getAllEdges`/`upsertEdge` 이름 중복 | cost edge와 nutrition edge master가 다른 도메인. export alias로 명확화하는 정도가 적절 |

---

## 5. 실행 플랜

### Phase 0. 기준 고정과 보호 장치

- 현재 dirty worktree에서 변경 대상 파일의 `git diff`를 먼저 확인한다.
- 기존 사용자 변경은 되돌리지 않는다.
- DB schema 변경, legacy store 제거, 데이터 삭제 마이그레이션은 별도 승인 전까지 하지 않는다.
- `docs/DEFERRED_WORK.md`와 이 문서의 관계를 정한다: 이 문서는 충돌/통합 후보, `DEFERRED_WORK.md`는 실제 착수/완료 상태.

**완료 기준**

- 이 문서가 최신 종합본으로 참조된다.
- 구현 티켓을 만들 때 각 항목의 우선순위와 테스트가 명확하다.

### Phase 1. 낮은 위험의 내비게이션 정리

- `/menu-sales` 허브에서 `/menu-sales/rank`, `/menu-sales/compare` redirect 카드를 제거하거나 "통합 페이지" 하나로 합친다.
- route 분류표를 문서와 QA 스크립트에 반영한다.
- 엣지 primary route를 결정하고 보조 route는 redirect/링크로 정리한다.
- `UploadDropzone` wrapper, nutrition/cost edge alias처럼 이름 혼동만 있는 항목은 rename 또는 주석만 정리한다.

**검증**

- `npm run qa:smoke`
- `/menu-sales`, `/cost`, `/cost/recipe?tab=edges`, `/cost/edge-dough` 수동 확인

### Phase 2. 식자재-메뉴 매핑 단일화

- `buildIngredientMenuMap()`을 단일 매핑 정책으로 확정한다.
- `buildIngredientUsageMap()`은 기존 return shape를 유지하는 adapter로 바꾼다.
- 사용현황 페이지에서 세트, 묶음, 엣지, 파생메뉴 데이터를 함께 로드한다.
- `getUsageMenuCounts()`에 세트/기타 카운트 정책을 추가하거나 UI에 영향이 크면 total 정확도부터 고정한다.

**검증**

- `__tests__/lib/ingredient-menu-map.test.mjs`
- `__tests__/lib/usage-menu-counts.test.mjs`
- 신규 `ingredient-usage-map.test.mjs`
- `/ingredient/usage` smoke 및 CSV/PDF 출력 확인

### Phase 3. 레시피 소스 정책 고정

- `recipe-source-precedence.js`를 모든 report/margin/usage/nutrition 집계의 공통 판단 함수로 사용한다.
- `cost_recipes`는 `legacy fallback`으로 표시한다.
- 빈 detail skeleton과 실제 작성 detail 레시피를 명확히 구분한다.
- `/cost/recipe-master`와 `/cost/recipe` 화면 문구를 역할 기준으로 정리한다.

**검증**

- `__tests__/lib/build-cost-report-recipes.test.mjs`
- `__tests__/lib/ingredient-menu-map.test.mjs`
- `__tests__/lib/recipe-master-sync.test.mjs`
- 원가 보고서, 마진표, 영양/원산지 자동집계 기준 비교

### Phase 4. 메뉴마스터-판매가 sync 정책 정리

- `syncMenuMasterFromPrices()`는 신규 메뉴 생성/가격 갱신만 하도록 제한한다.
- 기존 메뉴의 운영 필드는 보존한다.
- 충돌 후보를 반환해 UI에서 보여준다.
- `pushMasterToPrices()`는 master -> mirror 방향으로 유지한다.

**검증**

- 메뉴마스터 기존 상태/노트/숨김값 보존 테스트
- 판매가 mirror 갱신 테스트
- 메뉴 삭제 cascade 테스트

### Phase 5. cascade와 복원 안정화

- 메뉴마스터/식자재/노트 삭제에 delete plan preview를 추가한다.
- 노트 삭제는 descendant 전체를 수집한다.
- 복원은 store별 실행 전 전체 validation을 끝내고, 실패 store를 결과에서 강하게 노출한다.

**검증**

- `ingredient-delete-cascade.test.mjs`
- 노트 descendant 삭제 테스트
- backup/restore partial failure 테스트

### Phase 6. 대형 파일 분리

- 기능 안정화 후 파일별로 작게 진행한다.
- 우선순위:
  1. `app/note/_NoteContent.jsx`
  2. `app/report/sales/page.jsx`
  3. `app/note/sample/page.jsx`
  4. `lib/ingredient/store.js`
  5. `app/nutrition/allergen/page.jsx`
  6. `app/ingredient/manage/IngredientForm.jsx`

**검증**

- 각 파일 분리마다 기존 테스트 + 해당 화면 smoke.
- 기능 변경과 refactor-only diff를 섞지 않는다.

---

## 6. 추천 착수 순서

1. **백업/설정 정책 정리**: localStorage 선택 복원, 시스템 설정 key, source brand metadata를 먼저 고정.
2. **식자재 사용현황 정확도 보강**: `buildIngredientMenuMap` 기준으로 통합.
3. **레시피·menuCode 소스 정책 고정**: detail 우선, legacy fallback, base/full 기준을 전 사용처에 적용.
4. **메뉴마스터-판매가-영양 메뉴 기준 정리**: master identity, price mirror, nutrition-only 메뉴 허용 여부 확정.
5. **cascade/복원/destructive action 안정화**: 노트 descendant 삭제, 식자재 삭제 공통 undo, partial restore 대응.
6. **내비게이션/route metadata 정리**: 모바일 원가 탭, 보고서 비교 route, redirect 카드, 엣지 primary route 결정.
7. **CSS primitive와 대형 파일 분리**: 회귀 테스트가 잡힌 뒤 전역 `.btn`/`.card`와 대형 파일을 작게 분리.

---

## 7. 명시적 기본값

- 기존 데이터 store를 삭제하지 않는다.
- `cost_recipes`는 바로 제거하지 않고 legacy fallback으로 유지한다.
- `nutrition_allergy_links`는 잔여 데이터 0건 검증 전 제거하지 않는다.
- nutrition edge config와 cost edge/dough config는 통합하지 않는다.
- UI wrapper 수준의 중복은 무리하게 합치지 않고 이름/주석으로 역할을 명확히 한다.
- 모든 통합 작업은 `npm run test:ci`와 관련 route smoke를 기준 검증으로 삼는다.

---

## 8. 2차 전체 재스캔 추가 발견분

사용자 요청에 따라 1차 종합본 작성 후 다시 `app`, `components`, `hooks`, `lib`, `scripts`, `__tests__`, `app/styles`를 훑었다.

| 항목 | 추가 확인 결과 |
|---|---:|
| 소스/스타일/테스트 대상 파일 | 794개 |
| `app/**/page.jsx` route | 55개 |
| redirect route | 3개 |
| DB store 정의 | 49개 |
| schema 생성 누락 store | 0개 |
| 빈 `catch {}`/무시형 catch 후보 | 37줄 |
| CSS import 파일 | 22개 |
| 복수 CSS 파일에 걸친 전역 selector 후보 | 12개 이상 |

### 8.1 백업 localStorage 복원 gate가 `nutrition` 선택에 묶여 있음

- 구현 완료: `a9e1112 fix: restore scoped localStorage settings`
- 복원 화면에서 선택된 모듈별 영속 localStorage key만 골라 `importAll()`에 넘기도록 변경했다.
- 선택된 모듈이 없으면 공통 key도 복원 대상으로 만들지 않으며, `jette`/`nutrition`/공통 key 분리 테스트를 추가했다.

**관련 파일**

- `lib/nutrition/backup-keys.js`
- `lib/db/backup.js`
- `app/settings/restore/page.jsx`

**현재 상태**

- `PERSISTENT_LS_KEYS`는 영양뿐 아니라 노트, 샘플, 원가, 식자재, 홈, 제때, 프로필, 테마까지 포함한다.
- `exportSelected()`와 `exportAll()`은 이 전역 localStorage 묶음을 백업 파일에 넣는다.
- 복원 화면은 선택된 module scope에 해당하는 localStorage key subset만 `importAll()`에 넘긴다.

**충돌 가능성**

- 사용자가 원가, 노트, 홈, 제때 설정만 복원하려고 선택하면 해당 localStorage 설정은 백업 파일에 있어도 복원되지 않는다.
- 파일 이름은 "영속 설정"인데 복원 조건은 "영양성분 선택"이라 정책이 어긋난다.

**정리 방향**

- localStorage 복원 범위를 `nutrition`과 분리한다.
- 선택 UI에 `앱 설정/localStorage` 별도 scope를 만들거나, 선택된 module이 하나라도 관련 key를 가지면 해당 key만 복원한다.
- `restoreLocalStorage(map, keys)`에 module별 key subset을 넘길 수 있게 분리한다.

**검증**

- nutrition을 선택하지 않고 `v3:home-widgets`, `v3:jette-settings`, `v3:profile`이 복원되는지 테스트한다.
- nutrition만 선택하면 nutrition key만 복원되는지 테스트한다.

### 8.2 시스템 설정 저장소가 localStorage와 IndexedDB로 갈라져 있음

**구현 상태**

- 구현 완료: `315fc65 fix: include system settings in backup keys`, `179c2cd fix: apply jette policy settings`, `384f152 fix: enforce strict cost report posting`, `996c221 refactor: mark indexeddb settings store legacy`
- `lib/settings.js`에서 `SETTING_LS_KEYS`를 노출하고, `lib/backup/local-storage-keys.js`가 이 목록을 공통 localStorage 백업/복원 key로 사용한다.
- 구현 완료 범위: `theme`, `density`, `fontScale`, `autoRecalc`, `strictPosting`, `roundMode`, `unmatchedAlert`, `costRateAlert` localStorage 설정의 백업/복원 포함과 회귀 테스트.
- 구현 완료 범위: `unmatchedAlert`, `costRateAlert`는 실제 알림 로직에 연결했고, `autoRecalc`와 `roundMode`는 현재 정책에 맞게 조작 가능한 no-op 토글이 아니라 고정 상태로 낮췄다.
- 구현 완료 범위: `strictPosting`은 원가 보고서 생성 직전 단가 누락 레시피 구성품을 검사해 PDF/Excel 생성을 차단한다.
- 구현 완료 범위: `settings` IndexedDB store는 구버전/전체 백업 호환용 예약 store로 명시하고, 선택 백업 공통 store 범위에서는 제외했다.

**관련 파일**

- `lib/settings.js`
- `app/settings/system/page.jsx`
- `lib/db/schema/common.js`
- `lib/db/constants.js`
- `lib/db/module-stores.js`
- `lib/backup/local-storage-keys.js`

**현재 상태**

- IndexedDB에는 `settings` store가 정의되어 있고 `ALL_STORES`에는 남아 전체 백업/구버전 복원 호환성을 유지한다.
- 선택 백업의 공통 store(`COMMON_STORES`)에서는 `settings`를 제외했고, 실제 설정값은 localStorage key로 백업/복원한다.
- 실제 시스템 설정은 `lib/settings.js`가 `v3:<key>` localStorage에 저장한다.
- `app/settings/system/page.jsx`에서 읽는 설정 key는 `theme`, `density`, `fontScale`, `autoRecalc`, `strictPosting`, `roundMode`, `unmatchedAlert`, `costRateAlert`다.
- 현재 백업 영속 key에는 `SETTING_LS_KEYS` 기준으로 모든 시스템 설정 localStorage key가 포함된다.
- `theme`, `density`, `fontScale`은 UI dataset에 적용되고, `unmatchedAlert`, `costRateAlert`는 알림 로직에 연결된다.
- `autoRecalc`는 가격 업로드 이벤트 기반 자동 반영 상태로 표시하고, `roundMode`는 단가 1자리 반올림 고정 정책으로 표시한다.
- `strictPosting`은 시스템 설정에서 ON/OFF할 수 있고, ON이면 원가 보고서 생성 전 `recipeRows`의 단가 누락 구성품을 검사한다.

**충돌 가능성**

- 완료: `settings` IndexedDB store는 legacy/예약 store로 분류했고, 실제 설정 source of truth는 localStorage `SETTING_LS_KEYS`로 고정했다. (`996c221`)

**정리 방향**

- 구현 방향: 2안 기준으로 localStorage 설정을 실제 사용 source로 보고, 모든 실제 설정 key를 `PERSISTENT_LS_KEYS`와 `COMMON_LS_KEYS`에 포함했다.
- 완료: `settings` store는 legacy/예약 store로 명시하고 선택 백업 공통 store에서 제외했다. (`996c221`)
- 완료: 실제 로직에서 쓰이지 않는 정책 토글은 고정 상태 또는 `준비 중` 상태로 낮췄다. (`179c2cd`)
- 완료: `strictPosting`은 실제 원가 보고서 생성 차단 로직에 연결했다. (`384f152`)

**검증**

- 완료: `density`, `fontScale`, `autoRecalc`, `strictPosting`, `roundMode`, `unmatchedAlert`, `costRateAlert` 백업/복원 key 포함 테스트.
- 완료: 시스템 원가 정책 no-op 토글이 다시 노출되지 않는 소스 가드 테스트. (`179c2cd`)
- 완료: `strictPosting` 단가 누락 진단과 보고서 생성 직전 가드 소스 테스트. (`384f152`)
- 완료: `settings` 예약 store가 `ALL_STORES`에는 남고 `COMMON_STORES`/`storesForScopes()` 선택 백업 범위에서는 제외되는 회귀 테스트. (`996c221`)

### 8.3 멀티 브랜드 백업 파일에 source brand metadata가 없음

**구현 상태**

- 구현 완료: `44ce445 feat: record backup source brand metadata`
- 백업 JSON에 `sourceBrandId`, `sourceBrandName`, `sourceDbName`, `sharedDbName`을 포함한다.
- 복원 미리보기에서 백업 source 브랜드와 현재 복원 대상 브랜드를 함께 표시하고, 서로 다르거나 구형 백업이라 출처가 없으면 경고한다.
- 복원 미리보기에서 브랜드 DB로 들어가는 store와 공유 DB로 들어가는 store의 저장 위치를 안내한다.

**관련 파일**

- `lib/db/backup.js`
- `app/settings/backup/page.jsx`
- `app/settings/restore/page.jsx`
- `lib/active-brand.js`
- `lib/db/init.js`
- `lib/db/shared.js`

**현재 상태**

- 대부분의 store는 활성 브랜드 DB에 저장된다.
- 노트 패밀리는 `lib/db/shared.js`에 따라 항상 main DB에 저장된다.
- 백업 JSON에는 `sourceBrandId`, `sourceBrandName`, `sourceDbName`, `sharedDbName` metadata가 포함된다.
- 복원 미리보기는 백업 source 브랜드와 현재 target 브랜드를 함께 표시하고, 다르면 경고한다.
- shared store와 active-brand store는 복원 미리보기에서 저장 위치를 분리해 안내한다.

**충돌 가능성**

- 완료: source/target brand가 다르거나 구형 백업이라 source metadata가 없으면 복원 미리보기에서 경고한다. (`44ce445`)
- 완료: 노트처럼 main DB에 저장되는 shared store와 활성 브랜드 DB store의 저장 위치를 미리보기에서 구분한다. (`44ce445`)

**정리 방향**

- 완료: `exportSelected()` meta에 source brand 정보를 항상 포함한다. (`44ce445`)
- 완료: `app/settings/restore/page.jsx`에서 백업 source brand와 현재 target brand를 비교해 경고/확인 단계를 둔다. (`44ce445`)
- 완료: shared store와 active-brand store를 복원 미리보기에서 분리 표시한다. (`44ce445`)

**검증**

- 완료: main 백업을 non-main에 복원하려 할 때 강한 경고가 뜬다.
- 완료: non-main 백업을 main에 복원하려 할 때도 source/target mismatch를 보여준다.
- 완료: shared store는 main DB로, active store는 현재 브랜드 DB로 들어간다는 설명이 미리보기에 노출된다.

### 8.4 계정 store와 활성 계정 key의 범위가 애매함

**구현 상태**

- 부분 구현 완료: `211c7b7 fix: back up active account selection`
- `ACTIVE_ACCOUNT_KEY`를 `lib/auth/account-constants.js`로 분리해 순환 import 없이 백업 key 목록에서 재사용한다.
- 구현 완료 범위: 활성 계정 localStorage key `rnd_active_account_id`를 공통 localStorage 백업/복원 범위에 포함하고 회귀 테스트를 추가했다.
- 남은 범위: `ref_accounts`를 브랜드별 계정으로 둘지 shared/main DB의 전역 계정으로 옮길지 정책을 확정해야 한다.

**관련 파일**

- `lib/auth/account-constants.js`
- `lib/auth/accounts.js`
- `hooks/useCurrentRole.js`
- `app/settings/account/page.jsx`
- `lib/backup/local-storage-keys.js`
- `lib/db/module-stores.js`

**현재 상태**

- `ref_accounts`는 `COMMON_STORES`에 있어 백업 범위에는 항상 포함된다.
- 하지만 `ref_accounts` CRUD는 일반 `getAll`, `put`, `deleteById`를 써서 활성 브랜드 DB를 따른다.
- 활성 계정 ID는 localStorage `rnd_active_account_id`에 저장되며 공통 localStorage 백업/복원 key에 포함된다.

**충돌 가능성**

- "계정 관리"가 전역 시스템 설정인지, 브랜드별 계정 설정인지 명확하지 않다.
- 계정 목록과 활성 계정 선택은 함께 백업/복원되지만, 계정을 브랜드별로 볼지 전역으로 볼지 정책은 아직 불명확하다.
- active account id가 다른 브랜드의 account id와 우연히 겹치면 다른 권한으로 보일 수 있다.

**정리 방향**

- 계정이 전역이면 `ref_accounts`를 shared/main DB로 이동하고 active account key 정책을 정한다.
- 계정이 브랜드별이면 UI와 백업 문구에 "현재 브랜드 계정"이라고 명시한다.
- 완료: `rnd_active_account_id`는 공통 localStorage 백업/복원 범위에 포함한다. (`211c7b7`)

### 8.5 영양 메뉴 목록이 메뉴마스터 밖에서도 생성될 수 있음

**구현 상태**

- 구현 완료: `68aa43e fix: require menu master for nutrition menu refs`
- 영양성분 메뉴 추가는 메뉴마스터 menuCode 선택을 필수로 하며, 코드 없이 `MENU-*` 영양 전용 메뉴를 생성하지 않는다.
- 메뉴명과 카테고리는 메뉴마스터 선택값을 표시하는 read-only 흐름으로 바꿨다.
- `buildNutritionMenuRefPayload()` 테스트로 menuCode 없는 payload 생성을 차단한다.

**관련 파일**

- `hooks/useNutritionBaseEditor.js`
- `components/nutrition/menu/base/AddMenuModal.jsx`
- `lib/nutrition/values/store.js`
- `lib/menu-master/code-policy.js`
- `lib/menu-master/store.js`

**현재 상태**

- `nutrition_menu_ref`는 메뉴마스터와 별개 store다.
- 영양 메뉴 추가 시 메뉴마스터 menuCode 선택이 필요하다.
- 메뉴코드 없이 메뉴명만 넣는 `MENU-*` 영양 전용 메뉴 생성 경로는 제거됐다.
- 메뉴마스터 삭제 시 `nutrition_menu_ref`와 `nutrition_raw_values` cascade는 있지만, 메뉴마스터에 없는 영양 메뉴를 탐지하는 진단은 별도 확인이 필요하다.

**충돌 가능성**

- 메뉴마스터가 "전 모듈의 메뉴 기준"이라면 영양 전용 메뉴는 기준 밖 데이터가 된다.
- 원산지/알레르기/영양 출력에서 메뉴마스터에 없는 메뉴가 섞일 수 있다.

**정리 방향**

- 영양 전용 메뉴를 허용할지 정책을 정한다.
- 허용한다면 `source: nutrition-only` 같은 표시와 진단을 둔다.
- 허용하지 않는다면 AddMenuModal에서 메뉴마스터 선택을 필수로 바꾸고, 기존 `MENU-*` 레코드는 migration/진단 대상으로 둔다.

### 8.6 menuCode base/full 정책이 일부 화면에서 엇갈림

**구현 상태**

- 구현 완료: `0c72c95`, `4767b9e`, `9d68970`, `ad04fd7`
- 구형 `cost_recipes` 편집기와 base/full 혼합 fallback을 제거하고, 원가/레시피 기준을 full `menuCode` 기반 `menu_recipes`로 고정했다.
- 영양 메뉴/import는 계속 base code 정책을 사용하며, 원가/판매가/레시피는 full code 정책으로 분리된다.
- 구형 detail/cost recipe store 제거 테스트와 menu code policy 테스트가 기준을 검증한다.

**관련 파일**

- `lib/menu-master/code-policy.js`
- `components/ui/MenuCodePicker.jsx`
- `components/cost/recipe/RecipeEditor.jsx`
- `hooks/useRecipeWorkbenchData.js`
- `lib/recipe/store.js`
- `lib/nutrition/values/import.js`

**현재 상태**

- `code-policy.js`는 nutrition은 base code, cost detail/selling price는 full code라고 설명한다.
- `MenuCodePicker`는 mode에 따라 base/full을 고를 수 있다.
- 영양 메뉴와 영양 import는 base mode를 쓴다.
- 구형 원가 레시피 편집기와 `cost_recipes` store는 제거됐다.
- `menu_recipes`는 full `menuCode` 기준으로 원가/레시피 데이터를 연결한다.

**충돌 가능성**

- `cost_recipes`의 menuCode가 base인지 full인지 화면/주석/보고서가 다르게 이해할 수 있다.
- detail 레시피는 full menuCode 기준인데 legacy recipe fallback은 base code 기준이면 precedence 판단이 흔들릴 수 있다.

**정리 방향**

- `cost_recipes`의 menuCode 정책을 `legacy base code` 또는 `legacy mixed`로 명시한다.
- `recipe-source-precedence.js`에서 base/full normalize를 강제한다.
- 주석과 CSV export 헤더를 실제 정책에 맞게 수정한다.

### 8.7 모바일 원가 탭 진입점이 데스크톱과 다름

**구현 상태**

- 구현 완료: `5591241 refactor: redirect duplicate cost routes`
- 모바일 원가 탭은 구형 `/cost/pizza` 대신 `COST_MARGIN_ROUTE`로 이동한다.
- 사이드바 테스트에서 모바일 원가 탭이 원가마진표 route를 가리키는지 검증한다.

**관련 파일**

- `lib/menu.js`
- `app/cost/page.jsx`
- `app/cost/pizza/page.jsx`
- `app/cost/recipe/page.jsx`

**현재 상태**

- 데스크톱 사이드바의 원가 주요 진입점은 `/cost/ingredient-price`, `/cost/recipe`, `/cost/margin`이다.
- 원가 허브는 `/cost/pizza`, `/cost/edge-dough`, `/cost/side`, `/cost/personal`, `/cost/set`, `/cost/all-summary`까지 노출한다.
- 모바일 하단 탭은 원가 대표 href를 `COST_MARGIN_ROUTE`로 둔다.

**충돌 가능성**

- 모바일 사용자는 원가 대표 화면을 피자 원가표로 인식하고, 데스크톱 사용자는 원가 레시피/마진표로 인식할 수 있다.
- 같은 "원가" 탭에서 기기별로 다른 작업대가 열린다.

**정리 방향**

- 모바일 원가 탭을 `/cost` 또는 `/cost/recipe`로 변경한다.
- `/cost/pizza`는 카테고리별 원가표로 명시한다.
- route 분류표에 `mobile-primary`를 추가한다.

### 8.8 보고서 비교 route가 상수/허브에는 있고 사이드바에는 없음

**구현 상태**

- 구현 완료: `a43b683 refactor: derive report navigation from metadata`
- 보고서 사이드바 하위 메뉴를 `KIND_META`에서 파생하는 `REPORT_NAV_ITEMS`로 전환했다.
- `/report/menu-sales-compare`도 사이드바 보고서 하위 메뉴에 포함되며, 보고서 종류 metadata와 사이드바 route가 함께 검증된다.

**관련 파일**

- `lib/report/constants.js`
- `app/report/page.jsx`
- `app/report/menu-sales-compare/page.jsx`
- `lib/menu.js`
- `app/menu-sales/rank-compare/page.jsx`

**현재 상태**

- `KIND_META.compare`는 `/report/menu-sales-compare`를 보고서 종류로 정의한다.
- 보고서센터 허브의 5종 카드와 새 보고서 모달에서는 비교 보고서 접근이 가능하다.
- 사이드바 보고서 하위 메뉴는 `KIND_META`의 5종 생성 route를 모두 노출한다.
- `/menu-sales/rank-compare`에서는 "보고서 생성" 버튼으로 해당 route에 진입한다.

**충돌 가능성**

- 기능은 살아 있지만 사이드바만 보면 보고서 4종처럼 보인다.
- QA route 분류에서 "직접 메뉴 노출 누락"과 "의도된 허브 내부 route"를 구분해야 한다.

**정리 방향**

- 비교 보고서를 사이드바에 추가하거나, "판매량 비교 화면에서 생성하는 내부 보고서"로 route 분류를 고정한다.
- `KIND_META`에서 사이드바 노출 여부를 metadata로 관리하면 menu/hub drift를 줄일 수 있다.

### 8.9 노트 삭제가 parentId 체인 전체를 삭제하지 않음

**구현 상태**

- 구현 완료: `3bcd997 fix: delete full note child chains`
- 노트 삭제 시 현재 브랜드 범위의 parentId 하위 체인을 모두 재귀 수집한다.
- 부모와 모든 하위 노트를 한 트랜잭션에서 삭제하고, 삭제된 전체 레코드를 undo용으로 반환한다.

**관련 파일**

- `lib/note/store.js`
- `app/note/_NoteContent.jsx`
- `lib/db/shared.js`

**현재 상태**

- `deleteNote()` 주석은 "parentId 체인" 삭제라고 설명한다.
- 실제 구현은 부모와 직계 자식만 `getByIndex('parentId', id)`로 가져와 삭제한다.
- UI state 갱신은 `setNotes(prev => prev.filter(n => n.id !== note.id))`로 부모만 제거한다.
- undo는 삭제된 배열을 복원하지만 각 복원 실패는 `.catch(() => {})`로 무시된다.

**충돌 가능성**

- 손자/후손 노트가 DB에 남아 orphan이 될 수 있다.
- 삭제 직후 현재 목록에 직계 자식이 잔상으로 남을 수 있다.
- undo 일부 실패를 사용자가 알 수 없다.

**정리 방향**

- `getNotesInChain()` 또는 descendant collector를 삭제에도 사용한다.
- 삭제 후 UI state는 removed ids 전체를 기준으로 갱신한다.
- undo 복원 실패는 실패 건수 toast로 표시한다.

### 8.10 식자재 삭제 안전장치가 화면마다 다름

**구현 상태**

- 구현 완료: `8c39bed feat: consolidate ingredient management entrypoints`
- `/cost/ingredient-price`는 `/ingredient/manage?view=price`로 redirect되어 재료 단가표 별도 삭제 흐름을 더 이상 제공하지 않는다.
- 삭제 실행은 식자재관리 화면의 `deleteIngredient()`/`bulkDeleteIngredients()` 경로로 모이며, cascade warning, 실행취소, 부분 실패 toast를 공유한다.
- 회귀 테스트는 `ingredient-manage-undo-guards`, `ingredient-delete-cascade`, `sidebar-state` 계열에서 삭제 undo와 route 통합 기준을 확인한다.

**관련 파일**

- `app/ingredient/manage/page.jsx`
- `app/cost/ingredient-price/page.jsx`
- `lib/ingredient/store.js`

**현재 상태**

- 두 화면 모두 `bulkDeleteIngredients()`를 호출한다.
- 식자재 관리 화면은 cascade 경고와 실행취소를 제공한다.
- 재료 단가표 route는 식자재관리 가격 탭으로 redirect된다.

**충돌 가능성**

- 별도 재료 단가표 삭제 UI가 다시 생기면 복구 가능성, cascade 경고 노출이 화면별로 갈라질 수 있다.
- 신규 식자재 삭제 진입점은 식자재관리의 공통 삭제 helper를 재사용해야 한다.

**정리 방향**

- 유지 방향: destructive ingredient action은 식자재관리의 공통 삭제 흐름으로만 제공한다.
- 새 화면에서 삭제가 필요하면 `deleteIngredient()`/`bulkDeleteIngredients()` 결과의 `cascadeErrors`, `removed`, `failures`를 같은 toast/undo 정책으로 노출한다.

### 8.11 제때 설정과 시스템 설정의 자동화 토글이 실제 로직과 분리됨

**관련 파일**

- `app/settings/system/page.jsx`
- `lib/settings.js`
- `app/jette/settings/page.jsx`
- `lib/nutrition/backup-keys.js`

**현재 상태**

- 시스템 설정에는 `autoRecalc`, `strictPosting`, `roundMode`, `unmatchedAlert`, `costRateAlert`가 있다.
- 제때 설정에는 `priceAlertThreshold`, `autoRecalcOnUpdate`, `autoRegisterNew`가 있다.
- `unmatchedAlert`와 `costRateAlert`는 홈/상단 알림 표시에 반영된다.
- 자동 재계산 계열 토글은 가격 업로드 이벤트 기반 `항상 자동 반영` 상태로 정리했고, 사용자가 조작하는 no-op 토글로 노출하지 않는다.
- `v3:jette-settings`와 시스템 설정 localStorage key는 백업 key 범위에 포함된다.

**구현 상태**

- 구현 완료: `315fc65 fix: include system settings in backup keys`, `045ce2d fix: apply system alert settings`, `179c2cd fix: apply jette policy settings`, `384f152 fix: enforce strict cost report posting`
- `unmatchedAlert`는 TopBar/Sidebar/mobile badge/Home 미매칭 위젯/ModuleHealth 입력에 반영한다.
- `costRateAlert`는 Home 인사말, CostAlertWidget, ModuleHealth 원가율 알림 입력에 반영한다.
- `priceAlertThreshold`는 가격 비교 요약 카드와 비교 테이블 강조 조건에 반영한다.
- `autoRegisterNew`는 단가 업로드 후 새 제품코드를 관리품목에 `generic`/미관리 상태로 자동 등록한다.
- `autoRecalcOnUpdate`와 시스템 `autoRecalc`는 가격 업로드/삭제 이벤트가 열린 원가 화면을 갱신하는 현재 구조에 맞춰 `항상 자동 반영` 상태로 표시한다.
- `roundMode`는 사용자가 확정한 `g`/`개` 단가 소수점 1자리 반올림 정책에 맞춰 조작 가능한 세그먼트를 제거하고 고정 상태로 표시한다.
- `strictPosting`은 원가 보고서 생성 직전 단가 누락 레시피 구성품이 있으면 PDF/Excel 생성을 차단한다.

**충돌 가능성**

- 공통 보고서 shell에 생성 직전 가드가 추가됐으므로, 다른 보고서가 필요하면 같은 `onBeforeGenerate` 흐름을 재사용할 수 있다.

**정리 방향**

- 완료: 실제 동작이 없는 설정은 "준비 중"으로 숨기거나 설명을 바꾼다.
- 완료: 실제 동작이 필요한 제때 설정은 전용 설정 reader로 읽는다.
- 완료: 자동 재계산은 가격 업로드 이벤트 기반 `항상 자동 반영` 상태로 정리한다.
- 완료: `strictPosting`은 원가 보고서 발행 가드로 연결한다.

### 8.12 CSS 전역 selector 책임이 여러 파일에 분산됨

**구현 상태**

- 구현 완료: `4d378dd refactor: centralize css primitives`
- `.card`, `.btn`, `.input`, `.chip`, `.filter-chip` 기본 스타일은 `app/styles/base.css`의 Global Primitives 섹션으로 모았다.
- `home-hero.css`, `home-body.css`, `features.css`에서는 해당 primitive 본체 정의를 제거했다.
- `css-primitive-ownership` 테스트가 base 소유권, feature/home 재정의 금지, motion 파일의 additive-only 버튼 보강을 고정한다.

**관련 파일**

- `app/globals.css`
- `app/styles/base.css`
- `app/styles/tokens.css`
- `app/styles/components/home-hero.css`
- `app/styles/features/motion.css`
- `app/styles/features/motion-note.css`
- `app/styles/features/motion-report.css`
- `app/styles/features/report/builder.css`

**현재 상태**

- `globals.css`는 22개 CSS 파일을 순서대로 import한다.
- `.btn`, `.card`, `.input`, `.chip`, `.filter-chip` primitive 본체는 `base.css`가 소유한다.
- `.topbar`, `.sidebar`, `.bottom-tab-bar`, `.report-kind-grid-5` 같은 layout/feature selector는 각 영역 CSS에 남아 있다.
- `motion.css`/`motion-note.css`/`motion-report.css`의 `.btn`은 transition, position, overflow 같은 보강만 허용한다.

**충돌 가능성**

- 홈 전용처럼 보이는 파일이 앱 전체 버튼 스타일을 소유한다.
- import 순서를 바꾸거나 특정 feature CSS를 수정하면 전역 버튼/카드가 예상 밖으로 바뀔 수 있다.

**정리 방향**

- 완료: `.btn`, `.card`, `.input`, `.chip`, `.filter-chip` primitive는 `base.css` 한곳으로 모은다.
- 완료: motion 파일은 `.btn` 본체를 다시 정의하지 않고 additive class나 media query만 둔다.
- report grid처럼 중복 media query가 있는 selector는 report CSS 내부에서만 관리한다.

### 8.13 무음 실패 처리 후보가 아직 남아 있음

**구현 상태**

- 구현 완료: `9a565dd fix: surface note undo restore failures`, `866c6fd fix: report localStorage restore failures`, `44b2e55 test: guard silent catch policy`
- 노트 삭제 실행취소의 `restoreRecord(...).catch(() => {})`를 제거하고, 복구 실패 건수를 error toast로 노출한다.
- 삭제 직후 UI state도 삭제된 부모/하위 노트 전체 id 기준으로 갱신한다.
- `importAll()`의 localStorage 복원 실패는 결과 `errors`에 `localStorage` 항목으로 보고한다.
- `silent-catch-policy` 테스트가 app/components/hooks/lib의 빈 `catch {}`와 빈 Promise catch를 명시 allowlist에 고정한다.
- 삭제 실행취소, 복원 일부 실패, localStorage 복원 실패는 무음 처리하지 않는다는 소스 가드를 둔다.

**관련 파일**

- `lib/db/backup.js`
- `lib/nutrition/backup-keys.js`
- `app/note/_NoteContent.jsx`
- `hooks/useLocalStorage.js`
- `hooks/useSettingsAuth.js`
- `lib/note/storage.js`
- `components/sales/shared/SectionUtils.jsx`

**현재 상태**

- 빈 `catch {}`와 빈 Promise catch는 allowlist 테스트에 등록된 위치만 허용된다.
- storage 접근 실패처럼 무시 가능한 경로와 localStorage 복원 실패/undo 복원 실패처럼 사용자에게 알려야 하는 경로를 테스트로 분리했다.
- 노트 삭제 undo 복원 실패와 localStorage 복원 실패는 사용자/결과 객체에 노출되도록 정리됐다.

**정리 방향**

- 완료: storage 편의 기능, visual effect, cleanup, work-log 같은 best-effort 경로만 무음 허용 목록으로 둔다.
- 완료: 백업/복원, 삭제/undo, 데이터 저장 실패는 `errors` 배열 또는 toast로 노출하는 가드를 둔다.
- 완료: `silent-catch-policy` 테스트로 빈 catch가 다시 늘어나는 것을 막는다.

---

## 9. 보강 실행 플랜

### Phase A. 백업/설정 정책 정리

- `PERSISTENT_LS_KEYS`를 module별 key map으로 분리한다.
- restore에서 localStorage 복원 조건을 `nutrition` 선택과 분리한다.
- 완료: 시스템 설정 key 전체의 백업 포함 정책을 확정하고 `SETTING_LS_KEYS` 기준으로 반영했다. (`315fc65`)
- 완료: `settings` IndexedDB store를 legacy/reserved placeholder로 명시하고 선택 백업 공통 범위에서 제외했다. (`996c221`)
- 완료: 백업 JSON에 source brand metadata를 추가했다. (`44ce445`)

**검증**

- localStorage 선택 복원 테스트.
- source/target brand mismatch 미리보기 테스트.
- 시스템 설정 백업/복원 fixture.

### Phase B. 메뉴 기준 정책 정리

- `nutrition_menu_ref`가 메뉴마스터 밖 메뉴를 허용하는지 결정한다.
- `MENU-*` 영양 전용 메뉴 진단을 추가한다.
- `cost_recipes` menuCode base/full 정책을 `recipe-source-precedence.js`에 고정한다.
- 구형 레시피 주석과 CSV 헤더를 실제 정책에 맞춘다.

**검증**

- 메뉴마스터 없는 nutrition 메뉴 진단 테스트.
- base/full normalize precedence 테스트.
- 영양 import와 원가 레시피 저장 smoke.

### Phase C. destructive action 공통화

- ingredient delete helper/hook을 만들어 관리 화면과 재료 단가표가 같은 경고/undo를 쓰게 한다.
- note delete를 descendant 전체 삭제로 고친다.
- undo 일부 실패를 toast/결과로 노출한다.

**검증**

- 식자재 삭제 cascade + undo 테스트.
- 노트 parent/child/grandchild 삭제 및 undo 테스트.

### Phase D. 내비게이션/route metadata 정리

- `KIND_META`에 sidebar 노출 여부를 추가하거나 사이드바 보고서 메뉴를 `KIND_META`에서 생성한다.
- 모바일 원가 primary route를 `/cost` 또는 `/cost/recipe`로 바꾼다.
- redirect/internal/hub/mobile-primary route classification을 문서와 QA 스크립트에 반영한다.

**검증**

- `scripts/full-rt.mjs` route classification 테스트.
- 모바일/데스크톱 주요 진입 route smoke.

### Phase E. CSS primitive 정리

- `.btn`, `.card`, `.input`, `.modal-box`를 primitive layer로 이동한다.
- feature/motion CSS는 primitive 재정의 대신 modifier/additive class만 둔다.
- import 순서 의존 selector를 목록화한다.

**검증**

- 주요 route screenshot smoke.
- `.btn`/`.card` computed style 회귀 확인.

### Phase F. no-op 설정 정리

- 완료: `autoRecalc`, `autoRecalcOnUpdate`, `roundMode`, `unmatchedAlert`, `costRateAlert`, `priceAlertThreshold`, `autoRegisterNew`의 실제 동작 또는 표시 정책을 정했다. (`179c2cd`)
- 완료: `strictPosting`은 원가 보고서 생성 직전 단가 누락 구성품 차단으로 연결했다. (`384f152`)

**검증**

- 완료: 제때 설정 정규화, 가격 임계값 판정, 신규 제품 자동등록 후보, 설정 사용처 소스 가드 테스트. (`179c2cd`)
- 완료: `strictPosting` 단가 누락 진단, 생성 직전 가드 순서, 시스템 설정 토글 소스 가드 테스트. (`384f152`)
- 백업/복원 후 설정 동작 유지.
