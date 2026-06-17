# 메뉴마스터 레시피 입력 UX 및 원가레시피 통합 계획

작성일: 2026-06-17

## 1. 목적

기존에 별도 원가레시피 화면에서 하던 핵심 작업을 메뉴마스터의 `레시피 구성품` 섹션으로 통합한다. 사용자는 메뉴마스터에서 메뉴 정보, 판매가, 레시피 구성품, 공통원가, 총 원가, 원가율, 마진을 한 번에 입력하고 확인할 수 있어야 한다.

이번 작업은 기능 기준 변경이 아니라 입력 UX와 원가 표시 보강이다. 저장 기준은 현재 `menu_recipes` 단일 저장소를 유지한다.

## 2. 현재 구조

- `components/menu-master/MenuRecipeSection.jsx`
  - 레시피 구성품 상태, 식자재 검색어, 추천 목록, 저장 액션을 관리한다.
  - `getMenuRecipeForMenu`, `upsertMenuRecipeForMenu`로 `menu_recipes`를 읽고 저장한다.
  - `summarizeMenuRecipe`로 레시피 요약을 계산한다.
- `components/menu-master/MenuRecipeComponentsTable.jsx`
  - 구성품 테이블 UI를 담당한다.
  - 식자재명 input, 수량 input, 단위 select, 단가 표시, 삭제 버튼을 렌더한다.
  - 현재 추천 드롭다운은 마우스 선택 중심이다.
- `components/menu-master/MenuRecipeSectionHeader.jsx`
  - 총 원가, 원가율, 누락 수량, 누락 단가, 공통묶음 개수를 요약 표시한다.
- `components/menu-master/MenuRecipeGroupSelector.jsx`
  - 메뉴에 적용 가능한 공통원가 묶음을 선택한다.

## 3. 구현 목표

### 0. 저장 후 반영 버그 확인 및 수정

- 현재 사용자 제보:
  - `소스` 카테고리에서 레시피 구성품을 저장해도 원가/요약에 적용되지 않는 문제가 있다.
  - 같은 문제가 `사이드`, `음료`, `세트박스`, `1인피자`, `피자`에도 있는지 함께 확인해야 한다.
- 확인 범위:
  - 메뉴마스터 레시피 저장 직후 해당 행의 `레시피/원가` 요약이 갱신되는지
  - 원가마진표에서 저장한 레시피 원가가 반영되는지
  - 종합전메뉴원가에서 저장한 레시피 원가가 반영되는지
  - 원가 보고서의 레시피/원가 출력에 반영되는지
  - 원산지/알레르기/식자재 사용현황 매핑에 누락이 없는지
- 우선 점검 포인트:
  - `recipeStoreKindForCategory('소스')`가 `side`로 분류되는지
  - `menu_recipes` 저장 payload의 `kind`, `category`, `menuCode`, `size`가 올바른지
  - `loadMenuRecipeMaps()`의 `side` map에 `소스` 레시피가 들어가는지
  - 원가/보고서 builder가 `소스` 카테고리에서 `sideMap`을 참조하는지
- 수정 기준:
  - `소스`는 별도 store를 만들지 않고 현재 정책처럼 `side` 계열 레시피로 저장·조회한다.
  - 단, UI에는 `소스` 카테고리 그대로 표시한다.
  - 저장 직후 `onSaved`/`reload`가 실행되어 메뉴마스터 요약이 즉시 갱신되어야 한다.

### A. 키보드 중심 구성품 입력

- 식자재 검색 드롭다운에서 키보드 조작을 지원한다.
  - `ArrowDown`: 다음 추천 항목으로 이동
  - `ArrowUp`: 이전 추천 항목으로 이동
  - `Enter`: 현재 선택 항목 선택, 선택 항목이 없으면 첫 번째 추천 선택
  - `Escape`: 드롭다운 닫기
- `Enter`는 기본 제출 동작을 막아 저장 버튼이나 모달 submit으로 튀지 않게 한다.
- 추천 항목 선택 후 같은 행의 수량 input으로 자동 focus한다.
- 수량 input에서 `Enter`를 누르면 다음 구성품 입력으로 넘어간다.
  - 다음 행이 있으면 다음 행 식자재 input focus
  - 다음 행이 없으면 새 구성품 행 추가 후 새 행 식자재 input focus
- `+ 구성품 추가` 버튼 클릭 후 새 행의 식자재 input에 자동 focus한다.

### B. 원가레시피 역할 통합 표시

- 구성품별 원가 열을 추가한다.
  - 계산식: `구성품 원가 = 수량 * 단가`
  - 단가 기준은 현재 `unitPriceMap`과 저장된 `unitPrice` fallback 정책을 유지한다.
  - 단가가 없거나 수량이 없으면 `계산 불가` 또는 `단가 없음`을 표시한다.
