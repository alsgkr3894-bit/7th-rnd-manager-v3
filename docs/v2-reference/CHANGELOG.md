# Changelog

7번가피자 R&D 관리 플랫폼 v2의 모든 주요 변경 사항을 기록합니다.

이 문서는 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 형식을 따릅니다.

---

## [Unreleased] — v2.0.0 (안정화 완료, 디자인 작업 전)

v2.0.0 태그 예정 — 안정화 + 기능 보강이 마무리되고 클로드 디자인 UI/UX 작업 직전 시점.

### 안정화 (Stability)

#### 영역 A — menu-sales 상급 (2026-05-22)
- `menu-sales-parse.js` null/undefined 안전 처리 강화 (`0be7d70`)
- `menu-sales-store.js` `relatedSalesRowIds` Array.isArray 명시 + `upload-ui.js` 데드 필드 제거 (`4fd2bfd`)
- `saveSalesUpload` 88줄 중첩 콜백을 함수 분리로 22줄로 축소 (`e0f181b`)

#### 영역 B — price/shipment/report 입력 검증 (2026-05-22)
- `shipment.js` year/month 명시적 `Number.isNaN` + 범위 검증, `parseInt` radix 명시
- `shipment-store.js` 모든 IDB add 요청에 onerror→tx.abort 명시 (트랜잭션 원자성 강화)
- `shipment-calc.js` `aggregateShipmentRows`에 rows 배열 방어 추가
- `report-price.js`, `report-shipment.js` 입력 검증 강화 (`bc031a8`)

#### 영역 C — home / menu-dev-note (2026-05-22)
- `home.js` `setupHomeDashboard` `Promise.all` → `Promise.allSettled` (loader 격리, 한 loader 실패가 다른 loader 표시를 가리지 않도록) (`e89ddf1`)

#### 영역 E — 코드 품질 (2026-05-22~23)
- Dead export 제거: `removeBrackets`, `removeUnits`, `removeSideSpaces`, `createCollapsibleGroup` (`b2b6fe2`)
- 디버그 console.log 정리: `app.js` 6개, `xlsx-loader.js` 1개, `cost.js` 1개
- `db.js` getAll 성능 경고 임계값 200ms → 1000ms (정상 호출까지 경고로 분류되던 콘솔 도배 해소) (`e995664`)
- 안전 마진 강화: `xlsx-loader.js` 주석 정합, `menu-sales-parse.js` 기간 정규식 + Date 정합성 검증, `download.js` revokeObjectURL 타이머 1초 → 10초 (`879cb5c`)

### 변경 (Changed)

#### 보고서센터 다운로드 형식 (2026-05-23)
- 보고서 3종 CSV → **Excel(.xlsx) 전환** (`56594aa`)
  - 제때 상품가격 보고서, 제때 출고량 보고서, 메뉴판매량 비교 보고서
  - Excel로 열 때 "데이터 손실" 경고 제거
  - 컬럼 한국어화 (`productCode` → `제품코드` 등), DB 메타 필드(fileId, id 등) 제거
  - 단일/비교 모드 각각 적합한 headerMap 적용

#### 제때 출고량 조회 UX (2026-05-23)
- 조회 영역 year/month 2개 셀렉트 → "YYYY년 M월" 단일 ym 셀렉트로 통합
- **업로드된 (년, 월) 조합만 표시** (이전: 현재년-3~+1, 1-12월 무차별 표시)
- 데이터 없을 때 "업로드된 데이터 없음" 안내
- 새 월 업로드 시 셀렉트에 자동 추가 (`19d2928`)

### 리팩토링 (Refactored)

#### 공통 헬퍼 통합 — `common/ui.js` (2026-05-23)
- `escapeHtml` 신규 추가, 9개 파일의 자체 `esc/escHtml` 정의 제거 (`c4443bf`)
- `el`, `val`, `setVal` 신규 추가, 9개 파일의 `_el/_val/_set` 자체 정의 제거 (`cbf1424`)
- `fillMonthSelect` 신규 추가, 2개 보고서 파일의 `_fillMonthSelect` 자체 정의 제거 (`5899647`)
- `home.js` `price_files` 중복 호출 통합 (loadDataStatus + loadCostStats가 각자 호출하던 것 1번으로 prefetch + props 전달)

