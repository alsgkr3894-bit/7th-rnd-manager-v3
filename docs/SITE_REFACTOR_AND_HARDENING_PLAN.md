# 사이트 전체 보완 및 분리 작업 계획

작성일: 2026-06-17

## 1. 목적

사이트 전체 기준으로 남아 있는 분리 작업, 신뢰도 보강, 성능 점검, 보안 점검 후보를 정리한다.

이번 문서는 메뉴마스터 전용 계획이 아니라 전체 앱을 대상으로 한다. 기능 추가보다 유지보수성, 버그 탐지, 출력 신뢰도, 대량 데이터 대응을 우선한다.

## 2. 우선순위 요약

### P0. 신뢰도와 데이터 안전

- `lib/ingredient/store.js`
  - 참조 누락, cascade 일부 실패, undo 복구 실패가 `console.warn`에만 남는 경로를 점검한다.
  - 사용자에게 보이는 toast, 진단 카드, 이슈 탭 중 하나로 실패 내용을 노출한다.
  - 실패 항목 수, 제품코드, 복구 가능 여부를 함께 표시한다.
- 백업/복원
  - 복원 전 자동 백업 실패, 일부 store 복원 실패, 알 수 없는 store, 버전 불일치가 사용자가 놓치지 않게 표시되는지 확인한다.
  - 복원 완료 후 실제 store row count가 미리보기와 맞는지 검증한다.
- 출력물 회귀
  - 원가 보고서, 영양성분 표출력, 원산지 출력, 알레르기 출력, 식자재관리 PDF 출력에서 공통원가/식자재 연결 누락이 없는지 확인한다.

### P1. 큰 파일 분리

- `app/settings/backup/page.jsx`, `app/settings/restore/page.jsx`
  - 백업/복원 흐름 제어, UI, 검증 안내가 한 파일에 많이 남아 있다.
  - 추천 분리:
    - `useBackupPageController`
    - `BackupSummaryCards`
    - `BackupHistoryPanel`
    - `useRestoreFlow`
    - `RestoreFilePicker`
- `lib/nutrition/label/build.js`
  - 피자, 조각, 토핑, 사이드, 세트/하프, 음료 빌더가 한 파일에 있다.
  - 추천 분리:
    - `pizza-sheet`
    - `pizza-slice-sheet`
    - `topping-sheet`
    - `side-sheet`
    - `set-half-sheet`
    - `beverage-sheet`
- `app/cost/margin/page.jsx`
  - `useMarginData`는 분리됐지만 필터, 정렬, 통계, 스냅샷, 숨김 처리가 page에 남아 있다.
  - 추천 분리:
    - `useMarginFilters`
    - `useMarginSorting`
    - `useMarginStats`
    - `useMarginActions`
- `app/report/cost/page.jsx`
  - 원가 보고서 page 안에 엑셀 export builder가 들어 있다.
  - 추천 분리:
    - `lib/report/export-cost-xlsx.js`
    - `useCostReportData`
- `components/TopBar.jsx`
  - 브랜드 선택, 알림, 프로필, 테마, 로그아웃, 스크롤 상태가 한 컴포넌트에 섞여 있다.
  - 추천 분리:
    - `BrandSwitcher`
    - `NotificationMenu`
    - `ProfileMenu`
    - `ThemeToggle`

### P2. 로딩 패턴 정리

- 아직 수동 `initDB + useEffect + setLoading` 패턴이 남아 있는 곳을 확인한다.
- 후보:
  - `components/cost/manage/CommonManageView.jsx`
  - `components/cost/ingredient-price/SuppliersView.jsx`
  - 일부 노트 상세/달력 hook
  - 일부 영양성분 원산지/알레르기 hook
- 방향:
  - 단순 DB read는 `useDBLoad`로 통일한다.
  - visibility refresh가 필요한 화면은 `useVisibilityRefresh(reload)`를 붙인다.
  - 오류는 console만 남기지 말고 화면 또는 toast로 노출한다.

