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
| 메뉴마스터 삭제 동기화(판매가 mirror) | ✅ 완료 | **B-1** cascade 완료 (cost_selling_prices·cost_recipes·nutrition_menu_ref) |
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
| 드래그 정렬 접근성 안내 확인 | ✅ 완료 | **C-6** UploadDropzone role/tabIndex/onKeyDown, 보드·레시피 기존 완료 |
| 테스트 보강(BOM 복원·체크리스트↔연구일지) | ✅ 완료 | **C-7** restore-bom-sync.test.mjs 5케이스 (커밋 b0518b9) |

**최종 build / 수동 시나리오**(안정화 §4·§6)는 코드 보류 항목이 아닌 **운영 체크리스트**(릴리스 시 매번 수동 확인)로, `docs/RELEASE_CHECKLIST.md`·`docs/QA_CHECKLIST.md` 소관.

---

## B. 보류 작업 플랜 (위험도 순)

> 진행 시 위에서 아래로(고위험 먼저 충분히 검토, 저위험은 언제든 착수 가능).
> **항목 번호는 등록순 ID이며, 배치는 위험도순입니다** (B-15·B-16 등 번호가 섞이는 것은 이 이유).

### 🔴 고위험 — 다중 store / 집계 결과 변경

#### B-1. 메뉴마스터 삭제 cascade  ✅ 완료(2026-06-12)
- **완료**: `deleteMenuMaster`에 cascade 삭제 추가 — `cost_selling_prices`(판매가 mirror), `cost_recipes`(원가 레시피), `nutrition_menu_ref`+`nutrition_raw_values`(영양 참조)를 menuCode 기준 일괄 삭제. `deleteMenuRefsByMenuCode` 헬퍼 추가(`lib/nutrition/values/store.js`). `sales_rows`는 역사 데이터로 보존.
- **참고**: `pushMasterToPrices`(syncMirror)는 `discontinued` 상태만 제거 — 삭제된 메뉴를 별도 cascade하지 않아 orphan이 남던 버그 수정.


#### B-15. 식자재 삭제 실행취소(undo) cascade 복구 불완전  ✅ 완료(2026-06-12)
- **완료**: `lib/nutrition/values/store.js`에 `getIngredientValueByCode` 추가. `deleteIngredient`가 cascade 삭제 전 영양값 스냅샷 후 `{ ingredient, nutritionSnapshot }` 반환. `handleExclude`·`handleBatchDelete` undo에서 `restoreRecord('nutrition_ingredient_values', nutritionSnapshot)` 추가. 알레르기 링크(`nutrition_allergy_links`)는 CL2 이후 빈 legacy store라 실질 손실 없음.

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

#### B-7. localStorage 백업 범위 확대  ✅ 완료(2026-06-12)
- **완료**: `lib/nutrition/backup-keys.js`에 `PERSISTENT_LS_KEYS` 29종 추가(note·sample·recipe·cost·ingredient·home·jette·앱 설정). `lib/db/operations.js` `exportSelected`/`importAll`에서 nutrition 게이트 제거 → 항상 수집·복원. `NUTRITION_LS_KEYS`는 하위 호환 유지.

#### B-8. 칸반 드래그 순서 원자성  ✅ 완료(2026-06-12)
- **완료**: `lib/note/store.js`에 `bulkUpdateBoardOrder(updates)` 추가 — 단일 `runTransaction`으로 boardOrder 일괄 갱신. `app/note/board/page.jsx` 같은 컬럼 reorder + 크로스 컬럼 move 모두 교체. `lib/note/index.js` re-export 추가.

#### B-9. 1인피자 알레르기 표시 기준 정리  🟡 ⏸
- **파일**: `lib/nutrition/label/build.js:265`, `app/nutrition/allergen/page.jsx:345`
- **문제**: 라벨은 씬바사삭L만 출력, 알레르기 화면은 4크러스트 전부 생성 → 불일치.
- **해결 방향**: 도메인 확인(1인피자가 씬바사삭만 맞는지) 후 allergen 행 생성 필터 통일.
- **왜 보류**: 알레르기 출력은 법적 표기 영향. 도메인 확인 필수.