#### 큰 파일 분할 (2026-05-23)
- `shipment-settings-ui.js`: 257 → 204줄, 삭제 헬퍼를 `shipment-settings-delete.js`로 분리 (`4c35c8e`)
- `menu-dev-note-list.js`: 245 → 162줄, 클립보드 + 보고예정 패널 분리 (`7540b17`)
- `shipment.js`: 265 → 256줄, `shipment-helpers.js`로 순수 함수 분리 (`19d2928`)
- `price-ui.js`: 430 → 167줄, 비교 결과 영역을 `price-ui-compare.js`로 분리 (`7bb8393`)

#### cost 모듈 정리 (2026-05-23)
- `cost.js` 디버그 console.log 제거
- `cost-ui-shared.js` `esc` 함수를 `common/ui.js`의 `escapeHtml` 별칭으로 (중복 제거, 8개 사용처 영향 없음) (`0f482df`)
- `cost-manage-*-handlers.js` 6개 파일의 `_getEl`/`_val` 헬퍼를 `common/ui.js`의 `el`/`val` 별칭 import로 통합 (`4a84c00`)

### 수정 (Fixed)
- "정말 삭제?" 라벨이 좁은 td에서 세로로 깨지던 UI 버그 (`shipment-settings-delete.js`, white-space:nowrap 추가)
- `home.js`의 `_buildGroupedView` race 우려는 false positive로 판명 (readyNotes는 함수 지역 변수, 클로저로 캡처 안전)

### 알려진 제약 (Known limitations)
- 비교 결과 테이블 (`price-ui-compare.js`)에 컬럼 헤더 정렬 기능 미지원 (v3에서 추가 예정)
- `app.js` (249줄), `db.js` (614줄), 일부 cost 큰 파일은 v3 디자인 작업 후 일괄 분할 예정

---

## 진행 중 (Work in progress)

### NUT-1b 영양성분 정보 store (다른 클로드 세션 작업 중)
- NUT-1b-1 ~ NUT-1b-5-F: nutrition-compliance IndexedDB store + 전용 함수 + integrity 검증 + seed 함수
- 이번 세션에서는 직접 손대지 않음 (다른 클로드 세션과 충돌 회피)

---

## 이전 마일스톤

### MS-9 — 메뉴판매량 분류/보고서 (2026-05-19~22)
- 공통 계산 모듈 분리 (parse/calc/classify) (`cbd2afa`)
- 판매량 순위 보고서 구현 (`efdc6b0`)
- 판매량 비교 보고서 구현 (`0bfc73d`)
- 확장 규칙 파일 분리 및 병합 구조 (`492d0f0`)
- 메뉴판매량 분류 규칙 일괄 등록 (피자 103 + 1인피자 11 + 사이드 27 + 사이드(소스) 8 + 엣지&도우 10 + 하프앤하프 2 + 세트메뉴 26 + 추가토핑 21 + 음료 5 + 품목제외 20 = 233 MS9 rules) (`3a0255d`)
- 메뉴판매량 순위 UI 개선 — 카테고리 필터 + 세부 메뉴 펼침 (`ed62869`)
- 판매량 보고서 카테고리별 멀티시트 엑셀 (`98df8eb`)

### MS-8 — 월별 데이터 관리 고도화 (2026-05)
- 월별 데이터 관리 기반 구축 (조회 화면) (`2a3dc51`)
- 월별 재업로드 진입 UX (`41a398b`)
- 정합성 검증 엔진 구현 (`bd611e7`)
- 월별 데이터 정합성 + 상세 모달 통합 (`5f8d00a`)

### MS-7 — 안정성 강화 (2026-04~05)
- 중복 방지 + 삭제 확인 UI
- (자세한 내용은 `MENU_SALES_DETAILED_POLICY.md` 참고)

### 초기 ~ MS-6
- IndexedDB 기반 데이터 구조 확정
- 원자적 트랜잭션 기반 미매칭 이슈 해결
- 메뉴개발노트 / 원가계산 모듈 1차 구현
- (자세한 내용은 git log + 메모리 참고)

---

## 메모

- 버전 정책: git tag로 안정 시점 마킹 (`v2.0.0`, `v3.0.0` 등)
- 배포: GitHub Pages (`https://alsgkr3894-bit.github.io/7th-rnd-manager-v2/`)
- 데이터: 클라이언트 IndexedDB (백업/복원 기능 내장)
- v3 로드맵: 클로드 디자인 UI/UX 적용 + 새 기능 → 같은 저장소 master에서 진행 예정