### P3. 성능 점검

- 큰 테이블은 대부분 전체 렌더링 구조다.
- 점검 대상:
  - 식자재관리
  - 원가마진표
  - 보고서 이력
  - 제때 단가/출고량 테이블
  - 메뉴판매량 미매칭/랭킹 비교
- 기준:
  - 1천 행 기준 검색/필터/탭 전환이 즉시 반응해야 한다.
  - 5천~1만 행 기준 화면 freeze가 없어야 한다.
- 필요 시 적용:
  - memoized selector
  - pagination
  - 가상 스크롤
  - 검색 debounce
  - 탭 전환 시 비활성 패널 lazy render

### P4. 외부 배포 전 보안 점검

- 현재 인증은 `lib/auth.js` 기준 로컬 `localStorage` 해시와 `v3:auth` 쿠키 중심이다.
- 내부 로컬 도구라면 유지 가능하지만, 외부 배포 또는 LAN 다중 사용자 운영을 생각하면 별도 점검이 필요하다.
- 점검 항목:
  - `middleware` 또는 서버 route guard 필요 여부
  - 쿠키 `Secure`, `HttpOnly` 적용 가능 여부
  - 비밀번호 hash salt/계정별 인증 정책
  - 관리자/뷰어 권한이 UI disabled뿐 아니라 실행 함수에서도 막히는지
  - 설정 PIN과 로그인 인증의 역할 분리

## 3. 단계별 작업 계획

### 1단계. 신뢰도 보강 ✅ 완료 (2026-06-17)

- ✅ `lib/ingredient/store.js`의 silent warning 경로 목록화 완료
  - compositeOf 참조 누락 → UI 입력 검증 단계에서 사전 차단 (store console.warn 유지 적절)
  - 삭제 cascade 일부 실패 → `warnIngredientCascadeFailures` → toast 노출 (`ingredientManageUtils.js`)
  - undo 복구 실패 → toast "실행취소 실패: message" 노출 (`useIngredientManageActions.js`)
  - 일괄 삭제 실패 → `buildBulkDeleteToast` → "N개 삭제됨 · M개 실패" toast 노출
  - logWork 실패 → background 작업, silent 유지 (의도적)
- ✅ 백업/복원 실패 처리 확인
  - 백업 실행 실패 → toast "백업 중 오류가 발생했습니다." (`useBackupActions.js`)
  - 복원 버전 mismatch → toast warning 노출 (`restore/page.jsx`)
  - 복원 전 자동백업 실패 → RestoreBackupFailurePrompt 모달 노출
  - 복원 일부 실패 → RestoreDoneCard 인라인 에러 목록 노출
- ✅ guard 테스트 추가 (`ingredient-manage-undo-guards.test.mjs` +3건)
  - warnIngredientCascadeFailures toast 동작 구조 고정
  - 단건/일괄 삭제 후 cascade 경고 호출 경로 고정
- 커밋: `fix: guard cascade/undo failure surfacing with tests`

### 2단계. 백업/복원 분리 ✅ 완료 (2026-06-17)

- ✅ `app/settings/backup/useBackupHistory.js` 신규: history/lastBackupAt/backupReminder state + sortedHistory/filteredHistory useMemo + refreshHistory
- ✅ `backup/page.jsx` 461→431줄: useBackupHistory 적용, sortedHistory/filteredHistory useMemo 제거
- ✅ `hooks/useRestoreFile.js` 신규: handleFile(파일 읽기·JSON 파싱·validateBackupPayload·toast) + parsed state
- ✅ `restore/page.jsx` 375→333줄: useRestoreFile 적용, handleFile 인라인 제거
- ✅ `restore-failed-stores-guard.test.mjs` 업데이트: failedStores 검사 위치 → useRestoreFile 훅
- 커밋: `refactor: extract useBackupHistory and useRestoreFile hooks`

