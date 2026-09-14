# 1차~4차 작업 종합 기록 (2026-09-10 ~ 2026-09-14)

> 이 문서는 2026-09-10~14 사이 한 세션(대화)에서 진행한 **1차·2차·3차·4차 4개 라운드**의 요청·구현·검증 내역을
> 하나로 모은 기록입니다. 각 항목은 실제 코드를 다시 열어 존재 여부를 확인하고, 관련 자동화 테스트를 실행해
> 회귀 여부를 확인한 뒤 상태를 표시했습니다.

## 범례

| 표시 | 의미 |
|---|---|
| ✅ | 코드/테스트로 직접 재확인 — 정상 구현됨 |
| ⚠️ | 이번 재검증 중 문제를 발견함 (아래 "발견된 이슈" 참고) |
| ⏸ | 계획에는 있었지만 보류/미착수 상태로 남음 |

**공통 검증 방법**: `npm run format:check` → `npm run test:ci`(전체 스위트) → `npx next lint` — 4차 커밋 시점 기준
**368 suites / 2446 tests 전부 통과**, ESLint 경고 0건. 1·2·3차는 각 라운드 커밋 시점에 동일한 3단계 검증을 거쳤고,
이번 재검증에서는 해당 라운드가 만든 핵심 파일/함수가 지금도 코드에 남아 있는지, 삭제·회귀되지 않았는지를 grep과
직접 코드 읽기로 다시 확인했습니다.

---

## 1차 — 22건 기능개선·버그수정 (2026-09-10 11:43~13:13)

사용자가 22개 항목을 번호로 나열한 뒤 "일단 1차로 이것들 수정할거야, 계획부터 만들어줘"로 시작. 승인 후
"계속진행해줘 끝나면 확인점검 커밋하고 다음단계 진행"이라는 지시가 이후 전체 세션(1~4차)의 진행 방식이 됨.

### ⚠️ 착수 전 발견된 별도 사고 — Phase 0
이전 세션 작업 중 `scripts/register-*.ps1` 스크립트가 `New-Item -Force`로 **Windows 자동시작 레지스트리 값 5개**
(사이트 자동시작·카카오톡·Edge·Adobe 동기화·SmartBridgeLauncher)를 지운 사실을 발견 — 복구 후 재발 방지.

| 항목 | 내용 | 상태 | 커밋 |
|---|---|---|---|
| Phase 0 | 지워진 레지스트리 값 5개 복구 + 스크립트 3개에 `Test-Path` 가드 추가 | ✅ 재확인: `register-site-autostart.ps1`/`register-db-backup-autostart.ps1`/`register-db-autostart.ps1` 전부 `Test-Path` 가드 존재 | `ad84eda5` |
| 2·3 | 메뉴마스터 수정 모달 — 외부클릭 닫힘 제거, 모달 크기 확대 | ✅ | `2ab5aa22` |
| 4 | 식자재 자동완성 드롭다운 race-condition 수정 (계획의 "최근 사용 추천 복원"은 과거에 의도적으로 뺀 기능임을 확인하고 범위에서 제외) | ✅ | `2ab5aa22` |
| 8 | 메뉴명 행 클릭 시 바로 수정 진입 | ✅ | `2ab5aa22` |
| 15 | 연구일지 저장/취소 후 노트목록으로 안 돌아가던 버그 수정 | ✅ | `2ab5aa22` |
| 16 | 필터/검색어 잔류 → "필터 초기화" 버튼 추가 | ✅ | `2ab5aa22` |
| 18 | 샘플 폼 카테고리 기본값을 첫 옵션으로 | ✅ | `2ab5aa22` |
| 19 | 저장/취소 버튼 sticky 처리 | ✅ | `2ab5aa22` |
| 20 | "이전차수복제" 항목별 평가 기본 접힘 | ✅ | `2ab5aa22` |
| 17 | 노트 작성 4종(메뉴개발/개선/샘플테스트/제품이슈) UI 통일 — 작성 화면만 중복 SegGroup 제거, 수정 화면은 유지(레코드 타입 변경 수단 보존) | ✅ | `6848bc91` |
| 5·7 | 메뉴 단종(영구) 전용 뷰 + 판매순위 단종 배지, 숨김(임시) 필드/토글 | ✅ — 이후 3차에서 이 배지 체계를 비정규메뉴까지 확장 | `41b62285` |
| 22 | 레시피 구성품 드래그 순서변경(@dnd-kit) | ✅ | `8f79f997` |
| 9 | 메뉴마스터 사진 등록(단일 슬롯) | ✅ | `28f2d2e3` |
| 6 | 원가/레시피 변경 이력 + 버전 비교 (신규 store `menu_recipe_versions`, DB v26→v27) | ✅ 재확인: `lib/db/constants.js`·`module-stores.js`에 store 정의 존재, `components/menu-master/recipe/MenuRecipeVersionHistory.jsx` 존재 | `47b25e97` |
| 10·11 | 메뉴마스터↔베이스영양성분 코드 매칭 버그(양방향) 수정, 베이스영양성분 메뉴명/코드 수정 UI + raw_values cascade | ✅ | `3237d32e` |
| 13 | 단종 메뉴(L/R 전부 단종일 때만) 영양성분 숨김 | ✅ | `3237d32e` |
| 12 | "1인용피자" 전용 크러스트 타입 신설 + 기존 씬바사삭L 데이터 3건 자동 이관. **알레르기 표기는 기존 `씬바사삭L` 키 그대로 유지**(법적 표기 회귀를 코드리뷰 중 발견해 되돌림) | ✅ 재확인: `lib/nutrition/allergen/rules.js`의 `EDGE_ALLERGEN_RULES`가 지금도 `씬바사삭L` 기준 유지, 관련 테스트 `nutrition-personal-pizza-crust.test.mjs` 등 9개 파일에서 참조 | `bdcaf42f` |
| 1 | 모회사 "태명F&T" 표시 계층(사이드바/TopBar/로그인/에러페이지) — DB 브랜드 분리 로직은 불변 | ✅ | `501ecc0c` |
| 14 | `-OnBoot` 스위치로 로그인 전 부팅 시점 자동 시작 등록 | ✅ | `78496f49` |
| 21 | 일정 달력 "자동 일지"에 레시피/원가/영양성분 변동 기록 — 계획엔 있었지만 Phase 배정이 안 된 채 남았다가, 3차 직전(09-11 10:49)에 별도로 완료 | ✅ | `4107449d` |

