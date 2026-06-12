# 보류·정비 작업 단일 출처 (Deferred Work)

> 이 파일이 미루어진 모든 작업 + 정비 이력의 **단일 최종 출처**입니다.
> 새 보류 항목은 위험도에 맞춰 아래 플랜에 추가하고, 완료 시 상태를 `✅ 완료`로 바꾸고 완료일을 기입하세요.

---

## 범례

| 기호 | 의미 |
|------|------|
| 🔴 고위험 | 다중 store 수정 / 집계 결과 변경 → 회귀 위험 큼 |
| 🟡 중위험 | 단일 모듈 구조 변경, 충분한 테스트 필요 |
| 🟢 저위험 | UI 정보·안내 개선, 사이드이펙트 없음 |
| ⏸ 보류 | 아직 시작 안 함 |
| 🚧 진행 중 | 현재 작업 중 |
| ✅ 완료 | 구현·테스트 완료 |

---

## 완료 이력 (QA 라운드 순)

### QA 라운드 2 — ✅ 2026-06-12 이전 완료
satFat→fat 변환, BOM 통일, usePagination 훅, useDBLoad 부분 도입, ModalFrame z-index 통일, 보고서 생성 날짜 저장, 식자재 단가 이력 정렬

### QA 라운드 3 (12건) — ✅ 2026-06-12 커밋 3480850
A1: export failedStores manifest / A2: 보고서 수동 정리 버튼 / A3: 분류 토글 confirm 게이트 / A4: 복원 공통 store 안내 / B1: edgeSearch 선택 초기화 / B2: useDBLoad error UI / C1: CSV filtered 기반 / C2: 단가 정렬 라벨 / C3: 페이지 리셋 / C4: ModalFrame+ConfirmDialog ARIA / C5: qa-prod 포트 가드

### QA 라운드 4 (5건 구현 + 1건 조사) — ✅ 2026-06-12
- A-3: `downloadCsvText` 헬퍼 추가 → recipe/menu-master CSV 즉시 revoke 제거
- A-6: note/[id] + sample/[id] `if (saving) return` 재진입 가드
- A-8: 인쇄 팝업 5곳 `window.onafterprint = () => window.close()`
- A-11: origin-result.css `@media screen { .origin-result-table { min-width: 720px } }`
- A-D2: 데이터 삭제 confirm 문구 통일 ("되돌릴 수 없습니다." 포함)
- 항목5(조사): 파생메뉴 탭 그룹 — 이미 부모 카테고리 상속으로 정상 동작

### 안정화 라운드 (구 STABILIZATION_STATUS) — ✅ 2026-06-12
핵심 수정: 공유 스토어 main DB 라우팅, `replaceStore` clear+put 단일 트랜잭션(500건+ 복원), 영양 복원 localStorage gate, 파생메뉴 영양·알레르기 집계 반영, 베이스 메뉴 삭제 confirm, `build:clean` 포트 가드, smoke-qa networkidle 안정화, CSV/Excel 안전성(시트명 31자·금지문자), 사진 `contain`, BOM 제거, 조지방(fat) 라벨 전환, 추가토핑 알레르기 name fallback, favicon 200.
검증: `lint` 통과 · `test:ci` 131 suite/749 test · `qa:smoke` 22/22 · `qa:runtime` 60/60.

### 정합성 감사 CL1~CL8 (구 NEXT_TASKS) — ✅ 2026-06-11
모듈 연결 기준값(menuCode·productCode·category·compositeOf) 정합성 감사 8건 모두 코드 반영·검증 완료.
- **CL1** 영양 메뉴/원시값 중복 방지(menuCode·menuCode+crustType upsert 가드 + 저장 전 진단 UI) — `4ff4941`
- **CL2** 알레르기 링크를 식자재(`ingredientId`/`productCode`) 기준으로 정렬, 잘못된 메뉴 cascade 제거 — `d5a0b9f`
- **CL3** 식자재 `productCode` 중복 가드 + 진단/복구 UI(`ingredient/manage`) — `5df8e34`
- **CL4** 합산 식자재 가격 `resolveCompositePrice()` 공통화(엄격·부분 모드) — `3f7b509`
- **CL5** 원가 detail(personal/side/set)에 `menuCode` 인덱스 + 마이그레이션 — `fc7063a`
- **CL6** `normalizeMenuCodeForModule()` + `MenuCodePicker mode`로 base/full 정책 명시(`lib/menu-master/code-policy.js`) — `bdd3cd7`
- **CL7** 카테고리 판정 `lib/menu-master/category-policy.js`로 공통화(`isPizzaCategory` 등, 원가·영양·판매 전역 import) — `fc90148`
- **CL8** 제때 가격 row `productCode` 중복 dedupe + 진단 — `9c8014e`
검증: 125 suite/723 test, `lint`·`build`·`qa:smoke`(22 route, 콘솔 오류 0) 통과.
잔여: 알레르기 `nutrition_allergy_links` legacy store 제거(→ B-3), `_isPizzaMenu` wrapper 정리(→ B-2 소규모), 판매량 업로드 중복 진단 UI(→ C-2).