### 3단계. 영양성분 label builder 분리 ✅ 완료 (2026-06-17)

- ✅ `lib/nutrition/label/build.js` 560줄 → barrel re-export 22줄
- ✅ 공통 유틸 `_utils.js` (LABEL_COLS, scaleVal, roundLabelValue, parseVolumeMl, sortNutritionLabelMenus, augmentWithDerived 등)
- ✅ 시트별 분리: `sheets/pizza.js`, `sheets/topping.js`, `sheets/side.js`, `sheets/set-half.js`, `sheets/beverage.js`
- ✅ 외부 import 경로 `@/lib/nutrition/label/build` 변경 없음 (barrel 유지)
- 커밋: `refactor: split nutrition label build.js into per-sheet files`

### 4단계. 원가마진/원가보고서 분리 ✅ 완료 (2026-06-17)

- ✅ `app/report/cost/page.jsx` 384→255줄: exportCostXlsx → `lib/report/export-cost-xlsx.js` 분리
  - guard 테스트: `export-cost-xlsx-structure.test.mjs` (+6건)
  - 커밋: `refactor: extract exportCostXlsx to lib/report/export-cost-xlsx.js`
- ✅ `app/cost/margin/page.jsx` 487→297줄: `useMarginFilters`, `useMarginActions` 분리
  - `useMarginFilters`: catFilter/sortKey/sortDir/search/showHidden/edgeFilter + cats/filtered/edgeFiltered/sizeLabels/stats/handleSort/sortedFiltered/hiddenCount
  - `useMarginActions`: handleSaveSnapshot/handleSavePlatforms/handleToggleHide
  - guard 테스트: `margin-filter-state.test.mjs` (+7건)
  - 커밋: `refactor: extract useMarginFilters and useMarginActions from margin page`

### 5단계. 전역 UI 분리 ✅ 완료 (2026-06-17)

- ✅ `components/TopBar.jsx` 418→124줄
- ✅ `components/topbar/CompanyPicker.jsx`, `ThemeToggle.jsx`, `NotificationPopover.jsx`, `ProfileMenu.jsx` 신규
- ✅ clearAuthCookie/handleLogout → ProfileMenu, meta 객체 → NotificationPopover
- ✅ guard 테스트: `topbar-structure.test.mjs` (+8건)
- 커밋: `refactor: split TopBar into CompanyPicker/NotificationPopover/ProfileMenu/ThemeToggle`

### 6단계. 로딩 패턴 정리 ✅ 완료 (2026-06-17)

- ✅ `components/cost/ingredient-price/SuppliersView.jsx`: `useEffect+initDB+mountedRef` → `useDBLoad(getAllSuppliers)`
  - suppliers/loading/dbError 상태·useRef·useCallback 제거, `load()` → `reload()`
- ✅ `components/cost/manage/CommonManageView.jsx`: 동일 패턴 → `useDBLoad(async () => { ... })`
  - fetchFn이 `{ allMeta, unitPriceMap, groups, edges }` 반환, `data?.X ?? []` 로 구조 분해
  - `setEdges(...)` 직접 변경 → `load()` (reload) 로 통일
- 커밋: `refactor: migrate CommonManageView and SuppliersView to useDBLoad`

### 7단계. 보안 점검 ✅ 완료 (2026-06-17)

- ✅ `docs/SECURITY_POLICY.md` 작성
  - 현재 인증 구조: SHA-256 해시(솔트 없음), v3:auth 쿠키(SameSite=Strict), middleware route guard
  - admin 전용 실행 함수(`useBrandActions` 등)는 `if (!isAdmin) return` 코드 가드 확인
  - LAN HTTP 허용 목록 및 외부 배포 전 필요 변경사항(Secure/HttpOnly 쿠키, 서버 측 토큰, API 인증 등) 문서화
- 커밋: `docs: document local-tool auth policy and external deployment risks`

## 4. 테스트 계획

