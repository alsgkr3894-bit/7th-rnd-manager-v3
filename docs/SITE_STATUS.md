# 7번가 R&D 플랫폼 사이트 현황 (집중 탐색 결과)

> 작성일: 2026-06-17  
> 탐색 방식: 7개 영역 병렬 에이전트 → 종합 정리  
> 대상 브랜치: master (HEAD)

---

## 목차

1. [기술 스택 개요](#1-기술-스택-개요)
2. [라우트 및 화면 목록](#2-라우트-및-화면-목록)
3. [IndexedDB 스키마](#3-indexeddb-스키마)
4. [상태 관리 및 훅 패턴](#4-상태-관리-및-훅-패턴)
5. [lib 도메인 로직](#5-lib-도메인-로직)
6. [공통 컴포넌트 및 UI 시스템](#6-공통-컴포넌트-및-ui-시스템)
7. [멀티브랜드 및 설정 시스템](#7-멀티브랜드-및-설정-시스템)
8. [테스트 및 QA 현황](#8-테스트-및-qa-현황)

---

## 1. 기술 스택 개요

| 항목 | 내용 |
|---|---|
| 프레임워크 | Next.js 14 (App Router, `'use client'` 컴포넌트 중심) |
| 언어 | JavaScript (TypeScript 미사용) |
| 스타일 | CSS custom properties (`tokens.css`), 외부 CSS 프레임워크 없음 |
| 데이터 저장 | IndexedDB (클라이언트 전용, 서버 DB 없음) |
| 아이콘 | 자체 SVG 세트 (`components/icons.jsx`, 33종) |
| 엑셀 출력 | xlsx.js (동적 import) |
| 테스트 | Jest (단위·구조 가드), Playwright (브라우저 QA smoke) |
| 배포 환경 | 로컬 LAN HTTP, `next dev` or `next start` |

---

## 2. 라우트 및 화면 목록

총 56개 page 파일 (실제 화면 44개 + 리다이렉트 12개). 홈·메뉴마스터·원가계산(허브+공통원가+원가마진+전체원가)·보고서(허브+4종 빌더)·메뉴판매량(허브+분석+업로드+미매칭+설정)·제때(허브+출고+단가+설정)·식자재(허브+관리+사용량)·영양성분(허브+메뉴+알레르기+원산지+표출력)·설정(브랜드·계정·백업·복원·시스템)·노트(목록+작성+상세+캘린더+보드+일지+시제품) 총 10개 섹션 구성.

### 홈 / 인증

| 경로 | 설명 | 파일 |
|---|---|---|
| `/` | 홈 대시보드 — 시간대별 인사말, 월별 KPI 위젯(판매량·원가율·미매칭 알림), 빠른 메모, 최근 활동, 위젯 설정 모달 | `app/page.jsx` |
| `/login` | 로그인 / 초기 설정 — 비밀번호 인증·최초 비밀번호 설정(setup=1), 자동 로그인(remember) 지원 | `app/login/page.jsx` |

### 메뉴 마스터

| 경로 | 설명 | 파일 |
|---|---|---|
| `/menu-master` | 메뉴 마스터 — 브랜드별 메뉴 목록·카테고리 필터·레시피 연결 상태 표시, CSV 다운로드, 메뉴 추가/수정/삭제 | `app/menu-master/page.jsx` |

### 원가 계산

| 경로 | 설명 | 파일 |
|---|---|---|
| `/cost` | 원가계산 허브 — 기초 데이터(식자재 가격·메뉴마스터·공통묶음·엣지)·원가 분석(원가마진표·전체 종합 원가표) 진입점 | `app/cost/page.jsx` |
| `/cost/recipe` | 공통 원가 관리 — 공통묶음(groups 탭)·엣지 원가(edges 탭) 두 탭으로 공통 재료 묶음과 엣지/도우 항목 원가 관리 | `app/cost/recipe/page.jsx` |
| `/cost/margin` | 원가마진표 — 카테고리별 원가율·마진율 테이블, 플랫폼(배달앱) 할인 시뮬레이션, 경고 임계값 설정, 엑셀 내보내기 | `app/cost/margin/page.jsx` |
| `/cost/all-summary` | 전체 종합 원가표 — 모든 카테고리 통합 원가 현황, 카테고리 필터, 페이지네이션, CSV 내보내기 | `app/cost/all-summary/page.jsx` |

### 보고서

| 경로 | 설명 | 파일 |
|---|---|---|
| `/report` | 보고서 허브 — 저장된 보고서 목록·종류별 필터·공유·미리보기·PDF 인쇄, 보고서 신규 생성 진입 | `app/report/page.jsx` |
| `/report/sales` | 판매량 보고서 빌더 — 월/연도·범위 선택, 순위표/차트 뷰 전환, 엑셀 내보내기, 초안 자동 저장 | `app/report/sales/page.jsx` |
| `/report/cost` | 원가 보고서 빌더 — 카테고리별 원가·레시피 인쇄본 생성, Strict Posting 검증, 엑셀 내보내기 | `app/report/cost/page.jsx` |
| `/report/price` | 식자재 단가 보고서 빌더 — 기간별 단가 변동 요약·원가 영향도 포함, PDF/엑셀 출력 | `app/report/price/page.jsx` |
| `/report/shipment` | 출고량 보고서 빌더 — 월별 출고량 차트·카테고리 요약·전체 목록 옵션 선택 후 생성 | `app/report/shipment/page.jsx` |
| `/report/menu-sales-compare` | 판매량 비교 보고서 빌더 — MoM/YoY/커스텀 두 기간 비교, 카테고리 그룹 순위 변동 포함 | `app/report/menu-sales-compare/page.jsx` |

### 메뉴 판매량

| 경로 | 설명 | 파일 |
|---|---|---|
| `/menu-sales` | 메뉴판매량 허브 — 이번 달 판매량·전월 대비 KPI 카드, 하위 메뉴(업로드·분석·미매칭·설정) 진입점 | `app/menu-sales/page.jsx` |
| `/menu-sales/upload` | 판매량 업로드 — 드래그 앤 드롭 파일 업로드, 파싱 미리보기·확인·취소, 업로드 이력 관리 | `app/menu-sales/upload/page.jsx` |
| `/menu-sales/rank-compare` | 판매량 분석 — 단일 월 순위표와 두 기간 비교(카테고리별 순위 변동·증감) 통합 뷰 | `app/menu-sales/rank-compare/page.jsx` |
| `/menu-sales/unmatched` | 미매칭 이슈 — 업로드 데이터 중 메뉴 마스터 미연결 항목 목록·상태 필터(미처리/해결)·재분류 처리 | `app/menu-sales/unmatched/page.jsx` |
| `/menu-sales/settings` | 판매량 설정 — 카테고리 분류 규칙·별칭 관리·품목 제외 세 탭으로 구성 | `app/menu-sales/settings/page.jsx` |

### 제때 (식자재 발주)

| 경로 | 설명 | 파일 |
|---|---|---|
| `/jette` | 제때(식자재 발주 플랫폼) 허브 — 최신 단가 반영일·단가 인상/인하 건수 KPI, 출고량·단가비교·설정 진입점 | `app/jette/page.jsx` |
| `/jette/shipment` | 출고량 관리 — 월별 출고 데이터 업로드, 요약 카드·상세 테이블·업로드 이력 | `app/jette/shipment/page.jsx` |
| `/jette/price-compare` | 단가 비교 — 최신 단가 현황·파일 간 가격 비교·업로드 이력 세 탭, 인상/인하 차이 테이블 | `app/jette/price-compare/page.jsx` |
| `/jette/settings` | 제때 설정 — 관리 품목 시드 초기화, 단가 알림 임계값 등 제때 전용 설정 | `app/jette/settings/page.jsx` |

### 식자재

| 경로 | 설명 | 파일 |
|---|---|---|
| `/ingredient` | 식자재 허브 — 식자재 관리·사용량 분석 진입점, 대시보드 KPI 표시 | `app/ingredient/page.jsx` |
| `/ingredient/manage` | 식자재 관리 — 기본정보·단가·원산지·알레르기 탭별 관리, 공급업체 뷰, 이슈 패널, 일괄 선택, 제때 연동 이슈 | `app/ingredient/manage/page.jsx` |
| `/ingredient/usage` | 사용량 분석 — 레시피별 식자재 사용 현황 대시보드, CSV 내보내기 | `app/ingredient/usage/page.jsx` |

### 영양성분

| 경로 | 설명 | 파일 |
|---|---|---|
| `/nutrition` | 영양성분 허브 — 메뉴 영양성분·알레르기·원산지·표 출력 진입점, KPI 카드 | `app/nutrition/page.jsx` |
| `/nutrition/menu` | 메뉴 영양성분 — 메뉴별 열량·단백질 등 영양성분 입력/편집, 중복·마스터 불일치 진단 | `app/nutrition/menu/page.jsx` |
| `/nutrition/allergen` | 알레르기 정보 — 식자재 allergens 필드 자동 집계, 식자재별 뷰·메뉴×22종 매트릭스 뷰, 메뉴 순서 재정렬 | `app/nutrition/allergen/page.jsx` |
| `/nutrition/origin` | 원산지 정보 — 레시피 기반 메뉴별 원산지 자동 집계, 식자재별/메뉴별 뷰, CSV 내보내기 | `app/nutrition/origin/page.jsx` |
| `/nutrition/export` | 표 출력 — 원산지 표시판·영양성분표 두 탭, 인쇄 및 엑셀 다운로드 | `app/nutrition/export/page.jsx` |

### 설정

| 경로 | 설명 | 파일 |
|---|---|---|
| `/settings/brands` | 브랜드 마스터 — 브랜드 추가/수정/숨김, 활성 브랜드 전환, 브랜드별 DB 백업·복원(관리자 전용) | `app/settings/brands/page.jsx` |
| `/settings/account` | 계정 설정 — 프로필 편집·핀 설정·비밀번호 변경·세션 정보, 멤버 관리·권한 매트릭스(관리자) | `app/settings/account/page.jsx` |
| `/settings/backup` | 데이터 백업 — 모듈 범위 선택 후 JSON 백업 파일 다운로드, 백업 이력·핀 고정 | `app/settings/backup/page.jsx` |
| `/settings/restore` | 데이터 복원 — 백업 JSON 파일 업로드, 영향 스토어 미리보기·충돌 경고 후 복원 실행 | `app/settings/restore/page.jsx` |
| `/settings/system` | 시스템 설정 — DB 버전·스토어별 레코드 수·스토리지 사용량 확인, 테마·각종 알림 토글, 스토어 초기화·DB 삭제(위험) | `app/settings/system/page.jsx` |

### 노트

| 경로 | 설명 | 파일 |
|---|---|---|
| `/note` | 노트 목록 — 전체 R&D 노트 리스트, 카테고리·상태 필터, 프리셋 바, 통계 요약, 새 노트 작성 진입 | `app/note/page.jsx` |
| `/note/write` | 노트 작성 — 새 노트 폼(제목·날짜·카테고리·내용), Cmd+S 저장, 임시저장 복원, 홈 빠른 메모 연동 | `app/note/write/page.jsx` |
| `/note/[id]` | 노트 상세/편집 — 기존 노트 수정·복제·인쇄, 체인 타임라인, 연관 시제품 패널, 임시저장 배너 | `app/note/[id]/page.jsx` |
| `/note/calendar` | 캘린더 — 노트·일정·작업일지를 월 달력에 표시, 오늘 체크리스트, 일정 추가/수정/삭제, 월 인쇄 | `app/note/calendar/page.jsx` |
| `/note/board` | 칸반 보드 — 노트를 상태별(대기·진행·완료 등) 컬럼으로 표시, 드래그 앤 드롭 상태 변경 | `app/note/board/page.jsx` |
| `/note/journal` | 작업 일지 — 날짜별 노트 카드 웹 저널 뷰, 해당 날짜 노트 필터링, 인쇄 | `app/note/journal/page.jsx` |
| `/note/sample` | 시제품 목록 — 시제품 레코드 리스트·캘린더 뷰, 기간·평점 필터, 비교 바, CSV 내보내기 | `app/note/sample/page.jsx` |
| `/note/sample/write` | 시제품 작성 — 새 시제품 폼(메뉴명·날짜·평점·태그·사진), 노트에서 정보 연동, Cmd+S 저장 | `app/note/sample/write/page.jsx` |
| `/note/sample/[id]` | 시제품 상세/편집 — 기존 시제품 수정·평점·태그, CSV/인쇄 내보내기, 텍스트 복사 | `app/note/sample/[id]/page.jsx` |

### 레거시 리다이렉트 (15개)

| 구 경로 | 신 경로 |
|---|---|
| `/cost/manage` | `/cost/recipe` |
| `/cost/recipe-master` | `/menu-master` |
| `/cost/pizza, /cost/personal, /cost/side, /cost/set` | `/cost/margin` |
| `/cost/edge-dough` | `/cost/recipe?tab=edges` |
| `/cost/ingredient-price` | `/ingredient/manage?view=price` |
| `/menu-sales/rank` | `/menu-sales/rank-compare` |
| `/menu-sales/compare` | `/menu-sales/rank-compare` |
| `/ingredient/list` | `/ingredient/manage` |
| `/settings` | `/settings/brands` |

---

## 3. IndexedDB 스키마

DB 버전 23, 총 43개 store. 멀티브랜드 구조는 7번가(main) = 'rnd_manager_v3', 그 외 = 'rnd_manager_v3__<brandId>'로 완전 분리. 노트 패밀리(menu_dev_notes 등 4개)는 예외적으로 main DB에 공유 저장.

### 스토어 목록 (DB 버전 23, 총 43개)

**공통 / 인프라 (3개)**

settings(keyPath:key, 레거시/호환 예약), upload_log(autoIncrement, idx:fileHash·module·module_fileHash·linkedFileId), migration_flags(keyPath:flag). settings는 실제 설정 저장소가 아닌 구버전 백업 호환용이며, 실설정은 localStorage(SETTING_LS_KEYS) 사용.

**메뉴 마스터 (2개)**

menu_master(idx:menuCode unique·category·status·displayOrder) — 전 모듈 공용 menuCode 기준 단일 진실. menu_recipes(idx:menuCode unique·displayGroupKey·category·kind·updatedAt) — v22에서 cost_pizza/personal/side/set_detail 5개 레거시 store 대체.

**Sales 그룹 — 메뉴 판매량 (9개)**

sales_files(idx:year_month), sales_rows(idx:fileId·category·normalizedMenuName·year_month·category_normalizedMenuName·status), sales_rules(idx:rawMenuName·enable), menu_sales_issues(idx:fileId·issueType·status·year_month), ref_sales_categories(idx:categoryName unique·displayOrder·enabled), ref_sales_aliases(idx:rawName·enable), ref_excluded(idx:menuName), ref_discontinued(idx:menuName), ref_event_menus(idx:menuName).

**Price 그룹 — 제때 상품 가격 (2개)**

price_files(idx:updateDate unique), price_rows(idx:fileId·updateDate·productCode·fileId_productCode 복합).

**Shipment 그룹 — 제때 출고량 (4개)**

shipment_files(인덱스 없음), shipment_rows(idx:fileId·productCode·year_month), ref_shipment_products(idx:productCode unique·enable), ref_shipment_rules(idx:rawName·mappedCode·enable).

**Cost 그룹 — 원가계산 (9개, menu_recipes 포함 시 10개)**

cost_ingredients(idx:productCode·ingredientName), cost_selling_prices(idx:menuCode·menuName·size, v9에서 menuCode 인덱스 마이그레이션 추가), cost_edge_dough(idx:edgeType·size), cost_upload_log(idx:uploadType·uploadedAt), cost_recipe_groups(idx:name), cost_suppliers(v12, idx:name), cost_margin_snapshots(v12, idx:capturedAt), cost_ingredient_price_history(v13, idx:ingredientId·changedAt), cost_platform_fees(v13, keyPath:id 싱글톤 'config').

**Note 그룹 — 개발노트·샘플·일정·작업일지 (4개, main DB 공유)**

menu_dev_notes(idx:status·category·createdAt·parentId v11·brand v15), sample_records(idx:category·menuName·testDate·createdAt), work_log(idx:date·type·at), note_schedules(v10, idx:date·type·createdAt). SHARED_STORE_NAMES에 포함되어 비-main 브랜드에서도 항상 main DB('rnd_manager_v3')를 사용.

**Nutrition 그룹 — 영양성분·원산지·알레르기 (8개)**

nutrition_menu_ref(idx:menuCode·category·displayOrder), nutrition_raw_values(idx:menuCode·crustType·menu_crust 복합), nutrition_pizza_composition(idx:menuCode·baseMenuCode), nutrition_origin_master(idx:ingredientName·category·displayOrder), nutrition_allergy_master(idx:allergenCode·displayOrder), nutrition_topping_master(idx:toppingCode·displayOrder), nutrition_edge_master(idx:edgeCode·displayOrder), nutrition_set_composition(idx:setCode·kind). v20에서 nutrition_allergy_links 삭제(알레르기 데이터는 cost_ingredients.allergens으로 이전), v23에서 nutrition_ingredient_values 삭제.

**Report + Account (2개)**

generated_reports(idx:kind·createdAt·fav), ref_accounts(idx:role). 두 store 모두 COMMON_STORES에 포함되어 선택 백업 시 항상 포함됨.

**멀티브랜드 DB 분리 구조**

dbNameFor(brandId): main → 'rnd_manager_v3', 기타 → 'rnd_manager_v3__<brandId>'. initDB()는 getActiveBrandId()로 활성 브랜드 DB를 열고 이름별 Map으로 캐싱(싱글톤). 다른 탭의 버전 업그레이드 시 db.onversionchange로 자동 close + 캐시 무효화 + 'db:version-changed' 이벤트 디스패치.

---

## 4. 상태 관리 및 훅 패턴

총 59개 커스텀 훅(4,455줄). 핵심 패턴은 useDBLoad(IndexedDB 비동기 로드 + cancelled 가드 + reload), useLocalStorage(SSR 하이드레이션 안전 3단계 패턴), 전역 Toast(모듈-레벨 싱글턴 setToasts 레퍼런스). 컨텍스트 없이 CustomEvent + localStorage + window.addEventListener 조합으로 브랜드·설정·역할 상태를 전파.

### `hooks/ 디렉터리 전체 현황`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/hooks/`

총 59개 파일(58 .js + 1 .jsx), 4,480줄. 도메인별로 DB로드·로컬스토리지·브랜드·노트·리포트·홈대시보드·UI(배치·페이지네이션·스크롤·단축키·모달) 등으로 분류됨.

### `useDBLoad — IndexedDB 데이터 로드 패턴`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/hooks/useDBLoad.js`

fetchFn + options(initialData, deps, enabled, onError, mapErrorMessage, keepDataOnReload) 를 받아 { data, loading, error, errorMessage, reload } 반환. 내부에서 initDB() → fetchFn() 순으로 실행, cancelled 플래그로 언마운트 race condition 방지, reload()는 tick 카운터 증가 방식. keepDataOnReload=true가 기본값(로딩 중에도 기존 데이터 유지). 정의 파일 포함 25개 파일(소비 기준 24개): app 페이지 18곳 + app 내부 hook/controller 3곳 + hooks 1곳 + components 2곳.

### `useLocalStorage — SSR 안전 영속 상태`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/hooks/useLocalStorage.js`

3단계 패턴: ① SSR/초기렌더는 항상 initialValue ② 마운트 후 1회 getItem→JSON 파싱(실패 시 raw string fallback) ③ 값 변경 시 JSON.stringify로 저장(첫 마운트 저장 스킵 isFirstSave ref). normalize 함수로 타입 교정 지원, hydrated boolean 반환. useSearchHistory·useNotePresets·useNotePins에서 내부 소비.

### `useDebounce — 검색 입력 디바운싱`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/hooks/useDebounce.js`

단순 value + delay(기본 200ms) → debouncedValue 패턴. normalizeDelay로 비정상 값 방어. useReportListState 포함 app/ 내 총 8곳(훅 1 + 페이지 6)에서 사용.

### `useModuleScopes — 백업/복원 모듈 선택`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/hooks/useModuleScopes.js`

MODULE_KEYS(lib/db)의 모든 키를 boolean 맵으로 관리. toggleScope(key)/setAllScopes(value) 제공. isKnownModuleScope 가드로 미등록 key 방어. 백업·복원 페이지에서 공통 사용.

### `useIsMainBrand — 7번가 전용 기능 가드`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/hooks/useIsMainBrand.js`

SSR 첫 렌더는 true(main 기준), 마운트 후 getActiveBrandId()==='main' 비교로 교정. 하이드레이션 불일치 방지. 마스터 시드 버튼 등 7번가 전용 UI 조건부 렌더에 사용.

### `useAppBrands — 전역 브랜드 상태 + 테마 accent`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/hooks/useAppBrands.js`

SSR 상수 → 마운트 후 localStorage 교정 패턴. BRAND_MASTER_EVENT 커스텀 이벤트 + window storage 이벤트 구독으로 탭 간 브랜드 동기화. applyBrandAccent: 7번가(main)는 globals.css 레드 테마 유지, 비-main은 CSS custom properties(--accent, --accent-press, --accent-soft, --accent-text)를 color-mix(oklab) 기반으로 다크/라이트별 계산. MutationObserver로 data-theme 변경 시 re-apply. AppShell에서 마운트 1회 호출.

### `usePagination — 클라이언트 페이지네이션`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/hooks/usePagination.js`

items 배열 + pageSize(기본 50) → { page, goTo, totalPages, paged, total }. items 변경(필터 등) 시 page가 유효 범위로 자동 클램프. paged는 useMemo로 파생. normalizePageTarget으로 비정상 입력 방어.

### `Toast — 전역 알림 (Context 없음)`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/components/Toast.jsx`

모듈 레벨 _setToasts 싱글턴 레퍼런스 방식. ToastContainer 마운트 시 setToasts를 모듈 변수에 등록, unmount 시 null 초기화. showToast(msg, type, duration, action) 함수로 어디서나 임포트 호출. ok/error/info/warn 4종, 최대 3개 스택(초과 시 오래된 순 제거), dismiss 애니메이션 220ms, action 버튼 지원.

### `테마(다크/라이트) 상태 관리`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/components/TopBar.jsx`

lib/settings의 getSetting/setSetting으로 localStorage 저장. document.documentElement[data-theme] attribute로 적용. MutationObserver로 변경 감지(TopBar, useAppBrands). useSettingValue 훅으로 SETTING_CHANGED_EVENT + storage 이벤트 구독하여 동기화. 키보드 단축키 'd'로 토글 가능(useKeyboardShortcuts).

### `useSettingValue — 설정값 반응형 구독`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/hooks/useSettingValue.js`

getSetting(key)를 초기값으로, SETTING_CHANGED_EVENT 커스텀 이벤트 + storage 이벤트 양쪽 구독. 같은 탭 변경(CustomEvent)과 다른 탭 변경(StorageEvent) 모두 감지. 설정 UI 컴포넌트에서 반응형 갱신에 사용.

### `useVisibilityRefresh — 탭 포그라운드 복귀 시 reload`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/hooks/useVisibilityRefresh.js`

document.visibilitychange 이벤트에서 visibilityState==='visible' 시 콜백 실행. ref를 사용해 콜백 stale 방지. useIngredientPriceData, useHomeDashboardData에서 reload와 조합해 탭 복귀 시 자동 데이터 갱신.

### `useDBLoad 적용 현황`

소비 기준 24개 파일에서 사용. app/ 페이지 직접 사용 18곳(cost/margin, ingredient, menu-master, menu-sales, nutrition, report, settings/backup|restore|system 등), app 내부 hook/controller 3곳, hooks/ 위임 훅 1곳(useIngredientPriceData), components/ 2곳(SuppliersView, CommonManageView). useIngredientPriceData는 useDBLoad + useVisibilityRefresh를 조합한 파생 데이터 훅 패턴의 대표 사례.

### `useCurrentRole — 권한 상태 관리`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/hooks/useCurrentRole.js`

initDB() → getActiveRole() 순서로 비동기 로드. 기본값 'viewer'(safe-default), ready 플래그 제공. storage 이벤트 + rnd:account-changed 커스텀 이벤트 양쪽 구독. isAdmin/isViewer boolean 파생값 반환.

### `useWidgetConfig — 홈 대시보드 위젯 설정 영속화`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/hooks/useWidgetConfig.js`

localStorage 5개 키(visibility, collapsed, order, favorites, favOnly)를 단일 훅에서 관리. 마이그레이션 안전장치(stale key 정리 + 재저장). 함수형 setState 업데이트로 같은 tick 다중 호출 안전. toggleRow는 마지막 visible 행 삭제 차단(빈 대시보드 방지). effectiveOrder: 즐겨찾기 행 앞으로, 나머지는 widgetOrder 유지.

### `useKeyboardShortcuts — 앱 전역 키보드 단축키`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/hooks/useKeyboardShortcuts.js`

g+[h/n/c/r/s/i/u/b/j] 코드 시퀀스 네비게이션(800ms 타임아웃). Cmd/Ctrl+K 팔레트, ? 단축키 도움말, d 테마 토글, / 검색 포커스. INPUT/TEXTAREA/SELECT에서 plain key 단축키 비활성화. AppShell에서 마운트 1회 등록.

### `useVisualEffects — 버튼 ripple + 카드 tilt`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/hooks/useVisualEffects.js`

document.body 이벤트 위임 방식. .btn 클릭 ripple 스팬 동적 생성 + 500ms 후 제거. .card-lift 마우스무브 perspective(600px) rotateY/X 틸트. DOM 노드 속성 변경 없이 처리(Suspense 하이드레이션 경고 방지 목적).

### `useBatchSelection — 다중 선택 상태`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/hooks/useBatchSelection.js`

batchMode boolean + selected Set 상태. startBatch/exitBatch/toggleSelect/clearSelection 모두 useCallback 메모이제이션. 노트·샘플 등 리스트 페이지 배치 삭제/이동에 사용.

### `useMounted / useScrollMemory / useDraftRestore — 유틸리티 훅`

useMounted: mountedRef.current=true/false 패턴 추상화. useScrollMemory: sessionStorage 'scroll:{key}' 키로 #main-content 스크롤 위치 복원+저장. useDraftRestore: localStorage에서 임시저장 JSON 복원 후 apply 콜백 호출 + '이전 임시 저장본 복원' 토스트.

---

## 5. lib 도메인 로직

총 10개 핵심 도메인: 원가/마진(cost), 레시피(recipe), 영양성분(nutrition), 리포트(report), 출력(print), 백업(backup), 식자재(ingredient), 메뉴마스터(menu-master), 판매량(sales), 백업이력(backup-history). 각 도메인은 store/calc/build 패턴으로 구성.

### 원가 계산 (lib/cost/)
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/cost/`

calcUnitPrice(price, baseQty) — 단위가격 계산. resolveCompositePrice(compositeOf, priceLookup) — 복합 재료 가격 해소. shared/calc: componentSubtotal, simpleTotalCost, recipeIssues. shared/effective-cost: componentEffectiveUnitPrice, effectiveComponentsCost(components, unitPriceMap). shared/buildSummaryRows: buildRows(menuPrices, detailMaps, unitPriceMap). margin/build-rows: buildDetailRows, buildEdgeMetadata, buildDerivedRows. margin/calc: applyDiscount, calcNetRevenue, calcPlatformMargin. margin/platforms: loadPlatforms, savePlatforms, hydratePlatformsFromDB, normalizePlatforms. margin/snapshots: getAllSnapshots, saveSnapshot, deleteSnapshot. menu-price: getAllMenuPrices, generateMenuCode, parseMenuPriceRows, replaceAllMenuPrices. ingredient-price/buildRows: buildIngredientPriceRows. bulk-price-update, sync-base-quantity, recipe-source-precedence, unit-policy 포함.

### 레시피 계산 (lib/recipe/)
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/recipe/`

index.js: buildUnitPriceMap(allMeta, priceRowMap), calcRecipeCost(recipe, unitPriceMap, sizeLabel), calcCostBySizes(recipe, unitPriceMap), calcMarginRate(cost, sellingPrice). calc-costs.js: calcGroupCostBySizes(allGroups, activeGroupIds, sizeLabels, unitPriceMap), calcIngredientCostBySizes(ingredients, sizeLabels, unitPriceMap), calcTotalCostBySizes(ingredientCost, groupCost, sizeLabels). MENU_CATEGORIES 상수 정의.

### 영양성분 (lib/nutrition/)
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/nutrition/`

values/import: parseLabExcel(buf) — 실험실 엑셀 파싱, buildImportRows({rawRows, menuMasters}), toRawValueRecord. values/set-calc: getPizzaCalorieVariants(menu, rawMap, edgeMap). values/base-helpers: getCrustSize, getCrustPair, formatCalcValue. allergen/aggregate: buildMenuAllergenMap, buildEdgeAllergenMap, buildToppingAllergenMap, allergenNames(codeSet). allergen/matrix: buildMenuMatrix, buildDetailRows, edgeTypeForCrust, logicalMenuKey. allergen/rules: applyEdgeAllergenRules, EDGE_ALLERGEN_RULES. label/build.js: buildPizzaSheet, buildPizzaSliceSheet, buildToppingSheet, buildSideSheet, buildSetHalfSheet, buildBeverageSheet. label/export: exportNutritionLabelToExcel. label/_utils: addNutrition, calcSetMinMax, calcHalfMinMax, roundLabelValue, scaleVal(per100, grams).

### 리포트 빌더 (lib/report/)
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/report/`

build-price-report: buildPriceReportData(baseRows, latestRows, threshold). build-sales-report: buildSalesStats(normRows, {year, month, scope}), CAT_COLORS. build-shipment-report: buildShipmentMonthMap(files), buildShipmentTrendSeries. print.js: makeReportPrintTitle, printReportElements, printReportElement. index.js: getReports, saveReport, toggleReportFav, deleteReport, pruneOldReports(keepDays). report-list-utils: exportReportListToExcel, formatReportId, formatReportDate. strict-posting: collectStrictPostingIssues, buildStrictPostingMessage. constants: KIND_META, KIND_CHIP, KIND_COLOR — 리포트 종류 메타.

### 출력 (lib/print/ + lib/nutrition/label/print.js)
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/print/window-print.js`

lib/print/window-print.js: buildAutoPrintScript({waitForImages, closeAfterPrint}), openPrintWindow(html, {width, height}). lib/nutrition/window-print.js: 영양성분 전용 프린트 유틸. lib/ingredient/manage-print: buildIngredientManagePrintHtml, printIngredientManageReport, buildIngredientManageTableRows, buildIngredientManagePrintMeta. 사진 카드 출력: buildIngredientPhotoCard, buildIngredientPhotoCardPages. lib/cost/usage-print.js: 원가 사용 현황 출력.

### 백업 (lib/backup/ + lib/backup-history.js)
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/backup/`

backup/validation.js: validateBackupPayload(data), summarizeBackupStores(stores), CURRENT_BACKUP_VERSION='v3', failedBackupStoresOf, invalidStoreRowsOf. backup/brand-source.js: buildBackupSourceMetadata(brandId), isBackupSourceMismatch(backup, targetBrandId). backup/restore-impact.js: buildRestoreImpact(stores, currentStats, selectedStores), pickRestoreStores. backup/local-storage-keys.js: PERSISTENT_LS_KEYS, LOCAL_STORAGE_KEYS_BY_SCOPE, persistentLocalStorageKeysForScopes(scopes). backup-history.js: getHistory, addEntry, togglePin(id), getLastBackupAt, getBackupReminder(thresholdDays=14), normalizeHistoryEntry.

### 식자재 (lib/ingredient/)
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/ingredient/`

store.js: getAllIngredients, getIngredientMetaMap, addIngredient, updateIngredient, upsertIngredientMeta, excludeIngredientByCode, validateCompositeRefs, buildIngredientProductCodeDuplicateDiagnostics, mergeDuplicateIngredientRecord(내부). manage-print/table-report: buildIngredientManagePrintHtml, printIngredientManageReport. manage-print/formatters: priceLabel, originLabel, allergensLabel, filterLabel, scopeBadgeHtml. manage-print/photo-report: buildIngredientPhotoCard, buildIngredientPhotoCardPages. dashboard.js: getIngredientDashboard. jette-price-import.js, master-import-seed.js 포함.

### 메뉴마스터 (lib/menu-master/)
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/menu-master/`

store.js: getAllMenuMaster, getMenuMasterMap, getMenuNameToCodeMap, upsertMenuMaster(data), deleteMenuMaster(id), getMenuDeletePlan(id), resetAllMenuMaster. recipe-summary.js: summarizeMenuRecipe(menu, recipe, unitPriceMap), buildMenuRecipeSummary, buildMenuRecipeSummaryMap, loadLatestUnitPriceMap, loadMenuRecipeSummaryMap, MENU_RECIPE_SUMMARY_STATUS. code-policy.js: MENU_CODE_MODE, MENU_CODE_POLICY_BY_MODULE, normalizeMenuCodeForModule, getMenuCodeBase, stripMenuCodeSizeSuffix. normalize.js: stripPersonalSuffix, normalizePersonalPizzaCodes. recipe-issues.js: ISSUE_KINDS 정의.

### 판매량 (lib/sales/)
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/sales/`

index.js 통합 재수출. classify.js: classifyAndPrepare(validRows, year, month, classifier). reclassify.js: reclassifyAllFiles({onProgress}) — 전체 파일 재분류. ranking.js: buildGroupRanking(rows, period), extractSize(detailName, groupName). compare.js: buildPeriodCompare, deriveCompareB. resolve.js: resolveUnmatchedIssue, bulkExcludeIssues, bulkResolveRule. classifier-db.js: buildClassifierFromDB. export-xlsx.js: exportSingleMonthXlsx, exportCompareXlsx. suggest.js: suggestRulesByMenuName. store-files.js: getFiles, addFile, deleteFile, replaceFile. rules-pizza/side/set: 카테고리별 분류 규칙. parse.js: validateSalesFile. classify-rules, alias, ms9-rules, extra-rules 포함.

### 기타 공통 모듈 (lib/ 루트)
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/`

active-brand.js: 현재 활성 브랜드 관리. brand-master.js: 브랜드 마스터 CRUD. excel.js: 엑셀 공통 유틸. format.js: 숫자/날짜 포맷터. normalize.js: 공통 정규화. parse.js: 공통 파싱. download.js: 파일 다운로드. settings.js: 앱 설정. session.js: 세션 관리. work-log.js: 작업 로그. palette-recent.js: 최근 색상. auth/, db/, date/, home/, image/, jette/, navigation/, note/, price/, sample/, shipment/, stats/, ui/ 서브도메인 폴더 포함.

---

## 6. 공통 컴포넌트 및 UI 시스템

ui/ 폴더에 22개 공통 컴포넌트, icons.jsx에 자체 SVG 아이콘 33개, CSS custom properties 기반 라이트/다크 테마(tokens.css), TopBar는 4개 서브컴포넌트로 분리, ModalFrame은 createPortal+포커스트랩 완비

### `components/ui/ — 공통 UI 컴포넌트 목록`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/components/ui/`

22개 파일: Chip, ComboBox, ConfirmDialog, EmptyState, InlineConfirmButtons, MasterSourceBadge, MenuCodePicker, ModalFrame, PageHeader(+FilterBar), Pagination, ReorderModal, ScrollToTop, SearchBox, SectionDashboard, SectionHubPage, SettingTile, Skeleton(+파생 6종), SmallStatCard, SortButton, SortableTh, TagInput, Toggle, UploadDropzone. menu-code-picker/ 하위 폴더도 존재

### `components/icons.jsx — 자체 SVG 아이콘 시스템`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/components/icons.jsx`

33개 아이콘: home, chart, box, calc, doc, note, gear, search, bell, chevDown/Right/Left, plus, arrowUp/Down, upload, download, pizza, beaker, tag, alert, check, more, edit, trash, close, x, copy, moon, sun, star, starFill. stroke 1.6px, currentColor 기반, 라이브러리 의존 없이 자체 SVG 객체(Icon.*)로 제공

### `components/Toast.jsx — 토스트 알림`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/components/Toast.jsx`

전역 싱글턴 패턴(_setToasts 모듈 변수). showToast(msg, type, duration, action) API. 타입: ok/error/info/warn. 최대 3개 스택, 기본 2800ms, 220ms exit 애니메이션. 각 타입별 인라인 SVG 아이콘, 액션 버튼 및 수동 닫기 지원

### `app/styles/tokens.css — CSS 디자인 토큰`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/app/styles/tokens.css`

:root에 라이트 토큰(--bg, --surface~4, --text-1~4, --border, --accent #e1101f, --positive, --negative, --warn, --shadow-sm/md/lg, --radius-sm~xl, --gap, --pad-card, 카테고리 칩 8색 사이클). [data-theme='dark']로 다크모드 오버라이드. [data-density='compact'], html[data-font-scale='large/xlarge'] 반응형 스케일 지원

### `app/globals.css — CSS 임포트 허브`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/app/globals.css`

tokens.css + base + layout + overlay + palette + chrome + features(ingredient/cost/note/nutrition/settings/report 3종) + motion 4종 + home 관련 2종 등 총 22개 CSS 파일을 @import로 조합. 직접 스타일 없이 임포트 진입점 역할

### `components/TopBar.jsx + components/topbar/ — 상단바`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/components/TopBar.jsx`

TopBar는 4개 서브컴포넌트로 분리: CompanyPicker(브랜드 전환), ThemeToggle(다크/라이트), NotificationPopover(미매칭·보고예정 알림), ProfileMenu. 스크롤 시 .scrolled 클래스 추가, useOutsideClick으로 팝오버 외부 클릭 닫기, ⌘K 검색 버튼 포함

### `components/AppShell.jsx — 앱 전체 레이아웃`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/components/AppShell.jsx`

Sidebar + TopBar + ErrorBoundary(pathname 기반 key) + ToastContainer + ProgressBar + OfflineIndicator + DbVersionNotice + CommandPalette(dynamic) + ShortcutsHelp(dynamic) + 모바일 bottom-tab-bar 조합. useAppBrands(브랜드), usePageStats(미매칭/보고예정 카운트), useKeyboardShortcuts, useVisualEffects 훅 통합. 초기화: applyAllSettings, ensureSession, pruneOldWorkLogs, hydratePlatformsFromDB

### `components/ui/ModalFrame.jsx — 공통 모달`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/components/ui/ModalFrame.jsx`

createPortal로 document.body에 렌더링. useModalShell 훅이 포커스 트랩/복원, Esc, origin·exit 애니메이션 담당. props: title(string|ReactNode), subtitle, onClose, width(기본 min(860px,96vw)), zIndex(200), padding, maxHeight(92vh). role=dialog + aria-modal + aria-labelledby 접근성 완비

### `components/ui/ConfirmDialog.jsx — 확인 다이얼로그`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/components/ui/ConfirmDialog.jsx`

open prop으로 조건부 렌더링(null 반환). danger prop으로 --negative 색상 적용. useModalShell(autoFocus:false)로 포커스 트랩·Esc 처리, 확인 버튼에 네이티브 autoFocus 보존. zIndex 600(ModalFrame 200보다 높음)

### `components/ui/Skeleton.jsx — 로딩 스켈레톤`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/components/ui/Skeleton.jsx`

기본 Skeleton + 도메인별 파생 컴포넌트: NoteCardSkeleton, NoteDetailSkeleton, SampleCardSkeleton, SkeletonTableRows(rows/cols 가변), IngredientPriceSkeleton, IngredientListSkeleton. 모두 --border/--surface 토큰 기반 shimmer 애니메이션

### `components/CommandPalette.jsx — 통합 커맨드 팔레트`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/components/CommandPalette.jsx`

⌘K 단축키로 열림. usePaletteItems 훅으로 전체 메뉴/재료/보고서 항목 수집, useDebounce(150ms) 퍼지 검색. 최근 항목 저장(getRecentPaletteItems/saveRecentPaletteItem). dynamic import로 AppShell에서 지연 로딩

### `컴포넌트 설계 패턴`
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/components/ui/`

모든 공통 UI 컴포넌트가 normalize*/get*Style 순수함수를 /lib/ui/<name>.js에 분리(로직·스타일 계산 함수). 컴포넌트는 JSX만 담당. lib/ui/prop-guards.ts에서 noop/asDisplayText/asObjectArray 등 공통 방어 함수 제공. 다크모드는 CSS 토큰 오버라이드만으로 처리(JS 없음)

---

## 7. 멀티브랜드 및 설정 시스템

브랜드 3종(7번가피자·차이나X4·이천밥쌤), 각 브랜드별 완전히 분리된 IndexedDB 인스턴스(main은 rnd_manager_v3, 非main은 rnd_manager_v3__&lt;brandId&gt;), 노트 패밀리만 main DB 공유. 인증은 SHA-256 쿠키 게이트 + 로컬 계정 2역할(admin/viewer) 이중 구조.

### lib/active-brand.js — 브랜드 전환 로직
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/active-brand.js`

활성 브랜드 id를 localStorage('v3:active-brand')에 단일 값으로 저장. getActiveBrandId()는 잘못된 값이면 'main' 반환. setActiveBrandId() 호출 측에서 window.location.reload()로 전파(전파 복잡성 제거 설계). getActiveBrand()는 id→brand-master에서 메타 객체 반환.

### lib/brand-master.js — 브랜드 마스터 데이터
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/brand-master.js`

브랜드 목록을 localStorage('v3:brand-master', JSON {version:1, brands:[]})에 저장. defaultBrands()는 lib/companies.js(3개 상수)로 초기화. normalizeBrands()가 항상 main 브랜드 포함·isDefault 단일화를 보장. upsertBrand/setBrandHidden/setDefaultBrandId 변경 시 BRAND_MASTER_EVENT CustomEvent 발행. main 브랜드는 hidden 불가·삭제 불가 방어 코드 존재.

### lib/companies.js — 브랜드 상수
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/companies.js`

3개 브랜드 정의: main(7번가피자, #E1101F 레드), china4(차이나X4, #7C3AED 바이올렛), icheon(이천밥쌤, #1D766F 틸). 각 브랜드별 로고 이미지 경로, sub 문자열 포함.

### lib/db/init.js — 멀티브랜드 DB 초기화
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/db/init.js`

openNamed(name)이 이름별로 IDBDatabase 핸들을 Map에 캐싱(싱글톤/이름). initDB()는 dbNameFor(getActiveBrandId())를 호출해 활성 브랜드 DB를 열고, _getDB()는 동기 핸들 반환. db.onversionchange 시 자동 close + 캐시 무효화.

### lib/db/constants.js — DB 격리 방식
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/db/constants.js`

dbNameFor(brandId): main → 'rnd_manager_v3'(하위호환), 非main → 'rnd_manager_v3__<brandId>'. ALL_STORES에 43개 store 정의(DB_VERSION=23). 비-main 브랜드는 처음 접근 시 빈 DB로 자동 생성됨.

### lib/db/shared.js — 노트 패밀리 공유 DB
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/db/shared.js`

menu_dev_notes, sample_records, note_schedules, work_log 4개 store는 브랜드 무관하게 항상 main DB('rnd_manager_v3')에 저장. sharedGetAll/sharedPut 등 operations.js와 동일 시그니처를 제공하되 내부적으로 openNamed(MAIN) 사용.

### lib/db/module-stores.js — 모듈 그룹 매핑
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/db/module-stores.js`

MODULE_GROUPS: sales/jette/cost/notes/nutrition 5개 모듈에 store를 분류. SHARED_STORE_NAMES는 notes 모듈 store(항상 main DB). COMMON_STORES(upload_log, menu_master, ref_accounts 등)는 선택 백업에 항상 포함. storesForScopes()로 범위별 store 집합 반환.

### lib/auth.js — 인증 구조
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/auth.js`

서버 없는 로컬 환경 전용. 비밀번호는 SHA-256 해시(HTTPS는 crypto.subtle, LAN HTTP는 순수 JS 폴백)로 localStorage('v3:auth-hash')에 저장. 인증 세션은 쿠키('v3:auth', SameSite=Strict). remember 옵션 시 30일, 기본은 세션 쿠키. clearAuthCookie()로 로그아웃.

### middleware.ts — 라우트 보호
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/middleware.ts`

쿠키 'v3:auth' 미존재 시 /login으로 리디렉트. 이미 인증된 사용자가 /login 접근 시 / 로 리디렉트. PUBLIC_PATHS: /login, /_next, /favicon.ico, /logo-*, /api/ 통과. matcher는 _next/static·image·favicon 제외 전체 경로.

### lib/auth/accounts.js — 로컬 계정 관리
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/lib/auth/accounts.js`

역할: 'admin'(관리자)·'viewer'(조회자) 2종. 계정은 ref_accounts store(브랜드별 분리 DB)에 저장. 활성 계정 id는 브랜드별 localStorage key('rnd_active_account_id:<brandId>')로 관리. getActiveRole()은 DB가 비어있으면 'admin' 폴백. seedDefaultAdminIfEmpty()로 첫 실행 시 기본 관리자 자동 생성.

### app/settings/brands/page.jsx — 브랜드 설정 화면
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/app/settings/brands/page.jsx`

isAdmin 아닌 경우 편집 불가(권한 가드). 브랜드 추가/수정 폼(id·name·sub·logo·color), 목록 테이블에서 수정·기본설정·전환·백업·복원·숨김 작업 가능. 전환 클릭 시 setActiveBrandId 후 window.location.reload(). 브랜드별 백업은 exportAllForBrand, 복원은 importAllToBrand 사용.

### app/settings/account/page.jsx — 계정/권한 설정
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/app/settings/account/page.jsx`

프로필 편집(이름·이메일·팀·역할), 비밀번호 변경, PIN 설정/해제, 세션 정보·IP 조회. 구성원 관리(계정 추가·삭제·전환)는 isAdmin만 표시. _AccountSettingsUI의 AccountPermissionsMatrix는 관리자/에디터/조회자/API 4역할 × 8권한 매트릭스를 정적 표로 렌더링.

### app/settings/system/page.jsx — 시스템 설정
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/app/settings/system/page.jsx`

환경(다크모드·화면밀도·글씨크기), 알림(미매칭·원가율35%초과), 원가계산정책(autoRecalc·strictPosting·roundMode), 지역/언어(read-only), 앱정보(현재 활성 브랜드 DB명 실시간 표시), 저장소 상태(store별 행 수·브라우저 용량), 위험영역(모든 데이터 초기화·DB 완전 재생성). 설정 값은 lib/settings.js의 localStorage SETTING_LS_KEYS가 source of truth.

---

## 8. 테스트 및 QA 현황

Jest 단위 테스트 265개 파일(lib 240, hooks 20, scripts 5), QA 명령 3종(qa:smoke 22라우트, qa:runtime 전라우트 65개, qa:prod 프로덕션빌드) + 문서 수치 검증(audit:docs). 커버리지 수집 비활성화, playwright 기반 브라우저 QA 분리 운용.

### Jest 단위 테스트 — lib
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/__tests__/lib/`

__tests__/lib/ 하위 237개 .test.mjs 파일. 유틸, 컴포넌트 구조, DB 가드, 정책 검증 등 도메인 전 영역 커버. jest.config.mjs: testEnvironment=node, transform={}, testMatch=**/__tests__/**/*.test.mjs

### Jest 단위 테스트 — hooks
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/__tests__/hooks/`

__tests__/hooks/ 하위 20개 .test.mjs 파일. use-db-load, use-pagination, use-modal-shell, use-keyboard-save, use-local-storage, use-visibility-refresh 등 커스텀 훅 전반 검증

### Jest 단위 테스트 — scripts
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/__tests__/scripts/`

__tests__/scripts/ 하위 4개 파일(clean-build-script, full-rt-script, qa-browser-utils, smoke-qa-utils). QA 스크립트 내부 유틸 로직 단위 검증

### 테스트 픽스처
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/__tests__/fixtures/business/`

__tests__/fixtures/business/ 하위 CSV 6종(cost-basis, menu-price-valid, price-missing-tax, price-valid, sales-missing-quantity, sales-valid). 엑셀/가격/판매 파싱 테스트에서 참조

### npm run test / test:ci
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/package.json`

test: jest --no-coverage (병렬), test:ci: jest --no-coverage --runInBand (직렬, CI용). 커버리지 수집은 --no-coverage로 비활성화. Node 24 실험적 vm-modules 플래그 사용

### qa:smoke (npm run qa:smoke)
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/scripts/smoke-qa.mjs`

scripts/smoke-qa.mjs — Playwright Chromium으로 22개 대표 라우트 순회(홈~설정/복원). 검사 항목: h1/main 존재, console.error 없음, 가로 스크롤 없음, 영구 로딩 없음. 읽기 전용, IndexedDB 빈 상태 통과 목표

### qa:runtime (npm run qa:runtime)
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/scripts/full-rt.mjs`

scripts/full-rt.mjs — route-classification.js 기반 전 라우트 런타임 회귀 검사. MAIN 53개 + CHINA4 8개 + CHINA4_DIRECT 4개 = 65개 라우트. JS pageerror, hydration 오류, HTTP 500, h1/main 검사. 비-main 브랜드 직접진입 공유DB 초기화 버그 검증 포함

### qa:prod (npm run qa:prod)
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/scripts/qa-prod.mjs`

scripts/qa-prod.mjs — next build 후 next start 기동, Playwright로 프로덕션 빌드 smoke 검사 자동화. .next 삭제 후 빌드-기동-QA 파이프라인 일괄 실행

### 커버리지 설정
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/jest.config.mjs`

jest.config.mjs에 collectCoverage, coverageThreshold 설정 없음. 모든 test 스크립트에 --no-coverage 명시. 커버리지 리포트 및 임계값 강제는 미도입 상태

### 독립 실행 스크립트 (test-allergen.mjs)
`/Users/lmh/Documents/Codex/7th-rnd-manager-v3/test-allergen.mjs`

프로젝트 루트의 test-allergen.mjs — Jest 밖의 독립 Playwright 스크립트. /nutrition/allergen 페이지 스탯 카드 수동 검증용. package.json scripts에 미등록, 일회성 디버깅 도구로 추정


---

_문서 생성: 2026-06-17, 7-에이전트 병렬 탐색_
