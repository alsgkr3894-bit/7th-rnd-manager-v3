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
- `components/menu-master/MenuMasterIdentityFields.jsx`
  - 메뉴코드, 메뉴명, 카테고리, 규격 입력 필드를 담당한다.
  - 현재 `규격(사이즈)`은 일반 input이라 `L/R/단일` 선택 흐름이 약하다.
- `components/ui/ComboBox.jsx`
  - 직접 입력과 드롭다운 선택을 함께 지원한다.
  - 규격 드롭다운, 식자재 검색, 원산지 추천 같은 입력 개선에 재사용 가능하다.
- `app/ingredient/manage/IngredientSettingsPanel.jsx`
  - 식자재관리의 `분류·태그` 탭 UI를 담당한다.
  - 현재 분류/태그 칩과 삭제 버튼만 있어 정리 후보, 검색, 사용량 확인 흐름이 약하다.
- `app/ingredient/manage/IngredientForm.jsx`
  - 식자재 추가/수정 모달을 담당한다.
  - 현재 입력 순서는 제때 가져오기 → 재료명 → 사진 → 기본정보 → 원가 → 원산지/알레르기 → 사용현황이다.

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

### G. 메뉴마스터 규격 드롭다운

- `규격(사이즈)` 입력을 일반 input에서 선택 가능한 드롭다운으로 바꾼다.
- 권장 방식은 기존 `ComboBox` 재사용이다.
  - `L`, `R`, `단일` 같은 기본 규격을 빠르게 선택할 수 있다.
  - 음료, 세트, 브랜드별 예외 규격은 직접 입력으로 살릴 수 있다.
- 기본 후보:
  - 피자/세트박스: `L`, `R`
  - 그 외 기본: `단일`
  - 기존 저장값이 기본 후보에 없으면 후보 목록에 포함한다.
- 카테고리 변경 시:
  - 규격이 비어 있으면 기본 후보 첫 값을 제안한다.
  - 이미 입력된 커스텀 규격은 덮어쓰지 않는다.
- Enter 키로 후보 선택이 가능해야 한다.

### H. 식자재관리 설정/입력 UI 정리

- `분류·태그` 설정 탭을 관리하기 좋게 재배치한다.
  - 상단 요약: 분류 수, 태그 수, 미분류 수, 단종 수
  - 분류 영역과 태그 영역을 별도 섹션으로 분리
  - 사용량 0개인 분류/태그는 `정리 후보`로 표시
  - 분류/태그가 많아졌을 때 검색 또는 간단 필터를 제공
- 삭제 흐름은 기존처럼 확인 단계를 유지한다.
  - 삭제 대상과 영향 범위가 명확히 보이게 한다.
  - 삭제 후 해당 식자재 자체는 유지된다는 문구를 유지한다.
- 식자재 추가/수정 모달은 실제 입력 순서에 맞춰 정리한다.
  1. 제때 단가에서 가져오기
  2. 기본정보: 재료명, 제품코드, 제조사, 단종
  3. 분류/태그
  4. 단가/포장단위: 포장수량, 단위, 과세구분, 수동단가, 보관온도
  5. 원산지/알레르기
  6. 사진/비고
  7. 기존 식자재 사용현황
- 모달 개선:
  - 폭을 넓혀 관련 필드를 2열로 묶는다.
  - 저장/취소 버튼은 긴 입력 중에도 접근하기 쉽게 하단 고정 또는 sticky footer로 둔다.
  - 제때 연동 항목은 수정 불가 값과 수동 입력 값을 시각적으로 분리한다.
  - 모바일에서는 모든 필드가 한 열로 자연스럽게 접히게 한다.

### I. 추가 보완 및 버그 검사 항목

- 레시피 저장 반영 버그:
  - `소스` 외에도 피자, 1인피자, 사이드, 음료, 세트박스에서 저장 직후 원가 요약이 반영되는지 확인한다.
  - 메뉴마스터, 원가마진표, 종합전메뉴원가, 원가 보고서가 같은 결과를 보는지 확인한다.
