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

### UI 점검 라운드 (42건 — HIGH 14·MEDIUM 18·LOW 10) — ✅ 2026-06-13

`docs/UI_INSPECTION_2026-06-13.md` 내용을 이 섹션으로 통합하고 원본 리포트는 삭제 대상으로 정리.

**커밋 3건**: 8c1cd00 (즉시 HIGH 4), cfe0698 (나머지 HIGH 10), ed7df1b (MEDIUM 18)

**HIGH 즉시 수정 4건** (8c1cd00):
- H-01: `showToast(…, 'err')` → `'error'` (note/board)
- H-02: `tokens.css` 다크모드 누락 4토큰 추가 (`--warn`, `--surface-3`, `--surface-4`, `--color-reporting`)
- H-03: `IngredientSearch` 드롭다운 `zIndex: 9999` → `350` (모달 z-index 계층 준수)
- H-04: 가격보고서·출고보고서 미구현 Excel 체크박스 제거

**HIGH 나머지 10건** (cfe0698):
- H-05: `settings/system` DangerConfirm 확장 div `role="alert"` 추가
- H-06: `settings/account` PIN 해제 → `ConfirmDialog` 2단계 확인 + addingBusy 스피너
- H-07: `note/board` 로딩 중 스피너 표시
- H-08: `ingredient/list` catch showToast + PDF/Excel 버튼 `disabled={loading || filtered.length === 0}`
- H-09: `ingredient/usage`, `nutrition/allergen` catch showToast 추가
- H-10: `report/cost` 빈 데이터 `setDataError()` 호출
- H-11: `report/price` 파일 부족·비교 불가 `setDataError()` 2종
- H-12: `report/shipment` 빈 데이터·날짜 없음 `setDataError()` 2종
- H-13: `report/menu-sales-compare` 빈 데이터 `setDataError()` + 연도 동적 추출
- H-14: `MenuMasterEditModal` ESC 키 닫기 + 오버레이 클릭 닫기
- 기타: RecipeEditor 저장 중 삭제·취소 버튼 disabled, `--accent-soft`/`var(--warn)` 토큰화, `menu-master` 셀 `cell-name/menu-name` 클래스, `settings/account` `'err'`→`'error'` 4곳

**MEDIUM 18건** (ed7df1b):
- M-01~06: 하드코딩 hex → CSS 토큰 (`--warn`/`--surface`/`--positive`/`--scope-generic`/`--text-3`/`--cat-*`), 접근성 `aria-label`/`scope` (calendar·sample·NoteFormBody·ingredient-price·all-summary·manage·allergen·shipment·sales·usage·_NoteContent)
- M-07: 클릭 가능 div `role="button" tabIndex={0} onKeyDown` (ingredient-price stat-cards, HomeWidgets widget-rows)
- M-08: `.search:focus-visible`, `.profile-btn:focus-visible` CSS 포커스 링 추가
- M-09: 원가레시피 `loading` early return, 재료단가표 버튼 `disabled` `|| loading` 추가
- M-10: `refreshStats` try-catch + showToast on failure
- M-11: `handleRecreate` `setConfirmingRecreate(false)` + `'err'`→`'error'`
- M-12: `handleExcelExport` Promise 반환 + catch showToast
- M-13: 원가보고서 뷰 탭 `no-print`, ReportBuilderShell preview-head `no-print`
- M-14: `totalCount`/`allRisk` → `formatNumber()` 적용
- M-15: PIN 입력 `autoComplete="off"`
- M-16: 사용량 input `step="any"`, 판매가 input `step="1"`
- M-17: `.notif-pop z-index` 50 → 95
- M-18: `base.css` 전역 `scrollbar-width: thin` + `::-webkit-scrollbar 6px`

**LOW 10건 처리/보류**
- 추가 처리(통합 중): L-03 판매 보고서 비교 월 동일 선택 경고 표시, L-04 제때 출고량 업로드 제한 표시 30MB 일치 + toast 타입 `'error'` 교정, L-06 백업 진단 버튼 중복 실행 방지, L-07 회사 드롭다운·홈 인사 제목 모바일 overflow 완화.
- 이미 처리/확인: L-01 노트 보드 loading 표시·영양 메뉴 empty-state, L-05 미매칭 테이블 페이지네이션.
- 보류: L-02 고정 px값 추가 정리, L-08 메뉴마스터 폼 인라인 오류, L-09 테이블 가로 스크롤 래퍼 감사, L-10 폰트 preload 정책 변경. 디자인·검증 범위가 커서 별도 UI 정리 때 재검토.

---

### QA 리포트 통합 — ✅ 2026-06-13

`docs/QA_REPORT_20260613.md` 내용을 이 파일로 통합하고 원본 리포트는 삭제 대상으로 정리.

