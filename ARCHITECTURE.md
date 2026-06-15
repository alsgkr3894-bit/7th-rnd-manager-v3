# 7번가 R&D 플랫폼 아키텍처

작성: 2026-06-12 · 최종 갱신: 2026-06-15
상태: 현재 Next.js App Router 구현 기준

## 구조

```text
app/                 Next.js App Router 페이지와 route-level 컴포넌트
app/styles/          전역 CSS 분리(tokens/base/layout/components/features)
components/          재사용 React 컴포넌트
components/ui/       React 기반 공통 UI 컴포넌트
hooks/               클라이언트 상태, 브라우저 이벤트, 화면 공통 hook
lib/                 도메인 store, 계산, 파싱, export, 순수 helper
lib/ui/              React 없는 UI normalizer, prop guard, helper
lib/db/              IndexedDB 초기화, schema, CRUD, 백업 범위
scripts/             QA, smoke, build 정리 스크립트
__tests__/           Jest 단위/회귀 테스트
```

## 원칙

- 페이지 파일은 route 조립과 화면 상태만 맡기고, 반복 로직은 `hooks/` 또는 도메인 `lib/`로 이동한다.
- `components/ui`는 JSX를 렌더링하고, `lib/ui`는 테스트 가능한 순수 함수만 둔다.
- DB schema, IndexedDB store 이름, 백업/복원 wire shape는 기능 요구가 없으면 바꾸지 않는다.
- CSS 선택자 이름은 유지하면서 `app/styles`에 책임별로 분리한다.
- 원가, 식자재, 영양성분처럼 도메인 정책이 강한 로직은 공통 유틸보다 도메인 폴더를 우선한다.

## 라우트 구조

App Router 기준 page route 56개. 주요 그룹:

- `app/menu-sales/` — 판매량 업로드·순위·비교·미매칭·설정
- `app/cost/` — 원가허브·레시피·피자/1인피자/사이드/세트 세부·엣지도우·식자재단가·마진·전체요약
- `app/ingredient/` — 허브·관리·리스트·사용현황
- `app/nutrition/` — 영양성분·원산지·알레르기·표출력
- `app/note/` — 목록·작성/수정·칸반·달력·연구일지·샘플
- `app/report/` — 보고서허브·판매·원가·단가·출고량
- `app/jette/` — 가격비교·출고량·설정
- `app/settings/` — 계정·백업·복원·시스템
- `/menu-sales/rank` → `/menu-sales/rank-compare` redirect

## IndexedDB 스키마

현재 DB 버전: **v23**. 주요 store 그룹:

| 그룹 | 대표 store |
|------|-----------|
| 메뉴마스터 | `menu_master`, `cost_selling_prices` |
| 원가 | `menu_recipes`, `cost_ingredients`, `cost_selling_prices`, `cost_edge_dough`, `cost_recipe_groups` |
| 판매량 | `sales_rows`, `sales_files`, `sales_rules` |
| 영양 | `nutrition_menu_ref`, `nutrition_raw_values`, `nutrition_origin_master`, `nutrition_allergy_master`, `nutrition_edge_master` |
| 노트 | `menu_dev_notes`, `sample_records`, `note_schedules`, `work_log` |
| 보고서 | `generated_reports` |
| 제때 | `price_files`, `price_rows`, `shipment_files`, `shipment_rows`, `ref_shipment_products` |
| 공통 | `upload_log`, `migration_flags`, `menu_master`, `generated_reports`, `ref_accounts` |

브랜드별 DB (`7번가`, `차이나X4`, `이천밥썜`) — 비-main 브랜드는 빈 상태로 시작.

## QA 스크립트

| 명령 | 역할 |
|------|------|
| `npm run format:check` | Prettier 형식 검사 |
| `npm run lint` | ESLint |
| `npm run test:ci` | Jest 단위·회귀 테스트 |
| `npm run build:clean` | `.next` 초기화 후 프로덕션 빌드 |
| `npm run qa:smoke` | 대표 라우트 22개 smoke (dev 서버 필요) |
| `npm run qa:runtime` | 주요 정적 라우트 + 브랜드/동적 fixture runtime (dev 서버 필요) |

## 최근 정리 (2026-06-12 ~ 2026-06-15)

- `app/globals.css`를 import 집계로 축소하고 스타일 본문을 `app/styles/*`로 분리했다.
  - `components.css` → `components/` (home-hero·home-body·overlay·palette·chrome)
  - `features.css` 보고서/모션 분리: `features/report/`, `features/motion.css`, `features/motion-enhanced.css`
- 보고서 기간/범위/수량 정규화는 `lib/report/period.js`로 통합했다.
- 원가 detail 카드 4종은 `components/cost/shared/CostDetailCardBase.jsx`를 공유한다.
- 노트 달력 날짜/체크리스트 순수 로직은 `lib/note/calendar-utils.js`로 분리했다.
- 식자재 폼의 사진/원산지/알레르기 UI는 `IngredientFormSections.jsx`로 분리했다.
- localStorage 키는 `lib/note/keys.js` 헬퍼로 집중 관리한다 (sessionStorage 포함).
- `nutrition_allergy_links` store가 DB v20에서, `nutrition_ingredient_values` store가 DB v23에서 제거됐다.
- route-level `loading.jsx`·`error.jsx`를 4개 무거운 라우트에 추가해 예외 격리했다.