---

## 2차 — 실사용 중 발견한 6건 (버그 1 + 기능 5) (2026-09-10 16:30~17:33, 보강은 09-11 오전)

| 항목 | 내용 | 상태 | 커밋 |
|---|---|---|---|
| 1 | **[데이터 손실 버그]** 메뉴마스터 중분류 변경 시 레시피 구성품이 통째로 사라짐. 원인: 중분류 변경으로 `menuCode`가 바뀌는 순간 조회 effect가 화면을 비운 뒤, 그 빈 상태로 방금 이관된 새 코드의 레시피를 덮어씀 → 조회 기준을 모달 오픈 시점의 `sourceMenuCode`로 분리해 해결. **고아 레시피 복구 배너**도 함께 추가 | ✅ 재확인: `useMenuRecipeEditor.js`/`MenuRecipeSection.jsx`/`MenuMasterEditFields.jsx`에 `sourceMenuCode` 사용 확인, `components/menu-master/MenuRecipeOrphanBanner.jsx`가 `app/menu-master/page.jsx`에서 실제로 렌더됨 | `a17b2602` |
| 3 | 연구일지 날짜 입력을 즉시반영 → `dateDraft` + "조회" 버튼(Enter 지원) 방식으로 변경 (화살표/빠른날짜는 즉시반영 유지) | ✅ | `d8390c41` |
| 5 | 추가토핑 원가계산 — 메뉴마스터에 신규 kind(`topping`) 편입, `T-{SUB}-{NNN}` 코드체계, 마진표/보고서 반영, 영양 토핑마스터 일괄 가져오기 | ✅ | `1283324f` |
| 6 | 메뉴마스터에 영양성분 연동 상태 칩(연동/누락) + 실제 라벨 출력 미리보기, `buildNutritionLabelContext()` 공용화 | ✅ 재확인: `app/menu-master/page.jsx`·`components/menu-master/MenuMasterTableRow.jsx`에 연동 상태 칩 로직 존재, `lib/nutrition/label/context.js`의 `buildNutritionLabelContext`가 4차 `allergen-summary.js`에서도 참조됨(계획 문서에 무거운 대안으로 명시) | `c2bb32a8` |
| 2·4 | 새 store 없이 `price_files`/`price_rows`+`menu_recipe_versions`만으로 원가 변동 재구성, 버전 비교 UI 개선 | ✅ | `1e3c8b42` |
| 4 | 홈 대시보드 "원가 변동한 메뉴" 위젯 — 하드코딩된 빈 슬롯을 실제 데이터로 연결 | ✅ 재확인: `components/home/MenuCostChangeWidget.jsx` 존재 | `021bdcec` |
| (재검증 중 발견) | 원가마진표에서 추가토핑 메뉴 13건이 카테고리→레시피맵 매핑 누락으로 통째로 빠지던 버그 | ✅ 완료 처리됨 | `c9ee0f93` |

