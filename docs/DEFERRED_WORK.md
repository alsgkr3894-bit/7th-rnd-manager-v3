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

## B. 보류 작업 플랜 (위험도 순)

> 진행 시 위에서 아래로(고위험 먼저 충분히 검토, 저위험은 언제든 착수 가능).

### 🔴 고위험 — 다중 store / 집계 결과 변경

#### B-1. 메뉴마스터 삭제 cascade  🔴 ⏸
- **파일**: `lib/cost/menu-master.js`, `lib/nutrition/`, `lib/sales/`
- **문제**: `deleteMenuMaster`는 `menu_master` store만 삭제. 원가(`cost_recipes`)·영양(`nutrition_menu_ref`)·판매량(`sales_rows`)에 orphan 레코드 잔존. 현재는 삭제 다이얼로그 경고 표시만.
- **해결 방향**: 삭제 전 관련 store orphan 목록 미리보기 → ConfirmDialog → 동적 import로 각 모듈 cascade 삭제.
- **왜 보류**: 여러 store 동기 삭제는 트랜잭션 범위 조율 필요. 잘못 구현 시 정상 데이터 소실 위험.
- **관련 메모리**: [[db-write-footguns]]

#### B-2. 피자 카테고리 판정 통합  🔴 ⏸
- **파일**: `lib/cost/category-policy.js`, `lib/cost/crust-config.js`, `lib/cost/menu-categories.js`(레거시), `lib/cost/values/store.js`의 `_isPizzaMenu`
- **문제**: `isPizzaCategory` 판정 로직이 4곳에 분산. 1인피자 포함 여부 옵션도 갈림. 단일화하면 집계 결과(원가·판매량)가 달라질 수 있음.
- **해결 방향**: `category-policy.js` 기준 단일 `isPizzaCategory(cat, opts)`로 통합 → 나머지 3곳은 import로 교체.
- **왜 보류**: 집계 결과 변경 위험. 브랜드별 카테고리 정책 차이 확인 필요.

---

### 🟡 중위험 — 단일 모듈 구조 변경 / 테스트 필요

#### B-3. 알레르기 링크 테이블(legacy) 정리  🟡 ⏸
- **파일**: `lib/db/init.js` store 목록, `lib/nutrition/allergen/`
- **문제**: `nutrition_allergy_links` store가 legacy로 잔존. `saveIngredientAllergens`는 **호출처 없음**. 실제 알레르기 입력·집계는 `cost_ingredients.allergens` 기준으로 일관 동작. 대시보드 통계 1곳에서 best-effort 읽기 + 식자재 삭제 cascade만 사용.
- **해결 방향**: `nutrition_allergy_links`를 read 경로에서 완전 제거하고 `cost_ingredients.allergens`로 일원화. `saveIngredientAllergens` 및 관련 코드 제거.
- **현재 상태**: 활성 손상 없음. 주석/문서 정정 완료. 테이블은 보존.
- **왜 보류**: 통계 집계 코드 수정 범위 파악 필요. 브랜드별 알레르기 데이터 구조 확인 후 진행.

#### B-4. filterTargetRows 신규 대상 재분류 한계  🟡 ⏸
- **파일**: `lib/sales/resolve.js`, `lib/sales/use-unmatched-issues.js`
- **문제**: `filterTargetRows`는 기존 업로드 행의 재분류는 지원하지만, 규칙 추가 후 **신규 대상(이전엔 미분류)**이었던 행은 재업로드해야만 반영됨.
- **해결 방향**: `reclassifyAllFiles` 실행 시 미분류 행도 재시도하도록 로직 확장. 또는 "전체 재처리" 옵션 추가.
- **관련 메모리**: [[classification-staleness]]

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

#### B-8. 칸반 드래그 순서 원자성  🟡 ⏸
- **파일**: `app/note/board/page.jsx:116–149`
- **문제**: `Promise.all(updateNote…)` 개별 트랜잭션 → 중간 실패 시 일부만 반영.
- **해결 방향**: `runTransaction`(operations.js:223)으로 boardOrder 일괄 갱신.
- **왜 보류**: `menu_dev_notes`는 공유 store(main DB). 트랜잭션 범위·드래그 UX 회귀 검증 필요.