- 공통원가 적용:
  - 메뉴마스터에서 체크한 공통원가가 직접 원가와 합산되는지 확인한다.
  - 공통원가에 연결된 식자재의 알레르기/원산지가 해당 메뉴 출력에 포함되는지 확인한다.
- 단가 기준:
  - 제때 연동 품목은 최신 제때 단가를 사용한다.
  - 수동 입력 품목은 수동 단가를 최신값으로 사용한다.
  - 단가가 없는 식자재는 원가 누락 이슈로 표시한다.
- 원산지/알레르기:
  - 단일 메뉴 출력에서는 원산지/알레르기가 메뉴 기준으로 합산되는지 확인한다.
  - 공통원가, 엣지, 도우, 수동 식자재가 누락되지 않는지 확인한다.
- 권한:
  - viewer는 편집, 삭제, 저장, 자동등록 버튼이 막혀야 한다.
  - 관리자만 데이터 덮어쓰기/초기화/시드 실행이 가능해야 한다.
- UI 회귀:
  - 모달이 TopBar/Sidebar 뒤로 깔리지 않아야 한다.
  - 긴 메뉴명, 긴 식자재명, 많은 태그가 테이블과 모달을 깨뜨리지 않아야 한다.
  - 키보드 Enter가 의도치 않게 저장/닫기를 실행하지 않아야 한다.

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

### 8단계. 규격 드롭다운 적용

- `MenuMasterIdentityFields.jsx`
  - `규격(사이즈)` input을 `ComboBox`로 교체한다.
  - `defaultSizesFor(form.category)` 또는 동일 정책 helper로 기본 후보를 만든다.
  - 현재 `form.size`가 후보에 없으면 후보 배열에 포함한다.
  - 카테고리 변경 시 빈 규격에만 기본값을 제안한다.
- `MenuMasterEditModal.jsx`
  - 저장 payload의 `size` 정규화 정책은 기존처럼 빈 값은 `null`, 입력값은 trim 후 저장한다.

### 9단계. 식자재관리 설정 탭 정리

- `IngredientSettingsPanel.jsx`
  - 상단 summary row 추가: 분류 수, 태그 수, 미분류 수, 단종 수
  - 분류/태그 섹션을 카드 또는 섹션 단위로 분리한다.
  - 검색어 상태를 추가해 분류/태그가 많을 때 좁혀볼 수 있게 한다.
  - 사용량 0개 항목은 `정리 후보` 표시를 붙인다.
- `app/ingredient/manage/page.jsx`
  - 필요한 count 값을 `IngredientSettingsPanel`로 전달한다.
  - 기존 삭제 confirm 흐름은 그대로 유지한다.

### 10단계. 식자재 추가/수정 모달 정리

- `IngredientForm.jsx`
  - 모달 폭과 내부 레이아웃을 입력 중심으로 확장한다.
  - sticky footer 또는 하단 고정 action 영역을 추가한다.
  - 입력 순서를 기본정보 → 분류/태그 → 단가/포장 → 원산지/알레르기 → 사진/비고로 재배치한다.
- `BasicIngredientFields.jsx`, `IngredientCostFields.jsx`
  - 관련 필드를 2열 grid로 묶되 모바일에서는 1열로 접는다.
  - 제때 연동 항목에서는 수정 불가 출처값과 직접 입력 가능값을 명확히 구분한다.

### 11단계. 추가 버그 검사 및 보완