**2차 직후 후속 확장 (09-11 오전)**: "주문 시 추가토핑"(예: 치즈 100g 추가) 개념을 별도 화면(`/cost/topping`)으로 구현 —
5번 항목(메뉴로 등록하는 추가토핑)과는 구분되는 새 요청. ✅ 재확인: `app/cost/topping/page.jsx` 존재.
관련 커밋: `98b54326`, `d6a0bac6`, `c3183a5a`.

---

## 3차 — 판매량 보고서 "단종"/"비정규메뉴" 배지 (2026-09-11 전후, 사용자 피드백 다회 반영)

메뉴마스터에 없는 판매명을 순위표에서 바로 단종(비정규메뉴) 처리하는 기능. 사용자가 스크린샷으로 여러 차례
버그를 잡아준 뒤 완성됨(오표기·× 버튼 혼동·PDF 미표시 등).

| 항목 | 내용 | 상태 | 커밋 |
|---|---|---|---|
| 기본 기능 | menu_master 미등록 판매명에 "+ 단종" 버튼 → 클릭 시 비정규메뉴로 등록 | ✅ 재확인: [SalesRankTableRows.jsx](components/report/sales/SalesRankTableRows.jsx) `+ 단종` 버튼·`onMarkIrregular` 정상 | `83b09a25` |
| 되돌리기 | 비정규메뉴 해제(×) + 버튼 명칭을 "단종"으로 축약 | ✅ 재확인: [IrregularMenuBadge.jsx](components/sales/IrregularMenuBadge.jsx)의 `onUnmark` × 버튼 정상 | `fcff2ad6` |
| 메뉴마스터 기반 오표기 해제 | menu_master status 기준 "단종" 오표기도 화면에서 바로 해제 | ✅ 재확인: [DiscontinuedBadge.jsx](components/sales/DiscontinuedBadge.jsx) `onUnmark`, `page.jsx`의 `handleUndiscontinue` 정상 | `2ff68c20` |
| 전체 해제 | "전체 단종 해제" 일괄 버튼 | ✅ 재확인: [SalesDiscontinuedBulkFix.jsx](components/report/sales/SalesDiscontinuedBulkFix.jsx)가 [SalesReportPreview.jsx](components/report/sales/SalesReportPreview.jsx)에 정상 연결, `count`·`canEdit`·`onUndiscontinueAll` 배선 확인, `handleUndiscontinueAll`이 `page.jsx`에 존재 | `cd8d4a28` |
| UX 구분 | "+ 단종" 마크 버튼과 상태 배지를 시각적으로 구분 (사용자가 "단종x가 없어"로 혼동을 지적해서 수정) | ✅ | `cfd57490` |
| 인쇄/PDF | 다크모드 테마색이 인쇄 시 흰 배경 위에서 안 보이던 문제 — 인쇄 전용 고정 고대비 색 오버라이드 | ✅ 재확인: [lib/report/print.js](lib/report/print.js)에 `.discontinued-badge`/`.irregular-menu-badge` `@media print` 오버라이드 존재 | `6b6f929b` |

### ⏸ 3차 관련 미해결 항목 — "엣지&도우" 카테고리 배지 누락
판매량 보고서의 "엣지&도우" 카테고리(석쇠·치즈크러스트·골드스윗·씬바사삭 등) 순위표에서만 단종/비정규메뉴
배지와 "+ 단종" 버튼이 전혀 표시되지 않음. 2026-09-14에 사용자가 스크린샷으로 확인, **"일단 보류, 나중에
할 작업에 넣어줘"**로 명시적으로 보류 요청함. 자세한 원인 추정과 재개 시 체크리스트는 별도 메모리
(`project_sales_discontinued_badge_edge_category_gap`)에 기록되어 있음 — 아래 "남은 작업" 참고.

---

## 4차 — 식자재 관리 4건 + 메뉴마스터 알레르기 연동 + 사이드바 접기 (2026-09-14)