**리포트 판정**
- 빌드·테스트·ESLint 모두 정상으로 기록됨.
- UTC 날짜 기본값, `confirm()` 제거, `AreaChart` `useId`, `useSettingsAuth` storage listener, 가짜 공유 링크 차단, IP 조회 opt-in, ESLint 예외 축소 모두 정상.
- 즉시 수정 필요한 크리티컬 버그 없음.

**비긴급 잔존 패턴 처리**
- `lib/work-log.js`의 `toISOString().slice(0, 10)`은 사용자 입력 날짜가 아닌 작업로그 TTL cutoff 계산이라 수정 불필요로 분류.
- `Math.random()` 잔존은 404 이펙트·진행 시뮬레이션·모달 내부 id·캘린더 fallback 등 SSR 위험 낮은 용도라 즉시 수정하지 않음. 캘린더 fallback은 추후 client-only 구조 변경 시 재검토.

**보류 항목 매핑**
- B-3 Phase 2: `nutrition_allergy_links` legacy store schema 제거 — 브랜드별 DB migration 검증 필요.
- B-5: `useDBLoad` 전면 확산 — 회귀 위험 때문에 보류.
- B-6: 대형 컴포넌트 추가 분해 — 기능 변경 시점에 병행.
- B-9: 공유 링크 real backend — 도메인/백엔드 정책 확인 필요.
- 로컬 인증 경계 문서화는 정보성 항목으로 유지. 현재 구조는 로컬 앱 잠금이며 프로덕션 인증 체계가 아님.

---

### QA 리포트 통합(N-01~N-19 저위험 배치) — ✅ 2026-06-13

`docs/QA_REPORT_N01-N19.md` 내용을 이 파일로 통합하고 원본 리포트는 삭제 대상으로 정리.

**리포트 판정**
- 커밋 `08bcea6`(N-01~19 구현) + `7f54977`(버그 수정) 기준 검증 기록.
- `npm run build` 57페이지, `npm test` 140 suites / 793 tests, ESLint 0 errors로 기록됨.
- N-01~N-19 저위험 배치 전량 정상으로 판정됨.
- 잔존 이슈 없음. 보고서 결론상 중위험 배치(N-20~N-38) 진행 가능 상태로 기록됨.

**수정 완료 버그**
- N-05: 노트 작성·수정 저장 로직에 `menuName` 필수 검증이 남아 메뉴명 없이 저장할 수 없던 문제 수정 완료.
- N-06: 원가보고서 집계기간 UI 제거 후 남은 `Seg` 미사용 import 정리 완료.

**완료 항목 요약**
- 노트 탭 순서 변경, 노트목록/칸반/달력의 불필요 CSV·인쇄·복사 버튼 제거.
- 노트작성 메뉴명 필수 해제, 토핑 카테고리 제거.
- 원가보고서 제목 변경 및 집계기간 UI 제거.
- 공통 "CSV 내보내기" 라벨을 "엑셀로 내보내기"로 변경.
- TopBar 우측 정렬, 다크모드 모션은 기구현 확인.
- 메뉴마스터 규격 컬럼 추가, 피자 기본가 일괄 버튼 삭제, 양식업로드 카드 하단 이동.
- 재료단가표 초기화 버튼 축소, 일괄 가격 업로드·제품별 사용현황 탭·SortButton 제거.
- 식자재 사용현황 액션 버튼 상단 이동, 제때 업로드 박스 축소, 샘플기록 placeholder 변경.

---

### QA 리포트 통합(N-39~N-44 D배치) — ✅ 2026-06-13

`docs/QA_REPORT_N39-N44_2026-06-13.md` 내용을 이 파일로 통합하고 원본 리포트는 삭제 대상으로 정리.

**리포트 판정**
- 이번 세션에서 구현된 D배치 고위험 6개 항목과 버그 수정 2건 검증 기록.
- ESLint 에러 0, 테스트 140 suites / 793 passed, build 57 pages prerender 성공으로 기록됨.
- 발견 버그 2건은 fix 커밋 `1b15e5f`에서 수정 완료로 기록됨.
- 즉시 추가 수정할 코드 작업은 없음.

**완료 항목 요약**
- N-39: 원가보고서 미연결 메뉴 진단 추가. `detailStoreFor`를 `category-policy.js` 정책함수 기반으로 정리하고, `분류 미매핑`·`메뉴코드 없음`·`레시피 미등록`·`레시피 원가 0` 진단을 보고서에 표시.
- N-40: 제때 최신 파일과 식자재 메타 자동연동. 신규 제때 항목 자동등록, 최신 파일에서 사라진 항목 단종 처리, 뷰어 권한 버튼 비활성화.
- N-41: 메뉴마스터 편집 모달에 레시피 입력 섹션 연결. 카테고리별 detail store 라우팅, 비동기 race 방지, 신규 메뉴 가드 적용.
- N-44①: DB v19 및 `ref_accounts` store 추가, 계정 CRUD와 기본 admin seed, 백업 공통 store 포함.
- N-44②: 계정 관리 UI 추가. 계정 목록, 추가, 전환, 삭제 ConfirmDialog, 마지막 계정 삭제 방지.
- N-44③: 조회자 UI 게이팅 적용. `menu-master`, `ingredient-price`, `ingredient/manage`, `MasterRow`, `InlineEditCell`의 수정 동작을 readOnly 기준으로 차단.