#### B-10. menuCode 중복 사전 검증/안내  ✅ 완료(2026-06-12)
- **완료**: `app/menu-master/page.jsx` `handleSaveRow`에서 `upsertMenuMaster` 반환 `mode:'update'`를 확인 — `data.id`없이 update이면 `showToast('기존 항목(code) 갱신됨 — 새 항목으로 추가되지 않았습니다', 'warn')`.

#### B-11. 인쇄 CSS `.chip` 숨김 범위 조정  ✅ 완료(2026-06-12)
- **완료**: `app/globals.css` `@media print` — 전역 `.chip{display:none}` → `.filter-chips .chip, .filter-chip-row .chip, button.chip`으로 범위 축소. 표 내 데이터 칩·nutrition 토글 칩 인쇄 시 보존.

#### B-12. 연구일지 PDF 긴 내용 페이지 분할  ✅ 완료(2026-06-12)
- **완료**: `.note-card` `overflow:hidden`→`overflow:visible`, `page-break-inside:avoid`→`break-inside:avoid`(현대 속성). `.note-header`에 `break-after:avoid` 추가(헤더-내용 분리 방지). 시각 검증 필요 시 실 인쇄로 확인 권장.

#### B-13. build:clean 가드 범위 확대(프로세스 감지)  ✅ 완료(2026-06-12)
- **완료**: `scripts/clean-build.mjs`에 `hasNextDevProcess()` 추가(`ps -eo pid,command`로 `next dev`/`next-server` 감지, win32 제외). 포트 3000·3001 동시 점검(`Promise.all`). 오류 메시지에 트리거 출처(포트/프로세스) 표시.

#### B-14. 백업/복원 localStorage 키 정책 결정  ✅ 완료(2026-06-12)
- **완료**: 옵션 (a) "영속 설정만" 확정. 검색어·필터·초안·내비게이션 상태·보안 토큰은 제외. `lib/nutrition/backup-keys.js`에 `PERSISTENT_LS_KEYS` 추가(29종). B-7 구현 가능 상태 진입.

#### B-16. 메뉴 판매가 업로드 파일 가드 일관화  ✅ 완료(2026-06-12)
- **완료**: `components/cost/menu-price/MenuPriceUploadCard.jsx` `handleFile`에 빈 파일(`file.size===0`)·20MB 초과 가드 추가. 확장자는 `accept` 속성으로 이미 필터링됨.

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

## R. 리팩토링 후보 (Refactoring Candidates)

> 기능 동작 변경 없이 구조·가독성·테스트 가능성을 개선하는 작업.
> 위험도순 배치. 🔴·🟡는 충분한 검토 후 착수, 🟢는 언제든 착수 가능.
> **관련**: B-5(useDBLoad 전면 확산), B-6(대형 컴포넌트 분해)와 연계 항목에 표기.

---

### 🔴 고위험

#### R-1. `lib/sales/ms9-rules.js` 카테고리별 파일 분리  ⏸
- **파일**: `lib/sales/ms9-rules.js` (2262줄)
- **문제**: 석쇠/치즈/골드스윗/씬바사삭 규칙 등 전체 판매량 매칭 룰이 단일 파일에 집결. 룰 추가·수정 시 충돌 위험.
- **해결 방향**: `rules-pizza.js`, `rules-side.js`, `rules-edge.js`, `rules-set.js`로 분리 후 `ms9-rules.js`에서 re-export.
- **왜 보류**: 판매량 집계 핵심 로직. 분리 후 전체 룰 누락 없는지 테스트 필수.

#### R-2. `app/cost/margin/page.jsx` load() 순수 함수 분리  ⏸
- **파일**: `app/cost/margin/page.jsx` L143–L331
- **문제**: `recipeRows`, `detailRows`, `derivedRows` 생성 로직이 `load()` 안에 혼재. 단위 테스트 불가.
- **해결 방향**: `lib/cost/margin/build-rows.js` 순수 함수로 추출.
- **왜 보류**: 엣지 파생 행 생성 로직이 복잡해 추출 시 회귀 위험.

