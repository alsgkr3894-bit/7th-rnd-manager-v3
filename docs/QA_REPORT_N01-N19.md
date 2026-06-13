# QA 리포트 — N-01~N-19 저위험 배치 (2026-06-13)

> 커밋: `08bcea6` (N-01~19 구현) + `7f54977` (버그 수정)
> 검증 기준: 빌드 57페이지 ✅ · 테스트 140 suites 793 tests ✅ · ESLint 0 errors ✅

---

## 1. 검증 환경

| 항목 | 결과 |
|------|------|
| `npm run build` | ✅ Compiled successfully (57 static pages) |
| `npm test` | ✅ 140 suites / 793 tests 전부 통과 |
| `npx eslint --ext .jsx,.js app components hooks lib` | ✅ 0 errors (기존 `<img>` warning 12건 — 무관) |

---

## 2. 항목별 구현 상태 및 검증 결과

### N-01 [노트] 탭 순서 변경
- **파일**: `lib/menu.js`
- **변경**: 노트 하위 탭 순서 재배치
  - 이전: 노트 목록 → 연구일지 → 일정 달력 → 칸반 보드 → 노트 작성 → 샘플기록
  - 이후: 일정 달력 → 노트 작성 → 노트 목록 → 칸반 보드 → 연구일지 → 샘플기록
- **상태**: ✅ 정상 (데이터 변경 없음, 표시 순서만)

---

### N-02 [노트목록] CSV 버튼 삭제
- **파일**: `app/note/_NoteContent.jsx`
- **변경**: `exportCsv` 함수 + 버튼 제거, 미사용 `downloadCsv` import 정리
- **검증**: 함수·버튼·import 모두 제거 확인 ✅
- **상태**: ✅ 정상

---

### N-03 [칸반] CSV/인쇄 삭제
- **파일**: `app/note/board/page.jsx`
- **변경**: `exportBoardCsv` 함수 + CSV 버튼 + 인쇄 버튼 제거, 미사용 import 정리
- **검증**: `downloadCsv`, `printCurrentPageWithDownloadDate` import 잔존 없음 ✅
- **상태**: ✅ 정상

---

### N-04 [달력] 보고용복사 삭제
- **파일**: `app/note/calendar/page.jsx`
- **변경**: `copyMonthSummary` 함수 + 버튼 제거, 미사용 `copyText` import 정리
- **검증**: 함수·버튼·import 모두 제거 확인 ✅
- **상태**: ✅ 정상

---

### N-05 [노트작성] 메뉴명 필수 해제 + 토핑 삭제
- **파일**: `app/note/_NoteFormBody.jsx`, `lib/note/constants.js`, `app/note/write/page.jsx`, `app/note/[id]/page.jsx`
- **변경**:
  - `_NoteFormBody.jsx`: `Field` 컴포넌트의 `required` prop 제거
  - `constants.js`: `CATEGORIES`에서 `'토핑'` 삭제 → `['피자','사이드','소스','도우(엣지)','기타']`
  - `write/page.jsx` + `[id]/page.jsx`: 저장 시 menuName 필수 검증 제거 (토스트 메시지 수정)

> **⚠️ 발견된 버그 (수정 완료)**
> - `_NoteFormBody.jsx`의 required prop만 제거하고, `write/page.jsx:116`, `[id]/page.jsx:195`의 `handleSave` 내 menuName 필수 검증이 남아있었음
> - 증상: UI에서 menuName 없이 저장 시 "제목, 메뉴명, 테스트 내용은 필수입니다" 토스트로 저장 불가
> - 수정: 두 페이지 모두 menuName 조건 제거, 메시지 "제목과 테스트 내용은 필수입니다"로 변경

- **상태**: ✅ 버그 수정 완료 (`7f54977`)

---

### N-06 [원가보고서] 집계기간 삭제 + 제목 변경
- **파일**: `app/report/cost/page.jsx`
- **변경**:
  - 집계 기준 기간 `OptGroup` 제거 (UI에서만 숨김, periodLabel/state 계산 유지)
  - 보고서 제목 `{periodLabel} 원가계산 종합 보고서` → `7번가피자 제품원가표 (단가 기준)`
  - 미사용 `Seg` import 제거

> **⚠️ 발견된 버그 (수정 완료)**
> - `OptGroup` 제거 후 `Seg`가 import만 존재하는 미사용 변수로 남아 lint no-unused-vars 경고 유발
> - 수정: `Seg` import 제거

- **참고**: `periodLabel`은 Excel 파일명·reportMeta에 여전히 사용 중 (유지 정상)
- **상태**: ✅ 버그 수정 완료 (`7f54977`)

---

### N-07 [공통] "CSV 내보내기" → "엑셀로 내보내기" 라벨 변경
- **파일**: 12개 파일 (menu-master, note/sample, cost/recipe, cost/all-summary, nutrition/origin, nutrition/allergen, ingredient/usage, jette 3종, nutrition/TabResults)
- **변경**: 버튼 표시 텍스트만 변경 (함수명·파일포맷·파일명 불변)
- **상태**: ✅ 정상

---

### N-08 [공통] TopBar 우측 정렬
- **파일**: `components/TopBar.jsx`
- **변경**: 새 노트 버튼·다크모드 토글·알림·프로필 4개 요소를 `marginLeft: 'auto'` 래퍼로 묶어 우측 고정
- **검증**: `.notif-wrap`·`.profile` 모두 `position: relative` 유지 → 드롭다운 팝업 절대좌표 영향 없음
- **상태**: ✅ 정상

