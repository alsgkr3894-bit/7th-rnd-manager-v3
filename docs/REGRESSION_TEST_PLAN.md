# 7rnd v3 회귀 테스트 후보 계획

이 문서는 현재 테스트 구조를 기준으로 앞으로 추가하면 좋은 회귀 테스트 후보를 정리한다. production 코드나 테스트 러너 설정을 바꾸지 않고, 후보만 우선순위로 분류한다.

## 현재 테스트 구조 요약

- `__tests__/hooks`: hook helper와 브라우저 이벤트/저장소 guard 중심
- `__tests__/lib`: 파서, 계산 helper, 저장소 guard, UI helper, 통계, 백업, 영양성분, 원가 일부 테스트
- `__tests__/scripts`: smoke QA와 런타임 QA 스크립트 helper 테스트

이미 있는 주요 커버리지:

- 공통 guard: prop, form, pagination, search, chip, tag, skeleton
- 메뉴판매량: 파서 일부, 업로드 로그, 분류/통계/미매칭 guard
- 원가/마진: margin calc, matching, snapshots, platform calc 일부
- 영양성분: import, allergen aggregate, label build/print, origin template fixture
- 백업: validation, scope coverage
- 가격/제때: price compare, price lookup, price store read guard

## 우선순위 A: 배포 안전성에 직접 필요한 테스트

### 원가 계산

- [ ] 대표 메뉴 3개 이상에 대한 메뉴코드별 최종 원가 snapshot
- [ ] 판매가 0 또는 null일 때 원가율 표시/계산 guard
- [ ] 엣지·도우 원가가 피자 종합 원가에 반영되는지 fixture 기반 비교
- [ ] 식자재 단가 변경 전/후 영향 메뉴만 값이 변하는지 비교
- [ ] platform fee 설정이 마진표 결과에 반영되는지 고정 fixture 비교

필요 fixture:

- 메뉴 마스터 최소 5건
- 식자재 단가 최소 8건
- 레시피 구성 최소 5건
- 기대 원가/원가율 기준표

### 엑셀 업로드

- [ ] 메뉴 판매량 정상 파일 fixture를 rawRows로 읽어 기간/헤더/행 검증
- [ ] 메뉴 판매량 중복 월 차단은 store mock 또는 IndexedDB test harness로 검증
- [ ] 제때 단가 정상 파일 fixture로 제품명/과세구분/단가 필수 컬럼 검증
- [ ] 필수 컬럼 누락, 빈 파일, 잘못된 확장자 오류 메시지 검증
- [ ] 제품코드 없는 제때 단가 행이 저장 전 파싱에서 실패하지 않는지 검증

필요 fixture:

- 정상 판매량 `.xlsx` 또는 `.csv`
- 헤더 누락 판매량 파일
- 정상 제때 단가 파일
- 과세구분 오류 제때 단가 파일

### 엑셀 다운로드

- [ ] 메뉴 마스터 CSV 컬럼 순서 고정 테스트
- [ ] 원가 세부표 CSV 컬럼 순서 고정 테스트
- [ ] 영양성분 엑셀 workbook 시트명/헤더 고정 테스트
- [ ] 원산지 엑셀 workbook 시트명/헤더 고정 테스트
- [ ] 한글/줄바꿈/숫자 셀 값 보존 테스트

필요 fixture:

- 다운로드 대상 최소 rows
- 기대 시트명과 헤더 배열

## 우선순위 B: 업무 데이터 품질을 높이는 테스트

### 메뉴코드/제품코드 매칭

- [ ] 메뉴 마스터 메뉴코드 중복 차단
- [ ] 메뉴코드가 없는 메뉴의 표시/검색/필터 동작
- [ ] 제품코드 기준 식자재 upsert가 기존 행을 덮어쓰는지 검증
- [ ] `lib/ingredient/master-seed.js` 80건의 제품코드 중복 없음 검증
- [ ] compositeOf 참조 코드 누락 경고 후보 검증

### 저장/수정/삭제/복원

- [ ] 메뉴 마스터 신규 저장 후 mirror sync 결과 검증
- [ ] 식자재 수동 등록/수정/숨김/삭제 상태 전이 검증
- [ ] 판매량 업로드 이력 삭제 시 관련 rows/log 상태 검증
- [ ] 제때 단가 파일 삭제 시 비교 기준 재계산 검증
- [ ] 백업 JSON validate 후 복원 가능한 store 목록 검증

### 검색/필터/정렬/페이지네이션

- [ ] 메뉴 마스터 검색이 메뉴명/메뉴코드 모두 포함 검색되는지 검증
- [ ] 식자재 검색이 제품명/제품코드 모두 포함 검색되는지 검증
- [ ] 원가 테이블 숫자 정렬과 문자열 정렬 분리 검증
- [ ] 빈 결과 페이지네이션이 1페이지로 유지되는지 검증

## 우선순위 C: 장기 안정성 테스트

- [ ] 대량 메뉴 마스터 1,000건 렌더/필터 성능 기준
- [ ] 판매량 대량 파일 10,000행 파싱 시간 기준
- [ ] IndexedDB migration dry-run 검증
- [ ] 브라우저 새로고침/탭 복귀 후 데이터 refresh 검증
- [ ] 모바일 390px 주요 라우트 screenshot diff 후보

## 테스트 추가 원칙

- production 코드 변경 없이 순수 helper 또는 fixture 기반으로 먼저 추가한다.
- 계산식 테스트는 현재 결과를 기준값으로 고정하기 전에 담당자가 숫자를 검토한다.
- 업로드/삭제/복원 테스트는 운영 데이터가 아닌 isolated store 또는 mock DB로만 수행한다.
- 새 패키지가 필요한 테스트는 package 변경 없이 후보로만 남긴다.
- fixture 파일은 실제 업무 데이터를 익명화한 뒤 최소 컬럼/최소 행만 보존한다.

## 다음 테스트 작성 순서

1. `origin-template-fixture`와 같은 workbook 구조 고정 테스트 확대
2. 메뉴 판매량 정상/오류 CSV fixture 테스트
3. 제때 단가 정상/오류 CSV fixture 테스트
4. 원가 계산 담당자 검수 완료 기준표로 snapshot 테스트
5. 백업/복원 isolated store 테스트