#### R-3. `app/settings/restore/page.jsx` 분해  ⏸
- **파일**: `app/settings/restore/page.jsx`
- **문제**: 파일 파싱·영향도 계산·자동백업·import 실행·진행률 UI·완료 UI가 한 파일.
- **해결 방향**: `useRestoreFile`, `useRestoreImpact`, `useRestoreExecution`, `RestorePreview`, `RestoreProgressCard`.
- **왜 보류**: 고위험 기능. 분리 후 복원 시나리오 전체 재검증 필요.

---

### 🟡 중위험

#### R-4. `TabBase.jsx` 분해 (1153줄)  ⏸
- **파일**: `components/nutrition/menu/TabBase.jsx`
- **문제**: 영양값 입력·메뉴 CRUD·레시피 자동계산·식자재 기반 계산·import modal이 한 컴포넌트.
- **해결 방향**: `useNutritionBaseEditor`, `useRecipeNutritionCalc`, `useIngredientNutritionCalc`, `MenuGroupList`, `NutritionInputPanel`, `IngredientCalcModal`.
- **관련**: B-6

#### R-5. `app/ingredient/list/page.jsx` PDF 함수 이동 + hook 분리  ✅ 완료(2026-06-12)
- **완료(부분)**: `lib/ingredient/print.js` 신설 — `printIngredientPdf`, `ingredientName`, `originText`, `allergenText`, `ALLERGEN_MAP` 이동. 페이지에서 관련 인라인 함수 5개 + `ALLERGEN_SEED` import + `openPrintWindow`/`withDownloadDateSuffix` import 제거. hook 분리(`useIngredientCatalogData`, `useIngredientCatalogView`)는 B-5·B-6 연계 대형 작업 — 별도 진행.
- **관련**: B-5, B-6

#### R-6. `app/ingredient/usage/page.jsx` buildIngredientUsageMap 중복  ✅ 완료(2026-06-12)
- **완료**: `hooks/useIngredientUsageRows.js` 신설(usageRows·unusedRows·sorted·nonHidden·displayRows·menuCounts·totalUsedCount 7개 memoized 값 통합). usage/page.jsx의 inline normStr·cleanMenu·makeAddUsage 제거, `load()`에서 `buildIngredientUsageMap` 재사용. 848줄→715줄, useMemo·scopeLabelFor·SCOPE_UNASSIGNED·getUsageMenuCounts 등 import 제거.

#### R-7. `app/cost/ingredient-price/page.jsx` load() 분리  ✅ 완료(2026-06-12)
- **완료(부분)**: `lib/cost/ingredient-price/buildRows.js` 신설(`buildIngredientPriceRows`) — 제때 연동 row·수동 row 빌드 로직 이동. `hooks/useIngredientPriceFilters.js` 신설 — search/taxFilter/deltaFilter/mainCats/filtered 관리. 페이지에서 관련 인라인 useMemo 2개·useState 3개 제거, `sortMainCategories`·`scopeLabelFor`·`SCOPE_UNASSIGNED`·`calcUnitPrice`·`sumCompositePrice` import 제거. `useIngredientPriceData` 훅화는 mountedRef 비동기 패턴 복잡도로 보류.

#### R-8. `app/cost/recipe/page.jsx` 워크벤치 분해  ✅ 완료(부분)(2026-06-12)
- **완료**: `hooks/useRecipeWorkbenchData.js` 신설 — 6종 데이터 로드(getAll 7개 + buildPriceRowMap + buildUnitPriceMap) + loading/dbError/reload 캡슐화. page.jsx 851줄→789줄, `initDB`·`normalizePersonalPizzaCodes`·7개 fetch import 제거.
- **잔여**: `useRecipeListState`(필터·정렬·드래그 상태), `RecipeSidebar` 컴포넌트 분리. 드래그 상태와 필터가 밀결합돼 있어 별도 진행 필요.

