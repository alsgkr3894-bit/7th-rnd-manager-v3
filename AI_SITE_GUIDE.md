# 7번가 R&D 플랫폼 — AI용 사이트 안내서

> 작성: 2026-10-08 · 기준 커밋: `686aa53c` (master)
> 대상: 이 저장소를 처음 보는 AI/개발자. 이 문서 하나로 **무엇을 위한 사이트인지, 화면·기능·데이터·계산 규칙·작업 시 지켜야 할 것**을 파악할 수 있게 정리했다.
> 이 문서와 코드가 다르면 **코드가 기준**이다. 오래된 문서 목록은 맨 아래 [§14](#14-문서-지도--무엇이-최신인가) 참고.

---

## 목차

1. [한 줄 요약과 목적](#1-한-줄-요약과-목적)
2. [사용자·운영 환경](#2-사용자운영-환경)
3. [기술 스택과 폴더 구조](#3-기술-스택과-폴더-구조)
4. [데이터 저장·동기화 구조 (가장 중요)](#4-데이터-저장동기화-구조-가장-중요)
5. [인증·권한·브랜드](#5-인증권한브랜드)
6. [화면(라우트) 전체 지도](#6-화면라우트-전체-지도)
7. [모듈별 기능과 업무 규칙](#7-모듈별-기능과-업무-규칙)
8. [메뉴 코드·분류 체계](#8-메뉴-코드분류-체계)
9. [IndexedDB store 목록](#9-indexeddb-store-목록)
10. [출력(PDF·엑셀)](#10-출력pdf엑셀)
11. [의도된 데이터 특이사항 (버그 아님)](#11-의도된-데이터-특이사항-버그-아님)
12. [개발·검증 규칙 (작업 전 필독)](#12-개발검증-규칙-작업-전-필독)
13. [npm 스크립트](#13-npm-스크립트)
14. [문서 지도 — 무엇이 최신인가](#14-문서-지도--무엇이-최신인가)
15. [용어집](#15-용어집)

---

## 1. 한 줄 요약과 목적

**(주)태명에프앤티 R&D팀이 쓰는 사내 업무 플랫폼.** 피자 프랜차이즈 **7번가피자**(주력)와 **이천밥쌤·차이나X4**의 메뉴 개발·원가·영양성분·판매량·식자재 단가를 한곳에서 관리하고 보고서(PDF·엑셀)로 뽑는다.

핵심 목적:

| 목적 | 해결하는 일 |
|---|---|
| **메뉴 기준 정보 일원화** | 메뉴 마스터(코드·이름·사이즈·판매가·상태)를 원가·영양·판매량이 공통으로 참조 |
| **원가 계산** | 식자재 공급사 "제때"의 최신 단가 × 레시피 → 메뉴별 원가·원가율·플랫폼 수수료 반영 마진 |
| **영양성분·알레르기·원산지 표시** | 법정 표시물(영양성분표·원산지표시판·알레르기 21종)을 메뉴 데이터에서 자동 생성·출력 |
| **판매량 분석** | POS 월별 판매량 엑셀 업로드 → 메뉴 분류·순위·전월/전년 비교·보고서 |
| **연구 기록** | 메뉴개발노트(테스트 회차·평가), 연구일지(일일 보고), 샘플·제품이슈, 시장조사, 일정 달력 |
| **보고** | 판매량·원가·제때 단가·출고량 보고서를 PDF/엑셀로 생성·보관 |

화면 언어는 **한국어**, 사용자는 R&D 담당자(주임님)와 관리자다.

---

## 2. 사용자·운영 환경

- **운영 PC 1대**가 "정본"이다. 이 PC의 브라우저(`localhost:3000`)에서 입력한 데이터가 브라우저 IndexedDB에 저장되고, 같은 PC의 Postgres로 자동 미러링된다.
- **사내 LAN의 다른 PC**는 운영 PC 서버에 접속해 **읽기 전용(뷰어)**으로 본다(`/settings/sync` → "서버에서 불러오기").
- 운영 PC는 실제로 `next dev`(포트 3000)로 사이트를 띄운다(`npm run site:start`, `scripts/start-local-site.ps1`). Postgres는 저장소 안의 포터블 설치본(`.postgresql/`, 데이터 `.pgdata/`)을 쓴다.
- Postgres는 자동 pg_dump 백업(`.db-backups/*.dump`, 20시간마다·14개 보관)이 돈다.

---

## 3. 기술 스택과 폴더 구조

**스택** (`package.json`, 패키지명 `wonpay-rnd-platform`, `"type": "module"`)

- Next.js **15.5.26** App Router, React **19.3**
- Prisma **7.8** + `@prisma/adapter-pg` + Postgres (서버 미러)
- 브라우저 저장: **IndexedDB** (DB 이름 `rnd_manager_v3`, **버전 29, store 48개**)
- 엑셀: `xlsx`, `xlsx-js-style` · 드래그: `@dnd-kit`
- 테스트: Jest 29 (네이티브 ESM, `--experimental-vm-modules`) · QA: Playwright 스크립트
- 린트/포맷: ESLint 8 (`next/core-web-vitals`) · Prettier 3 (작은따옴표, 폭 100)
- PDF 라이브러리 **없음** — 모든 PDF는 브라우저 인쇄 대화상자(`window.print`)

**폴더**

```text
app/              App Router 화면(page.jsx 62개 = 실제 화면 + 레거시 리다이렉트), app/api/db/* 서버 API
app/styles/       전역 CSS (tokens/base/layout/components/features/*.css)
components/       재사용 React 컴포넌트 (components/ui = 공통 UI)
hooks/            화면 공통 훅 (useCurrentRole, useDBLoad, useBeforeUnload …)
lib/              도메인 로직·계산·파싱·출력 (순수 함수 위주)
lib/db/           IndexedDB 초기화·스키마·CRUD·서버 동기화·백업
lib/server/       서버 전용 (Prisma, LAN 요청 가드, store_rows 읽기/쓰기, 백업)
prisma/           schema.prisma, 마이그레이션, store 카탈로그, 백업/가져오기 스크립트
scripts/          개발 서버·샌드박스·QA·제때 다운로드·자동시작 스크립트
__tests__/        Jest 테스트 (lib 414개, hooks, scripts, audit)
docs/             기획·감사·작업 기록 문서 (대부분 시점 기록)
middleware.ts     로그인 쿠키 검사
```

설계 원칙: 페이지 파일은 화면 조립만, 반복 로직은 `hooks/`·`lib/`로. `lib/ui`는 React 없는 순수 함수. 도메인 정책이 강한 로직(원가·영양·식자재)은 도메인 폴더에 둔다.

---

## 4. 데이터 저장·동기화 구조 (가장 중요)

### 4-1. 브라우저가 1차 저장소 (client-first)

- 모든 화면은 **브라우저 IndexedDB**를 읽고 쓴다. 서버는 그 사본(미러)이다.
- 브랜드마다 DB가 따로 있다: `main` → `rnd_manager_v3`, 그 외 → `rnd_manager_v3__<brandId>` (`lib/db/constants.js` `dbNameFor`). 각 DB에 48개 store가 다 있다.
- **공유 store**(항상 main DB에, 서버에서도 `brandId='main'`): 노트 계열 `menu_dev_notes`, `sample_records`, `market_research`, `note_schedules`, `work_log` + RND `rnd_corporate_card_entries`, `rnd_login_credentials` (`lib/db/module-stores.js` `SHARED_STORE_NAMES`). 접근은 `lib/db/shared.js`.
- 설정값 대부분은 IndexedDB가 아니라 **localStorage** (`lib/settings.js`; `v3:active-brand`, `v3:server-sync-mode`, `v3:auth-hash` 등).

### 4-2. 서버(Postgres)

- 테이블 하나에 모든 store를 JSON으로 담는 범용 구조: **`store_rows`** (`brand_id`, `store_name`, `record_key`, `legacy_numeric_id`, `data` JSONB, `data_hash` …), 유일키 `(brand_id, store_name, record_key)`.
- `store_name`은 **`store_catalog`** 테이블을 외래키(RESTRICT)로 참조한다 → **새 store를 만들면 반드시 카탈로그 등록**(§12).
- API (`app/api/db/*`, 모두 `assertLocalRequest` — loopback 또는 `RND_ALLOW_LAN=1`일 때 사설망만 허용. **인증이 아니라 출처 제한**):
  - `GET /api/db/health` — DB 상태·행 수
  - `GET/POST /api/db/backups` — pg_dump 백업 목록/생성
  - `GET /api/db/store-rows` — `?manifest=1`(store별 행 수) / 페이지 읽기(`after` 커서, 최대 200행·8MB)
  - `POST /api/db/store-rows` — 쓰기 동기화 `{operations:[…]}` (최대 500). 400 = 영구 거절, 503 = 재시도, 403 = 샌드박스 쓰기 차단
- 민감 store(`rnd_login_credentials`, `rnd_corporate_card_entries`)는 LAN 읽기/쓰기에서 제외(`lib/server/sensitive-stores.js`).

### 4-3. 동기화 흐름

| 동작 | 위치 | 설명 |
|---|---|---|
| **자동 미러링** | `lib/db/crud.js`, `lib/db/server-sync.js` | 모든 쓰기(`put`/`delete`/`runTransaction`…)가 완료되면 큐에 넣고 150ms 뒤 200건씩 POST. 4xx는 작업별 격리(dead letter), 5xx/네트워크는 30초 뒤 재시도, 페이지 닫힐 때 `sendBeacon` |
| **서버에서 불러오기** | `lib/db/server-hydrate.js`, `/settings/sync` | 서버 → 이 브라우저로 store 단위 교체(다시 서버로 보내지 않음). LAN 뷰어 PC가 최신 데이터를 받을 때 |
| **서버로 전체 재전송** | `lib/db/server-repush.js` | 운영 PC 전용. 로컬 전부 업서트 + 서버에만 있는 키 삭제. 서버 복구 후 사용 |
| **동기화 가드** | `lib/db/sync-guard.js` | 운영 PC인데 로컬이 비었고 서버엔 데이터가 있으면 푸시를 막아 빈 브라우저가 서버를 덮어쓰는 사고 방지 |

**동기화 모드** (`lib/db/sync-mode.js`): `authoritative`(쓰기 미러링) vs `readonly`(미러링 안 함, 역할도 강제로 뷰어).
판정 순서: ① `NEXT_PUBLIC_SERVER_SYNC_FORCE_READONLY=1` → 무조건 readonly ② localStorage 수동 설정 ③ 호스트가 loopback(`localhost`, `127.0.0.1`)이면 authoritative, 그 외(LAN IP)면 readonly.

> ⚠️ **같은 PC에서 포트만 다른 두 번째 `next dev`도 loopback이라 authoritative다 = 실제 운영 Postgres를 덮어쓴다.** 2026-09-17에 이 실수로 145행이 손상돼 pg_dump에서 복구한 사고가 있었다. 검증은 반드시 §12의 샌드박스로.

---

## 5. 인증·권한·브랜드

- **로그인**: `middleware.ts`가 쿠키 `v3:auth`가 없으면 `/login`으로 보냄. 비밀번호는 클라이언트에서 SHA-256 해시해 localStorage `v3:auth-hash`에 저장(`lib/auth.js`). 사내용 간이 잠금이며 서버 인증이 아니다. `/api/*`는 쿠키 검사 대상이 아니다(출처 제한만).
- **역할**: `admin`(관리자) / `viewer`(조회자). 계정은 store `ref_accounts`, 현재 계정은 브랜드별 localStorage. `hooks/useCurrentRole.js` → 화면은 `canEdit = ready && isAdmin`으로 쓰기 버튼을 막는다.
  - 계정이 0개면 admin, 판정 실패면 viewer, readonly 동기화 모드면 항상 viewer.
  - 쓰기 함수 대부분은 저장 직전 `assertActiveAdmin(label)`(`lib/auth/guard.js`)로 한 번 더 막는다.
  - 뷰어에게 숨기는 경로: `/note/write`, `/note/sample/write`, `/menu-sales/upload`, `/settings/restore`, `/rnd/*` (`lib/navigation/role-visibility.js`).
- **설정 PIN**: `/settings/*` 전체가 `PinGate`(localStorage `v3:settings-pin`) 뒤에 있다.
- **브랜드** (`lib/companies.js`): `main`=7번가피자(빨강), `china4`=차이나X4(보라), `icheon`=이천밥쌤(청록). 모회사 (주)태명에프앤티. 상단 `CompanyPicker`로 전환 → 페이지 새로고침, 브랜드 DB 교체.
  - 메뉴(사이드바)는 브랜드와 무관하게 같다. 7번가 전용 동작은 코드에서 `useIsMainBrand()`/`getActiveBrandId()==='main'`로 분기(기본 코드 등록, 공통묶음 시드, 판매량 정적 분류 규칙, 판매가 카테고리 프리셋 등).
  - 차이나X4·이천밥쌤의 노트 분류는 `메뉴`/`사이드`만.

---

## 6. 화면(라우트) 전체 지도

공통 셸 `components/AppShell.jsx`: 사이드바(아코디언, 아이콘 레일로 접기), 상단바(검색 ⌘K, 새 노트, 브랜드 전환, 다크모드, 알림, 프로필), 모바일 하단 탭(홈·노트·보고서·원가·판매량), 명령 팔레트(⌘K), 단축키(`g`+키 이동, `n` 새 노트, `?` 도움말), 동기화/DB 버전 알림.

### 사이드바 구성 (`lib/menu.js` NAV_SECTIONS)

| 섹션 | 항목 → 경로 |
|---|---|
| 홈 | `/` |
| 개발 메모 › 메뉴개발노트 | 일정 달력 `/note/calendar` · 노트 목록 `/note` |
| RND › RND 업무 | 연구일지 `/note/journal` · 시장조사 `/note/market` · 법인카드 내역서 `/rnd/corporate-card`* · 계정 로그인정보 `/rnd/login-info`* |
| 보고서센터 | 보고서센터 `/report` · 판매량 `/report/sales` · 제때 가격 `/report/price` · 제때 출고량 `/report/shipment` · 원가 `/report/cost` |
| 상품 관리 › 제때데이터 | 단가 `/jette/price-compare` · 출고량 `/jette/shipment` · 관리품목 `/jette/settings` |
| 상품 관리 › 식자재 | 식자재 관리 `/ingredient/manage` · 제품별 사용 현황 `/ingredient/usage` |
| 메뉴 | 메뉴 마스터 `/menu-master` |
| 원가 · 영양 › 원가계산 | 공통 원가 관리 `/cost/recipe` · 원가마진표 `/cost/margin` |
| 원가 · 영양 › 영양성분 | 표 출력 `/nutrition/export` · 영양성분 정보 및 계산 `/nutrition/menu` · 알레르기 `/nutrition/allergen` · 원산지 `/nutrition/origin` |
| 판매 관리 › 메뉴 판매량 | 판매량 업로드 `/menu-sales/upload`* · 순위 및 비교 `/menu-sales/rank-compare` · 미매칭 관리 `/menu-sales/unmatched` · 분류 규칙 `/menu-sales/settings` |
| 시스템 › 설정 / 백업 | 브랜드마스터 `/settings/brands` · 시스템 설정 `/settings/system` · 계정 관리 `/settings/account` · 데이터 백업 `/settings/backup` · 서버 데이터 불러오기 `/settings/sync` · 데이터 복원 `/settings/restore`* |

\* 관리자 전용. 허브 페이지(`/cost`, `/ingredient`, `/nutrition`, `/jette`, `/menu-sales`)는 사이드바에 없고 URL·단축키·링크로 들어간다.

### 레거시 리다이렉트

`/menu-sales/rank`·`/menu-sales/compare` → `/menu-sales/rank-compare` · `/cost/pizza|side|set|personal` → `/cost/margin` · `/cost/edge-dough` → `/cost/recipe?tab=edges` · `/cost/manage` → `/cost/recipe` · `/cost/recipe-master` → `/menu-master` · `/cost/ingredient-price` → `/ingredient/manage?view=price` · `/ingredient/list` → `/ingredient/manage` · `/report/menu-sales-compare` → `/report/sales?view=compare…` · `/note/sample/write` → `/note/write?type=sample` · `/settings` → `/settings/brands`

---

## 7. 모듈별 기능과 업무 규칙

### 7-1. 홈 `/`

설정 가능한 대시보드(위젯 순서·숨김·즐겨찾기, `WidgetConfigModal`). 위젯: 최근 방문, 이번 달 브리핑, KPI, 데이터 신선도(마지막 업로드), 모듈별 헬스체크, 오늘 할 일·미매칭, 파이프라인·주간 일정, 판매 순위, 차트, 원가 변동·원가율 경보, 빠른 메모, 샘플기록, 노트 히트맵·보고서 빠른 생성, 최근 활동. 상단 **액션 센터**(`lib/action-center/build.js`)가 미매칭·오래된 업로드·백업 알림·식자재 문제·원가 경보를 모아 보여준다.

- 노트 KPI·"신메뉴 파이프라인"은 연구일지·체크리스트를 빼고 센다(`lib/stats/note-stats.js`).
- 홈 원가율은 `lib/stats/canonical-cost-rate.js`(기본 레시피 구성품 기준)라 원가마진표 수치와 다를 수 있다 — **의도됨**(§11).

### 7-2. 메뉴 마스터 `/menu-master`

메뉴의 **정본 카탈로그**. 코드·이름·사이즈·판매가(부가세 포함)·상태(`active`/`discontinued`/`test`)·분류·중분류·사진·출력명 + **레시피 편집**(구성 식자재·공통묶음 선택·원가·영양 미리보기·변경 영향 미리보기).

- 보기 칩: 목록 / 이슈(레시피 문제) / 출시 준비(레시피·영양·알레르기 준비도) / 품질 점검. 판매가 엑셀 업로드 카드.
- 버튼: 엑셀로 내보내기(CSV), 기본 코드 등록·추가토핑 가져오기(7번가 전용), 초기화, 메뉴 추가.
- **연쇄 반영** (`lib/menu-master/store.js`):
  - 코드 변경 → `cost_selling_prices`, `menu_recipes`, `menu_recipe_versions`, 영양 store의 연결 행 이동.
  - 코드는 그대로 두고 이름·분류만 바꾸면 연결 행을 제자리 갱신(`collectIdentitySyncRows`).
  - 삭제 → 연결 행 같은 트랜잭션에서 삭제(이력은 남김).
- `pushMasterToPrices()`가 마스터를 `cost_selling_prices`로 복사하며 **단종 메뉴는 판매가에서 제거**한다.
- `hidden`: 원가마진표·통계에서 임시로 숨김(단종과 별개).
- 레시피 저장마다 `menu_recipe_versions`에 스냅샷(메뉴당 최대 100).
- 엣지 계열(석쇠·씬바사삭·치즈크러스트·골드스윗)은 메뉴마스터 `OPT-EDGE`·원가 `edgeType`·영양 `crustType` 세 체계를 `lib/menu-master/edge-family.js`가 **연결**한다(합치지 않음).

### 7-3. 식자재 `/ingredient/*`

- `/ingredient/manage` 탭(`?view=`): **관리**(식자재 폼: 기본정보·포장량/기준수량·수동 단가·원산지·알레르기·사진·대체품·제때 단가 연결·변경 이력) / **단가**(단가 목록·일괄 업로드) / 이슈 / 분류·태그 / 공급업체 / 보고서(현재 상태표·사진 카드 PDF).
- 진단 배너: 끊긴 참조, 단종된 제때 품목, 중복, 미사용 정리. 일괄 삭제·단종·분류 변경.
- `/ingredient/usage`: 식자재별 사용 메뉴·공통묶음·엣지·영양 구성 (CSV).
- 저장: `cost_ingredients`(productCode, baseQuantity, baseUnitType, taxType, priceOverride, discontinued, origin, allergens …), `cost_suppliers`, `cost_ingredient_price_history`.

### 7-4. 원가 `/cost/*`

**단가 계산 사슬**

1. 제때 단가 파일(`/jette/price-compare` 업로드) → `price_files`/`price_rows`. 과세면 `priceWithTax = round(단가×1.1)`.
2. `buildLatestPriceLookup()` — **가장 최신 파일 하나**의 productCode → priceWithTax.
3. `buildUnitPriceMap()` (`lib/recipe/index.js`) — 식자재별 포장 가격: 복합품(`compositeOf`)은 구성품 합(하나라도 없으면 `priceOverride`), 일반은 제때 최신가(0이면 없음 취급 → `priceOverride`), 코드 없는 수동 식자재는 `priceOverride`. `unitPrice = round1(포장가 / baseQuantity)`, 단위는 `g` 또는 `개`(kg×1000).
4. 레시피(`menu_recipes`, 사이즈별 full 코드 1건) 원가 = Σ 수량×단가(최신 단가 우선, 없으면 저장 단가) + 선택한 **공통묶음**(도우·박스 등) 사이즈별 수량.

**공통묶음**(`cost_recipe_groups`): `defaultCategories`가 메뉴 분류와 같거나 `분류/`로 시작하면 후보(예: `피자`는 `피자/오리지널`도 포함). 레시피가 **명시적으로 선택한 묶음만** 더한다.

**엣지**(`cost_edge_dough`): 치즈크러스트·골드스윗크러스트·씬도우 × 사이즈, 항상 최신 단가로 재계산. 원가마진표에서 "피자 + 엣지" 파생 행을 만든다(원가·판매가 합산, 코드 접미 C/G/s). 하프앤하프는 파생 행 없음.

**하프앤하프** (`lib/cost/half-half.js`): 사이즈별로 **오리지널(`P-OR`) 피자 원가의 (최대+최소)/2**. 단종 제외, 후보 1개면 그 값. 하프앤하프 자체 레시피가 있는 사이즈는 그 값 우선. 원가마진표·원가 보고서 공통.

**원가마진표** `/cost/margin`: 메뉴별(L/R 묶음) 원가·원가율·마진. 플랫폼 수수료 시뮬레이션(`cost_platform_fees`: 기본, 방문/포장, 배민 등 — 할인 → 정률·정액 수수료 차감 → 순매출 대비 원가율), 할인 시뮬레이터, 필터·검색·숨김, 추이 저장(`cost_margin_snapshots`)/추이 보기.

**경보 기준** (`lib/cost/risk-threshold.js`): 원가율 ≤30% 양호, ≤40% 주의, 초과 경보(엄격히 `>`). 원가율 = 원가 / 판매가(부가세 포함) × 100.

기타: `/cost/recipe` 공통 원가 관리(묶음 관리·엣지 관리 탭), `/cost/topping` 추가토핑 원가, `/cost/all-summary` 전체 메뉴 종합 원가표(CSV).

### 7-5. 영양성분·알레르기·원산지 `/nutrition/*`

- **값은 메뉴 단위로 입력**(식자재로 계산하지 않음): `nutrition_raw_values` 키 `메뉴코드__crustType`(석쇠L·석쇠R·씬바사삭L·1인용피자·단품). 피자는 **100g당 값 + 한 판 총중량**, 사이드·음료는 `basis:'serving'`(1회 제공량 총량). 10개 항목: 중량·열량·탄수화물·당류·지방·포화지방·트랜스지방·콜레스테롤·단백질·나트륨.
- 엣지(`nutrition_edge_master`)는 **절대 추가량**: 베이스를 총량으로 바꾼 뒤 더하고 합친 중량으로 다시 나눈다.
- 1회 제공량: 조각 무게 ≥100g이면 1조각, 아니면 2조각(2조각도 100g 미만이면 3조각). 기본 조각 수 L 8 / R 6 / 1인 6.
- **세트·하프앤하프 표는 열량(최소~최대)과 중량만** 표시(중량 299g 고정). 하프앤하프 열량 최소=낮은 2판 평균, 최대=높은 2판 평균. 음료는 고정 표.
- **알레르기 법정 21종**(AL01–AL21, 조개류는 굴·전복·홍합 개별, 아몬드 제외). 레시피→식자재 알레르기 필드를 모아 자동 매칭. 엣지 규칙: 씬바사삭은 대두 제거, 치즈크러스트는 우유 추가.
- **원산지**: 식자재 `origin[]`에서 생성, 모든 피자 공통 재료는 "※ 피자공통".
- **단종 메뉴는 영양성분표·원산지·알레르기 출력에서 자동 제외**. `excludeFromOrigin` 행 제외. `outputMenuCode`로 매장 변형 메뉴를 대표 행 하나로 접는다(출력 전용).
- 화면: `/nutrition/menu`(베이스·엣지·추가토핑·계산 결과·세트 계산 탭), `/nutrition/allergen`(식자재별/메뉴별 매트릭스, 순서 드래그), `/nutrition/origin`, `/nutrition/export`(원산지표시판 4종·영양성분표 6종 — PDF 통합 출력·엑셀 통합 다운로드).

### 7-6. 판매량 `/menu-sales/*`

- **업로드**(`/menu-sales/upload`, 관리자): POS 엑셀/CSV → 검증 → 미리보기 → 반영. 한 달 한 번(`DUPLICATE_MONTH`).
  - 기간: 처음 20행에서 `YYYY-MM-DD ~ YYYY-MM-DD`, **반드시 한 달 전체**.
  - 헤더: `메뉴명`/`메뉴 명`, `판매량(개)`/`판매량 (개)`, 선택 매출액 칸(`매출액 (원)`처럼 `(원)`·`(₩)` 허용, `(천원)`은 불인식).
  - **이미 올린 달**인데 매출액이 비어 있으면 같은 엑셀을 다시 올려 **매출액만 채우기**(행 수·메뉴명·수량이 순서대로 모두 같아야 함, `lib/sales/fill-revenue.js`).
- **분류**(`lib/sales/classify.js`): 정규화(괄호→공백, `+` 주변 공백 제거) → 별칭 → 규칙(DB 규칙 우선, 정적 규칙은 7번가 전용) → 상태(분류됨/제외/미분류). 미분류는 `menu_sales_issues`로 묶여 **미매칭 관리**에서 별칭·규칙·제외로 해결. `+콘코울슬로` 콤보는 가상 행(`isCombo`) 추가. 규칙 변경 후 "지금 반영"으로 전체 재분류.
- 판매 분류: 피자·1인피자·사이드·사이드(소스)·엣지&도우·세트메뉴·하프앤하프·추가토핑·음료.
- **순위 및 비교**: 단월/전월/전년/직접 비교, 신규·단종 메뉴, 상승·하락 TOP.
- **판매량 보고서**(`lib/report/build-sales-report.js`): 분류된 행만, 월·분기·연 단위와 직전 기간 비교, 순위 키는 `이름|분류`.
  - 배지: **단종**(메뉴마스터 단종과 정확히 같은 이름) · **비정규**(`ref_discontinued`에 등록한 판매명) · **비정규 미등록**(메뉴마스터에 없는 판매명, `ref_registered_overrides`로 개별 해제). 단종·비정규는 상승/하락·베스트/워스트 집계에서 제외.
  - '매출액 포함' 옵션(기본 꺼짐)으로 KPI·분류 비중·순위표·엑셀에 매출액 표시.

### 7-7. 제때데이터 `/jette/*` (식자재 공급사 "제때")

- **단가** `/jette/price-compare`: 단가 파일 업로드(적용일 기준, 같은 날짜 중복 차단) → 최신 단가 현황·가격 비교(인상/인하/신규/삭제)·업로드 이력. **원가 계산의 유일한 단가 출처.**
- **출고량** `/jette/shipment`: 연·월별 출고 파일 업로드, 관리품목만 집계.
- **관리품목** `/jette/settings`: `ref_shipment_products`(전용/범용, 관리 여부).
- `npm run jette:*`: 제때 사이트 자동 다운로드 스크립트(자격증명 파일은 gitignore).

### 7-8. 노트 계열 (브랜드 공유 데이터)

- **메뉴개발노트** `/note`: 카드/표 보기, 필터·프리셋·고정·검색, 일괄 선택, 전체 보고서 PDF. 유형 `메뉴개발`·`메뉴개선`·`샘플`·`연구일지`, 상태 `테스트`·`테스트예정`·`보류`·`출시`·`폐기`. 회차는 `parentId` 체인, 평가(맛·식감·외관 0–5), 메뉴코드 `RND-YYMMDD-n`.
  - `/note/write`(작성: 메뉴개발/메뉴개선/샘플테스트/제품이슈), `/note/[id]`(수정·회차 타임라인·관련 샘플), `/note/board`(상태별 칸반).
  - **연구일지는 노트 목록·칸반에서 빠지고**, `/note/[id]`로 열면 연구일지 화면으로 보낸다.
- **연구일지** `/note/journal` (RND 일일 보고):
  - 탭 **[오늘 내용 보고서]**(날짜 이동·작성 칸 1개 + 사진 8장·그날 기록 카드) / **[연구일지 목록]**(전체 기간 검색·강조, 전체/일지 쓴 날/사진 있는 날 칩, 3줄 미리보기·사진 썸네일, 날짜별 펼치기, 50일씩 더 보기). 탭은 `?tab=list`로 유지.
  - 본문은 **`testContent` 한 칸**. 2026-10-06 이전 3칸 시절 데이터는 `lib/note/journal-report.js`가 `[테스트 결과]`(tasteEval+improvements)·`[다음 일정]`(nextAction+materials) 소제목으로 본문 아래 합쳐 보여주고, 그날 일지를 다시 저장할 때만 합쳐 저장한다.
  - 저장 안 한 내용이 있으면 날짜·화면 이동 전 확인, 창 닫기 경고. PDF: 오늘/선택일·주간·월간·연간·선택기간.
  - 샘플·시장조사 기록도 같은 날짜 기록으로 함께 보여준다(통합 기록, id 접두 `sample:`·`market:` — `lib/note/record-kind.js`).
- **일정 달력** `/note/calendar`: 노트·샘플·일정(반복: 매일/매주/매월, `repeatUntil`)·자동 업무기록 점. **오늘 체크리스트**(localStorage)의 완료 항목은 그날 연구일지 본문에 `[체크리스트 완료 항목]` 블록으로 합쳐진다.
- **샘플기록** `/note/sample`: 식자재 이슈·테스트/샘플(`sample_records`, 유형 샘플테스트/제품이슈), 비교 모드, 엑셀·PDF.
- **시장조사** `/note/market`: 경쟁사·트렌드·참고 포인트·개발 아이디어(`market_research`).
- **RND** `/rnd/corporate-card`(법인카드 내역 엑셀 업로드·출력), `/rnd/login-info`(외부 사이트 계정 메모 — **평문 비밀번호 저장, 서버 동기화 제외**).

### 7-9. 보고서센터 `/report/*`

- `/report`: 보고서 종류 런처, 생성된 보고서 목록(`generated_reports`, 기본 90일 보관)·미리보기·즐겨찾기, 오래된 보고서 정리, 예약 설정, 월마감 패키지.
- 각 보고서는 공용 빌더(`components/report/ReportBuilderShell.jsx`: 옵션 패널 + 첫 장 미리보기 + 보고서 생성 + PDF/엑셀).
  - `/report/sales` 판매량(비교 보고서는 `?view=compare`)
  - `/report/cost` 원가(`?mode=margin` 원가마진표 보고서, 레시피 출력 탭은 단종 제외)
  - `/report/price` 제때 단가 변동
  - `/report/shipment` 제때 출고량

### 7-10. 설정 `/settings/*` (PIN 잠금)

브랜드마스터(브랜드 추가·숨김·브랜드별 백업/복원) · 시스템 설정(테마·글자 크기·단축키·알림·원가 정책: 단가 업로드 시 자동 갱신, 단가 없으면 보고서 차단, 단가 반올림) · 계정 관리(멤버·역할·PIN·비밀번호) · **데이터 백업**(모듈별 JSON 백업 + 서버 pg_dump 상태/생성) · **데이터 복원**(관리자, 미리보기·영향·복원 전 자동 백업) · **서버 데이터 불러오기**(`/settings/sync`: 동기화 모드·서버/로컬 행 수 비교·불러오기·dead letter·전체 재전송).

---

## 8. 메뉴 코드·분류 체계

`lib/cost/menu-price/code.js`가 **코드에서 분류를 파생**한다(코드가 기준).

| 코드 | 분류 / 중분류 |
|---|---|
| `P-PS-NNN-{L\|R}` | 피자/프리미엄 스페셜 |
| `P-PR-NNN-{L\|R}` | 피자/프리미엄 |
| `P-OR-NNN-{L\|R}` | 피자/오리지널 (하프앤하프 원가 후보) |
| `P-HH-NNN-{L\|R}` | 피자/하프앤하프 |
| `P-PM-NNN-{L\|R}` | 피자/프로모션 (2026-10-02 추가) |
| `P-ONE-NNN` | 1인피자 (씬도우 전용, 사이즈 접미 없음) |
| `S-{SPG\|TBK\|CHK\|FRY\|SNK\|SLD\|PKL}-NNN` | 사이드(스파게티·떡볶이·치킨·튀김·스낵·샐러드·피클류) |
| `S-SAU-NNN` | 소스 |
| `SET-FAM-NNN[-사이즈]` | 세트박스/패밀리박스 |
| `D-{CC\|CZ\|SPR}-NNN-{ml}` | 음료(코카콜라·제로·스프라이트) |
| `T-*` | 추가토핑 |
| `OPT-EDGE-*` | 엣지/도우옵션 |

- 피자 L·R은 같은 번호를 공유. 정렬: PS→PR→OR·PM→ONE→사이드→세트→HH→소스→음료→엣지→토핑(`getMenuCodeRank`).
- **base 코드**(사이즈 접미 제거)는 영양·피커 중복 제거에, **full 코드**는 원가·판매가에 쓴다(`lib/menu-master/code-policy.js`).
- 분류 판정은 `lib/menu-master/category-policy.js`(`isPizzaCategory`는 `피자`·`피자/…`, 기본적으로 1인피자 포함).

---

## 9. IndexedDB store 목록

`lib/db/constants.js` `DB_VERSION=29`, `ALL_STORES` 48개. 스키마는 `lib/db/schema/*.js`.

| 그룹 | store |
|---|---|
| 공통 | `upload_log`, `migration_flags`, `menu_master`, `generated_reports`, `ref_accounts`, `settings`(레거시 예약) |
| 판매량 | `sales_files`, `sales_rows`, `sales_rules`, `menu_sales_issues`, `ref_sales_categories`, `ref_sales_aliases`, `ref_excluded`, `ref_discontinued`, `ref_registered_overrides`, `ref_event_menus` |
| 제때 | `price_files`, `price_rows`, `shipment_files`, `shipment_rows`, `ref_shipment_products`, `ref_shipment_rules` |
| 원가 | `menu_recipes`, `menu_recipe_versions`, `cost_ingredients`, `cost_selling_prices`, `cost_edge_dough`, `cost_upload_log`, `cost_recipe_groups`, `cost_suppliers`, `cost_margin_snapshots`, `cost_ingredient_price_history`, `cost_platform_fees` |
| 노트(공유) | `menu_dev_notes`, `sample_records`, `market_research`, `note_schedules`, `work_log` |
| 영양 | `nutrition_menu_ref`, `nutrition_raw_values`, `nutrition_pizza_composition`, `nutrition_origin_master`, `nutrition_allergy_master`, `nutrition_topping_master`, `nutrition_edge_master`, `nutrition_set_composition` |
| RND(공유·민감) | `rnd_corporate_card_entries`, `rnd_login_credentials` |

백업 범위는 `MODULE_GROUPS`(sales/jette/cost/notes/nutrition/rnd) + `COMMON_STORES`.

---

## 10. 출력(PDF·엑셀)

- **PDF = 브라우저 인쇄.** 보고서는 `lib/report/print.js` `printReportElements`가 `.report-paper`를 복제해 A4 인쇄 CSS를 입히고 `window.print()`. 쪽 나눔 제어 클래스: `.report-print-page`(쪽 넘김), `.paper-section.print-keep-together`·`.print-keep-block`(카테고리 구획 안 잘리게).
- 연구일지 PDF는 `lib/note/journal-print.js`가 HTML을 만들어 새 창(`openPrintWindow`)에서 인쇄. 스타일은 `lib/note/journal-print-styles.js`, 긴 본문 칸은 쪽 사이 분할 허용.
- 파일명 규칙 `{브랜드}_{보고서명}_{YYYYMMDD}`.
- 엑셀: `xlsx`/`xlsx-js-style` (`lib/excel.js`). 원가·판매량·단가·출고량·원가마진표·영양성분표·원산지 등. 일부 "엑셀로 내보내기" 버튼은 실제로 **CSV**(`downloadCsv`).

---

## 11. 의도된 데이터 특이사항 (버그 아님)

검사에서 이상해 보이지만 **사용자 확인으로 정상**인 것들. 재보고·"수정"하지 말 것.

- 시나몬츄러스 2PCS(`S-SNK-003`) 판매가·판매 이력 0 — 세트박스 구성 전용.
- 엣지 석쇠(`OPT-EDGE-001`)·씬바사삭(`OPT-EDGE-004`) 판매가 0 — 기본/무료 크러스트.
- 음료·엣지 레시피 없음 — 음료는 완제품, 엣지 원가는 `cost_edge_dough`.
- 레시피 구성품 중 productCode 빈 항목(양파·피망·박스류 등) — 제때 코드 없는 수동 식자재(`priceOverride`).
- 홈 "원가율 경보 N건"과 원가마진표 "40% 초과 M개"가 다름 — 계산 기준이 다름(홈은 기본 레시피 구성품만).
- 땅끝달콤고구마 피자(`P-PR-004`) 영양값 없음 — 시험성적서 대기.
- 사이드 꿀(`S-SAU-004`)이 알레르기·원산지엔 없고 영양성분표엔 있음 — "원산지 제외" 설정.
- 피자소스=닭고기, 랜치소스=쇠고기 알레르기 표시 — 소스 원재료 기준이 맞음.
- 사이드 영양값이 100g 기준으로 보면 커 보임 — 사이드는 1회 제공량(`basis:'serving'`) 총량.
- 추가토핑 `fat` 비고 `satFat`만 있음 — 표의 포화지방 칸은 `satFat`을 읽음.
- 엣지 이름이 원가(`골드스윗크러스트`/`씬도우`)와 영양(`골드스윗L`/`씬바사삭L`)에서 다름 — 의도, `edge-family.js`가 연결. 씬바사삭은 화면에 "씬바샤삭"으로 표시.
- 판매량 단종 판정은 **정확 일치만**(오탐이 미탐보다 나쁘다는 결정).

> 데이터 누락/불일치를 판단하기 전에: **서버(Postgres) 사본은 낡았을 수 있다.** 운영 PC 브라우저 데이터가 정본이다. 사용자에게 최신 백업(설정 → 데이터 백업)을 받아 대조하거나 `/settings/sync`의 서버·이 PC 행 수를 먼저 확인하라. 서버 API는 `nextCursor`로 끝까지 페이지를 넘겨 읽어야 한다(사진 base64 때문에 한 페이지가 잘림).

---

## 12. 개발·검증 규칙 (작업 전 필독)

### 데이터 안전

1. **앱 데이터를 직접 쓰지 않는다.** 데이터 입력은 사용자가 한다. 일괄 변환·마이그레이션은 사용자 승인 없이 하지 않는다.
2. **검증은 샌드박스에서만.** 두 번째 `next dev`도 운영 Postgres를 덮어쓴다(§4-3).
   - 개발 샌드박스: `npm run dev:sandbox` (포트 3002, 읽기 전용 강제 + 서버 쓰기 403).
   - 읽기 전용 프로덕션 샌드박스(성능·화면 검증용):
     ```bash
     NEXT_PUBLIC_SERVER_SYNC_FORCE_READONLY=1 NEXT_DIST_DIR=.next-sandbox npx next build
     NEXT_DIST_DIR=.next-sandbox RND_SANDBOX_REJECT_WRITES=1 npx next start -H 127.0.0.1 -p 3100
     ```
     브라우저 자동화 시 비-GET `/api/**` 요청도 차단하고, 실데이터는 `/settings/sync` "서버에서 불러오기"로 받는다. 샌드박스는 뷰어라 저장 버튼은 비활성.
   - 운영 dev 서버(3000)가 도는 동안 `.next`를 지우는 `qa:prod`·`build`를 돌리지 말 것(`NEXT_DIST_DIR`로 분리).
3. **새 IndexedDB store 추가 절차**: `ALL_STORES` 추가 → `schema/*.js` 생성 + `DB_VERSION` 올림 → `MODULE_GROUPS`/`COMMON_STORES` 등록 → `prisma/store-catalog.mjs` `STORE_OPTIONS` 추가 → 운영 PC에서 **`npm run db:seed:catalog`**. 마지막을 빼면 서버 쓰기가 외래키 오류(503)로 계속 재시도된다.
4. 서버를 pg_dump에서 복구한 뒤엔 운영 PC에서 **"서버로 전체 재전송"**을 해야 PC의 최신 수정이 서버에 다시 반영된다.

### 코드 규칙 (테스트로 강제됨)

- `eslint-disable`은 허용 목록 외 금지(`eslint-disable-policy.test.mjs`) · 빈 `catch` 금지(`silent-catch-policy`) · `fetch`는 `lib/session.js`에서만 · `dangerouslySetInnerHTML`은 `app/layout.jsx`에서만 · `indexedDB.open`은 `lib/db/init.js`에서만 · `console.error(err)` 단독 금지(맥락 문자열 필요).
- 파일 크기 제한 테스트가 많다(예: 연구일지 화면 폴더 파일 200줄 이하). 넘으면 파일을 나눈다.
- 다른 화면 폴더(`app/<module>/`)를 import하지 말고 공용 코드는 `lib/`에 둔다(예: 연구일지 폴더는 다른 화면이 import하지 않도록 테스트로 막혀 있음).
- 많은 `*-structure.test.mjs`가 **소스 문자열**을 검사한다 → 코드를 옮기면 해당 테스트의 기대 문자열도 함께 갱신.
- 이름으로만 이어진 화면 간 데이터(예: 토핑, 엣지)는 **합치지 말고 연결**(정규화 키 + 명시적 링크 필드) — 사용자 선호.
- 커밋 메시지는 한국어, `type(scope): 요약` 형식. **푸시는 사용자가 요청할 때만.**
- 작업 트리는 CRLF, 인덱스는 LF(경고는 정상).

### 검증 명령

```bash
npm test                     # Jest 전체 (약 3,100개)
npx next lint --no-cache
npm run format:check
```

---

## 13. npm 스크립트

| 스크립트 | 용도 |
|---|---|
| `dev` / `dev:lan` / `dev:clean` | 개발 서버(3000) / LAN 바인딩 / 정리 후 실행 |
| `dev:sandbox` | **안전한 검증 서버**(3002, 읽기 전용 강제, `.next-sandbox`) |
| `build` / `start` / `build:clean` / `demo` | 빌드·실행 |
| `test` / `test:ci` | Jest (ESM) |
| `lint` / `format` / `format:check` | ESLint / Prettier |
| `qa:smoke` / `qa:mobile` / `qa:runtime` / `qa:workflow` / `qa:full` | Playwright QA(실행 중인 서버 필요) |
| `qa:prod` | `.next` 삭제 후 빌드·QA — 운영 dev 서버 실행 중엔 금지 |
| `db:migrate` / `db:seed:catalog` / `db:check` / `db:bootstrap` | Prisma 마이그레이션 / store 카탈로그 시드 / 점검 |
| `db:import:backup[:dry-run]` | 브라우저 JSON 백업을 Postgres로 가져오기(`--brand`, `--include-shared`) |
| `db:backup` / `db:backup:list` / `db:backup:prune` / `db:backup:auto` | pg_dump 백업 |
| `db:pg:start` / `db:pg:status` / `db:pg:stop` | 포터블 Postgres |
| `site:start` / `site:start:lan` / `*:autostart` | 운영 PC 사이트 기동 / Windows 자동 시작 등록 |
| `jette:login` / `jette:download` | 제때 사이트 자동 다운로드 |

---

## 14. 문서 지도 — 무엇이 최신인가

| 문서 | 상태 |
|---|---|
| **`AI_SITE_GUIDE.md`(이 문서)** | 2026-10-08 기준 최신 |
| `ARCHITECTURE.md` | 서버·동기화·보안 설명은 대체로 맞음. IndexedDB 수치(v26·46개)는 낡음 → 실제 v29·48개 |
| `docs/SECURITY_POLICY.md` | 대체로 최신(2026-09-10). 일부 내보내기 함수 권한 설명은 낡음 |
| `docs/DEFERRED_WORK.md` | 보류 작업 단일 목록(테스트로 일관성 검사) |
| `docs/QA_FULL_SITE_2026-09-15.md`, `docs/QA_NUTRITION_AUDIT_2026-09-16.md`, `docs/ROUND_1-4_WORK_LOG_2026-09.md` | 시점 기록(최근) |
| `docs/SITE_STATUS.md` | 일부 낡음(DB v25 등) |
| `README.md`, `SITE_AUDIT_REPORT.md`, `docs/DB_BUILD_*`, `docs/LOCAL_DB_DEPLOY_PLAN.md`, `docs/CONVENIENCE_FEATURE_*`, 6~7월 감사·핸드오프 문서 | 역사 기록 — 현재 구조 판단에 쓰지 말 것 |

동기화 설계의 가장 정확한 설명은 코드 주석이다: `lib/db/sync-mode.js`, `sync-guard.js`, `server-sync.js`, `server-hydrate.js`, `server-repush.js`, `lib/server/*`, `scripts/dev-sandbox.mjs`.

---

## 15. 용어집

| 용어 | 뜻 |
|---|---|
| 제때 | 식자재 공급사(및 그 주문 사이트). 단가·출고량 파일의 출처 |
| 메뉴 마스터 | 메뉴 기준 정보 카탈로그(`menu_master`) |
| 공통묶음 | 여러 메뉴가 같이 쓰는 재료 묶음(도우·박스 등, `cost_recipe_groups`) |
| 엣지 | 피자 크러스트 옵션(석쇠·씬바사삭/씬도우·치즈크러스트·골드스윗) |
| 하프앤하프 | 두 피자 반반 메뉴(`P-HH`) |
| 원가율 | 원가 ÷ 판매가(부가세 포함) × 100 |
| 미매칭 | 판매량 업로드에서 분류 규칙에 안 걸린 판매명 |
| 비정규 | 메뉴마스터에 없는 판매명(이벤트·임시 메뉴 등). 단종처럼 집계에서 제외 가능 |
| 연구일지 | R&D 일일 업무 보고(`noteType: '연구일지'`) |
| 운영 PC / 뷰어 PC | 데이터 정본 브라우저(authoritative) / LAN 읽기 전용 브라우저 |
| 서버에서 불러오기 / 서버로 전체 재전송 | 서버→브라우저 교체 / 브라우저→서버 전체 업서트 |
| 주임님 | 이 플랫폼의 주 사용자(R&D 담당) |