### 원가 관리 탭 인라인 수정·삭제·정렬 (구 NEXT_TASKS 후반) — ✅ 구현됨
원가 관리 탭(B~H)의 인라인 수정·체크박스 삭제·컬럼 정렬 기능 구현 확인.
- `components/cost/manage/table-utils.js` — `sortRows()` + `useCostManageTable()`(정렬·페이지네이션 훅)
- `MenuPriceRow.jsx`(menuCode/category/menuName/price inlineSave + 선택 체크박스), `MasterRow.jsx`, `CostDetailView.jsx`, `EdgeEditModal.jsx` 등
- toast 안내·인라인 확인 UI 정책(`alert/confirm` 금지) 반영.

---

## A. 완료된 정비 (QA/버그 정비 — 구 BUG_FIX_PLAN)

> 2026-06-09 버그/QA 정비 계획에서 출발한 항목. 검증 후 아래와 같이 정리.
> 검증 기준: `npm test` 112 suite / 667 test 통과, `npm run lint` 무경고, `npm run build` 통과.

| 항목 | 상태 | 근거 |
|------|------|------|
| `build:clean`·`qa:runtime`·`qa:prod`·`test:ci` 스크립트 추가 | ✅ 완료 | `package.json` scripts |
| 프로덕션 QA 일괄 경로(.next 삭제→build→start→smoke→runtime→종료) | ✅ 완료 | `scripts/qa-prod.mjs` |
| Playwright QA helper `BASE`/`QA_BASE` + 인증 쿠키 공통화 | ✅ 완료 | `scripts/qa-browser-utils.mjs` (`getQaBase`/`newAuthedContext`) |
| 보조 검증 스크립트 복구(인증 주입·현재 selector·active-class) | ✅ 완료 | `verify-dashboard.mjs`·`verify-4th.mjs`·`verify-data-path.mjs` |
| 익명화 업무 CSV fixture + 회귀 테스트 | ✅ 완료 | `__tests__/fixtures/business/*.csv`(6종) + `business-fixtures.test.mjs` |
| `.next` 오염 시 `next start` 모듈 오류 회피 | ✅ 완료 | `clean-build.mjs` connect 방식 포트 감지 |
| Prettier 적용으로 `format:check` 통과 | 🟡 부분 | 불일치 **499 → 31개**로 감소. 잔여 31개 미정리 → 아래 C-4 참조 |

---

## A2. 화면/기능 맵 검증 (구 FEATURE_MAP) — 전 화면 구현 완료 ✅

> 2026-06-12 `docs/FEATURE_MAP.md`에 정리됐던 42개 화면을 실제 `app/` 라우트와 대조.
> **문서에 적힌 모든 화면이 구현되어 있음**(누락 0건). 따라서 보류 항목 없음 — 이 섹션은 완료 기록.
> 위험도 A/B/C는 **수동 QA 기준**(아래 표)이며, B 섹션의 저/중/고위험(회귀 위험)과는 다른 축임.

수동 QA 위험도 기준: **A** = 읽기·표시 안정성(자동 smoke로 충분) · **B** = 업무 데이터 결과 영향(실파일 확인 필요) · **C** = 저장/삭제/복원·원가·엑셀 출력(테스트 데이터+백업 필요).