**수정 완료 버그**
- Bug 1: `settings/account` 계정 삭제의 raw `confirm()` 사용을 `ConfirmDialog`로 교체. "되돌릴 수 없습니다." 문구 포함.
- Bug 2: 같은 탭 계정 전환 후 `useCurrentRole`이 즉시 갱신되지 않던 문제를 `rnd:account-changed` CustomEvent와 `storage` listener로 수정.

**보류 항목 정리**
- N-42: 엣지별 알레르기 탭 — 크러스트 변형 기대값 설계 합의 대기.
- N-43: 재료단가표 과거 단가 가져오기 — 조회 전용인지 일시 적용인지 동작 명세 대기.
- N-45·N-46은 이 리포트 작성 시점에는 예시 파일 대기로 표기됐으나, 현재 문서 최신 로그에는 후속 구현 완료로 기록되어 있어 신규 보류 항목으로 추가하지 않음.

---

### QA 리포트 통합(N-45·N-46·B배치) — ✅ 2026-06-13

`docs/QA_REPORT_N45-N46_N배치_2026-06-13.md` 내용을 이 파일로 통합하고 원본 리포트는 삭제 대상으로 정리.

**리포트 판정**
- 이번 세션 구현 항목(N-45·N-46), B배치 기구현 확인(N-01~N-19), C배치 기구현 확인(N-20~N-38) 검증 기록.
- ESLint 에러 0, 테스트 140 suites / 794 passed, build 57 pages prerender 성공으로 기록됨.
- 발견 버그 1건은 `87d6248`에서 수정 완료로 기록됨.
- 즉시 추가 수정할 코드 작업은 없음.

**완료 항목 요약**
- N-45: 영양성분 시험성적서 기반 입력 추가. 크러스트 탭 "성적서" 뱃지, "시험성적서 기반 입력" 체크박스, `certLinked` 저장 반영 검증.
- N-46: 원가보고서 제품원가표 탭 추가. `viewTab`, `groupPizzaLR`, 피자/1인피자 L/R 7컬럼 테이블, 사이드/세트/엣지 4컬럼 테이블, 카테고리 필터와 위험 원가율 색상 검증.
- N-05·N-07·N-09·N-18: 제목 required 제거, CSV→엑셀 명칭 변경, 다크모드 토글 트랜지션, dropzone 축소 검증 완료.
- N-01~N-19 B배치와 N-20~N-38 C배치는 이미 구현된 상태로 재확인됨.

**수정 완료 버그**
- N-07: `settings/backup`과 `note/sample/[id]`에 남아 있던 "CSV" 버튼 텍스트 2건을 "엑셀로 내보내기"로 변경 완료.

**보류 항목 정리**
- N-42: 엣지별 알레르기 탭 — 크러스트 변형 기대값 설계 합의 대기.
- N-43: 재료단가표 과거 단가 가져오기 — 조회 전용인지 일시 적용인지 동작 명세 대기.

---

### QA 리포트 통합(리팩터링 미커밋 변경사항) — ✅ 2026-06-13

`docs/QA_REPORT_REFACTOR_2026-06-13.md` 내용을 이 파일로 통합하고 원본 리포트는 삭제 대상으로 정리.

**리포트 판정**
- N-01~N-19 이후 working tree에 쌓인 리팩터링 변경사항 검증 기록.
- `npm run build` 57페이지, `npm test` 140 suites / 793 tests, ESLint 0 errors로 기록됨.
- 공개 API와 기존 import 경로는 유지된 것으로 판정됨.
- 잔존 style 이슈 1건은 통합 중 바로 정리함.

**완료 항목 요약**
- 판매 분류 규칙과 식자재 seed 대형 데이터를 `lib/sales/data/rules/`, `lib/ingredient/data/`로 분리하고 기존 경로는 re-export shell로 유지.
- `buildAutoPrintScript({ waitForImages, closeAfterPrint })`를 `lib/print/window-print.js`에 추가하고 원가 사용현황, 식자재, 연구일지, 영양 라벨, 원산지 인쇄 스크립트를 공통화.
- `SortableTh`, `ReportModalShell`, `copyText`, `useTableSearchSort.toggleSort` 등 공유 UI/helper 적용.
- `useLocalStorage` stale closure 버그 수정, `useOutsideClick` 테스트 가능 단위 분리, `useTableSearchSort` 초기 정렬 방향 옵션 추가.
- `ingredient/manage` `useCallback` deps 누락 수정, `sales/export-xlsx` 동적 로드를 `loadXlsx` 공통 helper로 통일.
- 신규 테스트: calendar-utils, report-period, useOutsideClick, local-date, sales-rule-matcher, sales-seed-data, ui-browser-helpers.

