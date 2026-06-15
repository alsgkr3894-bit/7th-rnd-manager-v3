# PROJECT_CODEBASE_AUDIT

> 기준일: 2026-06-14
> 대상 경로: `/Users/lmh/Documents/Codex/7th-rnd-manager-v3`
> 목적: 현재 프로젝트의 전체 코드 구조, 주요 기능 흐름, 데이터 저장 구조, 테스트/QA 체계, 유지보수상 주의점을 한 문서로 정리한다.

## 1. 점검 기준

- 확인 범위: `app`, `components`, `hooks`, `lib`, `scripts`, `__tests__`, `docs`, `public`, 루트 설정 파일.
- 제외 범위: `node_modules`, `.next`, `.git` 같은 외부 의존성/빌드 산출물.
- 현재 워크트리는 이미 다수의 수정/미추적 파일이 있는 상태다. 이 문서는 현재 파일 시스템 기준으로 작성했다.
- 실제 코드는 수정하지 않았고, 문서 추가만 수행한다.

## 2. 프로젝트 전체 개요

이 프로젝트는 7번가 R&D 업무를 위한 Next.js App Router 기반 로컬 우선 관리 도구다. 주요 업무 축은 메뉴 판매량, 제때 가격/출고량, 원가 계산, 식자재 관리, 영양성분/원산지/알레르기, 메뉴개발노트, 보고서, 백업/복원이다.

| 영역 | 파일 수 | 역할 |
|---|---:|---|
| `app` | 121 | Next.js App Router 화면, route-level 상태, 일부 화면 전용 hook/component |
| `components` | 186 | 공통 UI, 도메인별 재사용 컴포넌트, 표/모달/카드/업로드 UI |
| `hooks` | 56 | 클라이언트 상태, 브라우저 이벤트, 검색/필터/페이지네이션/모달/DB 로드 hook |
| `lib` | 259 | IndexedDB, 도메인 store, 계산, 파싱, 출력, QA 가능 순수 helper |
| `scripts` | 7 | smoke/runtime QA, clean build, production QA, dev 준비 |
| `__tests__` | 151 | Jest 기반 단위/회귀/guard 테스트 |
| `docs` | 3 | 보류 작업, 버그 감사, 사이트 개선 백로그 |
| `public` | 8 | 로고, manifest, 폰트, Excel 템플릿 |

## 3. 기술 스택과 실행 명령

| 항목 | 현재 값 |
|---|---|
| Framework | Next.js `14.2.3` |
| UI | React `18.3.1`, CSS Variables |
| 언어 | JavaScript/JSX 중심, `middleware.ts`만 TypeScript |
| 저장소 | IndexedDB + localStorage/sessionStorage |
| Excel | `xlsx` dynamic import |
| 테스트 | Jest, Playwright 기반 QA script |
| 주요 dependency | `next`, `react`, `react-dom`, `xlsx`, `@dnd-kit/*` |
| 주요 devDependency | `@playwright/test`, `eslint`, `eslint-config-next`, `jest`, `prettier` |

| Script | 역할 | 주의점 |
|---|---|---|
| `npm run dev` | 개발 서버 실행 | `predev`에서 `.next` 충돌을 줄이기 위한 준비 실행 |
| `npm run dev:lan` | LAN 접속용 dev 서버 | 외부 기기 접속용, 포트 3000 |
| `npm run dev:clean` | dev 서버 정리 후 실행 | 실행 중 서버 종료 동작 포함 |
| `npm run build` | Next build | README 기준 dev 서버가 켜진 상태에서는 주의 필요 |
| `npm run build:clean` | clean build wrapper | dev 서버 포트 guard와 stale `.next` 처리 |
| `npm run qa:smoke` | 대표 22개 라우트 UI smoke | 읽기 전용 순회, 업로드/저장/복원 실행 안 함 |
| `npm run qa:runtime` | 60개 이상 runtime route 순회 | main/china4 브랜드, 직접 진입 QA 포함 |
| `npm run qa:prod` | build 후 `next start`로 smoke/runtime 실행 | 포트 3000이 이미 사용 중이면 실패 처리 |
| `npm test`, `npm run test:ci` | Jest 테스트 | `--experimental-vm-modules` 사용 |
| `npm run format:check` | Prettier 검사 | `.prettierignore`에서 `*.md`, `.next*`, `public` 제외 |