| 모듈 | 구현 화면 | 최고 위험도 |
|------|-----------|------------|
| 공통/설정 | `/`, `/login`, `/settings/system`, `/settings/account`, `/settings/backup`, `/settings/restore` | C(백업·복원) |
| 메뉴 판매량 | `/menu-sales/rank`, `/upload`, `/rank-compare`, `/unmatched`, `/settings` | C(업로드·미매칭·룰) |
| 제때/식자재 | `/jette/price-compare`, `/jette/settings`, `/jette/shipment`, `/ingredient/manage`, `/ingredient/list`, `/ingredient/usage` | C |
| 메뉴마스터/원가 | `/menu-master`, `/cost`, `/cost/ingredient-price`, `/recipe`, `/margin`, `/all-summary`, `/edge-dough`, `/pizza`, `/personal`, `/side`, `/set` | C |
| 영양성분/원산지 | `/nutrition`, `/nutrition/menu`, `/allergen`, `/origin`, `/export` | C(출력) |
| 노트 | `/note`, `/note/write`, `/note/[id]`, `/board`, `/calendar`, `/sample` | C(작성·달력) |
| 보고서 | `/report`, `/sales`, `/price`, `/shipment`, `/cost`, `/menu-sales-compare` | C(원가 보고) |

**문서에 없던 추가 구현(맵 갱신 필요, 기능 자체는 정상):**
- `/note/journal` — 저널 화면(638줄, 실기능). FEATURE_MAP에 미기재.
- `/note/sample/write`, `/note/sample/[id]` — 샘플 작성·상세 하위 라우트.
- `/cost/manage`, `/menu-sales/compare`, `/settings`(허브) — 얇은 리다이렉트/허브 래퍼.

> 결론: FEATURE_MAP은 **참조용 인벤토리**였고 미구현·보류 항목이 없으므로 B 플랜에 추가할 신규 항목 없음. 단, 위 추가 라우트는 향후 문서/온보딩 시 반영.

---

## A3. 안정화 우선순위 작업 검증 (구 STABILIZATION_STATUS §8)

> STABILIZATION_STATUS 8장(데이터 손상 방지·정합성·UX·품질 게이트) 항목을 실제 코드와 대조.
> 대부분 QA 라운드 3/4에서 처리 완료. 미처리분만 아래 B/C 플랜으로 이관.

| 우선순위 항목 | 상태 | 근거 / 이관처 |
|---------------|------|---------------|
| 백업 export 실패 처리(manifest) | ✅ 완료 | QA R3 A1 + `backup-validation.test.mjs` |
| 대용량 복원 보완(트랜잭션) | ✅ 완료 | `replaceStore` 단일 트랜잭션 + `backup-restore-impact`·`backup-scope-coverage` 테스트 |
| 부분 복원 범위 안내 | ✅ 완료 | QA R3 A4 |
| 보고서 자동 삭제 제거 | ✅ 완료 | QA R3 A2(수동 정리 버튼) |
| 메뉴판매량 자동 재분류 분리 | ✅ 완료 | QA R3 A3(confirm 게이트). 신규대상 한계는 → **B-4** |
| 메뉴마스터 삭제 동기화(판매가 mirror) | ⏸ 보류 | → **B-1**(cost_selling_prices 포함하도록 보강) |
| 합산 식자재 가격 정책 통일 | ✅ 완료 | `lib/cost/composite-price.js` 공통 util 존재 |
| 원가 detail menuCode 인덱스 통일 | ✅ 완료 | `lib/db/schema/cost.js` — pizza/personal/side/set 전부 `menuCode` 인덱스 |
| 메뉴코드 base/full 정책 명시·util화 | ✅ 완료 | CL6 `normalizeMenuCodeForModule`(`lib/menu-master/code-policy.js`) |
| 영양/식자재 중복 차단·진단 | ✅ 완료 | CL1·CL3 저장 가드 + 진단 UI(`nutrition/menu`·`ingredient/manage`). 판매량 업로드 진단만 → **C-2** |
| 알레르기 링크 기준 정리 | 🟡 부분 | CL2 식자재 기준 정렬 완료. legacy store 제거만 → **B-3** |
| 피자 카테고리 판정 공통화 | ✅ 완료 | CL7 `lib/menu-master/category-policy.js`(전역 import). `_isPizzaMenu` wrapper만 → **B-2** |
| 삭제 확인 UX 통일(영양·샘플·노트) | ✅ 완료 | 안정화 §1 + QA R4 A-D2 |
| 원가 테이블 선택 상태 prune | ✅ 완료 | QA R3 B1(edgeSearch) |
| 로드 실패/빈 상태 구분 | ✅ 완료 | QA R3 B2(useDBLoad error UI). 전면 확산은 → **B-5** |
| CSV 필터 기준·정렬 라벨·페이지 리셋·모달 ARIA | ✅ 완료 | QA R3 C1·C2·C3·C4 |
| `format:check` 산출물 제외 | ✅ 완료 | `.prettierignore`에 `.next.stale-*` 존재. 코드 잔여는 → **C-4** |
| `qa:prod` 포트 충돌 방지 | ✅ 완료 | QA R3 C5 |
| 드래그 정렬 접근성 안내 확인 | ⏸ 보류 | → **C-6**(신규) |
| 테스트 보강(BOM 복원·체크리스트↔연구일지) | ⏸ 보류 | → **C-7**(신규). Excel 시트명·알레르기 fallback 테스트는 존재 |