#### R-9. 보고서 4종 공통 state hook 추출  ✅ 완료(2026-06-12)
- **완료**: `hooks/useReportPageState.js` 신설. `opts`/`docFormat` useState + `makeFieldUpdater` + `useDraftRestore`(opts 복원) 공통 처리. 페이지별 추가 복원은 `onRestoreExtra` 콜백으로 위임. 4개 페이지(`app/report/sales`, `cost`, `shipment`, `menu-sales-compare`)에 적용. 각 페이지의 `useDraftRestore` import → `useReportPageState`로 교체, 불필요 `makeFieldUpdater` import 제거.

#### R-10. `app/cost/all-summary/page.jsx` buildRows → lib 이동  ✅ 완료(2026-06-12)
- **완료**: `lib/cost/shared/buildSummaryRows.js` 신설. `normalizeCategory`, `catRank`, `CAT_ORDER`, `costPathFor`, `detailStoreFor`, `detailComponentCost`, `buildRows` 7종 이동. 페이지에서 관련 import 5개 제거(`calcCostBySizes`, `componentSubtotal`, `calcCostRate`, `MENU_CATEGORY`, `is*Category` 4종). 페이지는 `buildRows, catRank, CAT_ORDER, costPathFor` 4개만 re-import.

#### R-11. `TabSetCalc.jsx` / `TabDerived.jsx` 분해  ✅ 완료(2026-06-13)
- **완료**: `useSetCompositionForm`(`hooks/`) + `useDerivedCompositionForm`(`hooks/`) 추출.
  TabSetCalc 727→667줄, TabDerived 572→460줄.
- **관련**: R-4, B-6

#### R-12. BulkPriceModal 기반 컴포넌트 통합  ⏸
- **파일**: `components/cost/ingredient-price/BulkPriceModal.jsx`(396줄), `components/cost/menu-price/BulkPriceModal.jsx`(268줄)
- **문제**: StatusBadge, PriceDelta, phase 관리(`idle→parsing→preview→committing`), FileUploadZone 패턴이 양쪽에 중복.
- **해결 방향**: `BulkPriceModalBase` 공통 컴포넌트 + 파싱·매칭·커밋 전략 주입 패턴.

#### R-13. `PlatformSettingsModal.jsx` 서브컴포넌트 분리 (518줄)  ✅ 완료(2026-06-12)
- **완료(부분)**: `components/cost/margin/FeeRow.jsx` 신설 — 인라인 `FeeRow`(140줄) 분리. 모달 518줄 → 375줄. PlatformSelector/PlatformRow 분리 및 useReducer 전환은 상태 공유 복잡도로 보류.

#### R-14. settings 페이지 2종 서브컴포넌트 분리  ✅ 완료(2026-06-12)
- **완료**: account → `components/settings/PinSection.jsx`(내부 FormField 포함), `components/settings/PasswordChangeCard.jsx` 분리. account/page.jsx 674줄→441줄. backup → `hooks/useDiagnostics.js`(diagnostics state + collectDiagnostics) 훅 추출, backup/page.jsx 인라인 collectDiagnostics 제거.

#### R-15. `app/note/sample/page.jsx` 달력 계산 공통화  ✅ 완료(2026-06-12)
- **완료**: `lib/note/calendar-utils.js` 신설(`buildCalendarDays(month, totalCells=42)`). `app/note/sample/page.jsx`의 20줄짜리 `calDays` useMemo → `useMemo(() => buildCalendarDays(calMonth, CALENDAR_CELLS), [calMonth])` 한 줄로 교체.

---

### 🟢 저위험

#### R-16. `lib/print/window-print.js` 공통 헬퍼 추출  ✅ 완료(2026-06-12)
- **완료**: `lib/print/window-print.js`에 `openPrintWindow(html, {width, height})` 헬퍼 추출. `lib/cost/usage-print.js`, `lib/nutrition/label/print.js`, `lib/nutrition/origin/print.js`, `app/ingredient/list/page.jsx` 4곳 교체.

