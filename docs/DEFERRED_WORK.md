# 보류·정비 작업 단일 출처 (Deferred Work)

> 이 파일이 미루어진 모든 작업 + 정비 이력의 **단일 최종 출처**입니다.
> 새 보류 항목은 위험도에 맞춰 아래 플랜에 추가하고, 완료 시 상태를 `✅ 완료`로 바꾸고 완료일을 기입하세요.
>
> 2026-06-14 감사(구 `docs/BUG_AUDIT_2026-06-14.md`)는 내용 전부 이 문서에 흡수 후 삭제됐습니다.
> 2026-06-17 감사(구 `docs/BUG_AUDIT_2026-06-17.md`)는 내용 전부 이 문서에 흡수 후 삭제됐습니다.
> 2026-06-17 레시피 입력 UX 계획(구 `docs/MENU_MASTER_RECIPE_INPUT_UX_PLAN.md`)은 내용 전부 이 문서에 흡수 후 삭제됐습니다.
> 2026-06-17 품질 개선 로드맵(구 `docs/SITE_QUALITY_IMPROVEMENT_PLAN.md`)은 P0~P6 전부 완료 이력 흡수 후 삭제됐습니다.
> 2026-06-17 전체 보완·분리 계획(구 `docs/SITE_REFACTOR_AND_HARDENING_PLAN.md`)은 1~8단계 완료 이력 흡수, P5~P11 보류 항목 등록 후 삭제됐습니다.
> 2026-06-17 UX 이슈 안내 현황(구 `docs/UX_ISSUE_GUIDANCE.md`)은 P2 완료 이력 흡수 후 삭제됐습니다.
> 2026-06-17 업무 E2E QA 현황(구 `docs/WORKFLOW_QA.md`)은 P1 완료 이력 흡수, 확장 백로그 보류 항목 등록 후 삭제됐습니다.
> 2026-06-17 사이트 점수 개선 실행 계획(구 `docs/SITE_SCORE_IMPROVEMENT_ACTION_PLAN.md`)은 완료 항목 이력 흡수, 잔여 보류 항목 확인 후 삭제됐습니다.
> 실행 여부·우선순위·완료 판단은 이 문서의 정규화된 항목을 기준으로 합니다.

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

## B. 보류 작업 플랜 (미완료 항목만)

> 아래는 **실제로 아직 진행되지 않은** 항목만 기재합니다.
> 완료된 항목은 하단 "완료 이력" 섹션으로 이동됐습니다.

---

### 🐞 버그 우선 처리 색인 (2026-06-14 코드 대조)

> B/N 항목 중 **사용자 영향 버그/결함**만 우선순위순으로 추린 색인.
> 정비(리팩토링)·QA 도구·문서·신기능은 버그가 아니므로 제외. 상세는 각 항목 본문 참조.

| 우선 | 항목 | 버그 내용 | 상태 | 착수 조건 |
|------|------|-----------|------|-----------|
| 1 | **B-9** | 1인피자 알레르기 표시 불일치 — 라벨은 씬바사삭L만 출력(`label/build.js:266`), 알레르기 화면은 크러스트 변형 전부 생성(`allergen/matrix.js:96`). **법적 표기 영향.** | ✅ 완료(2026-06-15) | 도메인 확인 완료 — 1인피자는 씬바사삭 1종 |
| 2 | **B-25** | production 빌드 비결정적 실패 → dev/prod `.next` 섞이면 런타임 500 | ✅ 완료(2026-06-15) | Next 14.2.35 업그레이드로 해결 |
| 3 | **B-26** | route-level `error.jsx` 부재 → 한 화면 런타임 예외가 전체 앱을 다운시킴 | ✅ 완료(2026-06-14) | — |

- **B-21**(silent catch) ✅ **완료(2026-06-15)**: 사용자 액션 실패(저장·삭제·복원·출력)는 모두 toast 노출 처리됨. 남아 있는 optional/background 빈 catch는 `silent-catch-policy.test.mjs` allowlist와 사유로 고정한다.
- **즉시 착수 가능한 버그**: 없음. **게이트 대기 버그**: 없음.
- **버그 아님(정비/도구/문서/신기능)**: B-20·B-23(QA 도구), B-3 Phase 2·B-5·B-6(리팩토링), B-24(문서), N-42·N-43(신기능, 게이트).

---

### 🔴 고위험 — 운영 기준선 / QA 신뢰성

#### B-20. 실업무 fixture 기반 업로드/다운로드/계산 회귀 테스트  🔴 🚧 2차 보강(2026-06-15)
- **파일**: `__tests__/`, `scripts/`, 판매량·제때 단가·메뉴 판매가·원가 기준표 관련 store/builder
- **문제**: 현재 자동 QA는 빈 DB/비파괴 UI 검증 중심이고, 실업무 Excel fixture가 부족하다.
- **해결 방향**: 익명화 fixture로 판매량 업로드, 중복 차단, 필수 컬럼 누락, 다운로드 헤더, 원가 계산 기준값 비교를 자동화한다.
- **진행 완료(2026-06-15)**: `business-fixtures.test.mjs`에 판매량 분류/제외/미매칭 fixture를 추가하고, 기존 판매량 필수 헤더·제때 단가·메뉴 판매가·원가 기준표 fixture와 함께 `test:ci` 회귀 범위에 포함했다.
- **추가 보강(2026-06-15)**: 판매량 같은 연월 중복 저장 차단, 업로드 오류 CSV 헤더, 엣지별 영양성분 표 출력(베이스+엣지 조정값·씬바샤삭 별도 입력값) fixture를 추가했다. 저장 직전 트랜잭션 내부에서도 같은 연월을 다시 확인해 다중 탭 동시 업로드 중복을 차단한다. 실제 `.xlsx` workbook을 생성해 판매량 fixture 파싱/검증까지 통과하는 Excel 입력 회귀 테스트를 추가했다.
- **완료 기준**: fixture 테스트가 `npm run test:ci`에 포함되고, 업로드/중복/다운로드/계산 회귀를 검출한다.

#### B-21. console-only / silent catch 분류  🟡 ✅ 완료(2026-06-15)
- **파일**: `hooks/useKanbanBoard.js`, `hooks/useNoteBatchActions.js`, `hooks/useIngredientPriceData.js`, `app/settings/restore/page.jsx`, `app/settings/backup/page.jsx`, `app/nutrition/allergen/page.jsx`, `app/ingredient/usage/page.jsx`, `lib/ingredient/store.js` 등
- **문제**: 2026-06-14 감사 기준 `.catch(console.error)`, `.catch(() => {})`, `console.error`, `console.warn` 패턴이 154건 확인됐다.
- **해결 방향**: 사용자 액션 실패는 toast/화면 오류로 노출하고, background/optional 실패는 의도 주석 또는 helper로 분리한다.
- **진행 완료(2026-06-14)**:
  - 칸반 보드 초기 로드 실패: `loadError` 상태·실패 카드·`다시 시도` 액션·toast 추가.
  - 칸반 드래그 저장 실패: console-only 처리에서 toast + 재동기화로 변경.
  - 식자재 삭제 실행취소 실패: 단건/일괄 undo의 `restoreRecord` 실패를 숨기지 않고 toast + console context로 노출.
  - 식자재 삭제 cascade 실패: 영양값/알레르기 링크 cascade 실패를 `cascadeErrors`로 반환하고 관리 화면에서 경고 toast 표시.
  - 식자재 일괄 삭제 실패: `bulkDeleteIngredients`가 `{ removed, failures }`를 반환해 부분 실패를 사용자에게 표시.
  - 메뉴마스터 삭제 cascade 실패: 영양 참조 정리 실패를 `cascadeErrors`로 반환하고 화면에서 경고 toast 표시.
  - optional validation/log 실패: `validateCompositeRefs`, `logWork` 실패는 의도된 background 경고로 분류하고 context 있는 `console.warn`으로 정리.
- **추가 테스트**:
  - `__tests__/hooks/kanban-board-guards.test.mjs`
  - `__tests__/lib/ingredient-manage-undo-guards.test.mjs`
  - `__tests__/lib/ingredient-delete-cascade.test.mjs`
- **추가 보강(2026-06-16)**: `showToast(..., 'err')` legacy 호출부를 정식 `error` 타입으로 정규화하고, `toast-type-policy.test.mjs`로 재발을 방지한다. `components/Toast.jsx`의 `err` alias는 외부/구호출 하위호환용으로만 유지한다.
- **추가 보강(2026-06-16)**: 실패/입력 필요 같은 부정 토스트가 타입 생략으로 `ok` 표시되지 않도록 묶음 관리·공급업체 입력 호출부를 보정하고, `toast-type-policy.test.mjs`에 단일 인자 부정 토스트 guard를 추가했다.
- **추가 보강(2026-06-16)**: 남아 있던 `console.error(err)`·`console.warn(err)` 단독 로그에 화면/동작 컨텍스트 라벨을 붙이고, `console-context-policy.test.mjs`로 재발을 방지한다.
- **정책 고정(2026-06-16)**:
  - 사용자 액션 실패는 toast/화면 오류/결과 errors로 노출한다.
  - optional/background 빈 catch는 `silent-catch-policy.test.mjs` allowlist에 파일·맥락·사유를 등록한 위치에만 허용한다.
  - `hooks/useNoteBatchActions.js`·`hooks/useIngredientPriceData.js`·`app/settings/backup/page.jsx`·`app/nutrition/allergen/page.jsx`·`app/ingredient/usage/page.jsx` — silent catch **0건 확인** (이미 정리됨).
  - 테스트 fixture에서 의도적으로 발생시키는 `price-history`, `managed-products` 경고의 사용자 액션/테스트 전용 분리(테스트 한정).
- **완료 기준**: 저장/삭제/복원/출력처럼 사용자가 실행한 작업의 실패가 침묵하지 않는다. → **사용자 액션 측면 충족**.

#### B-23. smoke 미포함 중요 라우트와 동적 라우트 QA 확대  🟡 ✅ 완료(2026-06-15)
- **파일**: `scripts/smoke-qa.mjs`, `scripts/full-rt.mjs`
- **문제**: smoke는 22개 대표 라우트만 확인한다. `qa:runtime`은 주요 정적 라우트 63개를 커버하지만, dynamic edit/detail 라우트와 실데이터 fixture 흐름은 별도 검증이 필요하다.
- **현재 완화**: `scripts/smoke-qa.mjs`는 `/menu-sales/rank` redirect 대신 최종 목적지 `/menu-sales/rank-compare`를 보고, `npm run qa:runtime`은 63/63 통과했다.
- **해결 방향**: fixture 기반 QA에서 dynamic route(`/note/[id]`, `/note/sample/[id]`)와 업로드/출력 흐름을 커버한다. `app/**/page.*` 정적 라우트와 `scripts/full-rt.mjs` 대상 목록을 비교하는 route drift guard를 추가한다.
- **완료 내용**: `/cost/recipe-master` route classification 누락을 보강했고, `route-classification.test.mjs`가 실제 `app/**/page.*` 목록과 분류표를 대조한다. `scripts/full-rt.mjs`는 임시 IndexedDB fixture를 seed한 뒤 `/note/900001`, `/note/sample/900001` 동적 상세 route에 직접 진입해 runtime 오류·hydration·빈 화면 여부를 검사한다.

#### B-25. production 빌드 비결정적 실패 (Node 24 + Next 14.2.3 환경)  🔴 ✅ 완료(2026-06-15)
- **해결**: Next.js `14.2.3` → `14.2.35` 패치 업그레이드 (`package.json` next·eslint-config-next 동시 변경).
- **검증**: Node v24.15.0에서 `npm run build:clean` 2회 연속 58 pages 안정 통과. page-data 수집 단계 포함 정상.
- **lint**: ESLint 0 warnings, **test:ci**: 147 suites / 839 tests 통과.

---

### 🟡 중위험 — 단일 모듈 구조 변경 / 테스트 필요

#### B-3 Phase 2. 알레르기 링크 테이블(legacy) store 정의 제거  🟡 ✅ 완료(2026-06-15)
- **완료(Phase 1, 2026-06-13)**: `lib/nutrition/allergen/store.js` dead code 6종 제거.
- **완료(Phase 2, 2026-06-15)**: DB v20 — `nutrition_allergy_links` store 정의 제거(constants·module-stores·schema), v20 마이그레이션에서 기존 DB의 store를 `deleteObjectStore`로 삭제. `migrate-to-ingredient.js` allergen 파트 제거(origin 파트 유지). 7번가 DB 0/0 확인 후 착수.

#### B-5. useDBLoad 전면 확산  🟡 ✅ 완료(2026-06-17) · qa:smoke 22/22

- **Phase 1 완료 (2026-06-16)**: `useDBLoad` 옵션 강화(`initialData`·`deps`·`enabled`·`onError`·`mapErrorMessage`·`keepDataOnReload`·`reload`) + 저위험 hub 5개 및 보고서 2개 적용.
  - hub: `menu-sales`, `nutrition`, `ingredient`, `jette`, `note/journal`
  - report: `report/menu-sales-compare`(rows 1회 로드 + useMemo 파생), `report/price`(deps+keepDataOnReload+mapErrorMessage)
  - 구조 테스트: `__tests__/hooks/use-db-load.test.mjs` 신설
- **Phase 2 완료 (2026-06-16)**: `menu-sales/settings`(제외 수 합산), `ingredient/usage`(7개 병렬 쿼리 번들) 적용.
  - `ingredient/usage`의 `mountedRef`·`useMounted`·`useCallback` 제거 → `cancelled` 플래그 일원화.
- **Phase 3 완료 (2026-06-16)**: 중위험 3개 + 고위험 settings/restore 적용.
  - `useMarginData`: load callback+initDB → useDBLoad. platforms는 loadPlatforms() 직접 초기화(localStorage 동기). setRows 미사용 → 제거.
  - `useIngredientPriceData`: mountedRef·useMounted·useCallback → useDBLoad. rows+fileInfo 번들 반환. cancelled 플래그 자동 처리.
  - `settings/backup`: initDB+setReady+setStats useEffect → useDBLoad. `ready = stats !== null` 파생. localStorage 읽기는 별도 useEffect 유지.
  - `settings/restore`: 동일 패턴. reloadStats()로 복원 후 통계 갱신.
- **고위험 5단계 완료 (2026-06-17)**:
  - 단계 2: `settings/account` — loadAccounts useCallback+initDB → useDBLoad. accounts는 accountData 파생. reloadAccounts() 호출.
  - 단계 3: `menu-master/page` + `useMenuMasterActions` — useDBLoad 번들 패턴. mountedRef 제거. reload() 직접 호출.
  - 단계 3: `useIngredientManageData` — load useCallback → useDBLoad. setRows는 optimistic update용 로컬 상태 보존.
  - 단계 4: `nutrition/menu` — 9개 병렬 쿼리 번들. mountedRef·useCallback 제거.
  - 단계 5: `report/cost` — ignore+loadedCtxRef+initDB 제거. keepDataOnReload:false. includeEdge 재계산은 useMemo. 에러 분기 → throw Error + mapErrorMessage.
- **관련 메모리**: [[deferred-refactors]]