## 4. 라우트와 화면 구조

### 4.1 공통 레이아웃

| 파일 | 역할 |
|---|---|
| `app/layout.jsx` | Root layout, local font, metadata, `AppShell`, `ErrorBoundary` 연결 |
| `components/AppShell.jsx` | Sidebar, TopBar, CommandPalette, shortcut, theme/brand, toast, progress, offline, DB notice 총괄 |
| `components/Sidebar.jsx` | 좌측 네비게이션, active 상태, 브랜드/섹션 이동 |
| `components/TopBar.jsx` | 상단 검색/알림/프로필/모바일 메뉴 |
| `components/CommandPalette.jsx` | `Cmd/Ctrl+K` 통합 검색/이동 |
| `components/Toast.jsx` | 전역 toast, undo action 지원 |
| `components/ErrorBoundary.jsx` | React error boundary |
| `app/error.jsx`, `app/global-error.jsx`, `app/not-found.jsx` | Next error/not-found 화면 |

### 4.2 주요 route 그룹

| Route 그룹 | 주요 파일 | 역할 |
|---|---|---|
| 홈 | `app/page.jsx`, `hooks/useHomeDashboardData.js`, `components/home/*` | KPI, 위젯, 최근 활동, 일정/할 일, 모듈 상태 |
| 로그인 | `app/login/page.jsx`, `lib/auth.js`, `middleware.ts` | 로컬 비밀번호, `v3:auth` 쿠키, route guard |
| 메뉴마스터 | `app/menu-master/page.jsx`, `lib/menu-master/*`, `components/menu-master/*` | 메뉴코드, 카테고리, 판매가/레시피 연결 |
| 메뉴판매량 | `app/menu-sales/*`, `lib/sales/*`, `components/sales/*` | Excel/CSV 파싱, 분류, 미매칭, 순위/비교, 규칙 관리 |
| 제때 | `app/jette/*`, `lib/price/*`, `lib/shipment/*`, `components/jette/*` | 가격 파일, 출고량, 관리품목, 가격비교 |
| 원가 | `app/cost/*`, `lib/cost/*`, `components/cost/*` | 레시피, 피자/사이드/세트/1인피자 원가, 마진, 식자재 단가 |
| 식자재 | `app/ingredient/*`, `lib/ingredient/*`, `components/ingredient/*` | 식자재 등록/관리, 사진, 제품코드, 사용현황, 출력 |
| 영양성분 | `app/nutrition/*`, `lib/nutrition/*`, `components/nutrition/*` | 영양값, 파생/세트/토핑, 원산지, 알레르기, 출력 |
| 노트 | `app/note/*`, `lib/note/*`, `lib/sample/*`, `components/note/*` | 메뉴개발노트, 샘플, 칸반, 일정, 연구일지 |
| 보고서 | `app/report/*`, `lib/report/*`, `components/report/*` | 판매/원가/단가/출고량 보고서, 미리보기, 출력 |
| 설정 | `app/settings/*`, `components/settings/*`, `lib/settings.js`, `lib/db/backup.js` | 계정, PIN, 백업/복원, 시스템 설정 |

## 5. 데이터 저장 구조

### 5.1 IndexedDB 기본 정보

| 항목 | 값 |
|---|---|
| DB 이름 | `rnd_manager_v3` |
| DB version | `19` |
| 브랜드 DB 정책 | `main`은 기본 DB, 다른 브랜드는 `rnd_manager_v3__<brandId>` |
| 공유 store | 노트/샘플/일정/작업일지 계열은 main DB 공유 store로 분류 |
| 전체 store 수 | `ALL_STORES` 기준 43개 |

