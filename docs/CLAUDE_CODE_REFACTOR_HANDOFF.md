# Claude Code 작업 인수인계: 남은 분리/정리 계획

작성일: 2026-06-16 (2026-06-16 점검 업데이트)

이 문서는 Claude Code에서 이어서 작업하기 위한 현재 상태 및 남은 작업 목록이다. 현재 목표는 기능 변경이 아니라, 이미 동작하는 화면의 page/component 파일을 안전하게 분리하고 중복 코드를 줄이는 것이다.

## 현재 완료 상태

다음 작업은 완료되었고, `docs/DEFERRED_WORK.md`에도 구현 완료로 반영되어 있다.

### 식자재관리 보고서 탭 + PDF 출력 (2026-06-16)

- `app/ingredient/manage/page.jsx`에 “보고서” 탭 추가 (기존 헤더 PDF 버튼 제거).
- `app/ingredient/manage/IngredientReportPanel.jsx` 신설:
  - “현재 상태 출력”(표 형식) / “사진 카드 출력”(페이지당 2개 품목, 사진 포함) 2모드 선택.
  - 현재 필터 기준 출력 개수 표시 + PDF 출력 버튼.
- `lib/ingredient/manage-print/` 하위 3파일로 분리 (barrel → 8줄, `docs/DEFERRED_WORK.md` B-6 항목):
  - `formatters.js` — esc/text/rowName/priceLabel/allergensLabel/scopeBadgeHtml 등 공통 포맷 헬퍼.
  - `table-report.js` — 표 형식 HTML 빌더 + popup 출력 (`buildIngredientManagePrintHtml`, `printIngredientManageReport`).
  - `photo-report.js` — 사진 카드 HTML 빌더 + popup 출력 (`buildIngredientPhotoCardHtml`, `printIngredientPhotoReport`).
  - `lib/ingredient/manage-print.js` — barrel re-export 8줄. 4개 export 경로 유지.
- 사진 카드 PDF 사양: `@page { size: A4 portrait; margin: 0; }`, 페이지 div `height: 297mm` 고정, 카드 2개 `flex: 1` 꽉 채움, 사진 `object-fit: cover`.

### 공통원가 묶음 개선 (2026-06-16)

- `IngredientSearch.jsx` — `m.productCode &&` 필터 제거 → 수동입력 식자재(`productCode: null`)도 검색 결과에 노출.
- `lib/recipe/index.js` `buildUnitPriceMap` — `productCode`가 없으면 `String(m.id)`를 키, `priceOverride`로 단가 계산.
- `groupEditorUtils.js` `createGroupIngredientLine` — `productCode || String(meta.id)` 키 사용.
- `lib/cost/recipe-groups/apply.js` — `defaultCategories`가 비어 있으면 `return false` (카테고리 명시 필수). 이 정책이 최종 확정이다.
- **주의**: `GroupEditorCategoryChips.jsx:12` 문구 `(미선택 = 전체 메뉴에 적용)`이 실제 동작과 반대. **수정 필요** (아래 남은 작업 1번 참조).

### 기타 분리 완료

- `app/note/calendar/page.jsx` — 391→209줄 (CalendarPageActions, CalendarToolbar, CalendarWorkspace, CalendarPageDialogs 분리).
- `components/settings/restore/RestoreExecutePanel.jsx` — 342→105줄 (RestoreAutoBackupOption, RestoreConfirmSummary, RestoreBackupFailurePrompt, RestoreExecuteActions, RestoreProgressBar, RestoreModuleChip 분리).

## 최근 검증 상태

마지막 확인 기준 (2026-06-16, HANDOFF 전체 구현 완료):

- `npm run lint` 통과 — ESLint 0 warnings / 0 errors ✅
- `npm run test` 통과 — **247 suites / 1172 tests** 전부 통과 ✅
- `npm run qa:smoke` 통과 — 22/22 라우트 (콘솔 에러·하이드레이션·500 없음) ✅

참고: Node v24 환경에서 `next build`는 알려진 환경 이슈로 실패하지만 코드 결함이 아니다. 컴파일·런타임은 dev 서버에서 정상이다.

브라우저 확인:

- `/ingredient/manage` → 보고서 탭 렌더, 출력 버튼 동작 확인.
- `/cost/recipe?tab=groups` → 묶음 관리 식자재 검색에 수동입력 식자재 노출 확인.
- `/note/calendar` — PDF, 인쇄, 일정 추가, view mode 렌더 확인, 콘솔 error 없음.
- `/settings/restore` — 복원 화면 초기 렌더 확인, 콘솔 error 없음.

## 작업 원칙

- 기능 변경보다 “책임 분리”가 우선이다.
- 기존 사용자 변경을 되돌리지 않는다.
- 기존 import 경로와 화면 동작은 최대한 유지한다.
- page 파일의 상태/handler를 무리하게 한 번에 모두 이동하지 말고, 순수 helper와 UI 묶음부터 안전하게 분리한다.
- 각 단계마다 구조 테스트를 추가하거나 갱신한다.
- 작업 완료 시 `docs/DEFERRED_WORK.md`에 구현 완료 이력을 추가한다.
- 커밋은 사용자가 명시적으로 요청할 때만 진행한다.

## 남은 추천순 작업

> **2026-06-16 업데이트**: 아래 모든 항목 구현 완료. 현재 247 suites / 1172 tests 통과.

### 1. 공통원가 카테고리 UI 정합성 수정 ✅ 완료

**원인**: `apply.js`는 `defaultCategories`가 비어 있으면 `return false`(어떤 메뉴에도 안 나옴)인데, UI 문구가 "미선택 = 전체 메뉴에 적용"으로 정반대를 안내하고 있다. 카테고리를 모두 해제한 채 저장하면 메뉴마스터에서 그 묶음이 사라진다.

수정 파일 3곳:

**① `components/cost/recipe-groups/editor/GroupEditorCategoryChips.jsx:12`**
- 미선택 시 문구: `(미선택 = 전체 메뉴에 적용)` → 경고색으로 `(최소 1개 선택 필요 · 미선택 시 메뉴에 표시 안 됨)`.
- 선택 시: 기존 `N개 선택` 유지.
- CSS 변수: `color: 'var(--negative)'`.

**② `components/cost/manage/CommonManageView.jsx` `handleSaveGroup` (line 110)**
- 저장 가드 추가: `draft?.defaultCategories?.length === 0`이면 `showToast('선택 가능 카테고리를 1개 이상 지정해주세요', 'error')` 후 return.
- 기존 `!draft?.name?.trim()` 검증 바로 아래에 추가.

**③ `components/menu-master/MenuRecipeGroupSelector.jsx:39` (선택)**
- 빈 상태 문구: `선택 가능한 공통원가가 없습니다` → `이 메뉴 카테고리에 지정된 공통원가가 없습니다 (공통원가 관리에서 카테고리를 지정해주세요)`.

검증:
```bash
npm run lint
npm run qa:smoke
```
수동: 공통원가 관리 → 묶음 편집 → 카테고리 전부 해제 → 저장 시 차단 확인 → 카테고리 지정 후 저장 → 메뉴마스터에서 묶음 노출 확인.

---

### 2. `app/report/sales/page.jsx` 분리 ✅ 완료

공통원가 카테고리 수정 이후 다음 추천 후보.

목표:

- 판매량 보고서 page에서 데이터 로드, 제외 품목 합산, 기간/비교 계산, export handler를 분리한다.
- page는 `ReportBuilderShell`에 controls/preview를 조립하는 얇은 역할로 줄인다.

추천 분리:

- `app/report/sales/useSalesReportData.js`
  - `initDB`
  - `getAll('sales_rows')`
  - `getUserExcluded`
  - `getUserRules`
  - 제외 품목 이름 중복 제거
  - 사용 가능한 연/월 계산
  - 최신 기간과 비교 기간 초기값 계산

- `app/report/sales/salesReportPageUtils.js`
  - `normalizeViewMode`
  - 판매 row 정규화
  - 제외 품목 정규화
  - `periodLabel` 생성
  - `reportMeta` 생성

- `app/report/sales/useSalesReportComputed.js`
  - `buildSalesStats`
  - `buildPeriodCompare`
  - `safePeriodMode`, `safeYearValue`, `safeMonthValue`, `safeScope`, `safeViewMode` 정리