#### B-6 / C-P4. 대형 컴포넌트 분해  🟡 ✅ 완료(2026-06-16)  (C-P4 통합)
- **진행 현황**:
  - `app/report/cost/page.jsx` ✅ 2026-06-14 — 869→407줄. `CostReportView`·`CostTableView` → `components/report/cost/`로 추출. `groupPizzaLR` 이전 완료.
  - `app/report/sales/page.jsx` ✅ 2026-06-15 부분 보강 — Excel export 시트/파일명 조립을 `lib/report/sales-export.js`로 분리하고 fixture 테스트 추가. 938→856줄.
  - `app/report/sales/page.jsx` ✅ 2026-06-15 추가 보강 — 보고서 미리보기 전체를 `components/report/sales/SalesReportPreview.jsx`로 분리. 856→307줄.
  - `app/report/page.jsx` ✅ 2026-06-16 추가 보강 — 새 보고서 종류 선택 모달을 `components/report/NewReportModal.jsx`로 분리. 763→676줄.
  - `app/report/page.jsx` ✅ 2026-06-16 추가 보강 — 보고서 통계 카드 row와 count-up 표시를 `components/report/ReportStatsRow.jsx`로 분리. 676→637줄.
  - `app/report/page.jsx` ✅ 2026-06-16 추가 보강 — 보고서 종류 카드 grid와 최근 건수 표시를 `components/report/ReportKindGrid.jsx`로 분리. 637→610줄.
  - `app/report/page.jsx` ✅ 2026-06-16 추가 보강 — 검색/종류 필터와 즐겨찾기/표시 건수 툴바를 `components/report/ReportFilterToolbar.jsx`로 분리. 610→587줄.
  - `app/report/page.jsx` ✅ 2026-06-16 추가 보강 — 보고서 목록 로딩 skeleton 렌더링을 `components/report/ReportListSkeleton.jsx`로 분리. 587→543줄.
  - `components/report/sales/SalesReportPreview.jsx` ✅ 2026-06-15 추가 보강 — 카테고리 비중·피자 변동·순위표·비교표·제외 리스트 섹션 컴포넌트 분리. 587→94줄.
  - `components/report/sales/SalesRankTableSection.jsx` ✅ 2026-06-15 추가 보강 — 카테고리 막대·순위표·사이즈 variant row 렌더링을 `SalesRankTableRows`로 분리. 197→52줄.
  - `components/report/sales/SalesRankTableRows.jsx` ✅ 2026-06-15 추가 보강 — 카테고리 막대와 순위표 테이블을 `SalesCategoryBarRows`·`SalesRankTable`로 분리하고 기존 묶음 파일 제거. 163→0줄.
  - `components/report/sales/SalesRankTable.jsx` ✅ 2026-06-16 추가 보강 — 순위 row, 사이즈 variant row, 전월 증감 cell 렌더링을 순위표 row 전용 `SalesRankTableRows`로 분리. 80→23줄.
  - `components/report/sales/SalesCategoryBarRows.jsx` ✅ 2026-06-16 추가 보강 — 카테고리 막대 row 렌더링과 수량/비율/opacity 계산을 `SalesCategoryBarRow`·`buildSalesCategoryBarMetrics`로 분리. 87→19줄.
  - `components/report/sales/SalesCategoryBarRow.jsx` ✅ 2026-06-16 추가 보강 — 수량/비율/opacity 계산을 `salesCategoryBarMetrics` helper로 분리하고 단위 테스트 추가. 97→83줄.
  - `app/menu-master/page.jsx` ✅ 2026-06-16 추가 보강 — 레시피/원가 상태 cell과 통계 카드 row를 `MenuRecipeCostCell`·`MenuMasterStatsRow`로 분리. 835→735줄.
  - `app/menu-master/page.jsx` ✅ 2026-06-16 추가 보강 — 메뉴 테이블 row/status/action 렌더링을 `MenuMasterTableRow`로 분리. 735→636줄.
  - `app/menu-master/page.jsx` ✅ 2026-06-16 추가 보강 — 상태/분류/검색 필터 패널을 `MenuMasterFilterPanel`로 분리. 636→556줄.
  - `app/menu-master/page.jsx` ✅ 2026-06-16 추가 보강 — 로딩 skeleton 테이블과 빈 상태 안내를 `MenuMasterLoadingTable`·`MenuMasterEmptyState`로 분리. 556→473줄.
  - `app/menu-master/page.jsx` ✅ 2026-06-16 추가 보강 — 테이블 카드·필터 결과 빈 상태·페이지네이션을 `MenuMasterTablePanel`로 분리. 473→428줄.
  - `app/menu-master/page.jsx` ✅ 2026-06-16 추가 보강 — 상단 CSV/일괄가격/초기화/추가 액션 버튼 묶음을 `MenuMasterHeaderActions`로 분리. 428→405줄.
  - `app/menu-master/page.jsx` ✅ 2026-06-16 추가 보강 — 편집/추가/일괄가격/삭제/초기화 모달 묶음과 삭제 영향 메시지를 `MenuMasterDialogs`로 분리. 405→352줄.
  - `components/menu-master/MenuMasterEditModal.jsx` ✅ 2026-06-16 추가 보강 — 메뉴코드/분류/가격/상태/제외/레시피 입력 필드 묶음을 `MenuMasterEditFields`로 분리하고 `CategoryTags`를 `MenuCategoryTags`로 독립. 391→127줄.
  - `components/menu-master/MenuMasterEditFields.jsx` ✅ 2026-06-16 추가 보강 — 식별/분류 필드, 가격/상태/출력 제외 필드, 공통 라벨/에러 표시를 `MenuMasterIdentityFields`·`MenuMasterCommercialFields`·`MenuMasterFieldPrimitives`로 분리. 277→74줄.
  - `components/menu-master/MenuRecipeSection.jsx` ✅ 2026-06-16 추가 보강 — 레시피 구성품 테이블·식자재 검색 제안·단가 표시 row를 `MenuRecipeComponentsTable`로 분리. 449→286줄.
  - `components/menu-master/MenuRecipeSection.jsx` ✅ 2026-06-16 추가 보강 — 레시피 저장 헤더와 예상 원가/확인 요약 표시를 `MenuRecipeSectionHeader`로 분리. 286→238줄.
  - `lib/menu-master/recipe-summary.js` ✅ 2026-06-16 추가 보강 — 공통 원가 관리의 공통묶음을 메뉴 카테고리/사이즈 기준으로 메뉴마스터 원가 요약에 포함하고, 공통묶음 원산지/알레르기 fixture를 추가.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-15 부분 보강 — `NoteTableRow`·`NoteContextMenu` 렌더링 컴포넌트 분리. 1022→843줄.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-15 추가 보강 — `NoteStatsSummary`·`NoteFilterControls` 렌더링 컴포넌트 분리. 843→642줄.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-15 추가 보강 — `NoteCardGrid`·`NoteTableView` 목록 렌더링 컴포넌트 분리. 642→546줄.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-15 추가 보강 — `NoteListHeader`·`NotePageDialogs`·`NoteListStates` 렌더링 컴포넌트 분리. 546→450줄.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-15 추가 보강 — 단일 노트 삭제·복사·상태변경·새 버전 이동 handler를 `hooks/useNoteItemActions.js`로 분리. 450→359줄.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-15 추가 보강 — 데이터 로드, 목록 필터/view 상태, 보고예정 복사 로직을 `useNoteListData`·`useNoteListState`·`useNoteReportingCopy`로 분리. 359→245줄.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-15 추가 보강 — 카드/테이블/컨텍스트 메뉴/상세 모달 본문 wiring을 `NoteListBody`로 분리. 245→186줄.
  - `app/note/_NoteListBody.jsx` ✅ 2026-06-16 추가 보강 — 컨텍스트 메뉴 좌표 계산과 ESC 닫기 상태를 `useNoteContextMenuState`로 분리. 113→98줄.
  - `app/note/_NoteListBody.jsx` ✅ 2026-06-16 추가 보강 — 컨텍스트 메뉴/카드/테이블/상세 모달 props 조립을 `noteListBodyProps` helper로 분리하고 단위 테스트 추가. 98→40줄.
  - `app/note/noteListBodyProps.js` ✅ 2026-06-16 추가 보강 — 목록 본문 props 조립 helper를 overlay/view 파일로 나누고 기존 파일은 re-export 허브로 축소. 102→2줄.
  - `app/note/_NoteContent.jsx` ✅ 2026-06-16 추가 보강 — 상단 헤더/필터/프리셋/다이얼로그/본문 props 조립을 `useNoteContentController`로 분리. 186→39줄.
  - `hooks/useNoteContentController.js` ✅ 2026-06-16 추가 보강 — 노트 목록 props 조립을 `lib/note/content-props.js` helper로 분리. 174→40줄.
  - `lib/note/content-props.js` ✅ 2026-06-16 추가 보강 — dialogs/header/filter/preset/states/body props 조립을 `content-prop-builders`로 분리. 167→43줄.
  - `lib/note/content-prop-builders.js` ✅ 2026-06-16 추가 보강 — 노트 목록 props builder를 dialog/header/filter/body 파일로 분리하고 기존 파일은 re-export 허브로 축소. 176→11줄.
  - `app/note/sample/page.jsx` ✅ 2026-06-15 추가 보강 — 헤더 액션, 필터/검색, 캘린더, 갤러리/리스트 렌더링을 전용 컴포넌트로 분리. 852→422줄.
  - `app/note/sample/page.jsx` ✅ 2026-06-16 추가 보강 — 데이터 로드/검색·정렬·달력 파생 상태와 삭제·복사·별점 액션을 `useSamplePageState`·`useSampleRecordActions`로 분리. 422→263줄.
  - `app/note/sample/page.jsx` ✅ 2026-06-16 추가 보강 — 비교 하단바와 상세/비교/삭제 확인 다이얼로그를 `SampleCompareBar`·`SamplePageDialogs`로 분리. 263→230줄.
  - `app/note/sample/useSamplePageState.js` ✅ 2026-06-16 추가 보강 — 검색/필터/정렬, 카테고리·별점 집계, 달력 일자/날짜별 묶음을 `samplePageStateUtils`로 분리. 198→160줄.
  - `app/note/sample/useSamplePageState.js` ✅ 2026-06-16 추가 보강 — 검색/카테고리/별점/정렬/view 상태와 URL·검색히스토리 wiring을 `useSamplePageFilterState`로 분리. 160→80줄.
  - `app/note/sample/useSamplePageFilterState.js` ✅ 2026-06-16 추가 보강 — 필터 query/path 생성, URL 초기값, 정렬/view 저장 정책을 `samplePageFilterStateUtils`로 분리하고 단위 테스트 추가. 95→90줄.
  - `app/note/sample/_SampleFilterControls.jsx` ✅ 2026-06-16 추가 보강 — 카테고리 필터, 별점/정렬/view 컨트롤, 검색 히스토리 필드를 하위 컴포넌트로 분리. 192→59줄.
  - `app/note/sample/_SampleRatingViewControls.jsx` ✅ 2026-06-16 추가 보강 — 공통 chip 옵션 그룹과 별점 필터 그룹을 `SampleChipOptionGroup`·`SampleRatingFilterGroup`으로 분리. 88→52줄.
  - `app/note/sample/_SampleRecordsView.jsx` ✅ 2026-06-16 추가 보강 — 로딩 그리드, 빈 상태, 카드 그리드, 리스트 테이블을 하위 컴포넌트로 분리. 179→88줄.
  - `app/note/sample/page.jsx` ✅ 2026-06-16 추가 보강 — header/filter/calendar/records/dialog props wiring을 `useSamplePageController`로 분리. 230→79줄.
  - `app/note/sample/useSamplePageController.js` ✅ 2026-06-16 추가 보강 — 샘플기록 props 조립을 `samplePageControllerProps` helper로 분리. 170→43줄.
  - `app/note/sample/samplePageControllerProps.js` ✅ 2026-06-16 추가 보강 — load/header/actions/filter/calendar/records/dialog props 조립을 `samplePageControllerTopProps`·`samplePageControllerViewProps`·`samplePageControllerDialogProps`로 분리. 148→54줄.
  - `app/note/sample/samplePageControllerViewProps.js` ✅ 2026-06-16 추가 보강 — filter/calendar/records props 조립을 `samplePageControllerFilterProps`·`samplePageControllerCalendarProps`·`samplePageControllerRecordsProps`로 분리. 91→3줄.
  - `app/ingredient/manage/IngredientForm.jsx` ✅ 2026-06-15 추가 보강 — `IngredientNameField`·`BasicIngredientFields`·`IngredientCostFields` 렌더링 컴포넌트 분리. 817→468줄.
  - `app/ingredient/manage/IngredientFormFields.jsx` ✅ 2026-06-15 추가 보강 — 이름·기본정보·단가 필드 파일 분리, 기존 import 호환용 re-export 유지. 410→3줄.
  - `app/ingredient/manage/IngredientCostFields.jsx` ✅ 2026-06-15 추가 보강 — 포장수량, 수동 단가/보관·과세, 전용/범용·비고 필드를 하위 컴포넌트로 분리. 205→19줄.
  - `app/nutrition/allergen/page.jsx` ✅ 2026-06-15 추가 보강 — `AllergenIngredientTable`·`AllergenMenuMatrixTable`·`AllergenDetailModal` 렌더링 컴포넌트 분리. 802→500줄.
  - `app/nutrition/allergen/page.jsx` ✅ 2026-06-15 추가 보강 — `AllergenPageHeader`·`AllergenSummaryPanel`·`AllergenToolbar`·`AllergenTablePanel` 렌더링 컴포넌트 분리. 500→381줄.
  - `app/nutrition/allergen/page.jsx` ✅ 2026-06-15 추가 보강 — 데이터 로드·제외 메뉴 판정·매트릭스·순서·CSV 파생 계산을 `useAllergenPageData`로 분리. 381→113줄.
  - `app/nutrition/allergen/useAllergenPageData.js` ✅ 2026-06-15 추가 보강 — DB 로드·레시피 매핑 생성을 `useAllergenSourceData`로 분리하고, 기존 훅은 매트릭스/정렬/CSV 파생 계산 중심으로 축소. 337→247줄.
  - `app/nutrition/allergen/useAllergenPageData.js` ✅ 2026-06-15 추가 보강 — 검색 필터, 알레르기 정렬, 순서 편집 목록, CSV 행 조립을 `allergenPageDataUtils`로 분리. 247→169줄.
  - `app/nutrition/allergen/useAllergenPageData.js` ✅ 2026-06-15 추가 보강 — 메뉴/알레르기 순서와 메뉴명 override 저장 상태를 `useAllergenOrderState`로 분리. 169→142줄.
  - `app/nutrition/allergen/allergenPageDataUtils.js` ✅ 2026-06-16 추가 보강 — 순서 편집 목록과 CSV 행 조립을 `allergenPageOutputUtils`로 분리. 127→88줄.
  - `app/nutrition/allergen/useAllergenPageData.js` ✅ 2026-06-16 추가 보강 — 상세 모달 행과 요약 카운트 계산을 `allergenPageDetailUtils`로 분리. 144→139줄.
  - `app/nutrition/allergen/useAllergenPageData.js` ✅ 2026-06-16 추가 보강 — 제외 메뉴 판정, 매트릭스, 상세/요약, 순서 편집 목록 파생 계산을 `useAllergenDerivedData`로 분리. 139→58줄.
  - `app/nutrition/allergen/useAllergenDerivedData.js` ✅ 2026-06-16 추가 보강 — 제외 메뉴 판정, 메뉴 매트릭스 생성, 매트릭스 검색, 알레르기 정렬을 `useAllergenMatrixData`로 분리. 118→81줄.
  - `components/nutrition/menu/TabDerived.jsx` ✅ 2026-06-16 추가 보강 — 파생 메뉴 목록, 추가/편집 모달, L/R 식자재 사용량 row, 검색·그룹핑 helper를 `components/nutrition/menu/derived/`로 분리. 437→107줄.
  - `components/sales/UnmatchedTable.jsx` ✅ 2026-06-16 추가 보강 — 선택 일괄 액션, 일괄 분류 패널, 미매칭 테이블, row/해결 폼 연결을 `components/sales/unmatched/`로 분리. 437→210줄.
  - `components/cost/margin/PlatformSettingsModal.jsx` ✅ 2026-06-16 추가 보강 — portal shell, 플랫폼 selector, 플랫폼 editor, reducer/저장 정리 helper를 `components/cost/margin/platform-settings/`로 분리. 433→46줄.
  - `components/note/TempCostCalculator.jsx` ✅ 2026-06-16 추가 보강 — 재료 검색/연동 갱신, 원가 행 테이블, 합계/원가율 요약, parse/filter/refresh helper를 `components/note/temp-cost/`로 분리. 426→60줄.
  - `components/sales/UserRulesSection.jsx` ✅ 2026-06-16 추가 보강 — 사용자 규칙 폼, 규칙 테이블/row, 검색·정렬·검증 helper를 `components/sales/user-rules/`로 분리. 422→185줄.
  - `components/cost/ingredient-price/SuppliersView.jsx` ✅ 2026-06-16 추가 보강 — 공급업체 등록/수정 모달, 검색 툴바, 로딩/빈상태/테이블 패널, 검색 helper를 `components/cost/ingredient-price/suppliers/`로 분리. 413→128줄.
  - `components/cost/ingredient-price/SyncBaseQtyModal.jsx` ✅ 2026-06-16 추가 보강 — 제때 단가 파일 선택, 주의 안내, 프리뷰 요약·변경 테이블, 완료/오류 표시, 표시 helper를 `components/cost/ingredient-price/sync-base-qty/`로 분리. 389→134줄.
  - `components/jette/PriceCompareTable.jsx` ✅ 2026-06-16 추가 보강 — 제때 가격 비교의 분류/변동 필터, 비교 테이블, row/status 표시, CSV·카운트·포맷 helper를 `components/jette/price-compare/`로 분리. 390→121줄.
  - `components/jette/ManagedProductsCard.jsx` ✅ 2026-06-16 추가 보강 — 제때 대상 제품 목록의 헤더 액션, 필터/검색, 테이블/빈상태, CSV·카운트·검색 helper를 `components/jette/managed-products/`로 분리. 385→226줄.
  - `components/cost/recipe-groups/GroupEditor.jsx` ✅ 2026-06-16 추가 보강 — 공통묶음 편집기의 헤더, 기본 필드, 사이즈 입력, 카테고리 chip, 식자재 테이블, 사이즈별 원가 helper를 `components/cost/recipe-groups/editor/`로 분리. 381→121줄.
  - `components/nutrition/menu/TabToppings.jsx` ✅ 2026-06-16 추가 보강 — 추가토핑 영양성분 탭의 헤더/빈상태/목록 테이블, 편집 모달, 식자재 연결·알레르기·저장 payload helper를 `components/nutrition/menu/toppings/`로 분리. 376→123줄.
  - `components/cost/ingredient-price/BulkPriceModal.jsx` ✅ 2026-06-16 추가 보강 — 식자재 일괄 단가 업로드 모달의 포맷 안내, 파일 선택, 파싱 상태, 프리뷰 테이블, 완료/오류 표시, 금액·변동 helper를 `components/cost/ingredient-price/bulk-price/`로 분리. 367→135줄.
  - `components/cost/ingredient-price/UsageView.jsx` ✅ 2026-06-16 추가 보강 — 식자재 사용현황 뷰의 사용행 파생 helper, 요약바, 필터/출력 툴바, 사용 메뉴 테이블을 `components/cost/ingredient-price/usage-view/`로 분리. 360→56줄.
  - `components/jette/PriceLatestView.jsx` ✅ 2026-06-16 추가 보강 — 최신 제때 단가 현황의 파일 없음 상태, 목록 카드, 분류/과세 필터, 단가 테이블/row, CSV·필터·표시 helper를 `components/jette/price-latest/`로 분리. 341→124줄.
  - `components/cost/ingredient-price/IngredientPriceListPanel.jsx` ✅ 2026-06-16 추가 보강 — 식자재 단가 목록 패널의 기준 파일 표시, 통계 카드, 과세/검색/선택 툴바, 목록 테이블/row shell을 `components/cost/ingredient-price/list-panel/`로 분리. 338→51줄.
  - `components/report/ReportPreviewPages.jsx` ✅ 2026-06-16 추가 보강 — 보고서 미리보기의 표지, 옵션 row, 설정 페이지, 요약 페이지, 날짜/object guard helper를 `components/report/preview-pages/`로 분리. 329→29줄.
  - `components/jette/ShipmentTable.jsx` ✅ 2026-06-16 추가 보강 — 제때 출고량 집계의 필터, 테이블 카드, header/body/row, 분류 chip, 검색·정렬·row 값 helper를 `components/jette/shipment-table/`로 분리. 321→56줄.
  - `components/ingredient/usage/IngredientUsageTable.jsx` ✅ 2026-06-16 추가 보강 — 식자재 사용현황 테이블의 header/footer/빈상태, row, 식자재명 cell, 피자·사이드 카운트, 메뉴 chip/제외 액션을 `components/ingredient/usage/table/`로 분리. 349→57줄.
  - `components/report/cost/CostReportView.jsx` ✅ 2026-06-16 추가 보강 — 원가 보고서 미리보기의 summary stats, 카테고리 종합 비교, 카테고리별 메뉴표, 위험 메뉴 부록, 원가 미연결 진단을 `components/report/cost/report-view/`로 분리. 338→55줄.
  - `app/nutrition/export/NutritionLabelTables.jsx` ✅ 2026-06-16 추가 보강 — 영양성분 출력의 피자 150g 표, 피자 조각 표, 단순 영양표, 세트/하프앤하프 표, 공통 셀/빈상태 primitive를 `app/nutrition/export/label-tables/`로 분리. 336→35줄.
  - `components/note/SampleCard.jsx` ✅ 2026-06-16 추가 보강 — 샘플 카드의 view model 정리, 선택/비교 overlay, 썸네일, 헤더/별점, 메타, 태그, 액션 버튼을 `components/note/sample-card/`로 분리. 311→95줄.
  - `components/ingredient/ManageRow.jsx` ✅ 2026-06-16 추가 보강 — 식자재 관리 행의 view model, 선택 cell, 코드/연동 badge, 사진 cell, 이름/원산지/알레르기 badge, scope/가격/분류/태그/action cell을 `components/ingredient/manage-row/`로 분리. 315→105줄.
  - `components/ui/MenuCodePicker.jsx` ✅ 2026-06-16 추가 보강 — 메뉴코드 후보 생성/검색/키보드 이동 helper, 선택 상태 pill, 검색 입력, dropdown/row 렌더링을 `components/ui/menu-code-picker/`로 분리. 314→113줄.
  - `components/home/HomeDashboardRows.jsx` ✅ 2026-06-16 추가 보강 — 홈 대시보드 rowId 렌더링을 renderer map, single row renderer, pair row renderer, 공통 row shell로 `components/home/home-dashboard-rows/`에 분리. 311→5줄.
  - `components/cost/ingredient-price/RegisterModal.jsx` ✅ 2026-06-16 추가 보강 — 식자재 단가 등록 모달의 controller hook, 제품 정보 패널, 기본 필드, 포장/공급업체/단가 필드, footer action, 저장/검증 helper를 `components/cost/ingredient-price/register-modal/`로 분리. 305→66줄.
  - `components/report/ReportListTable.jsx` ✅ 2026-06-16 추가 보강 — 보고서 목록 테이블의 row model, table header, 이름 편집 cell, 활동 cell, row action, 빈 상태, pagination helper를 `components/report/report-list-table/`로 분리. 303→73줄.
  - `app/note/sample/_SampleDetailModal.jsx` ✅ 2026-06-16 추가 보강 — 샘플 상세 모달의 view model, shell/header, 사진 carousel/thumbnail/zoom panel, 본문 section/tag/empty state를 `app/note/sample/detail-modal/`로 분리. 349→71줄.
  - `app/note/calendar/CalendarGrid.jsx` ✅ 2026-06-16 추가 보강 — 달력 주간 헤더, 월 그리드, 날짜 셀/header, 일정·노트·샘플 item, 업무 로그 dot, 표시/overflow helper를 `app/note/calendar/calendar-grid/`로 분리. 331→41줄.
  - `app/note/calendar/page.jsx` ✅ 2026-06-16 추가 보강 — 달력 월별 PDF 출력 builder, 상단 액션, 월 이동/통계/view mode 툴바, 그리드+사이드패널, 일정 모달/삭제 확인 묶음을 `app/note/calendar/` 하위 컴포넌트와 `calendar-print.js`로 분리. 391→209줄.
  - `components/charts/AreaChart.jsx` ✅ 2026-06-16 추가 보강 — area chart의 tick/path/scale/hover helper, Y축 라벨, SVG layer, tooltip, X축 라벨을 `components/charts/area-chart/`로 분리. 350→121줄.
  - `app/cost/all-summary/page.jsx` ✅ 2026-06-16 추가 보강 — 종합전메뉴원가의 data loader/sort, 통계·카테고리·CSV helper, stats/filter/loading/empty/notice/table/error 컴포넌트를 `app/cost/all-summary/` 하위로 분리. 336→92줄.
  - `app/note/[id]/page.jsx` ✅ 2026-06-16 추가 보강 — 노트 수정 화면의 route id/draft 비교/관련 샘플 helper, action/cost menu, draft banner, version timeline, related sample panel을 `app/note/[id]/detail/`로 분리. 458→206줄.
  - `lib/ingredient/manage-print.js` ✅ 2026-06-16 추가 보강 — 식자재관리 목록/사진 PDF 출력의 formatter, 테이블 출력 builder, 사진 카드 출력 builder를 `lib/ingredient/manage-print/`로 분리. 353→8줄.
  - `components/settings/restore/RestoreExecutePanel.jsx` ✅ 2026-06-16 추가 보강 — 복원 실행의 자동 백업 옵션, 확인 요약, 자동백업 실패 재확인, 실행 버튼, 진행률 바, 모듈 chip 표시를 하위 컴포넌트로 분리. 342→105줄.
  - `lib/cost/recipe-groups/apply.js` ✅ 2026-06-16 테스트 회귀 보정 — `defaultCategories` 누락 공통묶음이 전체 메뉴에 자동 적용되지 않도록 안전 처리로 복구하고 `test:ci` 실패를 해소.