**최종 build / 수동 시나리오**(안정화 §4·§6)는 코드 보류 항목이 아닌 **운영 체크리스트**(릴리스 시 매번 수동 확인)로, `docs/RELEASE_CHECKLIST.md`·`docs/QA_CHECKLIST.md` 소관.

---

## B. 보류 작업 플랜 (위험도 순)

> 진행 시 위에서 아래로(고위험 먼저 충분히 검토, 저위험은 언제든 착수 가능).
> **항목 번호는 등록순 ID이며, 배치는 위험도순입니다** (B-15·B-16 등 번호가 섞이는 것은 이 이유).

### 🔴 고위험 — 다중 store / 집계 결과 변경

#### B-1. 메뉴마스터 삭제 cascade  🔴 ⏸
- **파일**: `lib/menu-master/store.js`(`deleteMenuMaster`; `lib/menu-master/index.js`로 re-export), `lib/nutrition/`, `lib/sales/`, `cost_selling_prices`(판매가 mirror)
- **문제**: `deleteMenuMaster`는 `menu_master` store만 삭제. 원가(`cost_recipes`)·영양(`nutrition_menu_ref`)·판매량(`sales_rows`)·**판매가 mirror(`cost_selling_prices`)**에 orphan 레코드 잔존. 판매가 mirror가 남으면 삭제한 메뉴가 다시 생성될 수 있음. 현재는 삭제 다이얼로그 경고 표시만.
- **해결 방향**: 삭제 전 관련 store orphan 목록 미리보기 → ConfirmDialog → 동적 import로 각 모듈 cascade 삭제(판매가 mirror 정리 또는 tombstone 정책 포함).
- **왜 보류**: 여러 store 동기 삭제는 트랜잭션 범위 조율 필요. 잘못 구현 시 정상 데이터 소실 위험.
- **관련 메모리**: [[db-write-footguns]]


#### B-15. 식자재 삭제 실행취소(undo) cascade 복구 불완전  🔴 ⏸
- **파일**: `lib/ingredient/store.js`(`deleteIngredient` store.js:463), `app/ingredient/manage/page.jsx`(undo: 326~332·394~397행)
- **문제**: `deleteIngredient`는 `cost_ingredients` 삭제 시 영양값(`deleteIngredientValueByCode`)·알레르기 링크(`deleteAllergenLinksByIngredient`)까지 cascade 삭제하지만, **반환·복원은 `cost_ingredients` 원본 레코드 1건뿐**. undo(`restoreRecord('cost_ingredients', backup)`)는 식자재 본문만 되살리고 **cascade 삭제된 영양값·알레르기 링크는 복구하지 못함** → 사용자는 "실행취소"로 완전 복구됐다고 오인, 조용한 데이터 손실.
- **해결 방향**: 삭제 시 cascade 대상(영양값·알레르기 링크) 스냅샷도 함께 반환 → undo에서 3개 store를 모두 복원. 또는 cascade를 soft-delete(tombstone)로 전환해 undo 일괄 복구.
- **왜 보류**: 다중 store 복원 트랜잭션 조율 필요. [[db-write-footguns]](삭제 Undo는 반환 레코드로 복원) 원칙과 충돌 → 반환 구조 확장 설계 필요.
- **출처**: SITE_IMPROVEMENT_AUDIT §13.5·§13.6 최우선 확인 항목.

