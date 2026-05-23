# 메뉴판매량 모듈 종합 정책서 및 구축 로드맵

**최종 업데이트**: 2026-05-20  
**상태**: MS-0~MS-9 완료 | MS-10 회귀검증 및 정리 진행 예정

---

## 문서 목적

이 문서는 7th-rnd-manager-v2의 메뉴판매량 모듈을
MS-0부터 최종 완성 단계까지 일관되게 설계·구현하기 위한 기준 문서다.

이 문서가 해결해야 하는 문제는 다음과 같다.

- 구현 단계가 진행될수록 초기 정책이 흔들리는 문제 방지
- 업로드, 분류, 집계, 비교, 미매칭 관리, 설정이 서로 다른 기준으로 구현되는 문제 방지
- 기존 제때상품·출고량·원가계산·메뉴개발노트 모듈과 충돌 방지
- DB 구조, 분류 기준, 통계 집계 기준을 사전에 고정
- Claude Code가 새 세션에서도 문서만 보고 작업을 이어갈 수 있도록 기준 제공

---

## 1. 전체 상태 요약

### 현재 탭 상태

| 탭 | 섹션 ID | 상태 |
|-----|---------|------|
| 메뉴판매량 업로드 | #menu-sales-upload | ✅ MS-2, MS-3-4, MS-6 후속 완료 |
| 메뉴판매량 순위 | #menu-sales-rank | ✅ MS-4 완료 |
| 메뉴판매량 비교 | #menu-sales-compare | ✅ MS-5 완료 |
| 메뉴미매칭 관리 | #menu-sales-unmatched | ✅ MS-6 완료 |
| 메뉴판매량 설정 | #menu-sales-settings | ✅ MS-7 완료 (MS-7.1, MS-7.2 안정성 강화) |
| 월별 데이터 관리 | #menu-sales-monthly | ✅ MS-8 완료 (Step 1: 조회 화면 / Step 2: 재업로드 진입 UX / Step 3: 정합성 검증) |

초기 설계에서는 비교 뷰를 후순위로 두었지만, 최신 구현 우선순위는 사용자 결정에 따라 **순위 → 비교 → 미매칭 관리 → 설정** 순서로 본 문서에서 정리한다. 기존 MS-0 설계와 단계별 로드맵은 이미 확정되어 있었고, 업로드·분류·DB 기반은 그 로드맵을 따라 구현되었다.

---

## 2. 메뉴판매량 모듈의 최상위 설계 원칙

### 2.1 안정성 우선

우선순위는 아래 순서를 따른다.

1. 안정성
2. 데이터 무결성
3. 기존 기능 보존
4. 버그 최소화
5. 구조 단순성
6. 기능 확장

### 2.2 모듈 분리 원칙

메뉴판매량 모듈은 다음 책임 분리를 지킨다.

| 레이어 | 책임 |
|-------|------|
| parse | 파일 구조 해석, 검증 |
| classify | 메뉴명 정규화, 별칭, 규칙, 상태 판정 |
| store | DB 저장, 조회, 삭제 |
| calc | 집계 계산, 순위, 비교 수치 계산 |
| ui | DOM 렌더링, 사용자 상호작용 |

#### 금지사항

- parse 함수에서 DB 접근 금지
- calc 함수에서 DOM 접근 금지
- UI 함수가 복잡한 분류 정책을 직접 판단하는 것 금지
- store 함수가 화면 로직을 직접 다루는 것 금지

---

## 3. 데이터베이스 기본 정책

### 3.1 DB 기본값

| 항목 | 값 |
|------|-----|
| DB 이름 | rnd_manager_v2 |
| DB 버전 | 6 |

현재 프로젝트의 DB_NAME은 rnd_manager_v2, DB_VERSION은 6이다.

### 3.2 메뉴판매량 관련 스토어