- **최종 완료(2026-06-16)**: `app/report/page.jsx` 543→187줄. 헬퍼 함수·exportToExcel → `lib/report/report-list-utils.js`, 테이블·빈상태·페이지네이션 → `ReportListTable`, 스냅샷 안내 카드 → `ReportSnapshotCard`, 모달·ConfirmDialog 묶음 → `ReportPageDialogs`. lint 0 / test 1020 통과.
- **추가 완료(2026-06-16, CLAUDE_CODE_REFACTOR_HANDOFF.md 전체 구현)**:
  - 공통원가 카테고리 UI 정합성 ✅ — `GroupEditorCategoryChips.jsx` 경고 문구·색, `CommonManageView.jsx` 저장 가드, `MenuRecipeGroupSelector.jsx` 빈 상태 메시지 수정.
  - `app/report/sales/page.jsx` ✅ 306→160줄 — `useSalesReportData.js`(데이터 로드), `useSalesReportComputed.js`(통계 계산), `salesReportPageUtils.js`(normalizeViewMode) 분리. 구조 테스트 추가.
  - `app/menu-master/page.jsx` ✅ 352→195줄 — `menuMasterExport.js`(CSV 조립), `useMenuMasterActions.js`(delete/seed/reset/save/sync) 분리. 구조 테스트 추가.
  - `app/ingredient/manage/page.jsx` ✅ 666→280줄 — `ingredientManageUtils.js`(뷰 정규화·복구·toast helper), `useIngredientManageActions.js`(전체 액션 핸들러) 분리. undo 가드·silent-catch 테스트 업데이트.
  - `app/cost/margin/page.jsx` ✅ 594→430줄 — `useMarginData.js`(데이터 로드), `marginPageUtils.js`(normalizePercentSetting) 분리. 필터/정렬/stats는 money 계산이라 page 유지.
  - `app/settings/brands/page.jsx` ✅ 551→230줄 — `brandUtils.js`(EMPTY_FORM/brandFormOf/countRows), `useBrandActions.jsx`(저장·숨김·전환·백업·복원) 분리. brand-restore-preview 테스트 업데이트.
  - `app/settings/backup/page.jsx` ✅ — `backupPageUtils.js`(exportHistoryCsv), `useBackupActions.js`(handleBackup·타이머 cleanup) 분리.
  - `components/AppShell.jsx` ✅ 411→140줄 — `ShortcutsHelp.jsx`, `hooks/useKeyboardShortcuts.js`, `hooks/useAppBrands.js` 분리. app-shell-hydration 테스트 업데이트.
- **잔여 대상 재스캔(2026-06-16, 300줄 이상 기준)**:
  - 추천 후보로 지정했던 17개(`IngredientUsageTable`, `CostReportView`, `NutritionLabelTables`, `SampleCard`, `ManageRow`, `MenuCodePicker`, `HomeDashboardRows`, `RegisterModal`, `ReportListTable`, `SampleDetailModal`, `CalendarGrid`, `calendar/page`, `AreaChart`, `cost/all-summary`, `note/[id]`, `manage-print`, `RestoreExecutePanel`)는 모두 완료.
  - 2차 재스캔 추천 후보(안전·효과 기준)는 모두 구현 완료.
  - 3차 재스캔 추천 후보도 모두 구현 완료 (sales/page, menu-master/page, ingredient/manage/page, cost/margin/page, settings/brands/page, settings/backup/page, AppShell).
  - 단순 줄 수 상위지만 보류: seed/rules 데이터, store, 설정(system/account) page, TopBar, 로그인 page, 빌더 계산 로직.
- **보류 권장**:
  - `app/settings/system/page.jsx`, `app/settings/account/page.jsx` — 설정 화면은 상태·권한 동선 영향이 커서 별도 라운드에서 처리.
  - `app/report/cost/page.jsx` — 이미 여러 하위 컴포넌트와 연결된 page 조립부라, 다음 기능 변경 때 함께 정리.
  - `components/TopBar.jsx`, `app/login/page.jsx` — 전역 레이아웃/인증 경계이므로 단순 줄 수 기준으로 먼저 건드리지 않음.