#### B-9. 1인피자 알레르기 표시 기준 정리  🟡 ⏸
- **파일**: `lib/nutrition/label/build.js:265`, `app/nutrition/allergen/page.jsx:345`
- **문제**: 라벨은 씬바사삭L만 출력, 알레르기 화면은 4크러스트 전부 생성 → 불일치.
- **해결 방향**: 도메인 확인(1인피자가 씬바사삭만 맞는지) 후 allergen 행 생성 필터 통일.
- **왜 보류**: 알레르기 출력은 법적 표기 영향. 도메인 확인 필수.

#### B-10. menuCode 중복 사전 검증/안내  🟡 ⏸
- **파일**: `lib/cost/menu-master/store.js`(upsertMenuMaster), `app/menu-master/page.jsx:538`
- **문제**: 중복 menuCode 시 조용히 기존 레코드 update, UI는 항상 "저장 완료". 병합 사실을 사용자가 모름.
- **해결 방향**: (a) ConfirmDialog "기존 항목을 덮어쓸까요?" 안내 후 진행, 또는 (b) 거부·에러.
- **왜 보류**: 동작 변경. 방향 결정 필요.

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

---

### 🟢 저위험 — UI 정보·안내 개선 (사이드이펙트 없음)

#### C-1. 영양성분·식자재 중복 진단 UI 노출  🟢 ⏸
- **파일**: `lib/nutrition/diagnostics.js`, `lib/cost/diagnostics.js`(유틸 보유)
- **문제**: `repairNutritionDuplicates`, `buildIngredientDiagnostics` 진단·복구 유틸이 있지만 UI에서 실행 불가. 중복 감지 시 사용자가 직접 해결 불가.
- **해결 방향**: 설정 > 데이터 관리 화면에 "중복 진단" 버튼 → 결과 미리보기 → 수동 정리.
- **왜 보류**: UI 설계 필요. 우선순위 낮음(발생 빈도 낮음).

#### C-2. 업로드 중복 파일 진단 UI  🟢 ⏸
- **파일**: `lib/sales/dedupe.js`, `lib/sales/diagnostics.js`
- **문제**: 같은 날짜 파일 재업로드 시 `dedupeUploadRows` 처리는 되나 사용자가 중복 상태를 확인 불가.
- **해결 방향**: 판매량 업로드 페이지에 중복 파일 배지 또는 경고 표시.

#### C-3. 판매 분류 미반영 구간 안내  🟢 ⏸
- **파일**: `app/menu-sales/unmatched/page.jsx`, `components/sales/UnmatchedTable.jsx`
- **문제**: 재분류 취소 시 규칙은 저장되나 기존 파일은 구버전 분류 유지. 사용자가 이 상태를 모를 수 있음.
- **해결 방향**: 미매칭/설정 페이지에 "분류 재반영 미실행" 배지/경고 표시.

#### C-4. Prettier 잔여 31개 파일 정리  🟢 ⏸
- **파일**: `format:check` 경고 31개 (`lib/nutrition/values/store.js`, `scripts/clean-build.mjs`, `scripts/qa-prod.mjs` 등)
- **문제**: 전체 정비에서 499 → 31개로 줄었으나 잔여분 미정리로 `format:check` 실패.
- **해결 방향**: `npm run format` 일괄 실행 후 diff 검토. 단, 자동 포맷이 의미상 변경을 일으키지 않는지 확인.
- **왜 보류**: 잔여 파일 다수가 스크립트/유틸. 기능 영향 없으나 diff 노이즈 검토 필요.

#### C-5. 피자 슬라이스 시트 satFat 레거시 참조 확인  🟢 ⏸
- **파일**: `lib/nutrition/label/build.js`의 `buildPizzaSliceSheet`
- **현황**: 슬라이스 시트의 `satFat → fat` 변환은 완료(현재 `build.js`에 satFat 잔존 없음 확인). 남은 `satFat` 참조는 `auto-calc.js`·`values/import.js`·`values/store.js`·`ImportBaseModal.jsx`로, 모두 **포화지방(정상 영양 필드)** 용도.
- **해결 방향**: 추가 작업 거의 없음 — 위 참조가 라벨 출력 경로에 잘못 새어들지 않는지만 점검 후 종료.

---

_최종 업데이트: 2026-06-12 — 완료 이력(라운드 2·3·4) 추가, QA R4 신규 보류 8건(B-7~B-14) 등록_