| 스토어 | 역할 |
|-------|------|
| sales_files | 월별 업로드 파일 메타 |
| sales_rows | 업로드된 판매량 행 데이터 |
| sales_rules | 향후 분류 규칙 관리 |
| ref_sales_aliases | 별칭 기준 데이터 |
| ref_sales_categories | 판매량 카테고리 |
| ref_discontinued | 단종 메뉴 기준 |
| ref_event_menus | 행사 메뉴 기준 |
| ref_excluded | 품목 제외 기준 |
| menu_sales_issues | 미매칭·문제 항목 이슈 |
| upload_log | 업로드 이력 |

위 스토어 구조는 DB v6 기준으로 이미 반영되어 있으며, sales_files, sales_rows, menu_sales_issues, upload_log는 업로드 및 분류 저장 흐름의 핵심이다.

### 3.3 주요 인덱스

#### sales_files
- year_month

#### sales_rows
- fileId
- category
- normalizedMenuName
- year_month
- category_normalizedMenuName
- status

#### menu_sales_issues
- fileId
- issueType
- status
- year_month

#### upload_log
- fileHash
- module
- module_fileHash
- linkedFileId

위 인덱스는 현재 db.js에 구현되어 있다.

---

## 4. 판매량 카테고리 정책

### 4.1 대분류 12개

판매량 모듈은 아래 12개 대분류 순서를 기준으로 한다.

1. 피자
2. 1인피자
3. 사이드
4. 사이드(소스)
5. 세트메뉴
6. 엣지&도우
7. 추가토핑
8. 하프앤하프
9. 음료
10. 7번가데이
11. 오리지널데이
12. 품목제외

이 순서는 초기 설계 단계에서 확정되었고, 현재 SALES_CATEGORIES에도 반영되어 있다.

---

## 5. 전체 구현 로드맵

### 최종 단계 체계

| 단계 | 내용 | 상태 |
|------|------|------|
| MS-0 | 메뉴판매량 모듈 전체 설계 확정 | 완료 |
| MS-1 | DB v6, parse, app/router 연결 | 완료 |
| MS-2 | 업로드 저장 + 중복 월 + 삭제 UX | 완료 |
| MS-3-1 | 정규화 + 기본 규칙 + matcher | 완료 |
| MS-3-2 | alias mapper | 완료 |
| MS-3-3 | status classifier | 완료 |
| MS-3-4 | 분류 결과 저장 + issue 그룹 저장 | 코드 구현 완료, 최종 검증 진행 |
| MS-3-5 | 제외후보·단종·행사 진단 확장 | 후속 |
| MS-4 | 판매량 순위 화면 | 다음 핵심 구현 |
| MS-5 | 판매량 비교 화면 | 후속 |
| MS-6 | 메뉴미매칭 관리 화면 | 후속 |
| MS-7 | 메뉴판매량 설정 화면 | 후속 |
| MS-8 | 월별 데이터 관리 고도화 | 후속 |
| MS-9 | 보고서센터 판매량 연동 | 후속 |
| MS-10 | 전체 회귀검증 및 정리 | 최종 |

초기 설계 문서상 MS-1~MS-10 단계는 이미 로드맵 형태로 정의되어 있었고, 현재는 업로드·분류 축을 MS-3-4까지 진행한 상태다.

---

## 6. MS-0 — 최종 설계 확정 단계

### 목적

구현을 시작하기 전에 아래를 확정한다.

- 탭 구조
- DB 확장 방향
- 카테고리 체계
- 파일 파싱 기준
- 월별 업로드 정책
- 분류 엔진 단계 구성
- 이후 순위·비교·미매칭·설정 화면의 큰 방향

### 확정된 사항

#### 6.1 탭 구조
- 업로드
- 순위
- 비교
- 미매칭 관리
- 설정

#### 6.2 DB v6 동의
- sales_files에 year_month
- sales_rows에 status 관련 인덱스 보강
- 판매량 관련 기준 스토어 확정

#### 6.3 카테고리 12개 확정
- 피자 ~ 품목제외 순서

#### 6.4 모듈 독립성
- 기존 가격 비교, 출고량, 원가계산, 메뉴개발노트 기능에 영향 최소화

MS-0 단계에서 설계 확정, compare 탭의 후순위 배치, DB v6 동의, 카테고리 12개 순서가 정리되었다.

---

## 7. MS-1 — 인프라 + parse + validate