- 기본 검증:
  - `npm run lint`
  - `npm run test:ci`
  - `npm run qa:smoke`
  - `npm run qa:runtime`
- 분리 작업별 추가 검증:
  - 백업 파일 생성 후 복원 미리보기 row count 확인
  - 복원 실패 store fixture 확인
  - 영양성분 label builder 시트별 snapshot 또는 구조 테스트
  - 원가마진 필터/정렬/스냅샷 저장 테스트
  - 원가보고서 엑셀 export 시트명/컬럼 확인
  - TopBar 브랜드 전환, 알림, 프로필, 로그아웃, 테마 전환 확인
- 브라우저 QA:
  - 데스크톱 1440px
  - 모바일 390px
  - 긴 메뉴명/긴 식자재명/많은 태그/많은 알레르기 케이스

## 5. 보류 후보

- `lib/ingredient/data/*`
- `lib/sales/data/rules/*`
- `lib/menu-master/seed.js`

위 파일들은 크지만 데이터/룰 성격이 강하므로 급하게 분리하지 않는다. 기능 안정화 후 필요하면 JSON/CSV 원천화 또는 데이터 loader 분리를 검토한다.

## 6. 완료 기준

- 큰 page/component 파일의 책임이 줄고, UI 조립과 비즈니스 로직이 분리되어 있다.
- silent warning이 사용자 확인 가능한 진단/이슈로 올라온다.
- 백업/복원 실패와 위험 상태가 명확히 표시된다.
- 영양성분/원가/원산지/알레르기 출력 결과가 분리 전과 동일하다.
- 주요 테이블이 대량 데이터에서도 freeze 없이 동작한다.
- 로컬 내부용 인증과 외부 배포용 보안 리스크가 문서로 구분되어 있다.
- lint, test, smoke/runtime QA가 통과한다.

## 7. 2차 추가 보완 후보

Claude Code가 기존 P0~P4 작업 이후 이어서 확인할 항목이다.

### P5. CSS/디자인 시스템 정리

- 큰 CSS 파일이 많아졌다.
  - `app/styles/features/motion-note.css`
  - `app/styles/features.css`
  - `app/styles/features/home.css`
  - `app/styles/features/report/builder.css`
  - `app/styles/features/report/table.css`
  - `app/styles/layout.css`
  - `app/styles/features/settings.css`
  - `app/styles/features/cost.css`
  - `app/styles/features/ingredient.css`
- 보완 방향:
  - 공통 토큰, 레이아웃, 테이블, 모달, 출력/인쇄 스타일을 역할별로 분리한다.
  - 기능별 CSS 안에 섞인 공통 패턴은 `components` 또는 `patterns` 계열로 이동한다.
  - inline style이 반복되는 card header, summary row, table wrapper, modal footer는 공통 class/helper로 정리한다.
  - 기존 디자인을 크게 바꾸지 않고, CSS 책임만 나눈다.
- 주의:
  - 한 번에 전체 CSS를 갈아엎지 않는다.
  - 먼저 보고서/인쇄 스타일처럼 영향 범위가 명확한 영역부터 분리한다.

### P6. 출력/인쇄/다운로드 파이프라인 점검

- 현재 출력 경로가 여러 방식으로 나뉘어 있다.
  - `lib/print/window-print.js`: `window.open` + `document.write`
  - `lib/report/print.js`: 현재 DOM clone 후 `window.print`
  - `lib/download.js`: JSON/CSV 다운로드
  - 각 모듈의 XLSX export helper
- 보완 방향:
  - PDF 출력, 인쇄, CSV, XLSX의 공통 UX 문구와 실패 처리를 맞춘다.
  - 팝업 차단, print dialog 취소, 이미지 로딩 지연, 긴 표 페이지 분할을 테스트한다.
  - `document.write` 기반 출력 HTML은 사용자 입력 문자열 escaping 여부를 확인한다.
  - 파일명 규칙을 `브랜드명_업무명_날짜` 기준으로 통일한다.