### 5.2 Store 그룹

| 그룹 | 주요 store | 역할 |
|---|---|---|
| common | `settings`, `upload_log`, `migration_flags` | 앱 공통 설정, 업로드 로그, 마이그레이션 플래그 |
| menu master | `menu_master` | 전 모듈 공용 메뉴코드 기준 |
| sales | `sales_files`, `sales_rows`, `sales_rules`, `menu_sales_issues`, `ref_sales_*` | 판매량 업로드/분류/미매칭/규칙 |
| price | `price_files`, `price_rows` | 제때 가격 파일/행 |
| shipment | `shipment_files`, `shipment_rows`, `ref_shipment_products`, `ref_shipment_rules` | 제때 출고량/관리품목 |
| cost | `menu_recipes`, `cost_ingredients`, `cost_selling_prices`, `cost_recipe_groups`, `cost_edge_dough`, `cost_margin_snapshots`, `cost_platform_fees` | 원가/식자재/판매가/마진 |
| notes | `menu_dev_notes`, `sample_records`, `note_schedules`, `work_log` | 메뉴개발노트, 샘플, 일정, 작업 이력 |
| nutrition | `nutrition_menu_ref`, `nutrition_raw_values`, `nutrition_origin_master`, `nutrition_allergy_master`, `nutrition_topping_master`, `nutrition_edge_master`, `nutrition_set_composition` | 영양성분, 원산지, 알레르기 |
| report | `generated_reports` | 생성 보고서 |
| account | `ref_accounts` | 로컬 계정/역할 |

### 5.3 백업/복원 흐름

| 파일 | 역할 | 주의점 |
|---|---|---|
| `lib/db/backup.js` | `exportAll`, `exportSelected`, `importAll`, `replaceStore` | export 실패 store는 `failedStores` manifest에 기록되지만 restore 차단 정책은 UI와 함께 확인 필요 |
| `lib/backup/validation.js` | 백업 JSON 구조 검증 | store 값 배열/레코드 객체 여부 검증 |
| `lib/backup/restore-impact.js` | 복원 영향 범위 계산 | 현재 데이터와 백업 데이터 row 수 비교 |
| `lib/db/module-stores.js` | 백업 scope와 store 그룹 | 공통 store는 항상 포함되는 구조 |
| `lib/nutrition/backup-keys.js` | nutrition localStorage 백업 키 | localStorage 복구 범위는 업무 기준 확인 필요 |

## 6. 도메인별 코드 정리

### 6.1 메뉴판매량

- 핵심 lib: `lib/sales/parse*.js`, `classify.js`, `rule-matcher.js`, `resolve.js`, `ranking.js`, `compare.js`, `export-xlsx.js`.
- 핵심 UI: `components/sales/UploadDropzone.jsx`, `UploadPreview.jsx`, `UnmatchedTable.jsx`, `UserRulesSection.jsx`.
- 주요 흐름: 파일 업로드 → header/row 파싱 → 규칙 기반 분류 → 미매칭 issue 저장 → 순위/비교/보고서 출력.
- 주의점: 규칙 변경 후 기존 업로드 재분류는 과거 보고 결과를 바꿀 수 있어 영향 범위 확인이 필요하다.

### 6.2 제때 가격/출고량

- 핵심 lib: `lib/price/*`, `lib/shipment/*`, `lib/jette/*`.
- 핵심 UI: `components/jette/PriceCompareTable.jsx`, `PriceLatestView.jsx`, `ShipmentTable.jsx`, `ManagedProductsCard.jsx`.
- 주요 흐름: 가격 파일/출고 파일 업로드 → productCode 기준 비교/집계 → 관리품목 전용/범용 분류.
- 주의점: productCode 중복, 파일 간 마지막 행 덮어쓰기, 전월 비교 기준을 실데이터로 확인해야 한다.