**수정 완료 버그**
- `hooks/useLocalStorage.js`: `initialValue`·`normalize` stale closure 문제 수정 완료.
- `app/ingredient/manage/page.jsx`: `setCatFilter`, `setTagFilter` deps 누락 수정 완료.
- `lib/note/journal-print.js`: `buildAutoPrintScript` import가 함수 선언 이후에 있던 style 이슈를 통합 작업 중 파일 상단 import로 이동 완료.

**운영 메모**
- 리포트는 당시 "커밋 가능 상태"로 판정했지만, 이 파일 통합 작업에서는 커밋은 수행하지 않음.
- `npx jest` 직접 실행은 ESM 플래그가 없어 실패할 수 있으므로 기존처럼 `npm test` 경로를 사용.

---

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
- **완료 Phase 1(2026-06-13)**: `lib/nutrition/allergen/store.js` dead code 6종 제거 — `MASTER_STORE`·`getAllAllergenMasters`·`getAllAllergenLinks`·`getAllergenLinkByIngredient`·`saveIngredientAllergens`·`deleteAllergenLink` 전부 외부 참조 없음. `ALLERGEN_SEED`·`deleteAllergenLinksByIngredient`·`LINKS_STORE`만 유지. imports에서 `put`·`deleteById` 제거.
- **잔여 Phase 2**: `nutrition_allergy_links` store 정의 제거(constants·module-stores·schema 6곳), `migrate-to-ingredient.js`의 allergen 파트 제거(origin 파트는 유지). store 제거는 브랜드별 DB 마이그레이션·데이터 확인 필요 — 외부 조건 대기.
- **주의**: `deleteAllergenLinksByIngredient`는 `lib/ingredient/store.js` dynamic import에서 여전히 호출됨 — store 제거 후에도 `hasStore` 가드로 no-op 처리되므로 Phase 2 이후에도 안전.

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
- **파일**: `app/ingredient/list/page.jsx`(904줄), `app/note/_NoteContent.jsx`(1017줄) 등
- **참고**: `app/note/calendar/page.jsx`는 이미 분해 완료(370줄) — CalendarGrid·_DayPanel·_ScheduleModal 컴포넌트 + useCalendarData·useCalendarMonth·useCalendarNavigation·useTodayChecklist 훅 분리.
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

#### R-1. `lib/sales/ms9-rules.js` 카테고리별 파일 분리  ✅ 완료(2026-06-13)
- **완료**: `rules-pizza.js`(피자103+1인피자11), `rules-side.js`(사이드26+소스8+추가토핑21+음료5+품목제외20), `rules-edge.js`(엣지10+하프앤하프2), `rules-set.js`(세트29) 4개 파일로 분리.
  `ms9-rules.js`는 4개 import 후 spread → re-export 배럴(17줄)로 교체. 호출처(`classify-rules.js`)는 경로 변경 없음.
  검증: `node --input-type=module` 로드 233룰·카테고리 개수 원본 일치·ruleId 중복 없음. lint 0 · 776 test.

#### R-2. `app/cost/margin/page.jsx` load() 순수 함수 분리  ✅ 완료(2026-06-13)
- **완료**: `lib/cost/margin/build-rows.js` 신규 생성 — `buildRecipeRows`, `buildDetailRows`, `buildEdgeMetadata`, `buildDerivedRows`, `toNum` 5개 순수 함수 추출.
  `load()` 240줄 → 78줄. 제거된 임포트: `calcCostBySizes`, `createDefaultGroupResolver`, `componentSubtotal`, `edgeTotalCost/defaultExpandInMargin/defaultMarginSuffix`.
  패턴: `matching.js`(IO 없음·사이드이펙트 없음·단위 테스트 가능)과 동일.

#### R-3. `app/settings/restore/page.jsx` 분해  ✅ 완료(2026-06-13)
- **완료**: 1124줄 → 366줄. 안전 우선 — 핸들러(handleFile·handleRestore)·핵심 상태는 page 유지.
  - `hooks/useRestoreImpact.js`: impact·dangerRows·wipeRows 순수 derived-state hook.
  - `components/settings/restore/RestoreDoneCard.jsx`: 완료 카드 (섹션6).
  - `components/settings/restore/RestorePreview.jsx`: 미리보기·범위·예상 변경 (섹션2·3·4, 340줄).
  - `components/settings/restore/RestoreExecutePanel.jsx`: 실행·자동백업·진행률 (섹션5, 220줄).
  ESLint 경고 0건.

---

### 🟡 중위험

