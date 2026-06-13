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

## B. 보류 작업 플랜 (미완료 항목만)

> 아래는 **실제로 아직 진행되지 않은** 항목만 기재합니다.
> 완료된 항목은 하단 "완료 이력" 섹션으로 이동됐습니다.

---

### 🟡 중위험 — 단일 모듈 구조 변경 / 테스트 필요

#### B-3 Phase 2. 알레르기 링크 테이블(legacy) store 정의 제거  🟡 ⏸
- **파일**: `lib/db/constants.js`·`lib/db/module-stores.js`·`lib/db/schema/nutrition.js`(store 정의 6곳), `lib/nutrition/allergen/migrate-to-ingredient.js`
- **완료(Phase 1, 2026-06-13)**: `lib/nutrition/allergen/store.js` dead code 6종 제거 — `MASTER_STORE`·`getAllAllergenMasters`·`getAllAllergenLinks`·`getAllergenLinkByIngredient`·`saveIngredientAllergens`·`deleteAllergenLink` 전부 외부 참조 없음. `allergenRate` 계산을 `nutrition_allergy_links`(legacy) → `cost_ingredients.allergens`로 교체.
- **잔여 Phase 2**: `nutrition_allergy_links` store 정의 제거(constants·module-stores·schema 6곳), `migrate-to-ingredient.js`의 allergen 파트 제거(origin 파트는 유지).
- **왜 보류**: store 제거는 브랜드별 DB 마이그레이션·데이터 확인 필요 — 외부 조건 대기.
- **주의**: `deleteAllergenLinksByIngredient`는 `lib/ingredient/store.js` dynamic import에서 여전히 호출됨 — store 제거 후에도 `hasStore` 가드로 no-op 처리되므로 Phase 2 이후에도 안전.

#### B-5. useDBLoad 전면 확산  🟡 ⏸
- **파일**: 직접 `getAll()`·`initDB()` 호출하는 페이지 다수
- **문제**: 일부 페이지가 `useDBLoad` 대신 useEffect + 직접 DB 호출 패턴 사용. 에러 핸들링·로딩 상태 누락.
- **해결 방향**: 각 페이지를 `useDBLoad` 패턴으로 통일.
- **왜 보류**: 변경 범위 넓음. 회귀 위험 > 현재 효과. 안전 우선.
- **관련 메모리**: [[deferred-refactors]]

#### B-6. 대형 컴포넌트 분해  🟡 ⏸
- **파일**: `app/ingredient/list/page.jsx`(904줄), `app/note/_NoteContent.jsx`(1017줄) 등
- **참고**: `app/note/calendar/page.jsx`는 이미 분해 완료(370줄) — CalendarGrid·_DayPanel·_ScheduleModal 컴포넌트 + useCalendarData·useCalendarMonth·useCalendarNavigation·useTodayChecklist 훅 분리.
- **해결 방향**: 기능별 서브컴포넌트 분리. 상태 관리 훅 추출.
- **왜 보류**: 효과 < 회귀 위험. 기능 추가 시점에 함께 진행 예정.
- **관련 메모리**: [[deferred-refactors]]

#### B-9. 1인피자 알레르기 표시 기준 정리  🟡 ⏸
- **파일**: `lib/nutrition/label/build.js:265`, `app/nutrition/allergen/page.jsx:345`
- **문제**: 라벨은 씬바사삭L만 출력, 알레르기 화면은 4크러스트 전부 생성 → 불일치.
- **해결 방향**: 도메인 확인(1인피자가 씬바사삭만 맞는지) 후 allergen 행 생성 필터 통일.
- **왜 보류**: 알레르기 출력은 법적 표기 영향. 도메인 확인 필수.

---

### 🔴 고위험 — 설계 합의 / 외부 조건 대기

#### N-42. 엣지별 알레르기 탭 (신중 점검)  🔴 ⏸
- **파일**: `lib/nutrition/allergen/matrix.js:102-150`, `rules.js:19-31`, `crust-config.js:49-54`
- **내용**: 표출력에 엣지 선택 시 알레르기 합산. 씬바사삭: 기본 도우(석쇠) 알레르기 **제거(-)** + 씬도우 **추가(+)**, 단 도우에 있던 알레르기값이 다른 식자재에도 있으면 유지.
- **왜 보류**: 크러스트 변형 기대값 설계 합의 대기. 구현 전 **별도 설계 합의** 필수.
- **착수 게이트**: 크러스트별(석쇠/씬바사삭/치즈크러스트/골드스윗) **입력 식자재 → 기대 알레르기 결과** 예시 1~2건 제공 시 착수.

#### N-43. 재료단가표 과거 식자재 단가 가져오기  🟡 ⏸
- **파일**: `app/cost/ingredient-price/` + `lib/price/`(파일별 이력 존재, `PriceHistoryModal`)
- **내용**: 일시적으로 변경된 납품가를 과거 단가로 소급 조회/적용.
- **왜 보류**: 동작 명세 미확정 — 특정 날짜 단가를 원가계산에 일시 적용하는지, 조회만 하는지.
- **착수 게이트**: 동작 명세 제공 시 착수.

---

## D. 운영·실데이터 QA 영역

> production 코드를 바꾸지 않는 QA·검증 가이드. `docs/RELEASE_CHECKLIST.md`·`docs/QA_CHECKLIST.md` 운영 소관.

**운영 QA로만 분류(코드 보류 아님)**: 원가/판매가/원가율 기준표 대조, 엑셀 입출력 Excel 앱 확인, 코드 매칭 원장 대조, 대용량(500MB) 복원 freeze·진행률, usage-counts `menuName` dedupe 규격 누락, 다운로드 파일명/출력 컬럼 정책, 인증·설정 PIN 보안경계 문서화, 성능(1천/1만 행) 측정.

---

## 완료 이력

> 완료된 모든 작업 기록. 라운드 순 → 가장 최근 항목이 위에 있습니다.

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
- R-11: `TabSetCalc·TabDerived` → `useSetCompositionForm·useDerivedCompositionForm`
- R-12: BulkPriceModal 통합 미구현 확정 (두 모달 구조 완전히 상이)
- R-13: `PlatformSettingsModal` `FeeRow·PlatformRow·PlatformSelector` 분리 + `useReducer` 전환 (518→280줄)
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

_잔여 보류(외부 조건 대기): **B-3 Phase 2**(DB schema, 브랜드별 migration) · **B-5**(useDBLoad 전면, 회귀위험) · **B-6**(대형 컴포넌트, 회귀위험) · **B-9**(1인피자 알레르기, 도메인 확인) · **N-42**(엣지 알레르기, 설계 합의) · **N-43**(과거 단가, 동작 명세)._