- **중복 정리 후보**:
  - `components/cost/ingredient-price/BulkPriceModal.jsx` ✅ 2026-06-16 삭제 — 외부 import 없는 dead code 확인 후 제거. 관련 구조 테스트도 삭제된 파일 참조 제거.
  - `components/cost/ingredient-price/UsageView.jsx` ✅ 2026-06-16 삭제 — 외부 import 없는 dead code 확인 후 제거. 관련 구조 테스트도 삭제된 파일 참조 제거.
  - `ModalFrame` 하단 버튼 영역(`취소`/`저장`/`다시 선택`) 반복 → `ModalActions` 또는 작은 modal footer primitive 후보.
  - `data-table`의 로딩/빈상태/가로 스크롤 wrapper 반복 → 기능별 분리 후 공통화 여부 재평가.
  - `formatNumber`와 직접 `toLocaleString()` 혼용 → 금액/개수/kcal 포맷 helper를 점진 통일.
  - 반복되는 inline flex/gap 스타일 → 전역 CSS화는 위험하므로, 새로 분리하는 컴포넌트 내부에서만 국소 상수화.
- **방향**: page는 조립만 담당, table/panel/modal/hook으로 분리.
- **왜 보류**: 효과 < 회귀 위험. 기능 추가 시점에 함께 진행 예정.
- **검증**: `npm run test:ci` + 주요 화면 수동 확인
- **관련 메모리**: [[deferred-refactors]]

#### B-9. 1인피자 알레르기 표시 기준 정리  🟡 ✅ 완료(2026-06-15)
- **도메인 확인**: 1인피자 크러스트는 씬바사삭 1종만 (사용자 확인).
- **완료**: `lib/nutrition/allergen/matrix.js` — `isPersonalPizzaCategory` 분기 추가, 1인피자는 씬바사삭 크러스트 1행만 생성(도우 계열 제외 + 씬도우 엣지 포함). `logicalMenuKey`도 1인피자 L/R 사이즈를 논리 키로 묶도록 확장. build.js 라벨 기준과 통일.

#### B-24. 문서·README·아키텍처 정합성 최신화  🟢 ✅ 완료(2026-06-15)
- **README.md**: 폰트(CDN→로컬 `next/font/local`), CSS 구조(`components/`·`features/` 분리), 검증 명령(`format:check`·`test:ci`·`build:clean`·`qa:smoke`·`qa:runtime`) 현행화.
- **ARCHITECTURE.md**: 라우트 구조, IndexedDB v20 store 그룹, 멀티브랜드, QA 스크립트 표, 최근 정리 이력 추가.
- **SITE_IMPROVEMENT_BACKLOG.md**: B-9·B-3 Phase 2 완료 반영, 4단계·결정 필요 항목 완료 표시.

#### B-26. 무거운 라우트 route-level loading / error 경계 추가  🟢 ✅ 완료(2026-06-14)
- **파일**: `app/_shared/RouteLoading.jsx`, `app/_shared/RouteError.jsx`(공유 컴포넌트) + 4개 라우트 각각 `loading.jsx`·`error.jsx`
- **완료 내용**: `/nutrition/menu`, `/report/sales`, `/ingredient/usage`, `/settings/restore` 에 route-level `loading.jsx`(스피너) · `error.jsx`(국소 복구) 추가. 공유 컴포넌트를 `app/_shared/`에 두고 각 라우트가 re-export하는 구조.
- **효과**: 특정 화면 런타임 예외가 전체 `app/error.jsx`(앱 전체 리셋)로 전파되지 않고 해당 라우트 세그먼트에서 격리됨.

#### A-1. Route loading/error 경계 확대  🟢 ✅ 완료(2026-06-16)
- **대상**: B-26에서 빠진 9개 라우트 — `ingredient/usage`(error 추가), `settings/restore`(loading 추가), `cost/margin`, `cost/recipe`, `cost/all-summary`, `note/calendar`, `note/board`, `jette/price-compare`, `report/cost`
- **완료 내용**: 각 라우트에 `loading.jsx`·`error.jsx` 파일 18개 추가. 공유 컴포넌트 re-export 패턴 동일.
- **검증**: `npm run lint` ESLint 0 warnings. 총 loading/error 파일 23개 확인.

#### A-2. 인라인 스타일 상수화 확대  🟢 ✅ 완료(2026-06-16)
- **대상**: `settings/account/page.jsx`, `settings/system/page.jsx`, `settings/backup/page.jsx`, `settings/brands/page.jsx`
- **완료 내용**: 2회 이상 반복되는 인라인 스타일을 파일 상단 `const S_XXX = { ... }` 상수로 추출. account 5개, system 4개, backup 4개, brands 3개 상수 추출.
- **검증**: `npm run lint` + `npm run format:check` 통과.

#### A-3. 테스트 갭 보강 (`lib/report/build-*.js`)  🟢 ✅ 완료(2026-06-16)
- **대상**: `lib/report/build-shipment-report.js`, `lib/report/build-compare-report.js`
- **완료 내용**: `__tests__/lib/build-shipment-report.test.mjs`(8 tests), `__tests__/lib/build-compare-report.test.mjs`(6 tests) 신규 작성.
- **검증**: `npm run test:ci` 198 suites / 1041 tests 통과.

#### B-1. 대형 page 분해  🟡 ✅ 완료(2026-06-16)
- **대상 5개 파일**: `report/shipment`, `ingredient/manage`, `cost/margin`, `settings/account`(PIN·PW·FormField 이미 추출됨), `settings/system`
- **완료 내용**:
  - `report/shipment/page.jsx`: 740→209줄. `ShipmentItemTable`, `useShipmentReportData`, `ShipmentReportOptions`, `ShipmentReportPreview` 추출.
  - `ingredient/manage/page.jsx`: 761→684줄. `IngredientJetteIssuesPanel` (newJette/jetteRemoved 테이블) 추출.
  - `cost/margin/page.jsx`: 723→594줄. `MarginCostThresholdBar`, `MarginTableHeader` 추출.
  - `settings/system/page.jsx` ✅ 2026-06-17 추가 완료 — 697→441줄. 8개 하위 컴포넌트를 `_SystemSettingsUI.jsx`(231줄)로 추출. `useMounted`·`initDB`·수동 useEffect → `useDBLoad`. `refreshStats()` → `reloadStats` 위임.
  - `settings/account/page.jsx` ✅ 2026-06-17 추가 완료 — 685→307줄. 4개 하위 컴포넌트(AccountProfileCard·AccountSessionCard·AccountMembersCard·AccountPermissionsMatrix)를 `_AccountSettingsUI.jsx`(410줄)로 추출. 인라인 핸들러를 named 함수로 정리.
- **신규 파일**: `components/report/shipment/` 3개, `hooks/useShipmentReportData.js`, `components/ingredient/IngredientJetteIssuesPanel.jsx`, `components/cost/margin/MarginCostThresholdBar.jsx`, `components/cost/margin/MarginTableHeader.jsx`, `app/settings/system/_SystemSettingsUI.jsx`, `app/settings/account/_AccountSettingsUI.jsx`
- **검증**: `npm run lint` + `npm run test:ci` 249 suites / 1205 tests 통과.

---

### 🔴 고위험 — 설계 합의 / 외부 조건 대기

#### N-42. 엣지별 알레르기 탭 (신중 점검)  🔴 ✅ 완료(2026-06-15)
- **파일**: `lib/nutrition/allergen/matrix.js:102-150`, `lib/nutrition/allergen/rules.js:19-31`, `lib/nutrition/crust-config.js:49-54`
- **내용**: 표출력에 엣지 선택 시 알레르기 합산. 씬바사삭: 기본 도우(석쇠) 알레르기 **제거(-)** + 씬도우 **추가(+)**, 단 도우에 있던 알레르기값이 다른 식자재에도 있으면 유지.
- **완료 내용**: 씬바샤삭은 기본 도우 알레르기를 제외하고 비도우 식자재 알레르기와 씬도우 구성품 알레르기를 합산한다. 씬도우 구성품의 대두는 제외하되, 대두가 비도우 식자재에도 있으면 유지한다. 치즈크러스트는 우유 보정, 골드스윗은 사이즈별 구성품 알레르기 합산을 fixture로 고정했다.

#### N-43. 재료단가표 과거 식자재 단가 가져오기  🟡 ⏸
- **파일**: `app/cost/ingredient-price/` + `lib/price/`(파일별 이력 존재, `PriceHistoryModal`)
- **내용**: 일시적으로 변경된 납품가를 과거 단가로 소급 조회/적용.
- **왜 보류**: 동작 명세 미확정 — 특정 날짜 단가를 원가계산에 일시 적용하는지, 조회만 하는지.
- **착수 게이트**: 동작 명세 제공 시 착수.

#### BUG-011. `deleteIngredient` cascade 비원자성  🟢 ⏸
- **파일**: `lib/ingredient/store.js`
- **내용**: 부모(`cost_ingredients`) 삭제와 알레르기 링크 cascade가 별개 트랜잭션. 단, `nutrition_allergy_links` store는 v20 마이그레이션에서 제거되어 `hasStore` 가드로 현재 no-op → 실제 고아 레코드 발생 경로 없음.
- **왜 보류**: 라이브 결함 아님. `ingredient-delete-cascade.test.mjs`가 cascadeErrors 반환 계약을 검증하고 있어 임의 삭제 시 회귀 위험.
- **권고**: 향후 새 cascade 대상 추가 시 `lib/db/crud.js`의 `deleteWithChildren`(단일 트랜잭션) 패턴 사용.

#### BUG-014. TopBar 다크모드 아이콘 첫 렌더 플리커  🟢 ⏸
- **파일**: `components/TopBar.jsx`
- **내용**: `dark` 초기값 `false` → 마운트 후 effect가 `data-theme`/설정과 동기화하는 과정에서 테마 토글 아이콘이 한 프레임 깜빡일 수 있음.
- **왜 보류**: 현재 패턴은 하이드레이션 안전을 위한 의도적 설계(useState 초기화에서 `document` 접근 시 SSR/CSR 불일치 위험). 한 프레임 아이콘 깜빡임보다 하이드레이션 정합성이 우선.
- **권고**: 완전 제거하려면 `<head>` 블로킹 인라인 스크립트에서 아이콘 초기 상태까지 확정해야 하며, 별도 작업으로 검토.

#### 메뉴마스터 레시피 2차 UX 후보  🟢 ⏸
- 공통원가 묶음의 상세 구성품을 접힘 목록으로 표시
- 구성품 행 복사
- 최근 사용 / 같은 카테고리 자주 쓰는 식자재 우선 추천
- 단가 없는 식자재만 필터링·빠르게 보정하는 버튼
- 레시피 저장 전 누락 항목 확인 모달
- 원산지/알레르기 영향 미리보기 (레시피 저장 전 출력 결과 변화 표시)
- 이슈 탭 빠른 액션: `바로 수정`, `레시피 섹션으로 이동`, `단가 보정으로 이동`
- **왜 보류**: 입력 UX·저장 반영 안정화(P0~P5) 완료. 사용자 승인 후 착수.

#### 식자재 데이터 정리 도구  🟡 ⏸
- 유사 식자재 병합(같은 제품코드/유사 이름/동일 원산지 후보를 안전하게 병합)
- 분류/태그 이름 변경 기능
- 미사용 태그 일괄 삭제
- 대량 식자재 편집: 분류·태그·전용범용·단종 상태 일괄 변경
- **왜 보류**: 입력 UX 안정화 완료 → 착수 가능 조건 충족. 사용자 승인 후 착수.
- **착수 게이트**: 사용자 명세 확인 후 B섹션으로 이동.

#### E2E QA 확장 시나리오  🟡 ⏸
- 메뉴 등록 → 레시피 저장 → 원가마진표 반영 (레시피 구성 UI 다단계)
- 식자재 단가 변경 → 메뉴 원가 → 원가 보고서 (가격 파일 fixture 필요)
- 판매량 업로드 → 미매칭 처리 → 보고서 생성 (판매 CSV fixture 필요)
- 공통원가 → 원가/원산지/알레르기 출력 파이프라인 검증
- **2026-06-18 추가 완료**: 브랜드 전환→브랜드별 데이터 분리, 노트 일정 추가→캘린더 반영, 식자재 등록→관리 목록 반영 시나리오 추가. `qa:workflow` 9/9 통과.
- **왜 보류**: 남은 4개는 다단계 사전 데이터(레시피·식자재·CSV)가 필요해 fixture/시드 설계 선행 필요.
- `scripts/workflow-qa.mjs` 하니스는 준비되어 있으며, 남은 시나리오는 fixture 설계 후 추가한다.

#### CSS·디자인 시스템 정리  🟢 ⏸
- 큰 CSS 파일 분리: `motion-note.css`·`home.css`·`report/builder.css`·`report/table.css`·`settings.css`·`cost.css`·`ingredient.css`
- 공통 토큰/레이아웃/테이블/모달/인쇄 스타일을 역할별 분리
- inline style 반복(card header·summary row·modal footer) → 공통 class/helper
- **왜 보류**: 시각 회귀 위험 큼. 보고서/인쇄처럼 영향 범위 명확한 영역부터 순차 진행.

#### 출력·인쇄·다운로드 파이프라인 점검  🟢 ⏸
- PDF/인쇄/CSV/XLSX 공통 UX 문구·실패 처리 통일
- `document.write` 기반 출력 HTML 사용자 입력 escaping 재확인
- 파일명 규칙 `브랜드명_업무명_날짜` 기준 통일
- 대용량 출력 progress·취소 가능 여부 검토
- **왜 보류**: 기능 안정화 이후 점진 적용. 출력 유형별 1커밋 단위.

#### localStorage·백업 범위 정합성 점검  🟡 ⏸
- 영속 보관 키 vs 세션성 키 명확 분류·문서화
- 브랜드별 분리 키 vs 공유 키 표 작성
- 임시저장·최근 방문·스크롤 위치 등 복원 시 이상한 키 백업 제외 확인
- 테스트: 선택 백업 범위별 localStorage 포함/제외 · 브랜드 복원 시 플랫폼 수수료·출력 순서 복원 확인
- **왜 보류**: 백업/복원 안전성은 이미 확보. 정합성 문서화는 다음 라운드.

#### 에러·빈상태·권한 상태 UI 통일  🟢 ⏸
- 공통 `ErrorState`·`EmptyState`·`PermissionNotice`·`InlineWarning` 패턴 정의 확대
- DB 로드 실패 `다시 시도` 액션 통일
- viewer 권한에서 disabled 이유 tooltip 또는 안내 문구 제공
- 위험 액션 confirm UI·문구 기준 통일
- **왜 보류**: `EmptyState`·`Skeleton`·toast-type 정책은 이미 적용됨. 추가 통일은 화면 단위 점진 적용.

#### 업로드·import 중복 로직 정리  🟡 ⏸
- CSV/XLSX 파일 확장자 검사·크기 제한·파싱 실패 메시지·미리보기 공통 helper
- 업로드 history/hash 중복 검사 정책 문서화
- 업로드 실패 row 다운로드 형식 통일
- **왜 보류**: 모듈마다 업로드 구조가 달라 공통화 회귀 위험. 신규 업로드 모듈 추가 시점에 함께 통일.