- 확인 대상:
  - 식자재관리 PDF
  - 식자재 사용현황 PDF
  - 영양성분표 PDF/XLSX
  - 원산지 PDF/XLSX
  - 보고서 PDF/XLSX
  - 메뉴마스터/마진/판매량 CSV

### P7. localStorage/백업 범위 정합성 점검

- localStorage 기반 데이터가 많다.
  - 환경설정
  - 브랜드/활성 브랜드
  - 계정/활성 계정
  - 설정 PIN
  - 영양성분 출력 순서/이름 override
  - 플랫폼 수수료 설정 mirror
  - 홈 위젯 설정
  - 임시저장/스크롤/최근 방문
- 보완 방향:
  - 영속 보관해야 할 키와 세션성 키를 명확히 분류한다.
  - 백업/복원 대상 키는 `lib/backup/local-storage-keys.js`에 모두 포함되어 있는지 확인한다.
  - 임시저장, 최근 방문, 스크롤 위치처럼 복원하면 오히려 이상한 키는 백업에서 제외한다.
  - 브랜드별로 분리되어야 하는 키와 공유되어야 하는 키를 표로 문서화한다.
- 테스트:
  - 선택 백업 범위별 localStorage 포함/제외 테스트
  - 브랜드 백업/복원 시 활성 계정, 플랫폼 수수료, 출력 순서가 예상대로 복원되는지 확인

### P8. 라우트 QA 커버리지 확대

- 현재 route 수가 많고 일부에만 `error/loading` 파일이 있다.
- 보완 방향:
  - `app/**/page.jsx` 목록과 `scripts/full-rt.mjs`, `scripts/smoke-qa.mjs`의 검사 대상 route를 대조한다.
  - 직접 진입해야 하는 route와 redirect 전용 route를 구분한다.
  - 주요 업무 route는 최소 smoke 대상에 포함한다.
  - 대용량/브랜드 전환/빈 DB 상태로 나눠 runtime QA를 보강한다.
- 우선 확인 route:
  - `/settings/backup`
  - `/settings/restore`
  - `/settings/brands`
  - `/cost/margin`
  - `/report/cost`
  - `/nutrition/export`
  - `/ingredient/manage`
  - `/menu-master`
  - `/menu-sales/unmatched`

### P9. 에러/빈상태/권한 상태 통일

- 같은 오류라도 화면마다 toast, console, 빈 카드, skeleton 처리가 다르다.
- 보완 방향:
  - 공통 `ErrorState`, `EmptyState`, `PermissionNotice`, `InlineWarning` 패턴을 정의한다.
  - DB 로드 실패는 `다시 시도` 액션을 제공한다.
  - viewer 권한에서 버튼 disabled만 하지 말고, 필요한 경우 이유 tooltip 또는 안내 문구를 제공한다.
  - 위험 액션은 같은 confirm UI와 문구 기준을 사용한다.
- 적용 후보:
  - 백업/복원
  - 식자재관리
  - 메뉴마스터
  - 제때 업로드
  - 메뉴판매량 업로드/미매칭
  - 원가관리

### P10. 업로드/import 중복 로직 정리

- 여러 모듈에서 CSV/XLSX 업로드를 직접 처리한다.
  - 제때 단가
  - 제때 출고량
  - 메뉴판매량
  - 메뉴 판매가
  - 식자재 일괄 단가
  - 영양성분 기본값 import
- 보완 방향:
  - 파일 확장자 검사, 크기 제한, 파싱 실패 메시지, 미리보기 상태를 공통 helper로 정리한다.
  - upload history/hash 중복 검사 정책을 문서화한다.
  - 업로드 실패 row 다운로드 형식을 통일한다.
  - 대용량 파일에서 progress와 취소 가능 여부를 검토한다.

### P11. 모바일/좁은 화면 레이아웃 재검사