---

### 🟡 중위험 — 단일 모듈 구조 변경 / 테스트 필요

#### B-3. 알레르기 링크 테이블(legacy) 정리  🟡 부분 완료
- **파일**: `lib/db/constants.js`·`lib/db/module-stores.js`·`lib/db/schema/nutrition.js`(store 정의 6곳), `lib/nutrition/allergen/`
- **완료(2026-06-12)**: `lib/nutrition/dashboard.js`의 `allergenRate` 계산을 `nutrition_allergy_links`(legacy, 사실상 빈 store) → `cost_ingredients.allergens`(CL2 이후 단일 출처)로 교체. 이전에는 legacy store가 비어 allergenRate가 항상 0이었던 버그 수정.
- **잔여**: `nutrition_allergy_links` store 정의 제거(constants·module-stores·schema 6곳), `saveIngredientAllergens` 함수·`migrate-to-ingredient.js` 제거. `deleteAllergenLinksByIngredient` cascade는 store가 없으면 `hasStore` 가드로 안전하게 no-op.
- **왜 잔여 보류**: 스키마 store 제거는 브랜드별 DB 마이그레이션·데이터 확인 필요. 기능 영향 없어 우선순위 낮음.

#### B-4. reclassifyAllFiles 신규 미분류 대상 처리  ✅ 구현됨(검증 2026-06-12)
- **확인**: `lib/sales/reclassify.js`는 `sales_rows`에서 `status:'unclassified'` 행도 **rawMenuName 기준으로 재구성해 re-classify**함 — `sourceRows`가 status 필터 없이 모든 원본 행을 포함하기 때문. 규칙 추가 후 `reclassifyAllFiles`를 실행하면 이전 미분류 행이 새 규칙에 매칭돼 정상 분류됨. 재업로드 불필요.
- **출고량(shipment) 한계**: `lib/shipment/`의 `filterTargetRows`만 신규 대상 재반영 한계 존재([[classification-staleness]] 출고량 항목). 이는 별도 모듈 문제로 판매량과 무관.

#### B-5. useDBLoad 전면 확산  🟡 ⏸
- **파일**: 직접 `getAll()`·`initDB()` 호출하는 페이지 다수
- **문제**: 일부 페이지가 `useDBLoad` 대신 useEffect + 직접 DB 호출 패턴 사용. 에러 핸들링·로딩 상태 누락.
- **해결 방향**: 각 페이지를 `useDBLoad` 패턴으로 통일. 에러 UI와 함께 진행.
- **왜 보류**: 변경 범위 넓음. 회귀 위험 > 현재 효과. 안전 우선.
- **관련 메모리**: [[deferred-refactors]]

#### B-6. 대형 컴포넌트 분해  🟡 ⏸
- **파일**: `app/note/calendar/page.jsx`(900줄+), `app/ingredient/list/page.jsx`(800줄+) 등
- **문제**: 단일 파일이 너무 커서 유지보수 어려움.
- **해결 방향**: 기능별 서브컴포넌트 분리. 상태 관리 훅 추출.
- **왜 보류**: 효과 < 회귀 위험. 기능 추가 시점에 함께 진행 예정.
- **관련 메모리**: [[deferred-refactors]]

#### B-7. localStorage 백업 범위 확대  🟡 ⏸  _(선행: B-10 정책 결정)_
- **파일**: `lib/nutrition/backup-keys.js`(NUTRITION_LS_KEYS), `lib/db/operations.js`(exportSelected)
- **문제**: nutrition 키 6종만 수집. 누락: `v3:note-calendar-checklist`, `v3:ingredient-usage-hidden`, `v3:ingredient-usage-excl-menus`, `v3:recipe-sort` 등
- **해결 방향**: 모듈별 키 수집 조건 설계 후 백업 포맷·복원 매칭 로직 확장.
- **왜 보류**: 백업 포맷 변경. [[multi-brand]] 브랜드 스코프 검토 필요. 정책(B-10) 결정 후 진행.

#### B-8. 칸반 드래그 순서 원자성  ✅ 완료(2026-06-12)
- **완료**: `lib/note/store.js`에 `bulkUpdateBoardOrder(updates)` 추가 — 단일 `runTransaction`으로 boardOrder 일괄 갱신. `app/note/board/page.jsx` 같은 컬럼 reorder + 크로스 컬럼 move 모두 교체. `lib/note/index.js` re-export 추가.