- 상단 요약을 원가레시피 입력 화면처럼 강화한다.
  - 직접 구성품 원가
  - 공통원가 묶음 원가
  - 총 원가
  - 판매가
  - 원가율
  - 예상 마진
- 원가율 색상 기준을 추가한다.
  - 35% 이상: 주의
  - 40% 이상: 위험
- 공통원가 묶음을 선택하면 요약에 즉시 반영한다.
  - 예: `직접 원가 2,100원 + 공통원가 450원 = 총 2,550원`
- 공통원가 포함 내역은 1차 구현에서는 요약 문구로 표시하고, 필요하면 2차에서 접힘 상세 목록으로 확장한다.

### C. 누락/오류 안내

- 다음 상태를 요약 영역에 명확히 표시한다.
  - 식자재명만 있고 제품코드가 없는 행
  - 수량 없음
  - 단가 없음
  - 구성품 미입력
- 저장은 기존처럼 가능하게 유지한다.
- 원가 보고서 발행 차단은 기존 `strictPosting` 정책과 연결된 상태를 유지한다.

### D. 메뉴명 셀 클릭 편집

- 현재는 행 우측의 수정 버튼을 눌러야 수정창이 열린다.
- 개선 후에는 메뉴명 칸을 클릭해도 같은 수정창이 열리게 한다.
- 조건:
  - `viewer` 권한에서는 클릭 편집을 비활성화한다.
  - 메뉴명 셀에는 클릭 가능 cursor와 hover 상태를 추가한다.
  - 키보드 접근성을 위해 메뉴명 영역에 `button` 또는 `role="button"` + `Enter/Space` 처리를 적용한다.
  - 기존 수정 버튼은 유지한다.

### E. 레시피 이슈 탭 추가

- 메뉴마스터에 `이슈` 탭을 추가해 레시피 작성 상태를 한 번에 볼 수 있게 한다.
- 표시 대상:
  - 레시피 미작성 메뉴
  - 구성품은 있으나 수량이 없는 메뉴
  - 구성품은 있으나 단가가 없는 메뉴
  - 소스/음료/사이드 등 저장 후 원가 반영이 누락된 의심 메뉴
  - 판매가가 없어서 원가율 계산이 불가능한 메뉴
- 이슈 행에서 제공할 액션:
  - 메뉴명 클릭 또는 `수정` 버튼으로 메뉴 수정창 열기
  - 가능하면 레시피 섹션으로 자동 스크롤/focus
  - 카테고리, 사이즈, 현재 상태, 이슈 사유 표시
- 탭 구성 추천:
  - `전체`
  - `레시피 미작성`
  - `수량 누락`
  - `단가 누락`
  - `판매가 누락`
  - `반영 확인 필요`

### F. 메뉴마스터 수정창 레이아웃 개선

- 현재 수정창은 작은 중앙 모달 형태라 메뉴 기본정보, 판매가, 상태, 메모, 레시피 구성품을 한 번에 입력하기에 좁다.
- 수정창이 열릴 때 기존 앱 상단바/배경 UI가 어색하게 같이 보이거나 클릭되는 느낌이 없도록 오버레이와 레이어를 정리한다.
- 개선 방향:
  - 수정창은 `min(960px, 96vw)` 수준의 넓은 편집 패널로 변경한다.
  - 모바일에서는 전체 화면에 가까운 편집 패널로 표시한다.
  - 수정창 내부 상단에 sticky 헤더를 둔다.
    - 메뉴명/메뉴코드/카테고리/상태 요약
    - 닫기, 저장 버튼
    - 저장 가능 여부와 필수값 누락 표시
  - 페이지의 기존 TopBar/Sidebar는 배경으로 dim 처리하고 클릭되지 않게 한다.
  - 배경 TopBar가 모달 위에 올라오지 않도록 z-index 기준을 고정한다.
- 입력 순서:
  1. 메뉴 식별 정보: 메뉴코드, 메뉴명
  2. 분류 정보: 카테고리, 사이즈, 상태
  3. 판매 정보: 판매가, 원산지/알레르기 출력 제외
  4. 레시피/원가: 구성품, 공통원가, 총 원가, 원가율, 마진
  5. 운영 메모
- 편의 기능:
  - 필수 입력값은 상단 요약에서 즉시 표시한다.
  - 메뉴코드는 신규 등록일 때만 강조하고, 수정 시에는 읽기 중심으로 둔다.
  - 레시피 섹션은 더 넓은 영역을 사용해 구성품 테이블이 잘리지 않게 한다.
  - 저장 버튼은 상단 sticky 헤더와 하단 액션 영역에 모두 둘 수 있다.
  - `Esc` 닫기, `Cmd/Ctrl+S` 저장은 유지한다.

## 4. 구현 단계

### 0단계. 소스 포함 레시피 반영 버그 재현 및 수정