- 많은 화면이 데스크톱 업무 도구 중심이지만 모바일 하단 탭과 responsive layout이 있다.
- 보완 방향:
  - 390px 폭에서 테이블, 모달, 드롭다운, 상단 액션 버튼이 겹치지 않는지 확인한다.
  - 고정 TopBar/Sidebar/Modal z-index 기준을 문서화한다.
  - 긴 버튼 텍스트는 아이콘+tooltip 또는 줄바꿈 기준을 정한다.
  - table은 모바일에서 최소한 가로 스크롤이 자연스럽게 보여야 한다.
- 우선 확인:
  - 메뉴마스터 수정창
  - 식자재 추가/수정 모달
  - 백업/복원
  - 원가마진표
  - 보고서 미리보기
  - 영양성분 표출력

## 8. Claude Code 2차 작업 순서

### 1순위. 출력/백업/스토리지 안전

- P6 출력/인쇄/다운로드 파이프라인 점검
- P7 localStorage/백업 범위 정합성 점검
- P8 라우트 QA 커버리지 확대

### 2순위. 공통 UX 안정화

- P9 에러/빈상태/권한 상태 통일
- P11 모바일/좁은 화면 레이아웃 재검사

### 3순위. 구조 정리

- P5 CSS/디자인 시스템 정리
- P10 업로드/import 중복 로직 정리

## 9. Claude Code 작업 메모

- 이 문서의 작업은 기능 구현보다 “안정화/정리” 성격이다.
- 각 항목은 한 번에 모두 처리하지 말고, 기능별로 작게 나눠 커밋한다.
- 분리 작업 전후에는 반드시 기존 동작이 유지되는지 비교한다.
- CSS 정리는 visual regression 위험이 크므로 작은 영역부터 처리한다.
- 출력/인쇄 관련 변경은 브라우저에서 실제 print/PDF 미리보기까지 확인한다.
- 백업/복원 변경은 실제 데이터 삭제 위험이 있으므로 테스트 fixture 또는 사전 백업 후 진행한다.

## 10. Claude Code 공통 작업 루프

모든 항목은 아래 순서로 단계별 진행한다. 한 단계가 완전히 끝나기 전에는 다음 단계로 넘어가지 않는다.

### 기본 루프

1. 작업 범위 확인
   - 해당 단계에서 수정할 파일과 영향 화면을 먼저 확인한다.
   - 관련 기존 테스트와 QA route를 확인한다.
   - 현재 워크트리의 다른 변경사항을 되돌리지 않는다.

2. 구현
   - 한 번에 한 단계만 구현한다.
   - 리팩토링이면 기능 동작을 바꾸지 않는다.
   - 기능 보강이면 기존 저장 형식과 출력 형식이 깨지지 않게 한다.

3. 1차 테스트
   - 관련 unit/jest 테스트를 실행한다.
   - 해당 단계와 직접 관련 있는 테스트를 우선 실행한다.
   - 실패하면 원인을 수정하고 다시 실행한다.

4. 검사 및 버그 탐색
   - 변경 파일을 다시 읽어 의도치 않은 삭제, 누락 import, 권한 누락, 저장 누락을 확인한다.
   - console error/warn, silent catch, 권한 우회, 빈 상태, 긴 텍스트, 모바일 레이아웃을 확인한다.
   - 관련 기능의 반대 케이스도 확인한다.
     - 예: 저장 성공뿐 아니라 저장 실패
     - 예: admin뿐 아니라 viewer
     - 예: 데이터 있음뿐 아니라 빈 DB

5. 사이트 확인
   - 브라우저에서 실제 route에 들어가 화면을 확인한다.
   - 필요한 경우 desktop/mobile viewport를 모두 확인한다.
   - 모달, 드롭다운, 출력, 업로드, 백업/복원처럼 UI 흐름이 있는 작업은 실제 클릭 흐름까지 확인한다.