#### R-4. `TabBase.jsx` 분해 (1153줄)  ✅ 완료(2026-06-13)
- **완료**: 훅 3종 + 컴포넌트 5종 + 순수 헬퍼로 분해. `TabBase.jsx` 1153→218줄(오케스트레이션만).
  - 훅: `hooks/useNutritionBaseEditor.js`(selMenu/selCrust/form/saving·메뉴 CRUD·저장), `hooks/useRecipeNutritionCalc.js`(레시피 기반 자동계산), `hooks/useIngredientNutritionCalc.js`(식자재 영양값+L/R 계산). 공유 `saving`은 base 훅이 소유하고 calc 훅에 `setSaving` 전달.
  - 컴포넌트(`components/nutrition/menu/base/`): `MenuGroupList`, `NutritionInputPanel`, `IngredientCalcModal`, `AutoCalcPreviewModal`, `AddMenuModal`.
  - 순수 헬퍼: `lib/nutrition/values/base-helpers.js`(asRecord·normalizeIngredientName·getCrustSize/Pair·formatCrustPairLabel·formatCalcValue).
  - 동작 보존(로직 무변경). 검증: `lint` 0건, 135 suite/776 test, `build` 통과.
- **부수 수정(별건)**: R-14 분해 시 누락됐던 `app/settings/account/page.jsx`의 `FormField` 미정의 빌드오류를 발견 — `components/settings/FormField.jsx` 공용 컴포넌트로 추출해 account·PinSection 양쪽에서 import(중복 제거 + 빌드 복구).
- **관련**: B-6

#### R-5. `app/ingredient/list/page.jsx` PDF 함수 이동 + hook 분리  ✅ 완료(2026-06-12)
- **완료(부분)**: `lib/ingredient/print.js` 신설 — `printIngredientPdf`, `ingredientName`, `originText`, `allergenText`, `ALLERGEN_MAP` 이동. 페이지에서 관련 인라인 함수 5개 + `ALLERGEN_SEED` import + `openPrintWindow`/`withDownloadDateSuffix` import 제거. hook 분리(`useIngredientCatalogData`, `useIngredientCatalogView`)는 B-5·B-6 연계 대형 작업 — 별도 진행.
- **관련**: B-5, B-6

#### R-6. `app/ingredient/usage/page.jsx` buildIngredientUsageMap 중복  ✅ 완료(2026-06-12)
- **완료**: `hooks/useIngredientUsageRows.js` 신설(usageRows·unusedRows·sorted·nonHidden·displayRows·menuCounts·totalUsedCount 7개 memoized 값 통합). usage/page.jsx의 inline normStr·cleanMenu·makeAddUsage 제거, `load()`에서 `buildIngredientUsageMap` 재사용. 848줄→715줄, useMemo·scopeLabelFor·SCOPE_UNASSIGNED·getUsageMenuCounts 등 import 제거.

#### R-7. `app/cost/ingredient-price/page.jsx` load() 분리  ✅ 완료(2026-06-12)
- **완료(부분)**: `lib/cost/ingredient-price/buildRows.js` 신설(`buildIngredientPriceRows`) — 제때 연동 row·수동 row 빌드 로직 이동. `hooks/useIngredientPriceFilters.js` 신설 — search/taxFilter/deltaFilter/mainCats/filtered 관리. 페이지에서 관련 인라인 useMemo 2개·useState 3개 제거, `sortMainCategories`·`scopeLabelFor`·`SCOPE_UNASSIGNED`·`calcUnitPrice`·`sumCompositePrice` import 제거. `useIngredientPriceData` 훅화는 mountedRef 비동기 패턴 복잡도로 보류.

#### R-8. `app/cost/recipe/page.jsx` 워크벤치 분해  ✅ 완료(2026-06-13)
- **완료(1차, 2026-06-12)**: `hooks/useRecipeWorkbenchData.js` 신설 — 6종 데이터 로드(getAll 7개 + buildPriceRowMap + buildUnitPriceMap) + loading/dbError/reload 캡슐화. page.jsx 851줄→789줄.
- **완료(잔여, 2026-06-13)**: `hooks/useRecipeListState.js` 신설 — 검색·커스텀정렬(localStorage)·드래그(dragSrc/dropTarget) 상태 + 파생 데이터(filtered/ordered/grouped/페이지네이션) + saveOrder/resetCatOrder + `getRecipeSearchText`·`normalizeRecipeSort` 헬퍼 이동. `components/cost/recipe/RecipeSidebar.jsx` 신설 — 좌측 메뉴 목록 카드(검색·드래그 정렬·페이지네이션·원가/마진 표시) 전량 이동. page.jsx 789→344줄. listState 객체 하나 + 데이터/핸들러로 주입.
- **검증**: lint(no-undef 포함) 0 · 776 test · `/cost/recipe` 시드 2건 상호작용(목록 렌더·검색 2→1·선택 시 에디터·새 메뉴 추가) JS 에러 0건.