### 목적

메뉴판매량 업로드 기능의 기반을 만든다.

### 구현 범위

#### 신규 파일
- src/modules/menu-sales/menu-sales-parse.js
- src/modules/menu-sales/menu-sales-store.js
- src/modules/menu-sales/menu-sales-upload-ui.js

#### 수정 파일
- src/core/db.js
- src/core/constants.js
- src/app.js
- src/core/router.js
- index.html

MS-1의 신규/수정 파일 범위는 초기 설계 문서에서 명시되었고, 구현 순서와 테스트 포인트도 사전에 정리되었다.

### 7.1 엑셀/CSV 업로드 정책

#### 실제 파일 구조 기준

| 행 | 내용 |
|----|------|
| 0행 | 보고서 제목 |
| 1행 | 현재 기간 |
| 2행 | 빈 행 |
| 3행 | 헤더 |
| 4행 이후 | 데이터 |

실제 정책 확인에서는 기간이 첫 행이 아니고, 헤더도 첫 행이 아니므로 첫 10행 탐색이 필요하다고 확정했다.

### 7.2 기간 인식 정책

#### 허용
- 2026-04-01 ~ 2026-04-30

#### 차단
- 2026-04-01 ~ 2026-04-17
- 2026-04-03 ~ 2026-04-30

#### 조건
- 시작일은 1일
- 종료일은 해당 월 말일
- 시작 월과 종료 월이 같아야 함

parse.js는 월 전체 기간만 허용하고, 월 일부 기간을 차단하는 정책으로 정리되었다.

### 7.3 헤더 인식 정책

#### 메뉴명 허용
- 메뉴명
- 메뉴 명

#### 판매량 허용
- 판매량(개)
- 판매량 (개)

#### 금지
- 판매량
- 기타 임의 이름

헤더는 화이트리스트 기반으로 엄격하게 처리한다.

### 7.4 데이터 행 검증 정책

#### 메뉴명
- 빈칸 차단
- 공백만 있는 값 차단

#### 판매량
- 빈칸 차단
- 숫자 아닌 값 차단
- 음수 차단
- 소수 차단
- 0은 허용

#### 전체 업로드 차단
- invalidRows가 1건이라도 있으면 업로드 전체 차단

해당 정책은 parse 함수 설계와 정합성 검증 결과에 포함되어 있다.

### 7.5 rawRows와 rows 구분

#### rawRows
- 원본 2차원 배열
- 기간 탐지
- 헤더 탐지
- validateSalesFile(rawRows)에 사용

#### rows
- loader가 가공한 객체 배열
- 메뉴판매량 검증에는 사용하지 않음

#### 최종 고정
- validateSalesFile(rawRows)

CSV 파서 역시 rawRows를 반환하도록 보완되었다.

---

## 8. MS-2 — 업로드 저장 + 중복 월 + 삭제 UX

### 목적

검증된 판매량 파일을 저장하고, 동일 월 중복 업로드를 안전하게 제어한다.

### 8.1 저장 대상

#### sales_files
파일 메타데이터
```javascript
{
  id,
  year,
  month,
  fileName,
  uploadedAt,
  totalRows
}
```

#### sales_rows
파싱된 행 데이터
```javascript
{
  id,
  fileId,
  year,
  month,
  rawMenuName,
  normalizedMenuName,
  quantity,
  originalIndex,
  status
}
```

#### upload_log
업로드 이력
```javascript
{
  id,
  module: 'sales',
  fileName,
  fileHash,
  linkedFileId,
  year,
  month,
  uploadedAt,
  totalRows,
  validCount,
  invalidCount,
  deleted,
  deletedAt
}
```

sales_files, sales_rows, upload_log의 저장 형태와 월 삭제 범위는 설계 단계에서 이미 정리되어 있다.

### 8.2 중복 월 감지 정책

#### 기준
- year + month만으로 중복 판단
- fileHash는 중복 판단에 사용하지 않음
- fileHash는 로그 보존 용도로만 저장

#### 이유
- 같은 월 데이터가 이미 있으면 덮어쓰기 위험
- 같은 파일이라도 다른 월이면 업로드 가능해야 함