#### R-17. `app/menu-master/page.jsx` EditModal 분리 + hooks  ✅ 완료(2026-06-12)
- **완료**: `CategoryTags`·`EditModal`(~318줄) → `components/menu-master/MenuMasterEditModal.jsx` 분리. 필터 상태(`catFilter`/`statusFilter`/`subFilter`/`search`) + 4개 useMemo(`statusFiltered`/`displayCategories`/`catCounts`/`filtered`) → `hooks/useMenuMasterFilters.js` 추출. page.jsx 불필요 imports 7개 제거(parseCategoryFromCode·OVERLAY_COLOR·SUB_TAG_STYLE·CAT_TAG_STYLE·makeFieldUpdater·useKeyboardSave·parseOptionalNonNegativeNumber). page.jsx 1051줄 → 약 700줄로 감소.

#### R-18. `app/note/_NoteFormBody.jsx` TempCostCalculator 분리  ✅ 완료(2026-06-12)
- **완료**: `components/note/TempCostCalculator.jsx` 신설. 임시 원가 계산 상태(parsedCostCalc·ingredients·ingSearch·showDropdown·refs) + 관련 함수(addIngRow·refreshLinkedCostRows·removeIngRow·updateIngRow·nonNeg) + JSX(검색 드롭다운·재료 테이블·원가율 요약) 전량 이동. `_NoteFormBody`는 `<TempCostCalculator value={form.tempCostCalc} onChange={...} />` 한 줄로 교체. 불필요 import 3개 제거(getAllIngredients·calcUnitPrice·calcCostRate).

#### R-19. `app/note/_NoteContent.jsx` 선택·핀·프리셋 hooks 분리  ✅ 완료(2026-06-12)
- **완료**: `hooks/useNotePins.js`(pinnedIds+togglePin, localStorage KEYS.NOTE_PINS), `hooks/useNotePresets.js`(presets·confirmDeletePreset·savePreset/applyPreset/deletePreset, filter setters를 params로 수신), `hooks/useNoteBatchActions.js`(batchMode·selected·confirmBatch·toggleSelect·exitBatch·handleBatchDelete/StatusChange/confirmBatchDelete) 3개 hook 신설. `_NoteContent`에서 normalizeNotePresets·normalizeIdList 함수 정의 제거, deletingIds(never-mutated dead state) 제거, `onExit` inline fn → `exitBatch` 교체. 1124줄 → 1017줄.

#### R-20. `app/nutrition/allergen/page.jsx` matrix 계산 → lib 이동  ✅ 완료(2026-06-12)
- **완료**: `lib/nutrition/allergen/matrix.js` 신설. `asMenuMap`·`normStr`·`stripSizeSuffix`·`logicalMenuKey`·`edgeTypeForCrust`·`nutritionEdgeCodeFor`·`sourceLabel` 헬퍼 + `buildMenuMatrix(allergenIngredients, baseMapData, edges, isExcludedMenu, menuOrder, menuNameOverrides, toppings)` + `buildDetailRows(detailRow, baseMapData, edges, ingredientByKey)` 추출. 페이지에서 inline 200줄 제거, `isPizzaCategory`·`isDoughCategory`·`CRUST_VARIANTS`·`applyMenuName`·`getMenuCodeRank`·`applyEdgeAllergenRules` 7개 import 제거.

#### R-21. `app/nutrition/export/OriginResult.jsx` 빌더 → lib 이동  ✅ 완료(2026-06-12)
- **완료**: `lib/nutrition/origin/build.js` 신설. `buildOriginsFromIngredients` + 내부 의존 상수(`asMenuMap`, `asSet`) 이동. OriginResult.jsx는 함수 제거 후 import로 교체 (단, `asSet`은 L365 렌더링에서도 사용되므로 로컬 사본 유지).