### 6.3 원가 계산

- 핵심 lib: `lib/cost/menu-price/*`, `lib/cost/pizza-detail/*`, `side-detail`, `set-detail`, `personal-detail`, `pizza-summary`, `margin`, `composite-price.js`, `ingredient-menu-map.js`.
- 핵심 UI: `components/cost/recipe/RecipeEditor.jsx`, `components/cost/manage/CommonManageView.jsx`, `components/cost/margin/*`, `components/cost/ingredient-price/*`.
- 주요 흐름: 판매가/식자재 단가/레시피 입력 → 메뉴별 원가 계산 → 마진/플랫폼 수수료/보고서.
- 주의점: 카테고리 판정과 menuCode base/full 정책이 여러 파일에 걸쳐 있어 원가율/마진 정확성 QA가 중요하다.

### 6.4 식자재

- 핵심 lib: `lib/ingredient/store.js`, `index.js`, `photos.js`, `dashboard.js`, `print.js`, `data/master-*.js`.
- 핵심 UI: `app/ingredient/manage/*`, `app/ingredient/list/*`, `app/ingredient/usage/page.jsx`, `components/ingredient/*`.
- 주요 흐름: master seed/price row/수동 식자재 통합 → productCode 기준 관리 → 사진/원산지/알레르기/영양값 연결 → 사용현황 출력.
- 주의점: `lib/ingredient/store.js`는 CRUD, 중복 진단, 병합, cascade, seed, legacy normalize를 모두 포함해 책임이 큰 파일이다.

### 6.5 영양성분/원산지/알레르기

- 핵심 lib: `lib/nutrition/values/*`, `label/*`, `origin/*`, `allergen/*`, `menu-group.js`, `crust-config.js`, `slice-config.js`.
- 핵심 UI: `app/nutrition/menu/page.jsx`, `app/nutrition/allergen/page.jsx`, `app/nutrition/origin/page.jsx`, `app/nutrition/export/*`, `components/nutrition/*`.
- 주요 흐름: 메뉴별 영양 원시값/식자재 영양값/토핑/엣지/파생메뉴/세트 계산 → 표 출력/Excel/PDF/알레르기/원산지.
- 주의점: 법적/업무 기준이 강한 영역이다. 실제 원가표/영양성분표/알레르기 기준표와 수동 QA가 필요하다.

### 6.6 메뉴개발노트/샘플/일정

- 핵심 lib: `lib/note/*`, `lib/sample/*`, `lib/work-log.js`.
- 핵심 UI: `app/note/_NoteContent.jsx`, `app/note/write/page.jsx`, `app/note/[id]/page.jsx`, `app/note/sample/*`, `app/note/calendar/*`, `components/note/*`.
- 주요 흐름: 노트 작성/수정/복사/버전관리 → 샘플 기록/사진 → 칸반/캘린더/체크리스트/연구일지.
- 주의점: `app/note/_NoteContent.jsx`와 샘플 화면은 큰 파일이며, 삭제/undo/복구 문구와 실제 복구 동작이 일치하는지 확인해야 한다.

### 6.7 보고서

- 핵심 lib: `lib/report/build-*.js`, `period.js`, `print.js`, `index.js`.
- 핵심 UI: `app/report/*`, `components/report/*`.
- 주요 흐름: 판매/원가/단가/출고량 데이터 집계 → 보고서 미리보기 → Excel/PDF/print.
- 주의점: 파일명 날짜 suffix, sheet name 제한, 긴 한글/사진/page-break, 빈 데이터 출력 정책을 QA해야 한다.

### 6.8 설정/인증/운영

- 핵심 lib: `lib/auth.js`, `lib/auth/accounts.js`, `lib/settings.js`, `lib/session.js`, `lib/backup-history.js`, `middleware.ts`.
- 핵심 UI: `app/settings/*`, `components/settings/*`.
- 주요 흐름: 로컬 비밀번호/PIN/역할 → 설정 저장 → 백업/복원 → 시스템 진단.
- 주의점: 현재 인증은 서버 없는 로컬 환경용이다. 외부 배포 또는 공유망 운영에서는 서버 기반 인증/세션 검토가 필요하다.