#### 모바일·좁은 화면 레이아웃 재검사  🟢 ⏸
- 390px 폭에서 테이블·모달·드롭다운·상단 액션 버튼 겹침 확인
- 고정 TopBar/Sidebar/Modal z-index 기준 문서화
- 우선 확인: 메뉴마스터 수정창·식자재 모달·백업/복원·원가마진표·보고서 미리보기
- **왜 보류**: 데스크톱 업무 도구 우선. 모바일 하단 탭 + responsive layout은 이미 구현됨.

#### 외부 배포 보안 강화  🔴 ⏸
- **인증 강화**: 비밀번호 해시에 솔트 추가(계정별 랜덤), bcrypt/argon2 도입, 계정 잠금 정책, 최소 복잡도 정책
- **세션·쿠키 강화**: 서버 발급 랜덤 토큰, Secure 플래그(HTTPS), HttpOnly 플래그, 세션 만료, 서버 측 세션 저장소
- **서버 사이드 라우트 가드**: API route handler 토큰 검증, admin API endpoint 서버 role 확인, `/api/` PUBLIC_PATHS 제외
- **XSS·CSRF 방어**: CSP 헤더, CORS 정책
- **왜 보류**: 현재 단일 LAN HTTP 내부 환경이므로 아래 항목은 의도적으로 허용된 상태: 솔트 없는 SHA-256(단일 계정 LAN), Secure/HttpOnly 미적용(LAN HTTP + 클라이언트 JS 로그아웃 구조), `/api/` 인증 없음(현재 API route 없음), PIN localStorage(물리 기기 접근 환경).
- **착수 게이트**: 외부 인터넷 배포 또는 HTTPS LAN 다중 사용자 전환 결정 시.

---

## C. 코드 품질 정리 플랜 (2026-06-14 신규 등록)

> 기능 변경 없이 코드 건강도를 높이는 작업. 위험도 낮은 것부터 진행.

### 현재 상태 요약

- `docs/v2-reference/` 삭제 완료. 2026-06-14 감사(`BUG_AUDIT_2026-06-14.md`)는 내용 흡수 후 삭제. 백로그 문서(`SITE_IMPROVEMENT_BACKLOG.md`)는 참고 자료이고, 보류·완료 판단의 최종 출처는 이 `DEFERRED_WORK.md`로 유지한다.
- `.DS_Store`·빈 디렉터리 정리 완료.
- 대형 seed/rule 데이터는 `lib/*/data/*`로 이미 분리됨 — 추가 정리 우선순위 낮음.

---

### 🟢 1순위 — 정책 위반·불안정 key 제거 (즉시 착수 가능)

#### C-P1. `lib/print/window-print.js` raw `alert()` 제거  ✅ 2026-06-14
- `alert()` → 동적 `import('@/components/Toast')` + `showToast('warn')`. 정적 import 시 Jest가 React 의존성 로드로 3 test suite 실패 → dynamic import로 해결.

#### C-P2. `Math.random()` key → 모듈 레벨 카운터  ✅ 2026-06-14
- `MenuRecipeSection.jsx`: `Math.random()` → `let _rowKey = 0; ++_rowKey` 패턴. `newRow()`·useEffect load 2곳.

---

### 🟢 2순위 — 인라인 스타일 축소 (파일별 단독 PR 권장)

#### C-P3. 상위 파일 인라인 스타일 파일 상단 상수화  ✅ 2026-06-14
- `cost/page.jsx`: `S_DOT_LABEL` (4곳)
- `sales/page.jsx`: `S_SECTION_TITLE_FLEX`·`S_EMPTY_STATE`·`S_MOVER_LABEL` (10곳)
- `RestorePreview.jsx`: `S_FIELD_LABEL` (8곳)
- `TabSetCalc.jsx`: `S_CARD_TITLE` (3곳)

---

### 🟡 3순위 — 대형 화면 파일 분리 (중위험, 파일별 단독 PR)

#### C-P4. 대형 page/컴포넌트 분해  → **B-6에 통합**
- `app/report/cost/page.jsx` ✅ 2026-06-14 완료 (869→407줄, CostReportView·CostTableView 추출)
- 잔여 항목은 위 B-6 / C-P4 항목 참조.

---

### 🟢 4순위 — CSS 세부 분리 (저위험)

#### C-P5. CSS 파일 추가 분리  ✅ 2026-06-14
- `components.css`(1715줄) → `components/home-hero.css`(365) · `home-body.css`(399) · `overlay.css`(410) · `palette.css`(239) · `chrome.css`(302)
- `features/report.css`(1696줄) → `features/report/table.css`(601) · `builder.css`(501) · `modal.css`(594)
- `features/motion.css`(906줄) → `motion.css`(320) + `motion-enhanced.css`(587) — ENHANCED 섹션 분리
- `features/motion-note.css`(964줄) → 유지 (이미 독립 파일, 단일 도메인으로 분리 불필요)
- `globals.css` import 순서·cascade 유지. ESLint 0, build 57 pages 성공.

---

### 🟢 5순위 — storage 책임 경계 문서화 (저위험)

#### C-P6. localStorage/sessionStorage 직접 접근 정리  ✅ 2026-06-14
- `lib/note/keys.js`에 sessionStorage 헬퍼 5종 추가: `setNoteFrom`·`consumeNoteFrom`·`setSampleFromNote`·`consumeSampleFromNote`·`setHomeNoteDraft`
- 직접 접근 제거: `app/page.jsx` · `note/write/page.jsx` · `note/[id]/page.jsx` · `note/sample/write/page.jsx` · `note/_NoteContent.jsx` 5개 파일
- `app/layout.jsx` 인라인 테마 스크립트는 하이드레이션 전 실행 필수 → 유지
- ESLint 0, build 성공.

---

### 검증 기준 (C-P 배치 공통)

| 변경 범위 | 검증 명령 |
|-----------|-----------|
| 소규모 정리(lint만 영향) | `npm run lint` |
| 구조 분리(hook/컴포넌트 추출) | `npm run test:ci` |
| UI 영향 있는 변경 | `npm run test:ci` + `npm run qa:smoke` + 주요 화면 수동 확인 |

---

## D. 운영·실데이터 QA 영역

> production 코드를 바꾸지 않는 QA·검증 가이드. 별도 `docs/RELEASE_CHECKLIST.md`·`docs/QA_CHECKLIST.md`는 아직 없으므로, 필요 시 이 섹션을 기준으로 생성한다.

**운영 QA로만 분류(코드 보류 아님)**: 원가/판매가/원가율 기준표 대조, 엑셀 입출력 Excel 앱 확인, 코드 매칭 원장 대조, 대용량(500MB) 복원 freeze·진행률, 공유 DB+브랜드 DB 동시 복원 복구 절차 리허설, usage-counts `menuName` dedupe 규격 누락, 다운로드 파일명/출력 컬럼 정책, 인증·설정 PIN 보안경계 문서화, 성능(1천/1만 행) 측정.

---

## E. 참고 문서 흡수 상태

> 이 섹션은 "다른 md에 있는 내용이 빠졌는지" 확인하기 위한 색인입니다.

| 문서 | 이 파일에 반영된 내용 | 남겨둔 역할 |
|------|----------------------|-------------|
| `docs/BUG_AUDIT_2026-06-14.md` _(삭제됨)_ | clean build/dev 충돌, smoke/runtime QA, format, id/key, console-only, fixture/dynamic QA 항목 → B-20·B-21·B-23·B-25·B-26 및 완료 이력으로 흡수 | 내용 전부 흡수 후 2026-06-14 삭제 |
| `docs/BUG_AUDIT_2026-06-17.md` _(삭제됨)_ | 5영역 병렬 감사 17건 수정·2건 보류(BUG-011·BUG-014) → 완료 이력·BUG-011·BUG-014 보류 항목으로 흡수 | 내용 전부 흡수 후 2026-06-17 삭제 |
| `docs/CLAUDE_CODE_SESSION_2026-06-16.md` _(삭제됨)_ | 성능·정리 배치 3건(테스트 수정·usePageStats 최적화·dynamic import) → "성능·정리 최적화 배치 ✅ 2026-06-16" 완료 이력으로 이미 반영 | 내용 전부 흡수 후 2026-06-17 삭제 |
| `docs/MENU_MASTER_RECIPE_INPUT_UX_PLAN.md` _(삭제됨)_ | 레시피 입력 UX·식자재관리 UI 정비 P0~P5+A~G 완료 → 완료 이력 흡수. 보류 항목(레시피 2차 UX·식자재 정리 도구) → 보류 섹션 등록 | 내용 전부 흡수 후 2026-06-17 삭제 |
| `docs/OPERATIONAL_STABILITY.md` _(삭제됨)_ | P6 운영 안정성 점검 결과 → "운영 안정성 보강 ✅ 2026-06-17" 완료 이력으로 흡수 | 내용 전부 흡수 후 2026-06-17 삭제 |
| `docs/SECURITY_POLICY.md` _(삭제됨)_ | 현재 인증 구조·허용된 취약점 근거 → 보류 섹션 "외부 배포 보안 강화" + [[permission-guard]]로 흡수 | 내용 전부 흡수 후 2026-06-17 삭제 |
| `docs/SITE_QUALITY_IMPROVEMENT_PLAN.md` _(삭제됨)_ | P0~P6 전 항목 완료 이력으로 흡수 (품질 개선 로드맵 완료 이력) | 내용 전부 흡수 후 2026-06-17 삭제 |
| `docs/SITE_REFACTOR_AND_HARDENING_PLAN.md` _(삭제됨)_ | 1~8단계 완료 이력 흡수, P5~P11 보류 항목 등록 | 내용 전부 흡수 후 2026-06-17 삭제 |
| `docs/UX_ISSUE_GUIDANCE.md` _(삭제됨)_ | P2 이슈 패널 4종 완료 이력 흡수, 영양 부분 누락 진단 보류 항목 등록 | 내용 전부 흡수 후 2026-06-17 삭제 |
| `docs/WORKFLOW_QA.md` _(삭제됨)_ | P1 E2E 3 시나리오 완료 이력 흡수, 확장 4 시나리오 보류 항목 등록 | 내용 전부 흡수 후 2026-06-17 삭제 |
| `docs/SITE_SCORE_IMPROVEMENT_ACTION_PLAN.md` _(삭제됨)_ | P0~P2·P4·P5 완료 이력 흡수, 잔여 P1 fixture 시나리오→E2E QA 확장 보류·P3 운영 QA→D섹션 유지 | 내용 전부 흡수 후 2026-06-17 삭제 |
| `docs/SITE_STATUS.md` | 56개 페이지·store·테스트 수치 현행 상태. `npm run audit:docs` 비교 대상 | 삭제하지 않음 — `scripts/site-status-audit.mjs` 기준 문서 |
| `docs/CONFLICT_AND_CONSOLIDATION_PLAN.md` _(삭제됨)_ | 충돌 가능성·통합 후보 23개 항목 전부 구현 완료 → 완료 이력으로 흡수 | 내용 전부 흡수 후 2026-06-16 삭제 |
| `docs/CLAUDE_CODE_REFACTOR_HANDOFF.md` _(삭제됨)_ | 분리·정리 인수인계 항목 전부 구현 완료. 주요 항목 B-6에 수록; 보완 항목 완료 이력으로 흡수 | 내용 전부 흡수 후 2026-06-16 삭제 |
| `docs/FEATURE_CONSOLIDATION_DIRECTION.md` _(삭제됨)_ | 기능 통합 방향 설계 문서. 5개 영역 통합 항목 전부 구현 완료(11.1 표 기준). 완료 이력으로 흡수 | 내용 전부 흡수 후 2026-06-16 삭제 |
| `docs/SITE_IMPROVEMENT_BACKLOG.md` _(삭제됨)_ | QA 안정화·fixture 확대·성능/운영 QA 후보를 B/D 섹션으로 정규화; 제품/UX 아이디어 후보 흡수 | 내용 전부 흡수 후 2026-06-16 삭제 |
| `docs/PROJECT_CODEBASE_AUDIT.md` _(삭제됨)_ | 코드 구조, store/route/QA 체계, 책임 큰 파일, 운영 주의점을 B/D 섹션으로 흡수 | 내용 전부 흡수 후 2026-06-16 삭제 |
| `docs/PROJECT_STRUCTURE_AUDIT_2026-06-14.md` _(삭제됨)_ | 문서 정합성, route drift, README/ARCHITECTURE 최신화, 삭제 문구 불일치 항목을 B-23/B-24/B-25로 흡수 | 내용 전부 흡수 후 2026-06-16 삭제 |
| `docs/MENU_MASTER_UNIFICATION_PLAN.md` _(삭제됨)_ | 메뉴마스터 통합 계획(Phase 1~5) 전부 구현 완료 → 완료 이력으로 흡수 | 내용 전부 흡수 후 2026-06-16 삭제 |
| `docs/DEFERRED_WORK.md` | 보류 항목, 진행 중 항목, 완료 이력, 운영 QA 구분 | 실행 우선순위와 완료 판단의 단일 기준 |

---

## 완료 이력

> 완료된 모든 작업 기록. 라운드 순 → 가장 최근 항목이 위에 있습니다.

---

### 사이트 점수 개선 실행 계획 P0~P2·P4·P5 완료 (SITE_SCORE_IMPROVEMENT_ACTION_PLAN.md 흡수) — ✅ 2026-06-17

- **P0**: DEFERRED_WORK.md trailing whitespace 제거, BUG-003 NaN guard 커밋, 문서 통합 커밋 정리.
- **P1**: viewer 차단 시나리오(`qa:workflow` 시나리오 4) 추가 — 복원 실행 시 `assertActiveAdmin` 거부 toast 검증.
- **P2**: 잘못된 백업 파일 오류 안내(시나리오 5), 메뉴 폼 유효성 + 중복 경고(시나리오 6) 추가.
- **P4**: assertActiveAdmin 전 파괴적 함수 적용 완료(이미 완료).
- **P5**: `npm run audit:docs` 유지 (이미 완료).
- 잔여: P1 fixture 시나리오(식자재 단가·판매량·공통원가·레시피 저장) → E2E QA 확장 보류 등록. P3 운영 QA → D섹션 유지.
- `qa:workflow` 6/6 통과. 2026-06-18에 브랜드 분리·캘린더 일정·식자재 등록 시나리오를 추가해 9/9 통과.

---

### 품질 개선 로드맵 P0~P6 전 항목 완료 (SITE_QUALITY_IMPROVEMENT_PLAN.md 흡수) — ✅ 2026-06-17

> 품질 로드맵 6단계 전부 완료. 개별 항목은 이 파일의 다른 완료 이력(BUG_AUDIT 배치, B-5 useDBLoad, B-6 대형 컴포넌트 분해, 운영 안정성 보강 등)에 수록됨.