- 소스 메뉴 1개를 기준 fixture로 잡는다.
- 메뉴마스터에서 레시피 구성품 저장 후 다음 값을 확인한다.
  - `menu_recipes`에 저장된 record
  - 메뉴마스터 행의 recipe summary
  - 원가마진표 row
  - 종합전메뉴원가 row
  - 원가 보고서 recipeRows
- 같은 검증을 피자, 1인피자, 사이드, 소스, 음료, 세트박스에 대해 최소 1개씩 수행한다.
- 필요한 경우 `recipeStoreKindForCategory`, `detailStoreFor`, `buildDetailRows`, `buildMenuRecipeSummaryMap` 쪽에 소스/음료 카테고리 guard를 추가한다.

### 1단계. 드롭다운 키보드 선택

- `MenuRecipeSection.jsx`
  - `activeSuggestionIdx` 상태 추가
  - `searchIdx`나 `suggestions` 변경 시 active index 초기화
  - `handleIngredientKeyDown(idx, event)` 추가
  - `pickSuggestion` 실행 후 수량 input focus 예약
- `MenuRecipeComponentsTable.jsx`
  - 식자재 input에 `onKeyDown` prop 연결
  - 추천 항목 active 여부 표시
  - 추천 항목을 `button type="button"` 또는 `role="option"` 구조로 변경
  - input에 `role="combobox"`, `aria-expanded`, `aria-activedescendant` 추가

### 2단계. 빠른 연속 입력

- `MenuRecipeSection.jsx`
  - 행별 식자재 input ref, 수량 input ref 관리
  - `focusIngredient(idx)`, `focusQuantity(idx)` helper 추가
  - `addRow`가 새 row key를 반환하거나, pending focus index를 통해 새 행 focus 처리
  - `handleQuantityKeyDown(idx, event)` 추가
- `MenuRecipeComponentsTable.jsx`
  - 식자재 input ref 등록 prop 추가
  - 수량 input ref 등록 prop 추가
  - 수량 input `onKeyDown` 연결

### 3단계. 원가 표시 보강

- `MenuRecipeComponentsTable.jsx`
  - `원가` 열 추가
  - 각 행에 `quantity`, `unitPrice` 기준 subtotal 표시
  - `formatNumber` 또는 기존 format helper 사용
- `MenuRecipeSectionHeader.jsx`
  - 직접 원가, 공통원가, 총 원가, 판매가, 예상 마진 표시
  - 원가율 경고 색상 반영
- 필요하면 `lib/menu-master/recipe-summary.js`에 표시용 필드 추가
  - `directCost`
  - `commonGroupCost`
  - `totalCost`
  - `marginAmount`
  - `costRateTone`

### 4단계. 안내 문구 정리

- 구성품 input placeholder:
  - `식자재명 검색 (↑↓ 이동, Enter 선택)`
- 수량 input title 또는 aria-label:
  - `수량 입력 후 Enter로 다음 구성품`
- 빈 상태 문구:
  - `구성품이 없습니다. 구성품 추가 후 식자재를 검색해 입력하세요.`

### 5단계. 메뉴명 셀 클릭 편집

- `MenuMasterTableRow.jsx`
  - 메뉴명 셀 또는 메뉴명 텍스트에 `onClick={() => onEdit(row)}` 연결
  - `isViewer`면 클릭/키보드 편집 비활성화
  - 접근성 속성 추가: `type="button"` 형태가 가장 안전하다.
- `MenuMasterTablePanel.jsx`
  - 별도 변경 없이 기존 `onEdit` 전달 흐름 유지

### 6단계. 이슈 탭 추가

- `MenuMasterFilterPanel` 또는 메뉴마스터 상단 탭 영역에 `이슈` 진입점을 추가한다.
- 이슈 데이터는 기존 `recipeSummaryMap`과 메뉴 행을 조합해 파생한다.
- 별도 DB 조회를 추가하지 않고 page에서 이미 로드한 `rows`, `recipeSummaryMap`을 재사용한다.
- 이슈 탭의 row click은 기존 수정 모달을 열어 레시피를 바로 보정할 수 있게 한다.

### 7단계. 수정창 레이아웃 개편

- `MenuMasterEditModal.jsx`
  - 모달 폭을 넓히고, 내부를 sticky header + scroll body + footer action 구조로 변경한다.
  - overlay가 TopBar/Sidebar보다 위에 오도록 z-index를 고정한다.
  - 배경 클릭 닫기는 유지하되, 편집 중 실수 방지를 위해 필요하면 확인 단계를 둘 수 있다.
- `MenuMasterEditFields.jsx`
  - 단일 세로 나열 대신 섹션별 배치로 재정렬한다.
  - `기본 정보`, `판매/상태`, `레시피/원가`, `메모/출력 옵션` 그룹으로 나눈다.
  - 레시피 섹션은 넓은 영역을 사용하고, 모바일에서는 세로 배치로 자연스럽게 접는다.