- 레시피 저장 후 반영 경로를 카테고리별 fixture로 고정한다.
- 공통원가 선택, 원산지/알레르기 합산, 단가 누락 이슈를 같은 테스트 묶음에서 확인한다.
- viewer/admin 권한별 버튼 disabled, 저장 차단, 삭제 차단을 점검한다.
- 메뉴마스터와 식자재관리 모달을 desktop/mobile viewport에서 확인한다.

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
  - 규격 드롭다운이 `L/R/단일` 후보를 보여주고, 커스텀 규격 직접 입력을 유지한다.
  - 카테고리 변경 시 빈 규격에는 기본 후보가 제안되고, 기존 커스텀 값은 덮어쓰지 않는다.
  - 식자재관리 `분류·태그` 탭에서 summary, 검색, 정리 후보 표시가 동작한다.
  - 식자재 추가/수정 모달에서 신규, 복사 추가, 제때 연동, 수동 입력 저장이 모두 동작한다.
  - 공통원가에 포함된 식자재의 원산지/알레르기가 메뉴 출력에 누락되지 않는다.
  - viewer 권한에서 메뉴마스터/식자재관리 편집 액션이 막힌다.
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
- 규격은 드롭다운으로 빠르게 선택할 수 있고, 필요하면 직접 입력할 수 있다.
- 식자재관리 설정 탭에서 분류/태그 상태와 정리 후보를 바로 파악할 수 있다.
- 식자재 추가/수정 모달의 입력 순서가 실제 등록 흐름에 맞다.
- 제때 연동 품목과 수동 입력 품목의 단가 기준이 화면에서 혼동되지 않는다.
- 기존 `menu_recipes` 저장 형식은 깨지지 않는다.
- lint, 관련 테스트, smoke QA가 통과한다.

## 7. 보류 또는 2차 후보

- 공통원가 묶음의 상세 구성품을 접힘 목록으로 표시
- 구성품 행 복사
- 최근 사용 식자재 우선 추천
- 같은 메뉴 카테고리에서 자주 쓰는 식자재 추천
- 단가 없는 식자재만 필터링해서 빠르게 보정하는 버튼
- 레시피 저장 전 누락 항목 확인 모달
- 식자재 병합 wizard: 같은 제품코드/유사 이름/동일 원산지 식자재 후보를 안전하게 병합
- 원산지/알레르기 영향 미리보기: 레시피 저장 전 출력 결과가 어떻게 바뀌는지 표시
- 식자재 설정 탭에서 분류/태그 이름 변경 기능
- 대량 식자재 편집: 분류, 태그, 전용/범용, 단종 상태 일괄 변경
- 메뉴마스터 이슈 탭에서 `바로 수정`, `레시피 섹션으로 이동`, `단가 보정으로 이동` 빠른 액션

## 8. Claude Code 작업 우선순위 체크리스트

> **전 항목 완료 (2026-06-17)** — P0~P5 모두 구현·테스트·커밋 완료.
> lint 0 / 1343 tests / 22/22 smoke QA 통과.

### P0. 먼저 고쳐야 할 버그 ✅ 완료

- ✅ `소스` 카테고리 레시피 저장 후 원가/요약 미반영 버그 재현 및 수정 (`recipeStoreKindForCategory` 확인, side 정책 검증)
- ✅ 피자, 1인피자, 사이드, 소스, 음료, 세트박스 저장 반영 경로 전체 확인 (`menu-master-p0-audit.test.mjs`)
- ✅ 레시피 저장 직후 메뉴마스터 row, 원가마진표, 종합전메뉴원가, 원가 보고서가 같은 원가를 보는지 확인
- ✅ 공통원가 체크 후 메뉴 원가, 원가율, 원산지, 알레르기 출력에 반영되는지 확인 (`common-cost-selection-results.test.mjs`, `nutrition-allergen-aggregate.test.mjs`)
- ✅ viewer/admin 권한별 편집, 삭제, 저장, 초기화, 데이터 덮어쓰기 버튼 상태 확인

### P1. 입력 편의성 개선 ✅ 완료