## 7. 공통 컴포넌트와 Hook

### 7.1 공통 UI

| 폴더/파일 | 역할 |
|---|---|
| `components/ui/*` | Button 성격의 Chip, SearchBox, Pagination, ModalFrame, ConfirmDialog, UploadDropzone, ComboBox 등 |
| `components/charts/*` | 순수 SVG 기반 AreaChart, Donut, Sparkline |
| `components/home/*` | 홈 위젯과 KPI 카드 |
| `components/cost/shared/*` | 원가 detail 화면 공통 카드/편집/검색/테이블 조각 |
| `lib/ui/*` | React 없는 UI helper와 guard, 테스트 가능한 순수 함수 |

### 7.2 Hook

| Hook 계열 | 주요 파일 | 역할 |
|---|---|---|
| 데이터 로드 | `useDBLoad`, `useHomeDashboardData`, `useIngredientPriceData`, `useRecipeWorkbenchData` | DB init/로드/상태 관리 |
| 검색/필터 | `useNoteFilter`, `useMenuMasterFilters`, `useIngredientPriceFilters`, `useTableSearchSort`, `useSearchHistory` | 목록 검색, 정렬, 필터, 기록 |
| UI/브라우저 | `useModalShell`, `useModalOrigin`, `useOutsideClick`, `useScrollMemory`, `useBeforeUnload`, `useVisualEffects` | 모달/스크롤/단축키/효과 |
| 업무 액션 | `useNoteBatchActions`, `useReportActions`, `useRestoreImpact`, `useSettingsAuth` | 삭제/정리/복원/설정 |
| 영양/원가 | `useNutritionBaseEditor`, `useIngredientNutritionCalc`, `useRecipeNutritionCalc`, `useDetailRecipePage` | 도메인 편집과 계산 지원 |

## 8. 테스트와 QA 체계

### 8.1 Jest 테스트

`__tests__`는 hook, lib, UI helper, script guard, business fixture 중심으로 구성되어 있다.

| 테스트 영역 | 예시 |
|---|---|
| Backup/restore | `backup-validation`, `backup-restore-impact`, `backup-scope-coverage`, `restore-bom-sync` |
| 원가/식자재 | `margin-*`, `composite-price`, `ingredient-product-code-dedup`, `ingredient-delete-cascade` |
| 영양성분 | `nutrition-label-build`, `nutrition-set-calc`, `nutrition-derived-calc`, `nutrition-import-guards` |
| 판매량 | `sales-rule-matcher`, `sales-store-issues`, `sales-dashboard`, `business-fixtures` |
| UI helper | `pagination-ui`, `combo-box`, `modal-frame-ui`, `sort-controls`, `search-box` |
| Scripts | `full-rt-script`, `clean-build-script`, `qa-browser-utils`, `smoke-qa-utils` |

### 8.2 Smoke/runtime QA

| Script | 검사 범위 | 특징 |
|---|---|---|
| `scripts/smoke-qa.mjs` | 대표 22개 route | h1/main, console/pageerror, HTTP 500, overflow, loading marker, error text |
| `scripts/full-rt.mjs` | main route 50개 이상 + china4 route + 직접 진입 route | 브랜드별 DB/공유 DB 초기화, runtime/hydration/console error 확인 |
| `scripts/qa-prod.mjs` | clean build + `next start` + smoke/runtime | 포트 충돌 시 기존 서버를 테스트하지 않도록 실패 처리 |
| `scripts/clean-build.mjs` | clean build wrapper | dev 서버 실행 중 `.next` 삭제/빌드 충돌 방지 |
| `scripts/prepare-dev.mjs` | dev 실행 전 준비 | stale `.next` 충돌 완화 |

## 9. 큰 파일과 유지보수 집중 후보