중복 감지는 year/month 기준만 사용하며, fileHash는 보조 기록만 남긴다.

### 8.3 중복 업로드 UX

#### 흐름
1. 파일 검증 성공
2. 사용자가 저장 클릭
3. 중복 월 검사
4. 중복이면 저장 차단
5. 중복 안내 UI 표시

### 8.4 기존 월 삭제 UX

#### 정책
- 자동 덮어쓰기 금지
- 명시적 삭제만 허용
- 재확인 모달 필수
- 삭제 완료 후 자동 저장 금지
- 사용자가 다시 저장 버튼을 눌러야 함

이 정책은 중복 업로드 UX와 삭제 안전성 설계에 포함되어 있다.

### 8.5 삭제 정책

| 스토어 | 처리 |
|-------|------|
| sales_files | hard delete |
| sales_rows | hard delete |
| menu_sales_issues | hard delete |
| upload_log | hard delete가 아니라 deleted=true, deletedAt 갱신 |

실제 최종 정책은 upload_log 보존이며, 삭제 후에도 이력 추적이 가능하게 한다.

---

## 9. MS-3 — 분류 엔진 전체 정책

### 목적

업로드된 메뉴명을 통계 가능한 내부 분류 구조로 변환한다.

### 9.1 MS-3-1 — 정규화 + 기본 규칙 + matcher

#### 정규화 예시

| 입력 | 출력 |
|------|------|
| 샘스테이크(L) | 샘스테이크 L |
| 오븐 스파게티 | 오븐스파게티 |
| 샘스테이크 R | 유지 |

#### 기본 규칙 8개

| 규칙 | 분류 |
|------|------|
| 더블치즈 | 1인피자 / 더블치즈 / 더블치즈 |
| 뉴더블치즈피자 | 피자 / 뉴더블치즈 / 뉴더블치즈피자 |
| 레드핫그릴 | 피자 / 레드핫그릴치킨 / 레드핫그릴치킨 |
| 샘스테이크 L | 피자 / 샘스테이크 / 샘스테이크L |
| 샘스테이크 R | 피자 / 샘스테이크 / 샘스테이크R |
| 오븐스파게티 | 사이드 / 오븐스파게티 / 오븐스파게티 |
| 파마산 | 사이드(소스) / 파마산 / 파마산 |
| 콜라 | 음료 / 음료 / 콜라 |

MS-3-1 완료 이후 정규화·기본 규칙·matcher는 커밋 단위로 정리되었다.

### 9.2 MS-3-2 — alias mapper

#### 확정 별칭 3개

| 입력 | 표준명 |
|------|--------|
| 뉴더블 피자 | 뉴더블치즈피자 |
| 치즈가루 | 파마산 |
| 파마산추가 | 파마산 |

#### 원칙
- exact 매칭만
- 추정 치환 금지
- 부분 문자열 치환 금지
- 별칭은 분류를 결정하지 않음
- 문자열만 표준화

MS-3-2는 별칭 매핑 함수로 분리되어 구현되었다.

### 9.3 MS-3-3 — 상태 판정기

#### status 3상태

| 상태 | 의미 |
|------|------|
| classified | 정상 분류, 집계 포함 |
| unclassified | 미분류, 검토 필요, 집계 제외 |
| excluded | 품목 제외, 집계 제외 |

#### 우선순위
1. exclusionDecision === 'excluded'
2. exclusionDecision === 'exclude_candidate'
3. matchedRule 존재
4. 그 외 unclassified

#### issue flag 기준

| 상황 | hasExcludeCandidate | hasUnmatched |
|------|-------------------|--------------|
| excluded | false | false |
| exclude_candidate | true | false |
| matchedRule 있음 | false | false |
| matchedRule 없음 | false | true |

### 9.4 MS-3-4 — 저장 전 분류 + issue 그룹 저장

#### 최종 처리 흐름

```
validateSalesFile(rawRows)
→ validRows
→ classifyAndPrepare(validRows, year, month)
→ classifiedRows + groupedIssues
→ saveSalesUpload(...)
```