- `MenuMasterIdentityFields.jsx`, `MenuMasterCommercialFields.jsx`
  - 기존 기능은 유지하되 섹션 배치에 맞춰 label, hint, error 표시를 정리한다.
  - 메뉴명 input은 수정창 진입 시 우선 focus 후보로 둔다.

## 5. 테스트 계획

- 새 구조 테스트 후보:
  - `__tests__/lib/menu-recipe-components-keyboard.test.mjs`
  - `__tests__/lib/menu-master-recipe-issues-tab.test.mjs`
- 테스트 항목:
  - `소스` 카테고리 레시피가 `side` 계열로 저장·조회되고 원가 요약에 반영된다.
  - 피자, 1인피자, 사이드, 소스, 음료, 세트박스 카테고리의 레시피 저장 반영 경로가 깨지지 않는다.
  - 식자재 input에 `onKeyDown`이 연결되어 있다.
  - `ArrowDown`, `ArrowUp`, `Enter`, `Escape` 처리가 있다.
  - 추천 목록 active index 상태가 있다.
  - 추천 선택 후 수량 focus 흐름이 있다.
  - 수량 `Enter` 후 다음 행 또는 새 행 focus 흐름이 있다.
  - 구성품별 원가 열 또는 subtotal 표시가 있다.
  - 요약 영역에 판매가, 총 원가, 원가율, 예상 마진 표시가 있다.
  - 메뉴명 셀 클릭 또는 Enter/Space로 수정창을 열 수 있다.
  - viewer 권한에서는 메뉴명 셀 클릭 편집이 비활성화된다.
  - 이슈 탭이 레시피 미작성, 수량 누락, 단가 누락, 판매가 누락 메뉴를 분류한다.
  - 수정창이 넓은 편집 패널 구조를 사용한다.
  - 수정창 내부 sticky header에 메뉴 요약과 저장/닫기 액션이 있다.
  - 수정창 overlay가 TopBar/Sidebar보다 높은 z-index를 사용한다.
  - 수정창 필드 순서가 기본 정보 → 판매/상태 → 레시피/원가 → 메모/출력 옵션 순서다.
- 회귀 테스트:
  - `__tests__/lib/menu-master-page-structure.test.mjs`
  - `__tests__/lib/menu-master-recipe-summary.test.mjs`
  - `__tests__/lib/menu-recipes.test.mjs`
  - `__tests__/lib/common-cost-selection-results.test.mjs`

검증 명령:

```bash
npm run lint
node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/lib/menu-recipe-components-keyboard.test.mjs __tests__/lib/menu-master-recipe-issues-tab.test.mjs __tests__/lib/menu-master-page-structure.test.mjs __tests__/lib/menu-master-recipe-summary.test.mjs __tests__/lib/menu-recipes.test.mjs __tests__/lib/common-cost-selection-results.test.mjs --runInBand --no-coverage
npm run qa:smoke
```

## 6. 완료 기준

- 마우스 없이 구성품을 연속 입력할 수 있다.
- 식자재 검색 결과를 `↑↓`와 `Enter`로 선택할 수 있다.
- 선택 후 수량 입력으로 자연스럽게 이동한다.
- 수량 입력 후 다음 구성품 입력으로 이동한다.
- 메뉴마스터 안에서 기존 원가레시피 수준의 원가 정보가 보인다.
- 공통원가 묶음 선택 여부가 총 원가와 원가율에 반영된다.
- 소스 카테고리 레시피 저장 후 메뉴마스터 요약, 원가마진표, 종합전메뉴원가, 원가 보고서에 반영된다.
- 다른 주요 카테고리도 레시피 저장 후 원가 반영이 깨지지 않는다.
- 메뉴명 칸 클릭으로 수정창을 열 수 있다.
- 이슈 탭에서 레시피 미작성/수량 누락/단가 누락/판매가 누락 메뉴를 확인할 수 있다.
- 수정창은 넓고 읽기 쉬운 편집 패널로 표시된다.
- 수정창 배경의 앱 상단바/사이드바는 클릭되지 않고, 레이어가 어긋나지 않는다.
- 수정창 필드 순서가 실제 입력 흐름에 맞게 정렬되어 있다.
- 기존 `menu_recipes` 저장 형식은 깨지지 않는다.
- lint, 관련 테스트, smoke QA가 통과한다.

## 7. 보류 또는 2차 후보

- 공통원가 묶음의 상세 구성품을 접힘 목록으로 표시
- 구성품 행 복사
- 최근 사용 식자재 우선 추천
- 같은 메뉴 카테고리에서 자주 쓰는 식자재 추천
- 단가 없는 식자재만 필터링해서 빠르게 보정하는 버튼
- 레시피 저장 전 누락 항목 확인 모달