- ✅ 레시피 구성품 드롭다운 키보드 조작 (ArrowUp/Down/Enter/Escape, `menu-recipe-components-keyboard.test.mjs`)
- ✅ 구성품 선택 후 수량 focus, 수량 Enter 후 다음 행 이동
- ✅ 메뉴마스터 규격 `ComboBox` 드롭다운 적용 (`MenuMasterIdentityFields.jsx`, `menu-master-size-combobox.test.mjs`)
- ✅ 메뉴명 셀 클릭/Enter/Space로 수정창 열기 (`MenuMasterTableRow.jsx` button type="button")
- ✅ 수정창 넓은 패널, sticky header/footer, TopBar z-index 문제 정리 (`MenuMasterEditModal.jsx` createPortal, 960px)

### P2. 식자재관리 UI 정리 ✅ 완료

- ✅ `분류·태그` 설정 탭 summary, 검색, 정리 후보 표시 추가 (`IngredientSettingsPanel.jsx`, `ingredient-settings-panel.test.mjs`)
- ✅ 식자재 추가/수정 모달 입력 순서 재배치 (`IngredientForm.jsx` 10단계, sticky header/footer, `ingredient-form-layout.test.mjs`)
- ✅ 제때 연동 품목과 수동 품목의 단가/수정 가능 영역 분리 (`JetteLinkedSourcePanel` + "직접 수정 가능한 항목" 섹션 헤더 + `IngredientCostFields` 안내 문구)
- ✅ 긴 식자재명, 많은 태그, 많은 원산지/알레르기 선택 시 레이아웃 깨짐 확인 (820px 폭 + flex 레이아웃)

### P3. 회귀 테스트와 QA ✅ 완료

- ✅ 카테고리별 레시피 저장 fixture 추가 (`menu-master-p0-audit.test.mjs` 26건)
- ✅ 공통원가 + 원산지/알레르기 합산 테스트 추가 (기존 테스트 확인 + 유지)
- ✅ 규격 드롭다운 후보/커스텀 값 유지 테스트 추가 (`menu-master-size-combobox.test.mjs` 14건)
- ✅ 식자재 설정 탭과 식자재 모달 구조 테스트 추가 (`ingredient-settings-panel.test.mjs` 14건, `ingredient-form-layout.test.mjs` 11건)
- ✅ `npm run lint`, 관련 jest, `npm run qa:smoke` 통과 후 커밋

## 9. 추가로 할만한 작업 후보

코드 스캔 기준으로 이번 계획 이후 이어서 처리하면 좋은 항목이다.

### A. 침묵 실패/경고 노출 보강 ✅ 완료 (DEFERRED_WORK B-21)

- ✅ 사용자 액션 실패(저장·삭제·복원·출력)는 모두 toast 노출 처리됨
- ✅ optional/background 빈 catch는 `silent-catch-policy.test.mjs` allowlist로 고정
- ✅ cascade 실패(`cascadeErrors`), undo 실패(`restoreRecord`) 화면 노출
- 참고: `lib/ingredient/store.js`의 `validateCompositeRefs` · `logWork` 실패는 의도된 background 경고로 분류 유지

### B. 식자재 폼 controller 분리 ✅ 완료 (2026-06-17)

- ✅ `useIngredientFormController.js` 신규 생성 — 저장/검증/사진 처리/제때 draft 적용/dirty 상태 분리
- ✅ `IngredientForm.jsx`: 486→215줄 (refs + JSX 렌더링만)
- ✅ 관련 테스트 controller 파일 참조 업데이트 (`ingredient-form-layout.test.mjs`, `p4-accessibility-guards.test.mjs`)

### C. 드롭다운/추천 입력 공통화 ✅ 정책 테스트 완료 (2026-06-17)

- ✅ `ComboBox`: ArrowUp/Down/Enter/Escape + `e.preventDefault()` 확인
- ✅ `MenuRecipeSection`: Enter preventDefault + ArrowUp/Down/Enter/Escape 확인
- ✅ `p5-dropdown-perf-guards.test.mjs`로 keyboard 정책 구조 고정
- 구현 통합(ComboBox 단일화)은 회귀 위험 대비 효과 낮음 → 보류 유지