#### classifiedRows 저장 필드

```javascript
{
  rawMenuName,
  normalizedMenuName,
  mappedMenuName,
  quantity,
  originalIndex,
  status,
  category,
  groupName,
  detailName
}
```

#### groupedIssues 저장 전 구조

```javascript
{
  issueType: 'unmatched',
  normalizedMenuName,
  representativeRawMenuName,
  totalQuantity,
  affectedRowCount,
  relatedRowPositions,
  status: 'open'
}
```

#### DB 최종 저장 시 추가되는 필드

```javascript
{
  fileId,
  year,
  month,
  relatedSalesRowIds,
  createdAt
}
```

#### 저장 설계 채택안

B안: 저장 전 분류 후 한 트랜잭션 저장

```
classifyAndPrepare()
↓
saveSalesUpload({
  meta,
  classifiedRows,
  groupedIssues,
  log
})
```

이 방식은 분류와 DB 저장을 분리하면서도, DB 저장 자체는 원자적으로 처리하기 때문에 가장 안정적이라고 판단되었다.

#### 트랜잭션 대상
- sales_files
- sales_rows
- menu_sales_issues
- upload_log

#### 오류 처리 정책
- 비동기 onerror 내부에서 throw 금지
- tx.abort() 명시 호출
- 중간 실패 시 전체 롤백

이 방식은 MS-3-4 설계에서 명시적으로 확정되었다.

### 9.5 MS-3-5 — 제외후보·진단 확장

#### 목적

현재 unmatched 중심의 이슈 생성에 더해, 아래 진단을 확장한다.

#### 후속 확장 대상
- 품목 제외 후보
- 단종 메뉴 재등장
- 행사 메뉴 여부
- 누락 진단

#### 원칙
- MS-3-4에서는 exclude_candidate 자동 생성 안 함
- MS-3-5 이후 별도 진단 레이어로 확장
- 분류 엔진과 진단 엔진은 섞지 않음

MS-3-4 설계에서는 unmatched만 자동 생성하고, exclude_candidate는 후속 단계로 분리하는 정책이 명확히 잡혀 있다.

---

## 10. MS-4 — 메뉴판매량 순위 화면

### 목적

월별 판매량 데이터를 메뉴 기준으로 집계해 순위를 보여준다.

### 데이터 기준
- sales_rows
- status = 'classified'만 사용

### 기본 집계 단위
- 기본: groupName
- 상세 보기: detailName

### 필터
- 월 선택
- 카테고리 선택
- 메뉴명 검색

### 기본 표 컬럼

| 컬럼 | 내용 |
|------|------|
| 순위 | 판매량 순위 |
| 카테고리 | 분류 카테고리 |
| 메뉴명 | groupName |
| 판매량 | 합산 수량 |
| 판매 비중 | 해당 월 classified 총량 대비 비율 |

### 집계 정책
- 집계 결과 DB 저장 금지
- 화면 조회 시 실시간 계산
- unclassified, excluded는 제외

---

## 11. MS-5 — 메뉴판매량 비교 화면

### 목적

두 월의 판매량을 비교한다.

### 기본 비교
- 기준월 A vs 비교월 B

### 계산식

#### 증감량
```
비교월 - 기준월
```

#### 증감률
```
(비교월 - 기준월) / 기준월 × 100
```

### 예외 처리

| 경우 | 표시 |
|------|------|
| 기준월 0, 비교월 > 0 | 신규 |
| 기준월 > 0, 비교월 0 | -100% 또는 판매 중단 라벨 |
| 둘 다 0 | 표시 제외 가능 |

### 기본 표 컬럼

| 컬럼 | 내용 |
|------|------|
| 카테고리 | 카테고리 |
| 메뉴명 | groupName |
| 기준월 판매량 | A |
| 비교월 판매량 | B |
| 증감량 | B-A |
| 증감률 | 변화율 |

---

## 12. MS-6 — 메뉴미매칭 관리

### 목적

미분류 메뉴를 사람이 확인하고, 향후 자동 분류 가능하게 보정한다.