#### R-22. `app/report/page.jsx` 보고서 목록 hooks 분리  ✅ 완료(2026-06-12)
- **완료**: `hooks/useReportListState.js`(kindFilter·search·favOnly·page·sortKey·sortDir·newIds + filtered·totalPages·list + URL 복원/갱신 effects + toggleSort) 및 `hooks/useReportActions.js`(삭제·정리·즐겨찾기·인라인 편집 상태+핸들러, reload 수신) 신설. page.jsx에서 관련 state/effect/함수 제거, 불필요 import 8개 제거(useRef·useEffect·deleteReport·toggleReportFav·saveReport·pruneOldReports·findPrunableReports·clampInteger). 914줄 → 739줄.

#### R-23. `EdgeEditModal.jsx` CompRow → `IngredientSearch` 재사용  ✅ 완료(2026-06-12)
- **완료**: CompRow의 자체 검색 상태(searchQ/dropOpen/activeIdx/rect) + 5개 useEffect + createPortal dropdown 제거. `IngredientSearch` 컴포넌트로 교체. `selectIng` 로직은 `onSelect` 콜백 인라인으로 이전. EdgeEditModal imports에서 `useRef`, `useMemo`, `useCallback`, `createPortal` 제거.

#### R-24. `useWidgetConfig.js` sanitize 로직 분리 (236줄)  ✅ 완료(2026-06-12)
- **완료**: `lib/home/widget-config-utils.js` 신설. `HOME_WIDGET_ROWS`, `HOME_WIDGET_DEFS`, `DEFAULT_ORDER`, `ALL_ROW_IDS`, `ALL_WIDGET_KEYS`, `sanitizeWidgetConfig`, `sanitizeWidgetCollapsed`, `reconcileWidgetOrder`, `reconcileWidgetFavorites`, `normalizeWidgetKeys`, `visibleRowCount` 모두 이동. `hooks/useWidgetConfig.js`는 lib에서 import 후 re-export.

#### R-25. `MarginFilterBar.jsx` DiscountSimulator 분리  ✅ 완료(2026-06-12)
- **완료**: `components/cost/margin/DiscountSimulator.jsx` 신설. `DiscountSimulator.Toggle`(플랫폼 bar 우측 버튼)·`DiscountSimulator.Panel`(펼침 폼) 서브컴포넌트로 분리. `MarginFilterBar`는 인라인 ~100줄 제거 후 두 서브컴포넌트 참조로 교체.

#### R-26. `useMounted()` 헬퍼 hook 추출  ✅ 완료(2026-06-12)
- **완료**: `hooks/useMounted.js` 신설(`useRef(true)` + useEffect cleanup 캡슐화). `mountedRef = useRef(true/false)` + 수동 cleanup 패턴을 10개 파일에서 교체: `hooks/useDetailRecipePage.js`, `hooks/useSettingsSection.js`, `app/nutrition/menu/page.jsx`, `app/nutrition/allergen/page.jsx`, `app/nutrition/origin/page.jsx`, `app/ingredient/list/page.jsx`, `app/ingredient/usage/page.jsx`, `app/cost/edge-dough/page.jsx`, `app/cost/ingredient-price/page.jsx`, `app/menu-master/page.jsx`, `app/settings/system/page.jsx`, `app/page.jsx`.

#### R-27. 4종 detail page 팩토리 정리  ✅ 완료(2026-06-12)
- **완료**: `components/cost/shared/makeDetailRecipePage.jsx` 팩토리 신설. `useDetailRecipePage` + `CostDetailView` + `handleDeleteRecipes` 보일러플레이트를 팩토리로 통합. pizza는 `usePizzaSummaryContent` 커스텀 훅으로 `useMemo` 유지. 4개 page 파일 모두 `makeDetailRecipePage({...})` 호출로 교체.

#### R-28. UploadDropzone 중복 자체 구현 수렴  ✅ 완료(2026-06-12)
- **완료**: `ImportBaseModal.jsx`, `BulkPriceModal.jsx` 2곳을 `UploadDropzone` 교체. `_NoteFormBody.jsx` L874는 복수 이미지 업로더(`image/*` + multiple)로 단일파일 `UploadDropzone`와 API 호환 불가 → 제외.

---