---

### N-09 [공통] 다크모드 모션
- **판정**: ✅ 이미 구현됨 (스킵)
- **근거**: `app/styles/base.css:30-52`에 `body, .sidebar, .topbar, .card...` 등 주요 요소에 `transition: background-color 220ms ease, border-color 220ms ease, color 120ms ease` 정의됨

---

### N-10 [메뉴마스터] CSV에 규격 추가
- **파일**: `app/menu-master/page.jsx`
- **변경**: `handleExportCsv` headers/rows에 `규격(row.size)` 컬럼 추가 (5번째 위치 → 판매가 앞)
- **상태**: ✅ 정상

---

### N-11 [메뉴마스터] 피자 기본가 일괄 버튼 삭제
- **파일**: `app/menu-master/page.jsx`
- **변경**:
  - `handleBulkPizza` 함수 제거
  - `bulking`, `confirmBulkPizza` state 제거
  - 헤더 버튼 제거
  - `confirmBulkPizza` ConfirmDialog 모달 제거
  - 미사용 `getDefaultPrice` import 제거
- **검증**: 잔존 참조 없음 ✅
- **상태**: ✅ 정상

---

### N-12 [메뉴마스터] 양식업로드 카드 하단 이동
- **파일**: `app/menu-master/page.jsx`
- **변경**: `<MenuPriceUploadCard>` 통계 카드 바로 아래에서 테이블 블록 이후로 이동
- **상태**: ✅ 정상

---

### N-13 [재료단가표] 초기화 버튼 축소
- **파일**: `app/cost/ingredient-price/page.jsx`
- **변경**:
  - 버튼 크기 `btn` → `btn sm`
  - 라벨 `마스터 초기화` → `초기화`
  - 2단계 확인 버튼 `정말 초기화` → `진행하기`
- **상태**: ✅ 정상

---

### N-14 [재료단가표] 일괄 가격 업로드 삭제
- **파일**: `app/cost/ingredient-price/page.jsx`
- **변경**:
  - `일괄 가격 업로드` 버튼 제거
  - `BulkPriceModal` dynamic import·렌더링 제거
  - `bulkOpen`, `setBulkOpen` state 제거
- **검증**: 잔존 참조 없음 ✅
- **상태**: ✅ 정상

---

### N-15 [재료단가표] 제품별 사용현황 탭 삭제
- **파일**: `app/cost/ingredient-price/page.jsx`
- **변경**:
  - `VIEW_TABS`에서 `usage` 탭 제거
  - `UsageView` dynamic import 제거
  - `viewTab === 'usage'` 렌더링 블록 제거
  - `usageMap`, `usageCat`, `usageSort` state 제거
  - 사용현황 빌드 로직(`getAllPizzaRecipes`, `getAllPersonalRecipes`, `getAllSideRecipes`, `getAllRecipes`, `buildIngredientUsageMap`) 제거
- **검증**: viewTab 기본값 `'price'` 유지, 잔존 참조 없음 ✅
- **부가 효과**: 페이지 로드 시 4개 DB 쿼리 절감 → 초기 로딩 속도 개선
- **상태**: ✅ 정상

---

### N-16 [재료단가표] SortButton 제거
- **파일**: `app/cost/ingredient-price/page.jsx`
- **변경**:
  - `SortButton` import 제거
  - `sortButtonOptions` import 제거
  - JSX의 `<SortButton>` 렌더링 제거
  - `SortableHeader` 클릭 정렬 유지
- **검증**: `priceSortOptions`는 `useCostManageTable`에 여전히 사용 중 (유지 정상) ✅
- **상태**: ✅ 정상

---

### N-17 [사용현황] 액션 버튼 상단 이동
- **파일**: `app/ingredient/usage/page.jsx`
- **변경**: `usage-action-row`(모두펼치기/접기/PDF/CSV) 블록을 카테고리 칩 행 위로 이동
- **상태**: ✅ 정상

---

### N-18 [제때] 엑셀업로드 박스 축소
- **파일**: `app/styles/features.css`
- **변경**: `.dropzone` padding `60px 32px` → `28px 32px`
- **상태**: ✅ 정상

---

### N-19 [샘플기록] 작성 placeholder 변경
- **파일**: `app/note/sample/_SampleFormBody.jsx`
- **변경**:
  - 제목(title) placeholder: `예) 불고기 피자 3차 샘플 — 소스 비율 조정` → `예) ○○ 0차 샘플`
  - 샘플명(sampleNames) placeholder: `예) 불고기피자` → `식자재명`
- **상태**: ✅ 정상

---

## 3. 버그 요약

| 항목 | 버그 내용 | 심각도 | 수정 커밋 |
|------|-----------|--------|-----------|
| N-05 | `write/page.jsx`, `[id]/page.jsx` 저장 로직에 menuName 필수 검증 잔존 → 저장 불가 | 🔴 High | `7f54977` |
| N-06 | `Seg` 미사용 import 잔존 → ESLint no-unused-vars | 🟡 Medium | `7f54977` |

---

## 4. 종합 판정

| 영역 | 결과 |
|------|------|
| 빌드 안정성 | ✅ 57페이지 통과 |
| 테스트 | ✅ 140 suites / 793 tests |
| ESLint | ✅ 0 errors |
| 기능 정합성 | ✅ 19건 전량 정상 (버그 2건 수정 완료) |
| 잔존 이슈 | 없음 |

**결론: N-01~N-19 저위험 배치 전체 정상 동작 확인. 중위험 배치(N-20~N-38) 진행 가능.**