| 파일 | 줄 수 | 판단 |
|---|---:|---|
| `app/note/_NoteContent.jsx` | 1002 | 노트 목록/검색/삭제/복사/버전/모달 책임이 큼 |
| `app/report/sales/page.jsx` | 938 | 판매 보고서 상태/계산/출력 UI가 큼 |
| `app/note/sample/page.jsx` | 852 | 샘플 목록/검색/삭제/비교/상세 UI가 큼 |
| `lib/ingredient/store.js` | 839 | 식자재 CRUD/중복/병합/cascade/seed 책임이 큼 |
| `app/nutrition/allergen/page.jsx` | 813 | 알레르기 matrix/필터/출력 UI가 큼 |
| `app/ingredient/manage/IngredientForm.jsx` | 807 | 식자재 form/validation/photo/origin/allergen UI가 큼 |
| `app/cost/margin/page.jsx` | 761 | 마진 계산/필터/플랫폼/스냅샷 UI가 큼 |
| `app/report/page.jsx` | 763 | 보고서 센터 목록/정리/모달 책임이 큼 |
| `app/ingredient/usage/page.jsx` | 718 | 제품별 사용현황 집계/표/CSV/print 책임이 큼 |
| `components/cost/recipe/RecipeEditor.jsx` | 717 | 레시피 편집/drag/계산/모달 책임이 큼 |
| `lib/nutrition/label/build.js` | 558 | 영양성분표 여러 시트 빌더가 집중됨 |

## 10. 현재 확인된 위험/주의 항목

| 분류 | 항목 | 관련 파일 | 위험도 | 추천 |
|---|---|---|---|---|
| 인증 | 로컬 cookie 존재 여부 기반 인증 | `middleware.ts`, `lib/auth.js` | 높음 | 로컬 전용이면 문서화, 외부 배포면 서버 세션 필요 |
| API 공개 | `/api/`가 public path에 포함 | `middleware.ts` | 중간 | API route 추가 시 별도 인증/allowlist 필요 |
| 백업 | export 실패 store가 `failedStores`로만 기록 | `lib/db/backup.js` | 높음 | restore UI에서 차단/강경 경고되는지 계속 검증 |
| 복원 | localStorage restore 실패 무시 | `lib/db/backup.js` | 중간 | 복원 결과 warning에 포함 권장 |
| 카테고리 | 피자/사이드/1인피자 판정 로직 분산 | `lib/menu-master`, `lib/nutrition`, `lib/cost` | 높음 | 공통 policy 기준 강화 |
| 코드 매칭 | menuCode base/full, productCode 기준이 여러 흐름에 존재 | `lib/menu-master`, `lib/cost`, `lib/ingredient`, `lib/nutrition` | 높음 | 업무 기준별 key 정책 문서화와 테스트 |
| 출력 | Excel/PDF/print의 파일명/시트명/page-break | `lib/download.js`, `lib/report`, `lib/nutrition`, `lib/ingredient/print.js` | 중간 | 실파일 수동 QA 필요 |
| 수동 스크립트 | root `verify-*.mjs`가 공식 script 밖에 있음 | `verify-dashboard.mjs`, `verify-4th.mjs`, `verify-data-path.mjs` | 중간 | 필요 시 `scripts/manual`로 이동 또는 삭제 검토 |
| 대형 파일 | route page와 store에 책임 집중 | `app/**/page.jsx`, `lib/ingredient/store.js` | 중간 | 변경 시 테스트 먼저 추가 후 분리 |

## 11. 정적 파일과 public 자산