#### ▸ 2차 발굴 (2026-06-12)

### 🟡 중위험

#### R-29. 홈 대시보드 `app/page.jsx` 분해 (817줄)  ✅ 완료(2026-06-13)
- **완료**: `useHomeDashboardData`(`hooks/`) 추출 — 모든 데이터 로드 상태·anchor·shiftAnchor·chartKey 포함.
  app/page.jsx 817→624줄.
- **관련**: B-6

#### R-30. `components/cost/recipe/RecipeEditor.jsx` 분해 (853줄)  ✅ 완료(2026-06-13)
- **완료**: `SortableIngredientRow` → 별도 파일 분리. `calcGroupCostBySizes`·`calcIngredientCostBySizes`·`calcTotalCostBySizes` → `lib/recipe/calc-costs.js` 순수 함수 추출.
  RecipeEditor 852→708줄.
- **관련**: R-8

#### R-31. 보고서 4종 데이터 빌더 → lib 이동  ✅ 완료(2026-06-12)
- **완료**: `lib/report/build-price-report.js`·`build-cost-report.js`·`build-shipment-report.js`·`build-compare-report.js` 신설. 4개 페이지 useEffect 인라인 집계 블록 교체 및 중복 로컬 헬퍼 제거. price 인라인 ~40줄, cost 인라인 ~28줄, shipment monthMap+trend ~28줄, compare series ~22줄 제거.
- **관련**: R-9

#### R-32. `app/nutrition/origin/page.jsx` 집계 분리 (614줄)  ✅ 완료(2026-06-12)
- **완료**: `lib/nutrition/origin/build.js`에 `buildOriginIngredientRows`·`buildOriginMenuRows` 추가. `ingredientRows`·`menuRowsAll` useMemo 인라인 코드(~80줄) 제거. 614줄→549줄, `applyOrder`·`getMenuCodeRank`·`applyMenuName` import 제거.
- **관련**: R-21

#### R-33. `app/note/board/page.jsx` 칸반 분해 (597줄)  ✅ 완료(2026-06-12)
- **완료(부분)**: `components/note/KanbanCard.jsx` 신설 — `buildNoteCopyText`·`copyNoteText`·`KanbanCard`(React.memo) 이동. board/page.jsx 597줄→427줄, `React` namespace·`formatShortDate` import 제거. `useKanbanBoard` 훅화는 handleDrop이 groupedNotes에 의존(순환 복잡도)으로 보류.

#### R-39. `lib/db/operations.js` 책임 분리 (516줄)  ✅ 완료(2026-06-12)
- **완료**: `lib/db/crud.js`(CRUD 12종)·`upload-log.js`(checkUploadHash·deleteFileWithLog)·`backup.js`(replaceStore·exportAll·exportSelected·importAll) 신설. `operations.js` → 30줄 re-export 파일로 교체. 기존 `@/lib/db` 및 직접 `operations.js` import 경로 무변경.

#### R-40. `lib/nutrition/values/store.js` 계산 분리 (627줄)  ✅ 완료(2026-06-12)
- **완료**: `lib/nutrition/values/calc.js` 신설 — `NUTRITION_FIELDS`·`addNutrition`·`scaleNutritionByAmount`·`ingredientAmountForSide`·`buildIngredientAdditionSumForSide`·`_isPizzaMenu`·`calcAllResults` 이동. `store.js`에서 re-export 유지 → 기존 import 경로(TabResults·NutritionGrid·label/build.js 등) 무변경. category-policy 5종 import 제거.

---

### 🟢 저위험

#### R-34. `app/note/journal/page.jsx` 출력 분리 (639줄)  ✅ 완료(2026-06-12)
- **파일**: `app/note/journal/page.jsx` L35 `buildPrintHtml`, L266 자체 `openPrintWindow`, L400 `WebJournalCard`
- **문제**: 출력 HTML 빌더가 페이지에 인라인, **자체 `openPrintWindow`(window.open+document.write)** 사용 — R-16 공용 헬퍼 미사용.
- **해결 방향**: `buildPrintHtml` → `lib/note/journal-print.js`로 이동하고 공용 `openPrintWindow`(`lib/print/window-print.js`) 호출로 교체. `WebJournalCard`·`TwoColFields` → `components/note/WebJournalCard.jsx`로 분리.
- **관련**: R-16(공용 print 헬퍼 — 이 파일이 마지막 미마이그레이션 사용처)