#### B-9. 1인피자 알레르기 표시 기준 정리  🟡 ⏸
- **파일**: `lib/nutrition/label/build.js:265`, `app/nutrition/allergen/page.jsx:345`
- **문제**: 라벨은 씬바사삭L만 출력, 알레르기 화면은 4크러스트 전부 생성 → 불일치.
- **해결 방향**: 도메인 확인(1인피자가 씬바사삭만 맞는지) 후 allergen 행 생성 필터 통일.
- **왜 보류**: 알레르기 출력은 법적 표기 영향. 도메인 확인 필수.

#### B-10. menuCode 중복 사전 검증/안내  🟡 ⏸
- **파일**: `lib/menu-master/store.js`(`upsertMenuMaster`, store.js:60~), `app/menu-master/page.jsx`
- **문제**: 신규 저장 시 동일 menuCode가 있으면 `upsertMenuMaster`가 조용히 기존 레코드를 `put`(`mode:'update'` 반환)하지만, UI는 이를 구분 없이 "저장 완료"로 안내 → 사용자가 병합 사실을 모름. (영양/식자재 중복은 CL1/CL3에서 처리됐으나 menu_master 저장 UX는 별개.)
- **해결 방향**: 반환된 `mode:'update'`를 활용해 (a) 저장 전 ConfirmDialog "기존 항목을 덮어쓸까요?" 안내, 또는 (b) 토스트 문구를 "기존 항목 갱신"으로 구분.
- **왜 보류**: 저장 흐름 UX 변경. 방향 결정 필요.

#### B-11. 인쇄 CSS `.chip` 숨김 범위 조정  🟡 ⏸
- **파일**: `app/globals.css:8408`
- **문제**: `@media print { .chip { display:none !important } }` 전역 → 표 안 카테고리/태그 데이터 칩, nutrition 뷰 토글 칩까지 인쇄에서 사라짐.
- **해결 방향**: `.filter-bar .chip` 또는 필터 칩에만 `.no-print` 부여. 모든 인쇄 경로 시각 검증 필요.
- **왜 보류**: 전역 CSS 수정 → 모든 인쇄 경로 교차 영향. 시각 검증 필요.

#### B-12. 연구일지 PDF 긴 내용 페이지 분할  🟡 ⏸
- **파일**: `app/note/journal/page.jsx:134`
- **문제**: `page-break-inside:avoid` + `overflow:hidden` → 페이지 높이 초과 카드 클리핑/빈 공간.
- **해결 방향**: 카드 overflow·max-height·photos 분할 재조정. 인쇄 결과 시각 검증 필요.
- **왜 보류**: 데이터·사진 양에 따라 달라짐. 시각 검증 필수.

#### B-13. build:clean 가드 범위 확대(프로세스 감지)  🟡 ⏸
- **파일**: `scripts/clean-build.mjs`
- **문제**: `isPortBusy`가 포트 3000만 점검. 다른 포트(3001 등)로 띄운 dev는 감지 못 함.
- **해결 방향**: 현재 프로젝트의 `next dev` 프로세스 감지 추가(`ps`로 cwd·명령행 매칭).
- **왜 보류**: OS별(win32) 처리 차이·오탐 가능. 오탐 시 빌드 차단. 우선순위 낮음(포트 3000은 이미 커버).

#### B-14. 백업/복원 localStorage 키 정책 결정  🟡 ⏸  _(B-7 선행 조건)_
- **내용**: B-7(localStorage 백업 범위)을 구현하려면 먼저 **어떤 화면 설정까지 백업에 포함할지 기준**을 정해야 함.
- **결정 옵션**:
  - (a) **영속 설정만** (권장): 체크리스트·usage 숨김/제외·recipe 정렬 등 사용자 의도 상태만 화이트리스트
  - (b) 전체 `v3:` 키: 단순하나 임시 UI 상태 오염
  - (c) 모듈 연동: 백업 모듈 선택에 맞춰 해당 모듈 키만
- **왜 보류**: 정책 확정 전 B-7 진행 금지.