6. 한 번 더 반복 검사
   - 같은 단계에서 한 번 더 테스트/검사를 반복한다.
   - 최소 반복 기준:
     - 관련 jest 또는 구조 테스트 1회 추가 실행
     - `npm run lint` 또는 변경 범위에 맞는 정적 검사
     - 브라우저 route 재확인
   - 반복 중 새 버그를 찾으면 수정 후 다시 3번부터 반복한다.

7. 커밋
   - 해당 단계가 통과하면 그 단계만 커밋한다.
   - 커밋 메시지는 작업 범위가 보이게 작성한다.
   - 예:
     - `refactor: split backup page panels`
     - `fix: surface ingredient cascade warnings`
     - `test: cover nutrition label sheet builders`

8. 다음 단계 이동
   - 커밋 후 다음 단계로 이동한다.
   - 다음 단계 시작 전 `git status`로 남은 변경을 확인한다.
   - 이전 단계에서 남은 미해결 이슈는 문서에 표시하고 다음 단계와 섞지 않는다.

### 단계 완료 기준

- 구현 완료
- 관련 테스트 통과
- 버그 탐색 1회 이상 완료
- 실제 사이트 route 확인 완료
- 반복 검사 완료
- 작업 내용 문서 업데이트
- 단계별 커밋 완료

### 금지 사항

- 여러 큰 단계를 한 커밋에 섞지 않는다.
- 테스트 실패 상태로 커밋하지 않는다.
- 사용자/다른 작업자가 만든 변경을 되돌리지 않는다.
- 백업/복원, 삭제, 초기화 같은 위험 작업을 실제 데이터로 바로 검증하지 않는다.
- CSS 대규모 정리를 기능 변경과 같은 커밋에 섞지 않는다.

### 권장 커밋 단위

- P0 신뢰도 보강: 진단 표시 1커밋, 백업/복원 검증 1커밋, 출력물 회귀 테스트 1커밋
- P1 큰 파일 분리: 파일 또는 화면 단위로 1커밋
- P2 로딩 패턴 정리: 화면 단위로 1커밋
- P3 성능 점검: 측정 테스트 1커밋, 실제 최적화 1커밋
- P4 보안 점검: 문서화 1커밋, 코드 보강은 별도 커밋
- P5 CSS 정리: CSS 영역 단위로 1커밋
- P6 출력/다운로드: 출력 유형별로 1커밋
- P7 localStorage/백업 범위: 키 분류 1커밋, 테스트 1커밋
- P8 라우트 QA: QA route 추가 1커밋, 발견 버그 수정은 별도 커밋
- P9 공통 상태 UI: 공통 컴포넌트 1커밋, 화면 적용은 화면 단위 커밋
- P10 업로드/import: 공통 helper 1커밋, 모듈 적용은 모듈 단위 커밋
- P11 모바일 레이아웃: 화면 단위로 1커밋

## 11. 문서 업데이트 및 완료 표시 규칙

Claude Code가 각 단계를 완료하면 이 문서를 반드시 같이 갱신한다.

- 상태 표기는 아래 기준으로 통일한다.
  - `⏳ 진행 예정`: 아직 착수하지 않음
  - `🔄 진행 중`: 구현 또는 테스트 중
  - `✅ 완료`: 구현, 테스트, 사이트 확인, 반복 검사, 커밋까지 완료
  - `⏸ 보류`: 지금 처리하지 않는 것이 안전하거나 우선순위가 낮음
  - `⚠️ 추가 확인 필요`: 구현은 됐지만 테스트, 데이터, 권한, 출력 확인이 남음
- 완료 항목에는 다음 정보를 남긴다.
  - 완료일
  - 커밋 해시
  - 변경한 핵심 파일
  - 실행한 테스트 명령
  - 확인한 브라우저 route
  - 남은 리스크 또는 보류 사유