#### R-35. `_ReportPreviewModal.jsx` 옵션 렌더러 registry화 (523줄)  ✅ 완료(2026-06-12)
- **파일**: `components/report/_ReportPreviewModal.jsx` L114 `ReportOptionsPage`
- **문제**: `kindOpts()`(L122~)가 sales/price/shipment/compare/cost 5종 옵션 표시를 if 분기로 모두 보유.
- **해결 방향**: `REPORT_OPTION_RENDERERS` registry(종류→렌더러 맵)로 분리 → 새 보고서 추가 시 분기 수정 불필요.

#### R-36. 판매 규칙 섹션 검색 상태 공통화  ✅ 완료(2026-06-12)
- **파일**: `components/sales/UserRulesSection.jsx`(421줄), `UserAliasesSection.jsx`(260줄), `UserExcludedSection.jsx`(202줄)
- **문제**: CRUD 로직은 이미 `hooks/useSettingsSection.js`로 공유됨. 그러나 검색 state(`query`)·filtered useMemo·`usePagination` 패턴이 3곳 중복.
- **해결 방향**: `hooks/useSectionSearch.js` — search state + filterFn injection 훅으로 수렴.
- **관련**: R-38(동일한 search 패턴 — 공통 hook 후보)

#### R-37. `app/styles/features.css` 2차 분리 (7829줄)  ⏸
- **파일**: `app/styles/features.css`
- **문제**: 1차로 globals와는 분리됐으나 여전히 단일 7829줄 모놀리식(페이지·필터·테이블·칸반·레시피·가격·출고·영양·식자재 전부 포함).
- **해결 방향**: `features/ingredient.css`·`features/report.css`·`features/note.css`·`features/nutrition.css`로 도메인별 2차 분리. `features.css`는 @import 파일만 남김.
- **왜 보류**: 7829줄 전체 도메인 분류 + 브라우저 캐스케이드 검증 필요.

#### R-38. 제때 테이블 4종 `useTableSearchSort` 수렴  ✅ 완료(2026-06-12)
- **파일**: `components/jette/ManagedProductsCard.jsx`(389줄), `PriceLatestView.jsx`(344줄), `PriceCompareTable.jsx`(361줄), `ShipmentTable.jsx`(332줄)
- **문제**: 4파일 모두 search·sortKey/sortDir 상태를 각자 중복 구현(`sortByKey`·`usePagination`은 이미 공용).
- **해결 방향**: `hooks/useTableSearchSort.js`(검색+정렬 상태 통합) hook으로 수렴.
- **관련**: R-36

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

_최종 업데이트: 2026-06-12 — R-8(부분)·R-31·R-39·R-40 완료. 잔여 중위험: R-4·R-8(잔여)·R-11·R-12·R-29·R-30, B-5·B-6·B-9. R-34(journal print 분리)·R-35(report options registry)·R-36(useSectionSearch)·R-38(useTableSearchSort) 구현. R-29~R-40 2차 발굴 등록. B-14 정책(a) 영속 설정만 확정 + B-7 localStorage 백업 범위 확대 구현. 잔여: B-3 legacy store 제거(DB migration), B-5/B-6(회귀위험), B-9(도메인 확인) — 외부 조건 충족 후 진행._
_[이전] B-8·C-2·C-3 완료 표시. 문서 정합성 정정: B-1 파일 경로·B-4 모듈 혼동·C-2 전제·B-3 경로. B-2 저위험 이동._
_[이전] SITE_IMPROVEMENT_AUDIT 통합·삭제. NEXT_TASKS(CL1~CL8) 통합, B-2/C-1/메뉴코드정책 완료 정정._