| 파일 | 역할/상태 |
|---|---|
| `public/logo-7thstreet.png` | `lib/companies.js`에서 main 브랜드 로고로 사용 |
| `public/logo-chinax4.png` | `lib/companies.js`에서 china4 브랜드 로고로 사용 |
| `public/logo-icheonbabssam.png` | `lib/companies.js`에서 이천밥쌈 브랜드 로고로 사용 |
| `public/logo-7th.png` | 코드 직접 참조는 확인되지 않음. 삭제 전 외부 직접 URL 사용 확인 필요 |
| `public/logo-icheon.png` | 코드 직접 참조는 확인되지 않음. 삭제 전 외부 직접 URL 사용 확인 필요 |
| `public/fonts/PretendardVariable.woff2` | `app/layout.jsx` localFont에서 사용 |
| `public/templates/원산지_템플릿.xlsx` | 원산지 템플릿 파일. 다운로드 경로 확인 필요 |
| `public/manifest.json` | PWA manifest. icon path는 `/icon.png`, 실제 icon은 `app/icon.png`가 존재 |

## 12. 현재 문서/작업 이력

| 파일 | 역할 |
|---|---|
| `README.md` | 빠른 시작, QA, 구조, 디자인 토큰, 실행 주의사항 |
| `ARCHITECTURE.md` | 아키텍처 원칙과 최근 구조 정리 |
| `docs/DEFERRED_WORK.md` | 보류/완료 판단의 단일 출처 역할 |
| `docs/BUG_AUDIT_2026-06-14.md` _(삭제됨)_ | 2026-06-14 버그 감사/검증 이력 → `DEFERRED_WORK.md`로 흡수 후 삭제 |
| `docs/SITE_IMPROVEMENT_BACKLOG.md` | 제품/UX/성능/안정성 개선 백로그 |
| `docs/PROJECT_CODEBASE_AUDIT.md` | 현재 문서. 전체 코드 구조와 유지보수 관점 정리 |

## 13. 유지보수 추천 순서

1. 데이터 안전성 우선: 백업/복원, productCode/menuCode 중복, 원가/영양 출력값 회귀 테스트를 먼저 고정한다.
2. 큰 파일 분리: `app/note/_NoteContent.jsx`, `app/report/sales/page.jsx`, `app/note/sample/page.jsx`, `lib/ingredient/store.js`를 테스트 기반으로 천천히 나눈다.
3. 정책 단일화: 카테고리 판정, menuCode base/full, productCode dedupe 정책을 공통 문서와 유틸로 고정한다.
4. 출력 QA 강화: Excel/PDF/CSV/print는 실제 업무 파일로 파일명, 컬럼, 시트명, 한글, page-break를 확인한다.
5. 운영 경계 확정: 이 앱이 로컬 전용인지 LAN 운영인지 외부 배포인지에 따라 인증/세션/권한 설계를 결정한다.
6. QA route drift 방지: `app/**/page.jsx`와 `qa:smoke`/`qa:runtime` 목록이 어긋나지 않도록 guard를 유지한다.

## 14. 코덱스가 맡기 좋은 작업과 사람 확인 필요 작업

| 구분 | 항목 |
|---|---|
| 코덱스 가능 | 문서화, 테스트 후보 작성, 순수 함수 테스트 보강, 대형 파일 분리 초안, console/catch 분류, route drift 검사 |
| 사람 확인 필요 | 실제 원가 숫자, 실제 Excel 출력값, 메뉴코드/제품코드 업무 기준, 알레르기/원산지 법적 기준, 백업/복원 실데이터 검증, 배포 방식 승인 |

## 15. 결론

현재 프로젝트는 기능 범위가 넓고, 대부분의 도메인 로직이 `lib`로 분리되어 있어 테스트 가능한 구조를 갖추고 있다. 동시에 로컬 IndexedDB 기반 업무 앱 특성상 데이터 손상 방지, 코드 매칭 정합성, 출력물 정확성, 백업/복원 안정성이 가장 중요한 축이다.

가장 현실적인 개선 방향은 기능을 크게 바꾸는 것이 아니라, 업무 데이터가 틀어질 수 있는 지점부터 테스트와 문서 기준을 세우고, 큰 화면/큰 store 파일을 작은 단위로 분리해 회귀 위험을 낮추는 것이다.