#### R-9. 보고서 4종 공통 state hook 추출  ✅ 완료(2026-06-12)
- **완료**: `hooks/useReportPageState.js` 신설. `opts`/`docFormat` useState + `makeFieldUpdater` + `useDraftRestore`(opts 복원) 공통 처리. 페이지별 추가 복원은 `onRestoreExtra` 콜백으로 위임. 4개 페이지(`app/report/sales`, `cost`, `shipment`, `menu-sales-compare`)에 적용. 각 페이지의 `useDraftRestore` import → `useReportPageState`로 교체, 불필요 `makeFieldUpdater` import 제거.

#### R-10. `app/cost/all-summary/page.jsx` buildRows → lib 이동  ✅ 완료(2026-06-12)
- **완료**: `lib/cost/shared/buildSummaryRows.js` 신설. `normalizeCategory`, `catRank`, `CAT_ORDER`, `costPathFor`, `detailStoreFor`, `detailComponentCost`, `buildRows` 7종 이동. 페이지에서 관련 import 5개 제거(`calcCostBySizes`, `componentSubtotal`, `calcCostRate`, `MENU_CATEGORY`, `is*Category` 4종). 페이지는 `buildRows, catRank, CAT_ORDER, costPathFor` 4개만 re-import.

#### R-11. `TabSetCalc.jsx` / `TabDerived.jsx` 분해  ✅ 완료(2026-06-13)
- **완료**: `useSetCompositionForm`(`hooks/`) + `useDerivedCompositionForm`(`hooks/`) 추출.
  TabSetCalc 727→667줄, TabDerived 572→460줄.
- **관련**: R-4, B-6

#### R-12. BulkPriceModal 기반 컴포넌트 통합  ✅ 검토 완료(미구현 확정, 2026-06-13)
- **파일**: `components/cost/ingredient-price/BulkPriceModal.jsx`(365줄), `components/cost/menu-price/BulkPriceModal.jsx`(268줄)
- **결론(미구현 확정)**: 두 모달은 **이름만 같고 구조가 완전히 다름** — 등록 당시 전제(StatusBadge·PriceDelta·`idle→parsing→preview→committing` phase 머신·FileUploadZone 양쪽 중복)는 **사실과 다름**. 해당 4요소는 모두 **ingredient-price 전용**이고, menu-price는 수동 폼 입력(phase 머신·파일 업로드·미리보기 전부 없음)임.

  | | menu-price | ingredient-price |
  |---|---|---|
  | 입력 | 수동 폼(코드그룹 가격 직접) | 파일 업로드(CSV/Excel) |
  | phase 머신 | ❌ (`saving` 불리언) | ✅ idle→parsing→preview→committing→done |
  | StatusBadge·PriceDelta·UploadDropzone | ❌ | ✅ |
  | DB 쓰기 | `cost_selling_prices` add/update | `cost_ingredients.priceOverride` bulkPut |

- **왜 미구현**: 실제 공통 표면은 `ModalFrame`·`showToast`·`onClose/onDone` 콜백 가드·`saving/error`·버튼 행 — 앱 내 거의 모든 모달이 공유하는 일반 보일러플레이트뿐. `BulkPriceModalBase` + 전략 주입은 본질적으로 다른 두 UI를 억지로 묶어 **재사용량≈0인데 분기·props만 증가 → 효과 < 회귀 위험**.
- **관련 메모리**: [[deferred-refactors]]

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

#### R-37. `app/styles/features.css` 2차 분리 (7829줄)  ✅ 완료(2026-06-13)
- **완료**: `features/motion.css`(모션 시스템 + UX 개선 2462줄) + `features/home.css`(홈 대시보드 768줄) 분리. globals.css에 import 추가.
  features.css 7829→4599줄. 캐스케이드 순서 유지(features.css 이후 순서대로 import).

#### R-38. 제때 테이블 4종 `useTableSearchSort` 수렴  ✅ 완료(2026-06-12)
- **파일**: `components/jette/ManagedProductsCard.jsx`(389줄), `PriceLatestView.jsx`(344줄), `PriceCompareTable.jsx`(361줄), `ShipmentTable.jsx`(332줄)
- **문제**: 4파일 모두 search·sortKey/sortDir 상태를 각자 중복 구현(`sortByKey`·`usePagination`은 이미 공용).
- **해결 방향**: `hooks/useTableSearchSort.js`(검색+정렬 상태 통합) hook으로 수렴.
- **관련**: R-36

#### R-41. `app/report/sales/page.jsx` 빌더 + 인라인 컴포넌트 분리  ✅ 완료(2026-06-13)
- **완료**: 1160줄 → 984줄.
  - `buildSalesStats(normRows, {year, month, scope})` → `lib/report/build-sales-report.js` 신설(catShares·groupRanking·kpi 계산, R-31 패턴 동일). `CAT_COLORS`도 함께 이동.
  - `MoverRow`·`RankRow` 인라인 컴포넌트 → `components/report/sales/SalesChartRows.jsx`(`SalesMoverRow`·`SalesRankRow`) 분리.
  - `buildGroupRanking`·`safePercentWidth` import 제거. 검증: lint 0 · 776 test · build 통과.