| 항목 | 내용 | 상태 | 커밋 |
|---|---|---|---|
| ③ 사이드바 접기 | 데스크톱 전용 아이콘 레일 접기/펼치기, localStorage 유지 | ✅ 재확인: [AppShell.jsx](components/AppShell.jsx)·[Sidebar.jsx](components/Sidebar.jsx)의 `sidebarCollapsed`/`normalizeSidebarCollapsed` 배선 정상 | `0a446fdf` |
| ② 메뉴마스터 알레르기 열 | 목록에 '알레르기' 열 추가, 레시피 기준 자동 집계(이름 나열), 레시피 없으면 "레시피 없음" | ✅ 재확인: [lib/menu-master/allergen-summary.js](lib/menu-master/allergen-summary.js) 로직 정상, `menu-master-allergen-column.test.mjs` 7개 통과 | `087f8c88` |
| 1-3 공급업체 연결 | 이름 일치 시 공급업체↔제조사 자동 연결 + 제조사 입력칸 자동완성 | ✅ 재확인: [lib/cost/suppliers/link.js](lib/cost/suppliers/link.js) 정규화·매핑 로직 정상, `suppliers-link.test.mjs` 14개 통과 | `16da397b` |
| 1-2 1개당 g | 포장단위 '개'일 때 "1개당 g" 입력 + g당 원가 자동 계산 | ✅ 재확인: `normalize.js`/`crud.js`/`index.js`/`dedupe-repair.js`/`product-replace.js`/`import.js` 6개 저장 경로 전부에 `pieceWeightGrams` 반영됨(누락 없음 확인) | `2cabc0d5` |
| 1-1 원산지·알레르기 표시 | 목록 행에 개수 대신 실제 이름 표시. **사용자가 스크린샷으로 "제품명 옆이 아니라 제때 연동 정보 박스처럼 대시보드 스타일로"** 요청해 인라인 텍스트 → 테두리 박스형 미니 카드로 재작업 | ✅ 재확인: [ManageRowNameCell.jsx](components/ingredient/manage-row/ManageRowNameCell.jsx)의 `.ingredient-row-dash` 카드 정상 | `2cabc0d5`(최초) → `e6ebe849`(대시보드 스타일 재작업) |
| 1-4 UI 정리 | 모달 짧은 필드쌍 2열 그리드, 목록 표 행간격, 상단 필터 칩 정리 (기능·데이터 무변경) | ✅ 재확인: `ingredient-manage-ui.test.mjs` 6개 통과 | `3882a71b` |

4차는 매 항목마다 `format:check`→`test:ci`(368 suites/2446 tests)→`next lint` 3단계 검증 후 커밋 — 전부 통과 확인됨.

---

## 이번 재검증에서 발견된 이슈

**없음.** 1~4차에서 언급된 핵심 파일·함수·store·테스트를 모두 grep/직접 읽기로 재확인했고, 전체 테스트
스위트(368 suites / 2446 tests)와 lint가 현재 기준으로도 전부 통과합니다. 코드가 삭제되거나 조용히 되돌아간
항목은 발견되지 않았습니다.

---

## 남은 작업

1. **[유일한 미해결 항목] 판매량 보고서 "엣지&도우" 카테고리 배지 누락** — 다른 카테고리(피자·사이드 등)는
   정상 표시되는데 이 카테고리만 단종/비정규메뉴 배지·버튼이 안 뜸. 원인 후보: 이 카테고리가
   `SalesRankTableRows` 트리를 안 쓰거나(스크린샷의 가로 막대 UI는 `SalesCategoryBarRows` 계열로 보임),
   `groupRanking` 소스가 다르거나 별도 렌더 경로를 씀. 사용자가 명시적으로 보류 요청 — 재개 시:
   1) 해당 카테고리가 실제로 어느 컴포넌트로 렌더되는지 확정
   2) 그 컴포넌트에 `item.discontinued`/`item.irregular`/`item.unregistered`, `canEdit`/`onMarkIrregular`/
      `onUnmarkIrregular`/`onUndiscontinue`가 전달되는지 확인
   3) 3차에서 만든 배지/버튼 배선 패턴을 동일 적용
2. 그 외 1~4차 계획에 있던 항목 중 미구현으로 남은 것은 없습니다. (`docs/DEFERRED_WORK.md`는 이 1~4차와
   무관한, 훨씬 이전 시점부터 이어져 온 별도의 상시 정비 백로그이며 이 문서의 범위 밖입니다.)
