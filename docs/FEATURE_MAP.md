# 7rnd v3 화면/기능 맵

이 문서는 주요 화면, 핵심 기능, 관련 데이터, 위험도, 수동 QA 필요 여부를 정리한다. 실제 확인 절차는 `docs/QA_CHECKLIST.md`와 `docs/RELEASE_CHECKLIST.md`를 함께 사용한다.

## 위험도 기준

- A: 읽기 중심 또는 표시 안정성 확인. 자동 smoke와 기본 수동 확인으로 충분한 영역.
- B: 업무 데이터 결과에 영향 가능. 실제 파일과 기준값으로 사람이 확인해야 하는 영역.
- C: 저장/삭제/복원, 원가 계산, 엑셀 출력처럼 운영 데이터 영향이 큰 영역. 테스트 데이터와 백업이 필요하다.

## 공통

| 화면 | 경로 | 핵심 기능 | 관련 데이터 | 위험도 | 수동 QA |
| --- | --- | --- | --- | --- | --- |
| 홈 | `/` | KPI, 위젯, 최근 작업, 모듈 상태 | 판매량, 원가, 노트, 업로드 상태 | A | 예 |
| 로그인 | `/login` | 접근 진입 | 인증 쿠키 | B | 예 |
| 설정 시스템 | `/settings/system` | 환경/알림/원가 정책 표시 및 설정 | localStorage, 설정 store | B | 예 |
| 계정 관리 | `/settings/account` | 역할/권한 표시 | 계정 설정 | B | 예 |
| 백업 | `/settings/backup` | 백업 생성, 이력 CSV/JSON 다운로드 | IndexedDB 전체 백업 | C | 예 |
| 복원 | `/settings/restore` | 백업 파일 읽기와 복원 | 백업 JSON, IndexedDB | C | 예 |

## 메뉴 판매량

| 화면 | 경로 | 핵심 기능 | 관련 데이터 | 위험도 | 수동 QA |
| --- | --- | --- | --- | --- | --- |
| 판매량 순위 | `/menu-sales/rank` | 월별 순위, 검색, 분류 표시 | sales files, sales rows | B | 예 |
| 판매량 업로드 | `/menu-sales/upload` | 엑셀/CSV 업로드, 기간 탐지, 중복 월 차단 | sales files, upload log | C | 예 |
| 순위 비교 | `/menu-sales/rank-compare` | 기간 비교, 증감, 정렬 | sales rows | B | 예 |
| 미매칭 | `/menu-sales/unmatched` | 미매칭 메뉴 해결, 별칭/룰 등록 | sales issues, aliases, rules | C | 예 |
| 판매 설정 | `/menu-sales/settings` | 별칭, 제외, 분류 룰 관리 | user rules | C | 예 |

## 제때/식자재

| 화면 | 경로 | 핵심 기능 | 관련 데이터 | 위험도 | 수동 QA |
| --- | --- | --- | --- | --- | --- |
| 제때 가격 비교 | `/jette/price-compare` | 단가 업로드, 최신/이전 비교 | price files, price rows | C | 예 |
| 제때 관리품목 | `/jette/settings` | 제품 분류, 전용/범용 설정 | managed products | C | 예 |
| 출고량 | `/jette/shipment` | 출고량 업로드/집계 | shipment files, shipment rows | C | 예 |
| 식자재 관리 | `/ingredient/manage` | 수동 등록, 수정, 숨김/삭제 | cost ingredients | C | 예 |
| 식자재 목록 | `/ingredient/list` | 검색, 필터, 제품코드 확인 | ingredient master | B | 예 |
| 식자재 사용현황 | `/ingredient/usage` | 메뉴별 사용 현황 | recipes, ingredient map | B | 예 |

## 메뉴 마스터/원가

| 화면 | 경로 | 핵심 기능 | 관련 데이터 | 위험도 | 수동 QA |
| --- | --- | --- | --- | --- | --- |
| 메뉴 마스터 | `/menu-master` | 메뉴코드, 메뉴명, 판매가, 상태 관리 | menu master | C | 예 |
| 원가 허브 | `/cost` | 원가 화면 진입 | menu master, recipes | A | 예 |
| 식자재 단가 | `/cost/ingredient-price` | 단가 등록, 이력, 공급사 | ingredient price | C | 예 |
| 원가 계산 | `/cost/recipe` | 레시피 구성, 메뉴별 원가 계산 | recipes, ingredient prices | C | 예 |
| 원가 마진표 | `/cost/margin` | 플랫폼 수수료, 마진 계산 | menu price, cost, platform settings | C | 예 |
| 종합 원가 | `/cost/all-summary` | 메뉴별 종합 원가 표시 | recipes, menu master | C | 예 |
| 엣지·도우 | `/cost/edge-dough` | 엣지/도우 원가 기준 | edge/dough costs | C | 예 |
| 피자/1인/사이드/세트 | `/cost/pizza`, `/cost/personal`, `/cost/side`, `/cost/set` | 상세 원가표 | recipes, cost components | C | 예 |

## 영양성분/원산지

| 화면 | 경로 | 핵심 기능 | 관련 데이터 | 위험도 | 수동 QA |
| --- | --- | --- | --- | --- | --- |
| 영양성분 허브 | `/nutrition` | 영양성분 화면 진입 | nutrition settings | A | 예 |
| 메뉴 영양성분 | `/nutrition/menu` | 베이스/파생/토핑/계산값 관리 | nutrition values | C | 예 |
| 알레르기 | `/nutrition/allergen` | 메뉴별 알레르기 집계 | allergens, menu master | B | 예 |
| 원산지 | `/nutrition/origin` | 원산지 표기, 엑셀 출력 | origin values, template | C | 예 |
| 출력 | `/nutrition/export` | 영양성분/원산지 다운로드 | export workbook | C | 예 |

## 노트

| 화면 | 경로 | 핵심 기능 | 관련 데이터 | 위험도 | 수동 QA |
| --- | --- | --- | --- | --- | --- |
| 노트 목록 | `/note` | 검색, 필터, 정렬 | notes | B | 예 |
| 노트 작성 | `/note/write` | 자동저장, 저장 | notes, drafts | C | 예 |
| 노트 상세 | `/note/[id]` | 상세 조회, 수정 | notes | C | 예 |
| 보드 | `/note/board` | 상태별 보드 | notes | B | 예 |
| 달력 | `/note/calendar` | 일정 등록/수정 | schedules | C | 예 |
| 샘플 기록 | `/note/sample` | 샘플 목록, 비교, 평가 | sample notes | B | 예 |

## 보고서

| 화면 | 경로 | 핵심 기능 | 관련 데이터 | 위험도 | 수동 QA |
| --- | --- | --- | --- | --- | --- |
| 보고서센터 | `/report` | 보고서 생성 진입 | report presets | B | 예 |
| 판매 보고서 | `/report/sales` | 판매 요약/출력 | sales rows | B | 예 |
| 가격 보고서 | `/report/price` | 단가 변화 보고 | price rows | B | 예 |
| 출고량 보고서 | `/report/shipment` | 출고량 보고 | shipment rows | B | 예 |
| 원가 보고서 | `/report/cost` | 원가 요약 보고 | cost rows | C | 예 |
| 판매 비교 보고서 | `/report/menu-sales-compare` | 기간 비교 보고 | sales rows | B | 예 |