- **관련**: R-31

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

_최종 업데이트: 2026-06-13 — 코드 품질 8종 수정 완료: UTC 날짜 버그(lib/date/local-date.js 신설·4곳 교체), confirm() 10곳 → useConfirmDialog 훅(새 파일)+ConfirmDialog, AreaChart Math.random→useId(), useSettingsAuth storage listener lazy 등록, ShareLinkModal 가짜 링크 비활성화(준비 중 안내), 외부 IP조회 자동→사용자 opt-in, ESLint 전역 예외 2종 → 파일 레벨 축소(no-img-element 3파일·no-unescaped-entities 8파일). 잔여 고위험: 없음. 잔여 중위험: B-3 Phase 2(DB schema, 외부 조건 대기)·B-5·B-6·B-9._
_2026-06-13 — R-41(report/sales 1160→984줄, buildSalesStats→lib·MoverRow/RankRow→SalesChartRows.jsx) 완료. B-6 항목 정정(calendar/page.jsx는 이미 분해 완료). 잔여 고위험: 없음. 잔여 중위험: B-3 Phase 2(DB schema, 외부 조건 대기)·B-5·B-6·B-9._
_2026-06-13 — B-3 Phase 1(allergen/store.js dead code 6종 제거 — 외부 참조 없음) 완료. 테스트 2종(calendar-utils·report-period) 커밋. 잔여 고위험: 없음. 잔여 중위험: B-3 Phase 2(DB schema 제거, 외부 조건 대기)·B-5·B-6·B-9._
_2026-06-13 — R-3(restore/page.jsx 1124줄→366줄, 서브컴포넌트3+hook1 분해) 완료. 잔여 고위험: 없음. 잔여 중위험: B-5·B-6·B-9(외부 조건 대기)._
_2026-06-13 — R-8 잔여(useRecipeListState + RecipeSidebar 분리, recipe/page 789→344줄) 완료. 잔여 중위험: B-5·B-6·B-9 (외부 조건 대기). 착수 가능: R-1·R-2·R-3(고위험)._
_2026-06-13 — `cost/margin` edgeFiltered 런타임 TypeError 수정(숫자 id에 `.startsWith` 호출 — 파생행만 'derived||' 문자열 id라 `String(r.id)` 강제 필요). 타입 가정 버그라 no-undef로는 안 잡힘._
_2026-06-13 — `.eslintrc.json` `no-undef` 상시 활성화 + es2021 env. 훅추출 회귀 3건 수정(런타임 ReferenceError, lint/build/qa:runtime 모두 미검출): `ingredient/usage` nonHidden(R-6)·`report` setEditingId(R-22)·`MarginFilterBar` formatNumber(R-25). [[no-undef-footgun]] 메모리 등록._
_2026-06-13 — R-4(TabBase 1153→218줄, 훅3+컴포넌트5+헬퍼 분해) 완료. account/page.jsx FormField 빌드오류 부수 복구. 잔여 중위험: R-8(잔여), B-5·B-6·B-9._
_2026-06-13 — R-12 검토 후 미구현 확정(두 BulkPriceModal은 이름만 같고 구조 상이 — 등록 전제 오류). 잔여 중위험: R-4·R-8(잔여), B-5·B-6·B-9._
_2026-06-13 — N-배치(B배치/C배치) 완료 요약: N-05(노트작성 제목 required 제거), N-07(CSV→엑셀 명칭 변경: ingredient/list 버튼·menu-master 토스트·lib/download.js 기본파일명), N-09(tokens.css 다크모드 트랜지션 — 전역 * 금지, 주요 구조 요소 한정), N-18(features.css dropzone 패딩/아이콘 축소). 기확인 skip: N-01~04·06·08·10~17·19(이미 구현) + N-20~38(C배치 전부 이미 구현)._
_2026-06-13 — N-45(영양성분 시험성적서 기반 입력): NutritionInputPanel 크러스트 탭에 "성적서" 뱃지 추가(safeRawMap[key].certLinked), NutritionGrid 아래 "시험성적서 기반 입력" 체크박스 추가. useNutritionBaseEditor handleSave의 ...form spread가 certLinked 자동 저장. N-46(제품원가표): report/cost/page.jsx에 viewTab state('report'|'costTable') + 탭 스위처 추가. 피자/1인피자 L/R 7컬럼 그룹 테이블, 사이드/세트/엣지 4컬럼 평면 테이블 신설. groupPizzaLR 순수함수 추가._
_2026-06-13 — 개선 로드맵(docs/IMPROVEMENT_ROADMAP_2026-06.md 계획) N-배치 완료 요약: N-39(원가 미연결 진단 + detailStoreFor 정책함수 교체), N-40(제때↔식자재 자동연동 — newJetteRows 자동등록·jetteRemovedRows 단종처리), N-41(MenuRecipeSection 신설, MenuMasterEditModal 레시피 입력 통합), N-44①②(ref_accounts DB v19, lib/auth/accounts.js, useCurrentRole 훅, settings/account 관리 UI), N-44③(조회자 UI 게이팅 — menu-master·ingredient-price·ingredient/manage 3페이지, InlineEditCell readOnly 프롭, MasterRow readOnly 전파). 보류: N-42(엣지 알레르기, 설계 합의 대기), N-43(과거 단가 동작 명세 대기)._
_2026-06-12 — R-8(부분)·R-31·R-39·R-40 완료. 잔여 중위험: R-4·R-8(잔여)·R-11·R-29·R-30, B-5·B-6·B-9. R-34(journal print 분리)·R-35(report options registry)·R-36(useSectionSearch)·R-38(useTableSearchSort) 구현. R-29~R-40 2차 발굴 등록. B-14 정책(a) 영속 설정만 확정 + B-7 localStorage 백업 범위 확대 구현. 잔여: B-3 legacy store 제거(DB migration), B-5/B-6(회귀위험), B-9(도메인 확인) — 외부 조건 충족 후 진행._
_2026-06-13 — `docs/QA_REPORT_20260613.md` 통합 완료: 즉시 수정 필요 버그 없음, 비긴급 잔존 패턴(`work-log` cutoff UTC·SSR 위험 낮은 Math.random)과 보류 항목(B-3 Phase 2·B-5·B-6·B-9·로컬 인증 경계 문서화)을 본 파일로 이관. 원본 QA 리포트 삭제._
_2026-06-13 — `docs/QA_REPORT_N01-N19.md` 통합 완료: N-01~N-19 저위험 배치 전량 정상, N-05·N-06 발견 버그는 `7f54977`에서 수정 완료, 잔존 이슈 없음으로 기록. 원본 QA 리포트 삭제._
_2026-06-13 — `docs/QA_REPORT_N39-N44_2026-06-13.md` 통합 완료: D배치 N-39·N-40·N-41·N-44①②③ 정상, 버그 2건(raw confirm·useCurrentRole 미갱신)은 `1b15e5f`에서 수정 완료로 기록. N-42·N-43은 외부 설계/명세 대기, N-45·N-46은 후속 완료 로그가 있어 신규 보류로 추가하지 않음. 원본 QA 리포트 삭제._
_2026-06-13 — `docs/QA_REPORT_N45-N46_N배치_2026-06-13.md` 통합 완료: N-45 시험성적서 기반 입력, N-46 제품원가표 탭, B배치(N-05·07·09·18) 및 C배치(N-20~N-38) 기구현 확인. N-07 누락 2건(settings/backup·note/sample/[id])은 `87d6248`에서 수정 완료. 보류는 N-42·N-43만 유지. 원본 QA 리포트 삭제._
_2026-06-13 — `docs/QA_REPORT_REFACTOR_2026-06-13.md` 통합 완료: 대형 seed/rule 데이터 분리, print script 공통화, SortableTh/ReportModalShell/copyText/useTableSearchSort 정리, useLocalStorage stale closure·ingredient/manage deps 수정, 신규 테스트 7종 검증 기록 이관. 잔존 style 이슈였던 `lib/note/journal-print.js` import 위치는 통합 중 수정. 원본 QA 리포트 삭제._
_2026-06-13 — `docs/UI_INSPECTION_2026-06-13.md` 통합 완료: 기존 HIGH 14·MEDIUM 18 완료 이력에 원본 점검 내용을 매핑. LOW 중 L-03·L-04·L-06·L-07 추가 처리, L-01·L-05는 기처리 확인, L-02·L-08·L-09·L-10은 별도 UI 정리 보류로 유지. 원본 UI 점검 리포트 삭제._
_2026-06-13 — UI 점검 라운드 42건 완료: HIGH 14건(즉시 4·나머지 10, 커밋 8c1cd00·cfe0698), MEDIUM 18건(M-01~M-18, 커밋 ed7df1b). 빌드 57페이지 prerender 클린 통과. LOW 10건 보류(N-42·N-43 설계 합의·예시 파일 대기)._
_[이전] B-8·C-2·C-3 완료 표시. 문서 정합성 정정: B-1 파일 경로·B-4 모듈 혼동·C-2 전제·B-3 경로. B-2 저위험 이동._
_[이전] SITE_IMPROVEMENT_AUDIT 통합·삭제. NEXT_TASKS(CL1~CL8) 통합, B-2/C-1/메뉴코드정책 완료 정정._