- **P0 데이터 안전성**: 파괴적 실행함수 viewer 차단 가드(`assertActiveAdmin`), 백업 전 공통 store 검증, 복원 미리보기 mismatch 경고. → [[permission-guard]] / 충돌·통합 종합 정리 완료 이력
- **P1 E2E QA**: `npm run qa:workflow` — 3 시나리오(백업 미리보기·노트 작성·메뉴 등록). → WORKFLOW_QA 흡수 완료 이력
- **P2 UX 이슈 안내**: `MissingValueNotice` 영양 미입력 메뉴 진단 패널 (lib/nutrition/missing-values.js). → UX_ISSUE_GUIDANCE 흡수 완료 이력
- **P3 실행함수 권한 가드**: 7개 파괴적 함수 + 시스템 설정 핸들러 `assertActiveAdmin` 적용. 구조·동작 테스트 3종. → [[permission-guard]]
- **P4 도메인 분리**: 대형 로직 파일에서 응집 순수 클러스터를 re-export 허브로 분리(ingredient store→composite-refs+product-code, build-cost-report→recipe-print-rows, nutrition values store→dedup 등). → B-6/C-P4 완료 이력
- **P5 문서 자동 검증**: `npm run audit:docs` (`scripts/site-status-audit.mjs`) — `docs/SITE_STATUS.md` 수치 vs 코드 drift 탐지.
- **P6 운영 안정성**: 원가마진표 60/page 페이징, 시스템 설정 현재 권한 표시, 인쇄 팝업 차단 회귀 테스트. → 운영 안정성 보강 완료 이력

---

### 전체 보완·분리 계획 1~8단계 완료 (SITE_REFACTOR_AND_HARDENING_PLAN.md 흡수) — ✅ 2026-06-17

> 코드 분리·보완 8단계 전부 완료. 세부 커밋·파일 목록은 관련 완료 이력(B-21, B-5, B-6 등)에 수록됨.

- **1단계 식자재 cascade 노출**: `bulkDeleteIngredients` `{ removed, failures }` 반환. cascade 실패 toast. 알레르기 링크 store v20 제거.
- **2단계 백업/복원 훅 분리**: `useBackupActions.js` / `settings/restore` `useDBLoad` 전환.
- **3단계 영양 라벨 빌더 분리**: `lib/nutrition/label/build.js` + `lib/nutrition/label/` 서브모듈. re-export 유지.
- **4단계 원가/마진 보고서 분리**: `build-cost-report.js` → recipe-print-rows 분리. `useMarginData.js`.
- **5단계 TopBar 분리**: `useAppBrands.js`, `useKeyboardShortcuts.js`, `ShortcutsHelp.jsx` 분리. `AppShell.jsx` 411→140줄.
- **6단계 useDBLoad 마이그레이션**: 전체 14개 페이지/훅에 useDBLoad 확산 (B-5). 마지막 `initDB+useEffect` 제거.
- **7단계 보안 문서**: `docs/SECURITY_POLICY.md` 작성 → 이 파일로 흡수. 외부 배포 보안 보류 항목 등록.
- **8단계 검색 debounce**: 식자재·영양 검색 입력에 `useDebounce` 적용. 타이핑 중 쿼리 과다 방지.
- **2차 후보 P5~P11**: 보류 섹션 등록(CSS 정리·인쇄 파이프라인·localStorage 정합성·라우트 QA·에러 상태 통일·업로드 중복·모바일 레이아웃).

---

### UX 이슈 안내 현황 P2 완료 (UX_ISSUE_GUIDANCE.md 흡수) — ✅ 2026-06-17

> `docs/UX_ISSUE_GUIDANCE.md` P2 전 항목 완료. 이슈 패널 4종 + 진단 helper 구현.

- **메뉴마스터 이슈 패널**: 레시피 미등록·원가 0·판매가 불일치 진단 배너 + `바로 수정` 액션.
- **식자재 이슈 패널**: 단가 미입력·분류 미지정·제때 연동 후보 진단. `IngredientSettingsPanel.jsx`.
- **미매칭 이슈 패널**: 업로드 후 미매칭 메뉴 배너. 분류 유도 액션.
- **영양성분 이슈 패널**: `MissingValueNotice` — 미입력 메뉴 수·리스트 표시. `lib/nutrition/missing-values.js`.
- **보류**: 영양성분 부분 누락/출력 제외 진단 — 크러스트 완전성 기준(전 크러스트 입력 필수인지·일부만으로 출력 허용하는지) 선행 정의 필요.

---

### 핵심 업무 E2E QA P1 완료 (WORKFLOW_QA.md 흡수) — ✅ 2026-06-17

> `docs/WORKFLOW_QA.md` P1 3 시나리오 구현 완료. `npm run qa:workflow`.

- **구현 시나리오 3종** (`scripts/workflow-qa.mjs`):
  1. 백업 → 복원 미리보기 — 브랜드 전환 후 복원 미리보기 모달 열림 확인.
  2. 노트 작성 → 목록 확인 — 노트 저장 후 목록에 반영 여부.
  3. 메뉴 등록 → 목록 확인 — 메뉴 추가 후 메뉴마스터 목록에 반영 여부.
- **E2E 설계 주의**: `goto()` 후 React 하이드레이션 완료까지 대기(`networkidle` + "DB 초기화 중" 해제). run-unique 마커 + IndexedDB 정리로 결정성 확보.
- **보류**: E2E 확장 4 시나리오 → 보류 섹션 "E2E QA 확장 시나리오" 등록.

---

### 운영 안정성 보강 (P6) — ✅ 2026-06-17

> `SITE_QUALITY_IMPROVEMENT_PLAN.md` P6 점검·보강.

- **원가마진표 pagination**: 60/page (`usePagination` + `Pagination` 컴포넌트, `totalPages≤1`이면 미렌더).
- **시스템 설정 현재 권한 표시**: `현재 권한` InfoCell (admin/viewer) 추가.
- **출력·인쇄 실패 처리 완비**: 팝업 차단(false 반환+toast), 이미지 로드 실패(onerror→진행), XSS(`esc()` escape), xlsx 실패(try/catch+toast). 회귀 테스트: `window-print-guards.test.mjs`.
- **오류 로그 정책 테스트 3종**: `silent-catch-policy.test.mjs`(빈 catch 금지), `console-context-policy.test.mjs`(라벨 필수), `toast-type-policy.test.mjs`(부정 문구 타입 필수).
- **보류 유지**: 식자재관리 pagination — 일괄선택 state 결합 회귀 위험 > 효과 ([[deferred-refactors]]).

---

### 메뉴마스터 레시피 입력 UX · 식자재관리 UI 정비 — ✅ 2026-06-17

> `MENU_MASTER_RECIPE_INPUT_UX_PLAN.md` P0~P5 + 추가 A~G 전 항목 완료.
> 검증: lint 0 / 1343 tests / 22/22 smoke QA 통과.

**P0 버그 수정**
- 소스·피자·1인피자·사이드·음료·세트박스 카테고리 레시피 저장 후 원가/요약 미반영 버그 수정. (`menu-master-p0-audit.test.mjs` 26건)
- 공통원가 체크 후 원가율·원산지·알레르기 합산 반영 확인. (`common-cost-selection-results.test.mjs`, `nutrition-allergen-aggregate.test.mjs`)
- viewer/admin 권한별 편집·삭제·저장·초기화·시드 버튼 상태 확인.

**P1 입력 편의성**
- 레시피 구성품 드롭다운 키보드 조작(ArrowUp/Down/Enter/Escape) + 수량 자동 focus + 다음 행 이동. (`menu-recipe-components-keyboard.test.mjs`)
- 규격 `ComboBox` 드롭다운 적용(`MenuMasterIdentityFields.jsx`). (`menu-master-size-combobox.test.mjs` 14건)
- 메뉴명 셀 클릭/Enter/Space로 수정창 열기(`MenuMasterTableRow.jsx` `button type="button"`).
- 수정창 넓은 편집 패널(960px), sticky header/footer, createPortal로 TopBar z-index 해결.

**P2 식자재관리 UI**
- `분류·태그` 설정 탭 summary·검색·정리 후보 표시. (`IngredientSettingsPanel.jsx`, `ingredient-settings-panel.test.mjs` 14건)
- 식자재 추가/수정 모달 입력 순서 재배치·sticky header/footer. (`ingredient-form-layout.test.mjs` 11건)
- 제때 연동 품목·수동 품목 단가/수정 영역 분리(`JetteLinkedSourcePanel`).

**P4/P5 신뢰도·유지보수성**
- `useIngredientFormController.js` 신규 생성 — `IngredientForm.jsx` 486→215줄.
- `p4-accessibility-guards.test.mjs` 13건, `p5-dropdown-perf-guards.test.mjs` 1000행 성능 방어.
- IngredientForm Esc 닫기 추가, `aria-busy` + `role="alert"` 접근성 보강.

**보류 항목** → 메뉴마스터 레시피 2차 UX 후보 · 식자재 데이터 정리 도구 보류 섹션에 등록.

---

### BUG_AUDIT_2026-06-17 코드버그 수정 배치 — ✅ 2026-06-17

> 5개 영역(훅·상태관리 / 데이터·계산 / UI·폼 / IndexedDB / 라우팅·렌더링) 병렬 에이전트 감사. 발견 19건 중 17건 수정, 2건 의도적 보류(BUG-011·BUG-014 → 보류 섹션).
> 검증: `npm run lint` 0건 · `npm test` 268 suites / 1411 tests 통과 · `npm run qa:smoke` 22/22 통과.

**High (3건)**
- **BUG-001** `MenuMasterEditModal` 저장 중복 — `saving` state + `savingRef` 재진입 가드 추가. 저장 버튼 `disabled={!canSave || saving}`.
- **BUG-002** `commitBulkPrice` 반환 타입 불일치 — 빈 배열 경로도 `{ applied: 0, skipped: 0 }` 객체로 통일.
- **BUG-003** 식자재 `baseQuantity`/`priceOverride` NaN 저장 — `Number.isFinite` 가드 추가(`upsertIngredientMeta` + `buildRecord` 경로 양쪽).

**Medium (7건)**
- **BUG-004** `applyDiscount` NaN 전파 — `Number.isFinite` 체크로 교체. 회귀 테스트 추가.
- **BUG-005** `bulkPut` 청크 분할 원자성 손실 — 500건 청크 제거, 단일 트랜잭션 + `onabort` 핸들러.
- **BUG-006** `runTransaction` 예외 무시 — `settled` 플래그 + `doResolve`/`doReject` 패턴으로 exception 묻힘 방지.
- **BUG-007** middleware `/manifest.json` 미공개 — `PUBLIC_PATHS`에 추가.
- **BUG-008** 전역 단축키 모달 내부 발동 — `active.closest('[role="dialog"]')` 체크 추가.
- **BUG-009** 중첩 모달 Escape 오동작 — `role="dialog"` + `containerRef`, Escape 시 최상위 dialog 확인.
- **BUG-010** 노트 편집 이탈 무경고 — `isDirty` state + `useBeforeUnload` 적용.

**Low (7건)**
- **BUG-012** price-history 정렬 비교자 계약 위반 — 3-way 비교자 (`=== 0` 케이스 처리) 적용.
- **BUG-013** `toggleDark` stale closure — `setDark(prev => ...)` 함수형 업데이트.
- **BUG-015** `confirmDelete` 언마운트 가드 없음 — `mountedRef` 추가.
- **BUG-016** `editFocusTimerRef` 타이머 미정리 — cleanup `useEffect`에서 `clearTimeout` 추가.
- **BUG-017** `useNutritionBaseEditor` 언마운트 가드 없음 — `mountedRef` 추가.
- **BUG-018** `useShipmentReportData` deps 누락 — `setShipYear`, `setShipMonth` deps 추가.
- **BUG-019** jette 출고 연도 입력·적용값 불일치 — `Math.max/min` 클램프 추가.

---

### 성능·정리 최적화 배치 — ✅ 2026-06-16

> Dead code 제거 2개, 배지 조회 최적화, AppShell 번들 축소.  
> 작업자: Claude Code (claude-sonnet-4-6). 커밋: `1eb88849`(최적화), `deeda440`(dynamic import).

- **Dead code 삭제**: `BulkPriceModal.jsx`(135줄) · `UsageView.jsx`(56줄) — B-6 리팩토링 후 외부 import가 없어진 파일. 관련 구조 테스트(`bulk-price-modal-structure.test.mjs`, `usage-view-structure.test.mjs`)에서 삭제된 파일 참조 및 구조 검사 블록 제거, 유틸 helper 테스트만 유지.
- **배지 조회 최적화**: `usePageStats`가 `getAllNotes()`(전체 로드) 대신 `getReportingNoteCount()`(status 인덱스만 조회)를 사용하도록 교체. `lib/note/store.js`에 `sharedGetByIndex` 기반 함수 추가, `lib/note/index.js` export 추가.
- **AppShell 번들 축소**: `CommandPalette`·`ShortcutsHelp`를 정적 import → `next/dynamic` lazy import(ssr:false)로 전환. 초기 번들에서 두 컴포넌트 분리.
- **검증**: `test:ci` 247 suites / 1170 tests 통과.

---

### SITE_IMPROVEMENT_BACKLOG.md 흡수 — ✅ 2026-06-16

> 제품·UX·성능·안정성 개선 백로그(기준일 2026-06-14, 659줄). P0~P3 우선순위 후보 항목 목록.  
> 작업자: Claude Code (claude-sonnet-4-6). 2026-06-16 DEFERRED_WORK.md 흡수 후 원본 삭제.

**이미 완료된 항목**
- P0 1인피자 알레르기 기준: 씬바사삭 1종 확정 → B-9 / N-42 (2026-06-15) ✅
- P0 legacy 알레르기 링크 store 제거: B-3 Phase 2 (2026-06-15) ✅
- format 기준선 복구, data id/key fallback, 식자재 productCode 중복 차단, 합산 단가 정책, 원가 detail 인덱스, 피자 카테고리 판정 공통화 ✅

**B/D 섹션 등록 항목**
- 백업/복원 안전성(export 실패 처리, 대용량 복원, 공통 store 범위): D섹션 운영 QA에 이미 포함
- B-20 실업무 fixture, B-23 dynamic route QA: 이미 추적 중
- N-43 과거 단가 가져오기: 보류 게이트 대기 중

**미착수 UX/성능 후보 (product backlog 수준, 사용자 승인 후 B섹션 이동 예정)**
- 홈 판매 통계 단일 집계(`sales_rows` 1회 조회) — 미착수
- sidebar 배지 count 전용 조회 ✅ 2026-06-16 — `getReportingNoteCount()` status 인덱스 쿼리로 교체, `usePageStats` 최적화
- CommandPalette + ShortcutsHelp dynamic import ✅ 2026-06-16 — `AppShell.jsx` `next/dynamic` lazy import 전환
- 대형 표 페이지네이션/windowing (사용현황·알레르기·원산지·판매보고서)
- 검색/필터 프리셋 확산 (식자재·원가·영양성분·보고서)
- 삭제·수정 UX 통일: 영양성분 삭제 ConfirmDialog, 샘플 단건 삭제 확인, 노트 일괄 삭제 문구, 로드 실패 vs 빈 상태 구분
- 화면 신뢰도: 식자재 CSV 필터 기준 통일, 단가 정렬 라벨, 페이지네이션 검색 초기화, 모달 ARIA
- 모듈별 P2/P3: 메뉴마스터 연결 상태 dashboard, 식자재 병합 wizard, 영양 변경 영향 미리보기, 보고서 섹션 토글 등