### D. 제때 단가 가져오기 UX 보강 ✅ 기본 완료

- ✅ `JettePriceImportField.jsx`: 제품코드/품목명/단가/과세구분/이미 등록됨 표시
- ✅ `alreadyRegistered` 항목은 disabled + "등록됨" 라벨로 선택 차단
- ✅ `ingredient-jette-price-import.test.mjs`로 검증
- 추가 개선(적용 전 필드 preview)은 필요 시 다음 라운드에서 진행

### E. 대량 데이터 성능 점검 ✅ 완료 (2026-06-17)

- ✅ `useMemo` 기반 memoized filter 구조 확인 (메뉴마스터 `useMenuMasterFilters`, 식자재관리 `useIngredientManageView`)
- ✅ 식자재관리 검색어 `debouncedSearch` 사용 확인
- ✅ `p5-dropdown-perf-guards.test.mjs` — 1000행 필터 3가지 케이스 모두 10ms 이내 통과
- 가상 스크롤/pagination: 성능 문제 미발생 → 현 구조 유지

### F. 접근성/포커스 회귀 점검 ✅ 완료 (2026-06-17)

- ✅ `IngredientForm.jsx`: Esc 닫기 keydown 핸들러 추가
- ✅ `MenuMasterEditModal.jsx`: Esc 닫기 기존 확인
- ✅ `aria-busy={saving}` (IngredientForm form 태그)
- ✅ `role="alert"` (IngredientFieldPrimitives 에러 표시)
- ✅ `MenuMasterTableRow` 메뉴명 셀: `button type="button"` 시맨틱스
- ✅ `p4-accessibility-guards.test.mjs` 13건으로 구조 고정

### G. 출력물 회귀 확인 ✅ 테스트 완료

- ✅ 공통원가 포함 식자재 알레르기 합산 테스트 (`nutrition-allergen-aggregate.test.mjs`)
- ✅ 공통원가 원가 합산 출력 테스트 (`common-cost-selection-results.test.mjs`)
- ✅ 22/22 smoke QA — 원가 보고서, 영양성분, 원산지, 알레르기 출력 라우트 포함

### H. 데이터 정리 도구 ⏸ 보류

- 현재 입력 UX와 저장 반영 버그가 안정화됨 → 착수 가능 조건 충족
- 다음 기능 라운드에서 우선순위 지정 후 진행
- 구현 범위: 유사 식자재 병합, 분류/태그 이름 변경, 미사용 태그 일괄 삭제

## 10. Claude Code 추가 우선순위 ✅ 전 항목 완료 (2026-06-17)

기존 P0~P3가 끝난 뒤 아래 순서로 진행한다.

### P4. 신뢰도 보강 ✅ 완료

- ✅ 침묵 실패/경고 노출 보강 (B-21, `p4-accessibility-guards.test.mjs`)
- ✅ 제때 단가 가져오기 중복 선택 경고 (`alreadyRegistered` disabled 처리)
- ✅ 공통원가/원산지/알레르기 출력물 회귀 테스트 (기존 테스트 확인)
- ✅ 접근성/포커스 회귀 점검 (`IngredientForm` Esc 추가 + `p4-accessibility-guards.test.mjs`)

### P5. 유지보수성 보강 ✅ 완료

- ✅ `IngredientForm.jsx` controller 분리 (`useIngredientFormController.js`, 486→215줄)
- ✅ 추천 입력/드롭다운 공통화 (keyboard 정책 테스트로 고정, 구현 병합은 보류)
- ✅ 대량 데이터 성능 측정 (`p5-dropdown-perf-guards.test.mjs` 1000행 성능 방어)
- ⏸ 식자재 데이터 정리 도구 설계 (입력 UX 안정화 완료 → 다음 라운드)