### 데이터 기준
- menu_sales_issues
- issueType = 'unmatched'
- status = 'open'

### 표시 필드

| 필드 | 설명 |
|------|------|
| 월 | year/month |
| 이슈 유형 | unmatched |
| 정규화 메뉴명 | normalizedMenuName |
| 대표 원본명 | representativeRawMenuName |
| 영향 행 수 | affectedRowCount |
| 판매량 합계 | totalQuantity |
| 연결 행 | relatedSalesRowIds |
| 상태 | open |

### 관리자 처리 방식

#### 1. alias 등록
예: 치즈가루 → 파마산

#### 2. 신규 규칙 등록
예: 새 메뉴명 → category/groupName/detailName

#### 3. 품목 제외 등록
예: 통계 제외 품목

### 반영 정책

#### 현재 데이터
- 관련 sales_rows 재처리
- issue 상태 변경

#### 미래 데이터
- alias / rules / excluded 기준으로 자동 반영

---

## 13. MS-7 — 메뉴판매량 설정

### 관리 대상

#### 13.1 별칭 관리
- 원본명 → 표준명

#### 13.2 품목 제외 관리
- 통계 제외 메뉴

#### 13.3 분류 규칙 관리
- 메뉴명 패턴 → 카테고리 / 그룹 / 상세명

#### 13.4 카테고리 표시 관리
- 필터 표시 순서
- 노출 여부

### 설정 정책
- 삭제보다 비활성화 우선
- 중복 등록 방지
- 과거 전체 데이터 자동 재분류 금지
- 재분류는 명시적 실행 시에만

---

## 14. MS-8 — 월별 데이터 관리 고도화

### 목적

업로드 이력과 월별 데이터 운영 편의성을 높인다.

### 포함 기능
- 업로드 월 목록
- 파일명 / 업로드일 / 행 수
- 삭제됨 로그 확인
- 월별 재업로드 진입
- 이슈 수 표시

---

## 15. MS-9 — 보고서센터 연동

### 연동 대상
- 판매량 보고서
- 판매량 비교 보고서

### 원칙
- 보고서는 기존 계산 로직을 재사용
- 별도 중복 집계 로직 만들지 않음
- 화면용 계산과 보고서용 계산은 공통 calc 함수 사용

---

## 16. MS-10 — 전체 회귀검증

### 점검 범위
- 메뉴판매량 업로드
- 순위
- 비교
- 미매칭
- 설정
- 월별 데이터 관리
- 보고서 연동
- 기존 모듈 회귀

### 회귀검증 핵심 항목
- 기존 가격 비교 이상 없음
- 출고량 이상 없음
- 원가계산 이상 없음
- 메뉴개발노트 이상 없음
- DB 마이그레이션 충돌 없음
- 탭 전환 문제 없음
- 동일 월 중복 차단 유지
- 삭제/재업로드 안정성 유지

---

## 17. 구현 금지사항

### 절대 금지
- 원본 엑셀 카테고리 열을 내부 집계 기준으로 사용
- 집계 결과를 DB에 저장
- invalidRows가 있는데 일부만 저장
- 같은 월 자동 덮어쓰기
- 사용자 승인 없이 과거 월 자동 재분류
- UI 안에서 분류 정책 직접 판단
- 비동기 IDB onerror에서 throw
- 삭제 후 자동 재저장
- 미매칭 자동 추정 분류

---

## 18. 문서 구조 권장안

### 18.1 CLAUDE.md

**요약 정책만 유지**

#### 포함할 것
- 메뉴판매량 핵심 원칙
- DB/업로드/분류/집계 금지사항
- MS 단계별 큰 흐름
- 상세 문서 링크

### 18.2 별도 상세 문서

**권장 파일**: `docs/menu-sales/MS_MASTER_SPEC.md`

#### 이 문서에 넣을 것
- 본 답변 전체 내용
- MS-0~MS-10 로드맵
- 각 단계별 정책
- 완료 기준
- 향후 구현 기준

---

**최종 확정**: 2026-05-19  
**이 문서는 메뉴판매량 모듈의 일관성 유지 기준 문서입니다.**