#### B-16. 메뉴 판매가 업로드 파일 가드 일관화  🟡 ⏸
- **파일**: `components/cost/menu-price/MenuPriceUploadCard.jsx`, `lib/excel.js`
- **문제**: 공통 `UploadDropzone`은 `maxSizeMB` 크기 검사(`file.size > maxSize`)·빈 파일·확장자 차단을 수행하지만, 메뉴 판매가 업로드는 **직접 `<input>` + FileReader**로 처리해 `accept` 확장자 필터만 있고 크기/빈 파일 가드가 없음. 판매가는 기존 데이터를 일괄 교체하는 흐름이라 잘못된 파일 영향이 큼.
- **해결 방향**: 공통 드롭존 사용으로 통일하거나, 동일한 크기·빈 파일·헤더 누락 가드를 추가. fixture로 저장 전 차단 회귀 테스트.
- **왜 보류**: 일괄 교체 흐름 변경이라 회귀 검증 필요.
- **출처**: SITE_IMPROVEMENT_AUDIT §13.5.

---

### 🟢 저위험 — UI 정보·안내 개선 (사이드이펙트 없음)

#### B-2. `_isPizzaMenu` wrapper 정리  ✅ 완료(2026-06-12)
- **완료**: `lib/nutrition/values/store.js` — `isBeverageCategory`·`isSideCategory`·`isExtraToppingCategory`·`isSetCategory`·`isHalfAndHalfCategory` import 추가, `_isPizzaMenu` 내부를 해당 헬퍼 호출로 교체. 동일 deny-list 동작 유지, 중앙 정책 위임. (커밋 5e2306d)

#### C-1. 영양성분·식자재 중복 진단 UI 노출  ✅ 완료(CL1·CL3)
- **완료**: CL1(`4ff4941`) 영양 메뉴/원시값 저장 전 중복 진단 UI(`app/nutrition/menu/page.jsx`), CL3(`5df8e34`) 식자재 productCode 중복 진단/복구 UI(`app/ingredient/manage/page.jsx`). 저장 경로 조용한 덮어쓰기도 가드됨.
- **참고**: 백업 화면(`settings/backup`)에도 진단 표기 존재.

#### C-2. 판매량 업로드 행/파일 단위 중복 시각화  ✅ 완료(2026-06-12)
- **완료**: `lib/sales/use-sales-upload.js` `buildUploadArtifacts`에 `issueGroupCount` 추가, `components/sales/UploadHistory.jsx` "처리 건수" 셀에 `{N}그룹 미매칭` 배지 표시(기존 레코드는 `issueGroupCount` 없어도 배지 미노출로 하위 호환). 월 단위 중복 차단은 기존부터 완료.

#### C-3. 판매 분류 미반영 구간 안내  ✅ 완료(2026-06-12)
- **완료**: `components/sales/shared/SectionUtils.jsx`에 `markPendingReclassify`·`hasPendingReclassify`·`clearPendingReclassify`(localStorage `v3:sales-pending-reclassify`) 추가. `UserRulesSection`·`UserAliasesSection` 토글 시 confirm 직전 플래그 설정. `reapplyToUploadedData` 성공 시 자동 해제. `app/menu-sales/unmatched/page.jsx`에 마운트 시 플래그 확인 → 배너 + "지금 반영" 버튼 표시.

#### C-4. Prettier 잔여 31개 파일 정리  ✅ 완료(2026-06-12)
- **완료**: `npm run format` 일괄 적용 → `format:check` 0건. 131 suite/749 test 통과. (커밋 5e2306d)

#### C-5. 피자 슬라이스 시트 satFat 레거시 참조 확인  ✅ 완료(2026-06-12)
- **완료**: `build.js`에 satFat 잔존 없음 확인. 나머지 satFat 참조(`auto-calc.js`·`values/import.js`·`values/store.js`·`ImportBaseModal.jsx`)는 모두 포화지방(정상 영양 필드) 용도로 라벨 출력 경로와 무관 — 추가 조치 불필요.

#### C-6. 드래그·업로드 키보드 접근성 검증  ✅ 완료(2026-06-12)
- **완료**: `components/ui/UploadDropzone.jsx`에 `role="button"`, `tabIndex`, `aria-label`, `onKeyDown`(Enter/Space → input.click()) 추가. 보드(`app/note/board/page.jsx`) 드래그 카드는 이미 `tabIndex={0}`·`aria-label`·`onKeyDown` 완료. `RecipeEditor.jsx` dnd-kit 핸들은 이미 `aria-label` 완료.