- 가능하면 나중 단계에서만:
  - Excel export handler를 page 밖 helper로 더 얇게 정리
  - 단, `loadXlsx()` 동적 import 흐름은 유지한다.

주의:

- `useReportPageState`의 draft 복원 콜백은 page에 남겨도 된다.
- compare mode 계산은 현재 `setTimeout(0)`으로 지연되어 있으므로 동일 동작을 유지한다.
- 데이터 없음일 때 `isLoading`이 false로 내려가는 흐름을 유지한다.
- DB 연결 실패 메시지와 판매 데이터 로드 실패 메시지를 바꾸지 않는다.

권장 테스트:

- 새 테스트: `__tests__/lib/report-sales-page-structure.test.mjs`
  - page가 `useSalesReportData`, `useSalesReportComputed` 또는 새 helper에 위임하는지 확인.
  - page에 `getAll('sales_rows')`, `getUserExcluded`, `getUserRules`, `buildPeriodCompare` 같은 세부 로직이 남지 않았는지 확인.
  - 새 helper가 `normalizeViewMode`, 기간 label, excluded name dedupe를 보유하는지 확인.

검증 명령:

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/lib/report-sales-page-structure.test.mjs __tests__/lib/sales-report-preview-structure.test.mjs __tests__/lib/sales-report-export.test.mjs __tests__/lib/report-menu-sales-compare-page-structure.test.mjs --runInBand --no-coverage
npm run lint
npm run test:ci
```

브라우저 확인:

- `/report/sales`
- 제목/controls/preview가 렌더되는지 확인.
- 콘솔 error가 없는지 확인.

### 3. `app/menu-master/page.jsx` 분리 ✅ 완료

판매량 보고서 분리 이후 후보.

목표:

- 메뉴마스터 page에 남은 load/seed/reset/delete/save/export 액션을 분리한다.
- 메뉴/레시피/판매가 미러 동기화 영향이 있으므로 판매량 보고서보다 더 조심해서 진행한다.

추천 분리:

- `app/menu-master/useMenuMasterPageData.js`
  - `initDB`
  - `normalizePersonalPizzaCodes`
  - `getAllMenuMaster`
  - `loadMenuRecipeSummaryMap`
  - visibility refresh에 연결 가능한 `load`

- `app/menu-master/useMenuMasterActions.js`
  - delete
  - delete plan load
  - reset
  - seed
  - save
  - sync mirror

- `app/menu-master/menuMasterExport.js`
  - CSV headers/rows 생성
  - `downloadCsvText`

주의:

- `pushMasterToPrices()`는 메뉴마스터 변경 후 미러 동기화에 중요하다.
- `resetAllMenuPrices()`도 reset flow에서 함께 유지해야 한다.
- `getMenuDeletePlan()` 삭제 영향 메시지 흐름을 바꾸지 않는다.
- viewer/admin 권한 흐름은 기존 UI 컴포넌트와 맞춰 유지한다.

권장 테스트:

- 기존 `menu-master` 관련 테스트 유지.
- 새 구조 테스트 추가 후보:
  - `__tests__/lib/menu-master-page-structure.test.mjs`
  - page가 `MenuMasterDialogs`, `MenuMasterTablePanel`, `MenuMasterHeaderActions`, 새 hook/helper에 위임하는지 확인.
  - page에 CSV 문자열 조립이 직접 남지 않았는지 확인.

검증 명령:

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/lib/menu-master-price-sync.test.mjs __tests__/lib/menu-master-recipe-summary.test.mjs __tests__/lib/menu-master-page-structure.test.mjs --runInBand --no-coverage
npm run lint
npm run test:ci
```

브라우저 확인:

- `/menu-master`
- 목록/필터/추가 버튼/편집 모달 진입이 깨지지 않는지 확인.
- 콘솔 error가 없는지 확인.

### 4. 추가 재스캔 ✅ 완료

위 작업들 완료 후 다시 250~300줄 이상 파일을 재스캔한다.

예상 후보:

- `app/ingredient/manage/page.jsx`
  - 액션 handler가 여전히 많음.
  - 다만 기능 영향 범위가 넓어서 별도 라운드 권장.

- `app/cost/margin/page.jsx`
  - 원가/마진 계산, 필터, 정렬, 스냅샷 액션이 한 page에 남아 있음.
  - 돈 계산 화면이므로 테스트를 넓게 붙이고 천천히 진행.

- `app/settings/brands/page.jsx`
  - 브랜드 백업/복원, 숨김, 기본 브랜드, 전환 액션이 한 파일에 있음.
  - 설정/백업 계열이라 별도 라운드 권장.

- `app/settings/backup/page.jsx`
  - 백업 이력, 모듈 선택, 진단, 진행률이 한 page에 있음.
  - 복원과 같은 설정/백업 묶음으로 따로 처리 권장.

### 5. 추가 후속 정리 ✅ 완료

위 모든 작업 완료 후 다시 한 번 큰 파일을 재스캔하고, 아래 순서로 추가 정리를 진행하는 것을 권장한다.

1순위: `app/ingredient/manage/page.jsx` ✅ 완료

- 식자재 저장/삭제/복구/시드/초기화/제때 연동 handler를 `useIngredientManageActions`로 분리한다.
- page는 탭, 패널, dialog 조립만 담당하도록 줄인다.
- 식자재 관리는 자주 사용하는 핵심 화면이므로 분리 효과가 크다.

2순위: `app/cost/margin/page.jsx` ✅ 완료

- 데이터 load, 필터/정렬, margin stats, snapshot 저장을 hook/helper로 분리한다.
- 추천 파일:
  - `useMarginRows`
  - `useMarginFilters`
  - `useMarginActions`
- 금액/마진 계산 화면이므로 UI 분리보다 계산 회귀 테스트를 먼저 고정한다.

3순위: 설정/백업 계열 ✅ 완료

- `app/settings/brands/page.jsx`: 브랜드 form, 브랜드 목록, 백업/복원 action을 분리한다.
- `app/settings/backup/page.jsx`: 백업 실행, 이력 목록, 진단 카드를 분리한다.
- 설정/백업 계열은 위험도가 높으므로 한 번에 묶지 말고 브랜드와 백업을 각각 별도 라운드로 처리한다.

4순위: 전역 Shell ✅ 완료 (AppShell 분리)

- 대상:
  - `components/TopBar.jsx`
  - `components/AppShell.jsx`
  - `components/Sidebar.jsx`
- 브랜드 전환, 검색, 권한, navigation 상태에 모두 닿기 때문에 전역 영향이 크다.
- 다른 page 조립부 정리가 끝난 뒤 마지막 단계에서 처리한다.

보류 후보:

- seed/rules 대형 데이터 파일은 단순 줄 수가 커도 UI 분리 대상이 아니다.
- `lib/nutrition/label/build.js`, `lib/report/build-cost-report.js` 같은 계산/출력 builder는 기능 변경이 있을 때 별도 테스트와 함께 진행한다.
- import 진입점이 없는 컴포넌트는 삭제 전 반드시 `rg`로 실제 사용 여부를 확인하고, 제거/보류/재연결 중 하나를 결정한다.

## 각 단계 공통 완료 기준

각 후보 작업은 아래를 모두 만족하면 완료로 본다.

1. 기능 변경 없이 파일 책임이 분리되어 있다.
2. 새 구조 테스트 또는 기존 구조 테스트가 업데이트되어 있다.
3. `docs/DEFERRED_WORK.md`에 완료 이력이 추가되어 있다.
4. `git diff --check` 통과.
5. `npm run lint` 통과.
6. 관련 테스트 통과.
7. 관련 route 브라우저 렌더 확인 및 콘솔 error 없음.
8. 마지막에 `npm run test:ci` 통과.

## 참고 명령

큰 파일 재스캔:

```bash
find app components lib -name '*.jsx' -o -name '*.js' | while read f; do lines=$(wc -l < "$f"); if [ "$lines" -ge 250 ]; then printf '%5d %s\n' "$lines" "$f"; fi; done | sort -nr
```

전체 검증:

```bash
git diff --check
npm run lint
npm run test:ci
```