- 실제 구현이 끝난 항목만 `✅ 완료`로 바꾼다.
- 테스트를 못 했거나 사이트 확인을 못 한 항목은 완료로 표시하지 않고 `⚠️ 추가 확인 필요`로 둔다.
- 메뉴마스터 전용 작업은 `docs/MENU_MASTER_RECIPE_INPUT_UX_PLAN.md`와 중복되지 않게 링크 또는 짧은 참조만 남긴다.

## 12. 작업 전 안전 체크

데이터 손실 가능성이 있거나 전역 영향이 큰 작업은 구현 전에 아래 항목을 확인한다.

- `git status --short`로 기존 변경사항을 확인한다.
- 사용자 또는 다른 작업자가 만든 변경은 되돌리지 않는다.
- 백업/복원, 삭제, 초기화, seed 덮어쓰기, store 구조 변경 전에는 테스트 데이터 또는 별도 백업을 먼저 만든다.
- 실제 운영 데이터로 위험 작업을 검증하지 않는다.
- localStorage, IndexedDB, 백업 파일 형식을 바꾸는 경우 복원 호환성을 먼저 문서화한다.
- 여러 화면이 같이 바뀌는 공통 helper 변경은 영향 route 목록을 먼저 적고 시작한다.
- 대규모 CSS, TopBar, AppShell, 인증, 백업/복원 변경은 단독 커밋으로 분리한다.

## 13. 단계별 결과 보고 형식

각 단계가 끝나면 Claude Code는 아래 형식으로 결과를 남긴다.

- 작업 범위:
  - 처리한 P단계 또는 세부 항목
  - 변경한 파일
- 구현 내용:
  - 사용자 입장에서 달라진 점
  - 내부 구조에서 분리되거나 정리된 점
- 테스트/검사:
  - 실행한 명령
  - 통과/실패 결과
  - 브라우저에서 확인한 route
  - 반복 검사 여부
- 발견 이슈:
  - 바로 수정한 버그
  - 남겨둔 보류 항목
  - 다음 단계에서 이어서 봐야 할 위험
- 커밋:
  - 커밋 해시
  - 커밋 메시지

## 14. 우선순위 재조정 규칙

작업 중 아래 상황이 나오면 현재 리팩토링을 멈추고 우선순위를 조정한다.

- 데이터 저장, 복원, 삭제, 출력 누락, 권한 우회 버그를 발견하면 즉시 P0로 올린다.
- 테스트가 없어서 기능 유지 여부를 판단하기 어려운 분리는 먼저 테스트를 추가한다.
- CSS 변경으로 모바일, 모달, 출력물 레이아웃이 깨지면 CSS 범위를 더 작게 나눠 다시 진행한다.
- 공통 helper 분리 중 import 순환이나 전역 동작 변경이 보이면 해당 분리는 보류하고 기존 구조를 유지한다.
- 성능 최적화가 코드 복잡도를 크게 높이면 실제 측정 결과가 있을 때만 적용한다.
- 보안 관련 변경은 로컬 내부용 정책과 외부 배포용 정책을 분리해서 결정한다.

## 15. 반복 QA 매트릭스

각 단계의 사이트 확인은 가능하면 아래 조합 중 관련 있는 항목을 포함한다.

- 권한: 관리자, viewer
- 데이터 상태: 빈 데이터, 일반 데이터, 대량 데이터
- 화면 크기: 1440px 데스크톱, 390px 모바일
- 브랜드: 기본 브랜드, 별도 브랜드
- 출력: PDF, 인쇄, XLSX, CSV 중 해당 기능
- 실패 케이스: 저장 실패, 파싱 실패, 단가 없음, 참조 누락, 권한 없음
- UI 케이스: 긴 메뉴명, 긴 식자재명, 많은 태그, 많은 알레르기, 많은 원산지

필수 route는 단계별 영향 범위에 따라 정하되, 전역 변경 후에는 최소한 `/`, `/menu-master`, `/ingredient/manage`, `/cost/margin`, `/nutrition/export`, `/settings/backup`, `/settings/brands`를 확인한다.