#### C-7. 테스트 보강 잔여(BOM 복원·체크리스트↔연구일지 동기화)  ✅ 완료(2026-06-12)
- **완료**: `__tests__/lib/restore-bom-sync.test.mjs` 추가 — BOM 선행 JSON stripBom+JSON.parse+validateBackupPayload, 체크리스트 타이틀/콘텐츠 생성, doneItems=[]→deleteNote 조건 회귀(5케이스). 132 suite / 759 test. (커밋 b0518b9)

#### C-8. 폼 내부 `<button>` type 누락 점검  ✅ 완료(2026-06-12)
- **완료**: `<form>` 내부 버튼 스캔 → `components/settings/PinGate.jsx` 확인 버튼 1건만 해당(`type="submit"` 추가). 나머지 form 파일(login·IngredientForm·EdgeEditModal 등) 검사 완료, 추가 미처리 없음. (커밋 201b806)

---

## D. 운영·실데이터 QA 영역 (구 SITE_IMPROVEMENT_AUDIT — 코드 보류 아님)

> SITE_IMPROVEMENT_AUDIT(574줄)는 **production 코드를 바꾸지 않는 QA·검증 가이드**(문서 §7 명시)였음.
> 42개 카테고리·성능·실데이터 체크리스트 대부분은 **실제 업무 파일·기준 원가표·담당자 승인**이 필요한 **수동 QA**로, 코드 보류가 아니라 `docs/RELEASE_CHECKLIST.md`·`docs/QA_CHECKLIST.md` 운영 소관.

**§13에서 검토한 작업트리 변경분 = 이미 구현 완료** (실데이터 QA만 운영 대기):
- 영양 파생메뉴 `ingredientCodes/ingredientAmounts` 기반 계산(`lib/nutrition/values/store.js`)
- 추가토핑 마스터(식자재코드 연결 + 알레르기 출력 반영, `TabToppings.jsx`)
- 식자재 사진 3종(packaging/detail/actual, `lib/ingredient/photos.js`, legacy fallback 포함)
- 레시피 식자재 드래그 정렬(dnd-kit, `RecipeEditor.jsx`)
- 영양 메뉴에 `추가토핑` 탭 추가, `씬바사삭R` 행 제외
- 검증 기록: `npm test` 129 suite/739 test · `lint`·`build`(56 static page) 통과(2026-06-11 기준).

**코드로 추출해 B/C 플랜에 등록한 구체 항목**(나머지는 운영 QA):
- 🔴 **B-15** 식자재 삭제 undo cascade 복구 불완전(데이터 손실) — §13.6 최우선
- 🟡 **B-16** 메뉴 판매가 업로드 파일 가드 일관화 — §13.5
- 🟢 **C-6**(확장) 업로드 키보드 접근성, **C-8** 폼 button type — §13.5

**운영 QA로만 분류(코드 보류 아님)**: 원가/판매가/원가율 기준표 대조, 엑셀 입출력 Excel 앱 확인, 코드 매칭 원장 대조, 대용량(500MB) 복원 freeze·진행률, usage-counts `menuName` dedupe 규격 누락, 다운로드 파일명/출력 컬럼 정책, 인증·설정 PIN 보안경계 문서화, 성능(1천/1만 행) 측정. → 실데이터·담당자 승인 확보 후 `QA_CHECKLIST`/`RELEASE_CHECKLIST`에서 수행.

---

_최종 업데이트: 2026-06-12 — B-8·C-2·C-3 구현 완료 표시. C-3: localStorage 재분류 미반영 플래그 + unmatched 배너. C-2: issueGroupCount 배지. B-8: bulkUpdateBoardOrder 단일 트랜잭션._
_[이전] 문서 정합성 정정: B-1 파일 경로·B-4 모듈 혼동·C-2 전제 갱신·B-3 store 경로 보정. B-2 저위험 이동. 번호=등록순 ID 안내._
_[이전] SITE_IMPROVEMENT_AUDIT 통합·삭제. NEXT_TASKS(CL1~CL8) 통합, B-2/C-1/메뉴코드정책 완료 정정._