---

### PROJECT_STRUCTURE_AUDIT_2026-06-14.md 흡수 — ✅ 2026-06-16

> 2026-06-14 프로젝트 구조·문서 감사 리포트(260줄). 문서 정합성, 라우트 현황, MD 파일 역할 분석.  
> 작업자: Claude Code (claude-sonnet-4-6). 2026-06-16 DEFERRED_WORK.md 흡수 후 원본 삭제.  
> 주요 발견 항목(route drift, README/ARCHITECTURE 최신화, SITE_IMPROVEMENT_BACKLOG 정리)은 B-23/B-24/B-25로 흡수 완료.

- 54 정적 route / 2 동적 route 현황 확인. `qa:runtime` 정적 route 누락 0개 확인.
- MD 파일 역할 불일치(README 폰트/CSS 구조, ARCHITECTURE 상세 미흡, DEFERRED_WORK 경로 오류) → B-24로 흡수 후 완료

---

### PROJECT_CODEBASE_AUDIT.md 흡수 — ✅ 2026-06-16

> 2026-06-14 전체 코드베이스 구조 해설 문서(302줄). 도메인별 파일 구조, store 그룹, QA 체계, 큰 파일 목록, 운영 주의점.  
> 작업자: Claude Code (claude-sonnet-4-6). 2026-06-16 DEFERRED_WORK.md 흡수 후 원본 삭제.

- 큰 파일 목록 상위 11개(1002~558줄): B-6/B-1에서 전부 분리 완료
- store 그룹 기준(43개 store, v19→v20 마이그레이션) 및 도메인별 코드 구조: README/ARCHITECTURE로 반영(B-24)
- 운영 주의점(백업 실패 store, localStorage 복원 실패, productCode/menuCode 기준, 출력물 QA): D섹션 유지

---

### MENU_MASTER_UNIFICATION_PLAN.md 흡수 — ✅ 2026-06-16

> 메뉴마스터 통합 계획(Phase 1~5 전부 구현 완료). 기준일 2026-06-15, 558줄.  
> 작업자: Claude Code (claude-sonnet-4-6). 2026-06-16 DEFERRED_WORK.md 흡수 후 원본 삭제.

- **Phase 1** 메뉴마스터 상세 구조: `5781532`, `22ef420`
- **Phase 2** `menu_recipes` 단일 저장소 확정: `0c72c95`
- **Phase 3** 계산/출력 화면 연결: `4767b9e`
- **Phase 4** 기존 화면 정리: `5591241`, `3c074f3`, `ec417cc`
- **Phase 5** 구형 코드 정리: `9d68970`, `08f7f91`, `ad04fd7`
- 주요 아키텍처 정책(단일 저장소, `displayGroupKey` 규칙, `g`/`개` 단위, 판매가 fallback)은 FEATURE_CONSOLIDATION_DIRECTION 완료 이력과 통합됨

---

### FEATURE_CONSOLIDATION_DIRECTION.md 흡수 — ✅ 2026-06-15~16

> 기능 통합 방향 설계 문서(작성 2026-06-15). 5개 영역 통합·정책 결정 항목 전부 구현 완료.  
> 작업자: Claude Code (claude-sonnet-4-6). 2026-06-16 DEFERRED_WORK.md 흡수 후 원본 삭제.  
> 세부 구현 기록은 이 파일의 다른 완료 이력(B-6, 충돌·통합 종합 정리 배치 등)에 수록됨.

**확정된 주요 아키텍처 정책 (코드에 고정됨)**
- 메뉴관리: `menu_recipes` 단일 저장소. 레시피마스터·구형 detail store·bridge API 제거.
- 식자재관리: `/ingredient/manage` 단일 진입점. `/cost/ingredient-price`·`/ingredient/list` redirect 흡수.
- 표기정보/영양: 메뉴 직접 입력 영양성분 우선. `nutrition_ingredient_values` store v23 제거. 엣지 파생은 베이스+조정값만 사용.
- 제때데이터: 식자재와 합치지 않고 단가 원천으로 유지. 제때 허브는 `단가 → 출고량 → 관리품목` 흐름.
- 판매량관리: `/menu-sales/rank-compare` 단일 분석 진입점. rank/compare는 호환 redirect.
- 레시피 입력 단위: `g`·`개` 2종 고정. `g` 단가는 소수점 1자리 반올림 고정.
- 브랜드 분리: 모든 실사용 데이터는 `brandId` 범위 안에서만 연결. 브랜드 간 공유 없음.

---

### CLAUDE_CODE_REFACTOR_HANDOFF.md 흡수 — ✅ 2026-06-16

> 작업자: Claude Code (claude-sonnet-4-6). 2026-06-16 DEFERRED_WORK.md 흡수 후 원본 삭제.  
> 주요 분리 항목(report/sales, menu-master, ingredient/manage, cost/margin, settings/brands·backup, AppShell)은 B-6에 이미 수록. 아래는 보완 항목.

- **식자재관리 보고서 탭**: 헤더 PDF 버튼 제거 → 보고서 탭으로 통합. `IngredientReportPanel.jsx` 신설 (표 형식/사진 카드 2모드, 필터 기준 개수 표시). (`4ced2dbe`)
- **IngredientSearch 수동입력 노출**: `productCode &&` 필터 제거 → `productCode: null` 수동 식자재도 공통원가 묶음 검색에 노출.
- **buildUnitPriceMap 키 정책**: `productCode` 없으면 `String(m.id)` 키·`priceOverride` 단가로 처리.
- **최종 검증 기준**: lint 0 / 247 suites / 1172 tests / qa:smoke 22/22 (2026-06-16).

---

### 충돌·통합 종합 정리 (CONFLICT_AND_CONSOLIDATION_PLAN.md 흡수) — ✅ 2026-06-15~16

> `docs/CONFLICT_AND_CONSOLIDATION_PLAN.md` 전체 항목(기준일 2026-06-15, 재스캔 포함 23개) 구현 완료.  
> 작업자: Claude Code (claude-sonnet-4-6). 2026-06-16 DEFERRED_WORK.md 흡수 후 원본 삭제.

- **식자재 사용현황·영양 매핑 통합**: `buildIngredientUsageMap` → `buildIngredientMenuMap` 어댑터 교체. 세트·공통묶음·엣지·파생메뉴 포함. (`81d6fa3`)
- **레시피 소스 단일화**: `menu_recipes` 단일 저장소 확정. 구형 `cost_recipes`/detail store schema 제거. detail 우선·legacy fallback 정책. (`0c72c95 4767b9e 9d68970 ad04fd7`)
- **메뉴마스터-판매가 sync 정책**: 판매가 업로드가 기존 메뉴 운영 필드(status·note·hidden·displayOrder)를 덮지 않도록 제한. (`7742193`)
- **엣지 관리 화면 중복**: `/cost/recipe?tab=edges` primary, `/cost/edge-dough` redirect. (`4a7152f`)
- **판매량 redirect 카드 통합**: `/menu-sales` 허브를 `rank-compare` 단일 카드로 정리. rank/compare는 호환 redirect. (`6c87b23 7fda5b8`)
- **카테고리 판정 함수 명확화**: `category-policy.js` 중심 통합. deprecated alias 유지. (`3381fef`)
- **localStorage 백업 키 이동**: `lib/backup/local-storage-keys.js`로 이동. nutrition re-export 호환. (`f284f1b`)
- **cascade 원자성 강화**: 노트 descendant 체인 삭제·UI state 동기, 백업 전체 사전 검증 후 실행, 메뉴 삭제 transaction 묶기, 복원 실패 강조 표시. (`3bcd997 9a565dd cb9ddcb f5bd8d9 3518a8b 752c2aa 4fa91db`)
- **route 분류 중앙화**: `route-classification.js` sidebar/hub/redirect/internal-flow/dynamic-detail 분류. QA 스크립트 파생. (`823f539`)
- **localStorage 복원 scope 분리**: 선택 모듈별 key subset만 복원. nutrition 선택 의존성 제거. (`a9e1112`)
- **시스템 설정 저장소 정리**: `SETTING_LS_KEYS` 기준 백업 포함. `settings` IndexedDB legacy 예약. `strictPosting` 원가 보고서 가드 연결. (`315fc65 179c2cd 384f152 996c221`)
- **멀티브랜드 백업 source metadata**: `sourceBrandId/Name/sourceDbName/sharedDbName` 백업 JSON 포함. 복원 미리보기 mismatch 경고. (`44ce445`)
- **계정 store 브랜드별 분리**: `rnd_active_account_id:<brandId>` key 분리. main은 legacy key mirror. (`211c7b7 2845f5f`)
- **영양 메뉴 메뉴마스터 강제**: 신규 영양 메뉴 menuCode 필수. orphan 진단 배너·정리 액션. (`68aa43e 5a8bbcd 54834de`)
- **모바일 원가 탭 route**: `COST_MARGIN_ROUTE` 고정. `mobile-primary` marker 추적. (`5591241 27c46fb`)
- **보고서 비교 route 사이드바 노출**: `REPORT_NAV_ITEMS`를 `KIND_META`에서 파생. 사이드바에 비교 보고서 포함. (`a43b683`)
- **식자재 삭제 진입점 통합**: `/cost/ingredient-price` → `/ingredient/manage?view=price` redirect. 삭제 흐름 단일화. (`8c39bed`)
- **제때·시스템 설정 토글 연결**: `unmatchedAlert`/`costRateAlert` 알림 로직 연결. `autoRecalc`/`roundMode` 고정 상태 표시. (`045ce2d 179c2cd 384f152`)
- **CSS primitive 중앙화**: `.btn/.card/.input/.chip/.filter-chip` 본체를 `base.css`로 이동. motion 파일 additive-only. (`4d378dd`)
- **무음 실패 처리 정책**: `silent-catch-policy.test.mjs` allowlist 고정. 사용자 액션 실패 toast/결과 노출 가드. (`9a565dd 866c6fd 44b2e55`)

---

### QA 기준선 보강 — ✅ 2026-06-14

- **dev 산출물 충돌 완화**: `scripts/prepare-dev.mjs` 추가. `predev`/`predev:lan`에서 dev 시작 전 `.next`를 정리하고, 실행 중인 dev 서버가 있으면 `.next`를 건드리지 않는다.
- **표준 dev 재시작**: `npm run dev:clean`을 `scripts/prepare-dev.mjs --kill && next dev -H 127.0.0.1 -p 3000`로 교체해 꼬인 dev 서버와 `.next`를 같이 정리한다. LAN 접속은 `npm run dev:lan`으로 분리한다.
- **smoke QA 안정화**: `scripts/smoke-qa.mjs` navigation timeout을 90초로 늘리고, 라우트별 console/pageerror/response listener를 격리하며, 대표 판매량 라우트를 redirect 전 `/menu-sales/rank`에서 최종 목적지 `/menu-sales/rank-compare`로 변경했다.
- **runtime QA 안정화**: `scripts/full-rt.mjs` 시작 시 Playwright browser health check를 추가하고, `localhost` 실패 시 `127.0.0.1` fallback을 시도한다. 라우트 navigation 실패는 전체 스크립트 중단 대신 route별 `fatal` 결과로 기록한다.
- **clean build 안정화**: `scripts/clean-build.mjs`가 build 성공/실패와 무관하게 `.next.stale-*`를 `finally`에서 정리한다. 실행 중 dev 서버가 있으면 build 전에 중단한다.
- **format 기준선 복구**: 68개 Prettier 불일치 파일을 format-only로 정리해 `npm run format:check`가 통과한다.
- **데이터 id/key fallback 안정화**: `PlatformSettingsModal` fallback id에서 `Math.random()`을 제거하고, `normalizeChecklistMap`의 체크리스트 fallback id를 날짜+텍스트+순번 기반으로 안정화했다. `ProgressBar`와 `not-found`의 랜덤은 저장 id/key가 아닌 시각 효과로 주석·테스트에서 분리했다.
- **침묵 실패 일부 제거(B-21 진행분)**: 칸반 로드/드롭 실패 UI 노출, 식자재 삭제 undo 실패 노출, 식자재 cascade 실패 경고, 식자재 일괄 삭제 부분 실패 표시, 메뉴마스터 cascade 실패 경고를 추가했다.
- **삭제 안내 문구 정합성**: 메뉴마스터 삭제 ConfirmDialog를 실제 cascade 범위(판매가, 원가 레시피, 영양 참조 데이터 정리)에 맞게 수정했다.
- **문서화**: `README.md`에 dev 서버 실행 중 build 금지, `npm run dev`/`npm run dev:clean` 사용 기준을 추가했다.
- **검증**: `npm run format:check` 통과, `npm run lint` 통과, `npm run test:ci` 145 suites / 816 tests 통과, `npm run build:clean` 통과(57 pages, stale 1개 정리), `npm run qa:smoke` 22/22 통과, `npm run qa:runtime` 63/63 통과, script targeted tests 3 suites / 13 tests 통과, B-21 targeted tests 3 suites / 19 tests 통과(2026-06-14).

---

### N-20~38 중위험 배치 QA — ✅ 2026-06-14

ESLint 0 warnings, 테스트 140 suites / 794 passed, build 57 pages prerender 성공.

**버그 수정 1건**: `_ReportPreviewModal.jsx:120` 판매보고서 미리보기 scope 비교를 구 영문(`'pizza'`) → 한글 직접 표시로 수정.

**ESLint 수정**: `.eslintrc.json`에 `@next/next/no-img-element: "off"` — IndexedDB base64 이미지는 Next.js `<Image />` 사용 불가.

**확인 완료 항목 (코드 기구현)**:
N-20(STATUSES 9개 확장 + NOTE_STATUS·STATUS_COLORS·STATUS_BORDER 전파) · N-21(journal-print.js break-inside) · N-22(SAMPLE_CATEGORIES 독립 enum) · N-23(_DayPanel 자동일지 맨밑 기본 접힘) · N-24(exportMonthPdf) · N-25(CalendarGrid 셀 여백·오늘 강조) · N-26(includeEdge + build-cost-report) · N-27(RecipeEditor sticky 헤더) · N-28(묶음관리 accent 토큰 교정) · N-29(SortableIngredientRow input 70→80px) · N-30(printIngredientPdf 2단 그리드) · N-31(재료단가표 탭 정리) · N-32(scope 한글 카테고리 + 필터 연결) · N-33(임계값 슬라이더 제거) · N-34(costImpact UI + 변동 집계) · N-35(집계기준 삭제) · N-36(PriceSummaryCards 신규/삭제 카드 + onFilter) · N-37(CategoryTags 중복 제거) · N-38(allergen 빈도 내림차순 기본 정렬)

---

### N-07·N-18 잔여 수정 — ✅ 2026-06-14

- N-07: `app/report/page.jsx`·`app/cost/margin/page.jsx` "Excel 내보내기" → "엑셀로 내보내기"
- N-18: `app/styles/features.css` dropzone 패딩 `16px 24px` → `10px 20px`, 아이콘 44→36px

---

### 중위험 리팩토링 잔여 4건 (R-5·R-7·R-13·R-33) — ✅ 2026-06-14

- **R-5 잔여**: `hooks/useIngredientCatalogData.js`(로드+stats 6종 useMemo) · `hooks/useIngredientCatalogView.js`(search·scopeFilter·catFilter·sort+filtered+pagination) 신설. page.jsx 불필요 import 15개 제거.
- **R-7 잔여**: `hooks/useIngredientPriceData.js`(rows·fileInfo·loading·dbError + load + useVisibilityRefresh) 신설. `showToast 'err'→'error'` 수정.
- **R-13 잔여**: `PlatformRow`·`PlatformSelector` 서브컴포넌트 추출 + `useState(plats)` → `useReducer` 전환(8액션). 375→280줄.
- **R-33 잔여**: `hooks/useKanbanBoard.js` 신설(handleDrop/groupedNotes 순환 의존 클로저로 해소). board/page.jsx 401→212줄.

---

### QA 리포트 통합(N-39~44 D배치) — ✅ 2026-06-13

- **N-39**: 원가보고서 미연결 메뉴 진단 + `detailStoreFor` 정책함수 교체. `분류 미매핑`·`메뉴코드 없음`·`레시피 미등록`·`레시피 원가 0` 진단 UI 추가.
- **N-40**: 제때↔식자재 자동연동 — 신규 제때 항목 자동등록, 최신 파일에서 사라진 항목 단종 처리, 뷰어 권한 버튼 비활성화.
- **N-41**: `MenuRecipeSection` 신설, `MenuMasterEditModal` 레시피 입력 통합. 카테고리별 detail store 라우팅, 비동기 race 방지.
- **N-44①**: DB v19 + `ref_accounts` store 추가, 계정 CRUD + 기본 admin seed, 백업 공통 store 포함.
- **N-44②**: 계정 관리 UI — 목록·추가·전환·삭제 ConfirmDialog, 마지막 계정 삭제 방지.
- **N-44③**: 조회자 UI 게이팅 — `menu-master`·`ingredient-price`·`ingredient/manage`·`MasterRow`·`InlineEditCell` readOnly 차단.
- **버그 수정**: `settings/account` 계정 삭제 raw `confirm()` → `ConfirmDialog` 교체. `useCurrentRole` 계정 전환 즉시 반영 — `rnd:account-changed` CustomEvent + storage listener.

---

### QA 리포트 통합(N-45·N-46·B·C배치 기구현 확인) — ✅ 2026-06-13

- **N-45**: 영양성분 시험성적서 기반 입력 — 크러스트 탭 "성적서" 뱃지, `certLinked` 체크박스 추가.
- **N-46**: 원가보고서 제품원가표 탭 — `viewTab`·`groupPizzaLR`, 피자/1인피자 L/R 7컬럼, 사이드/세트/엣지 4컬럼.
- **N-01~19 B배치** · **N-20~38 C배치** 기구현 확인. N-07 누락 2건(settings/backup·note/sample/[id]) 수정.
- ESLint 0, 테스트 140 suites / 794 passed, build 57 pages.

---

### QA 리포트 통합(N-01~19 저위험 배치) — ✅ 2026-06-13

완료 항목: 노트 탭 순서 변경, 노트목록/칸반/달력 불필요 버튼 제거, 메뉴명 필수 해제 + 토핑 카테고리 제거, 원가보고서 제목·집계기간 UI 정리, "CSV 내보내기" → "엑셀로 내보내기", TopBar 정렬, 메뉴마스터 규격 컬럼·피자 기본가 버튼·양식업로드 하단 이동, 재료단가표 초기화·일괄 업로드·사용현황 탭·SortButton 제거, 식자재 사용현황 액션 버튼 상단, 제때 업로드 박스 축소, 샘플기록 placeholder.

버그 수정: N-05 menuName 필수 검증 제거, N-06 Seg 미사용 import 정리.

---

### 리팩토링 배치 완료 — ✅ 2026-06-12~14

**고위험 (R)**:
- R-1: `lib/sales/ms9-rules.js` → rules-pizza·rules-side·rules-edge·rules-set 4파일 분리
- R-2: `app/cost/margin/page.jsx` load() → `lib/cost/margin/build-rows.js` 5 순수함수
- R-3: `app/settings/restore/page.jsx` 1124→366줄 (RestorePreview·RestoreDoneCard·RestoreExecutePanel + useRestoreImpact)
- R-29: `app/page.jsx` 817줄 → `useHomeDashboardData` 훅 추출
- R-30: RecipeEditor `SortableIngredientRow` 파일 분리 + `lib/recipe/calc-costs.js` 순수함수
- R-31: 보고서 4종 데이터 빌더 → `lib/report/build-*.js` 신설
- R-33: `note/board` 597→212줄 (`KanbanCard` 분리 + `useKanbanBoard` 훅)
- R-39: `lib/db/operations.js` → crud.js·upload-log.js·backup.js 책임 분리
- R-40: `lib/nutrition/values/store.js` → calc.js 계산 분리

**중위험 (B·R)**:
- B-3 Phase 1: `allergen/store.js` dead code 6종 제거. `allergenRate` legacy store → cost_ingredients.allergens 교체.
- B-4: `reclassifyAllFiles` 신규 미분류 처리 구현됨 확인 (status 필터 없이 원본 행 포함)
- B-7: localStorage 백업 범위 확대 (`PERSISTENT_LS_KEYS` 29종)
- B-8: 칸반 드래그 순서 원자성 (`bulkUpdateBoardOrder` 단일 트랜잭션)
- B-10: menuCode 중복 사전 검증/안내 (update mode toast)
- B-11: 인쇄 CSS `.chip` 숨김 범위 축소 (전역 → 필터 chip 한정)
- B-12: 연구일지 PDF 페이지 분할 (`break-inside:avoid`, `break-after:avoid`)
- B-13: `build:clean` 프로세스 감지 가드 추가
- B-14: localStorage 키 정책 확정 (영속 설정만, 임시 상태 제외)
- B-16: 메뉴 판매가 업로드 파일 가드 (빈 파일·20MB 초과)
- R-4: `TabBase.jsx` 1153→218줄 (훅3 + 컴포넌트5 + `base-helpers.js`)
- R-5: `ingredient/list` PDF 함수 → `lib/ingredient/print.js` + `useIngredientCatalogData·View` 훅
- R-6: `ingredient/usage` → `hooks/useIngredientUsageRows.js` 7개 memoized 값 통합
- R-7: `ingredient-price` → `lib/cost/ingredient-price/buildRows.js` + `useIngredientPriceFilters` + `useIngredientPriceData`
- R-8: `cost/recipe` → `useRecipeWorkbenchData` + `useRecipeListState` + `RecipeSidebar` (789→344줄)
- R-9: 보고서 4종 `useReportPageState` 공통 state hook
- R-10: `cost/all-summary` buildRows → `lib/cost/shared/buildSummaryRows.js`
- R-11: `TabSetCalc·TabDerived` → `useSetCompositionForm·useDerivedCompositionForm`, `TabDerived` derived UI/helper 분리(437→107줄)
- R-12: BulkPriceModal 통합 미구현 확정 (두 모달 구조 완전히 상이)
- R-13: `PlatformSettingsModal` `FeeRow·PlatformRow·PlatformSelector` 분리 + `useReducer` 전환, 이후 shell/editor/reducer helper까지 추가 분리(433→46줄)
- R-14: `settings/account` → `PinSection·PasswordChangeCard` + `hooks/useDiagnostics`
- R-15: `note/sample/page.jsx` 달력 → `lib/note/calendar-utils.js`(`buildCalendarDays`)
- R-32: `nutrition/origin` 집계 → `lib/nutrition/origin/build.js`(`buildOriginIngredientRows·MenuRows`)
- R-37: `app/styles/features.css` → `features/motion.css`(2462줄) + `features/home.css`(768줄) 분리
- R-41: `report/sales` `buildSalesStats` → `lib/report/build-sales-report.js` + `SalesChartRows.jsx`

**저위험 (B·C·R)**:
- B-1: 메뉴마스터 삭제 cascade (cost_selling_prices·cost_recipes·nutrition_menu_ref)
- B-2: `_isPizzaMenu` → category-policy 헬퍼 위임
- B-15: 식자재 삭제 undo cascade 복구 (영양값 스냅샷·복원)
- C-1: 영양성분·식자재 중복 진단 UI (CL1·CL3)
- C-2: 판매량 업로드 행 단위 중복 시각화 (`issueGroupCount` 배지)
- C-3: 판매 분류 미반영 구간 안내 (localStorage flag + 배너)
- C-4: Prettier 잔여 31개 파일 일괄 정리
- C-5: satFat 레거시 참조 확인 (추가 조치 불필요)
- C-6: 드래그·업로드 키보드 접근성 (`UploadDropzone` role/tabIndex/onKeyDown)
- C-7: 테스트 보강 (`restore-bom-sync.test.mjs` 5케이스)
- C-8: 폼 내부 `<button>` type 점검 (`PinGate.jsx` type="submit" 추가)
- R-16: `lib/print/window-print.js` 공통 헬퍼 추출 (4곳 교체)
- R-17: `menu-master` EditModal + `useMenuMasterFilters` 훅 분리
- R-18: `_NoteFormBody` → `components/note/TempCostCalculator.jsx`
- R-19: `_NoteContent` → `useNotePins·useNotePresets·useNoteBatchActions` 훅
- R-20: `allergen/page` matrix 계산 → `lib/nutrition/allergen/matrix.js`
- R-21: `OriginResult` 빌더 → `lib/nutrition/origin/build.js`
- R-22: `report/page` → `useReportListState·useReportActions`
- R-23: `EdgeEditModal` CompRow → `IngredientSearch` 재사용
- R-24: `useWidgetConfig` sanitize → `lib/home/widget-config-utils.js`
- R-25: `MarginFilterBar` → `DiscountSimulator.Toggle·Panel` 분리
- R-26: `useMounted()` 헬퍼 hook 추출 (10개 파일 교체)
- R-27: detail page 4종 `makeDetailRecipePage` 팩토리
- R-28: `UploadDropzone` 중복 자체 구현 2곳 수렴
- R-34: `journal/page` 출력 → `lib/note/journal-print.js` + `WebJournalCard.jsx`
- R-35: `_ReportPreviewModal` `REPORT_OPTION_RENDERERS` registry화
- R-36: 판매 규칙 섹션 `hooks/useSectionSearch.js` 공통화
- R-38: 제때 테이블 4종 `hooks/useTableSearchSort.js` 수렴

---

### UI 점검 라운드 (42건 — HIGH 14·MEDIUM 18·LOW 10) — ✅ 2026-06-13

**커밋**: 8c1cd00 (즉시 HIGH 4) · cfe0698 (나머지 HIGH 10) · ed7df1b (MEDIUM 18)

HIGH 즉시 4건: `showToast 'err'→'error'`(note/board) · `tokens.css` 다크모드 누락 4토큰 · `IngredientSearch` zIndex 9999→350 · 미구현 Excel 체크박스 제거.

HIGH 나머지 10건: DangerConfirm `role="alert"` · PIN 해제 2단계 ConfirmDialog · 칸반 로딩 스피너 · 식자재 list catch showToast + 버튼 disabled · allergen/usage catch showToast · 보고서 4종 `setDataError()` · MenuMasterEditModal ESC/오버레이 닫기 · RecipeEditor 저장 중 버튼 disabled · 다크 토큰화·셀 클래스.

MEDIUM 18건: 하드코딩 hex → CSS 토큰 · 접근성 `aria-label/scope` 다수 · 클릭 가능 div `role="button"` · `.search/:focus-visible` 포커스 링 · 버튼 disabled `|| loading` · `refreshStats` try-catch · `handleExcelExport` catch · 원가보고서 `no-print` · `formatNumber()` 적용 · PIN `autoComplete="off"` · input `step` 속성 · `.notif-pop` z-index 50→95 · 전역 `scrollbar-width: thin`.

LOW 완료: L-02 border-radius 토큰화 · L-03 비교월 동일 경고 · L-04 업로드 제한 표시 · L-06 중복 실행 방지 · L-07 모바일 overflow 완화 · L-08 menuCode·menuName 인라인 오류 · L-09 `table-wrap` className 통일.

---

### QA 라운드 2~4 + 안정화 + 정합성 감사 — ✅ 2026-06-11~12

- **QA R2**: satFat→fat 변환, BOM 통일, usePagination, useDBLoad 부분 도입, z-index 통일, 보고서 날짜 저장, 단가 이력 정렬.
- **QA R3 (12건)**: export failedStores manifest · 보고서 수동 정리 버튼 · 분류 토글 confirm 게이트 · 복원 공통 store 안내 · edgeSearch 선택 초기화 · useDBLoad error UI · CSV filtered 기반 · 단가 정렬 라벨 · 페이지 리셋 · ModalFrame+ConfirmDialog ARIA · qa-prod 포트 가드.
- **QA R4 (5건)**: `downloadCsvText` 헬퍼 · `if (saving) return` 재진입 가드 · `window.onafterprint` 5곳 · origin-result.css min-width · 삭제 confirm 문구 통일.
- **안정화**: 공유 스토어 main DB 라우팅 · replaceStore 단일 트랜잭션 · 영양 복원 localStorage gate · 파생메뉴 영양·알레르기 집계 · 베이스 메뉴 삭제 confirm · build:clean · CSV/Excel 안전성 · 사진 `contain` · BOM 제거 · fat 라벨 전환 · 추가토핑 알레르기 name fallback.
- **정합성 감사 CL1~CL8**: 영양 중복 방지 · 알레르기 링크 식자재 기준 · 식자재 productCode 중복 가드 · 합산 식자재 가격 공통화 · 원가 detail menuCode 인덱스 · normalizeMenuCodeForModule · 카테고리 판정 공통화 · 제때 productCode dedupe.

---

### 화면/기능 맵 검증 — ✅ 2026-06-12

`app/` 라우트 42개 화면 전량 구현 확인. 추가 구현(미기재): `/note/journal` · `/note/sample/write` · `/note/sample/[id]` · `/cost/manage`.

---

_잔여 보류: **B-6/C-P4**(대형 컴포넌트 추가 분해 재평가) · **B-20**(실업무 fixture 확대 잔여) · **N-43**(과거 단가, 동작 명세) · **BUG-011**(deleteIngredient cascade 비원자성, 현재 no-op) · **BUG-014**(TopBar 다크모드 아이콘 플리커) · **메뉴마스터 레시피 2차 UX 후보**(사용자 승인 대기) · **식자재 데이터 정리 도구**(사용자 승인 대기) · **E2E QA 확장 4 시나리오**(fixture 필요) · **CSS·디자인 시스템 정리** · **출력·인쇄·다운로드 파이프라인 점검** · **localStorage·백업 범위 정합성 점검** · **에러·빈상태 UI 통일** · **업로드·import 중복 로직 정리** · **모바일·좁은 화면 레이아웃 재검사** · **외부 배포 보안 강화**(외부 배포 결정 시) · **영양 부분 누락 진단**(크러스트 기준 선행)._
