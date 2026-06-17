# 사이트 품질 개선 작업 계획

작성일: 2026-06-17

## 1. 현재 평가

현재 사이트를 냉정하게 평가하면 다음 수준이다.

- 내부 R&D/운영툴 기준: 82/100점
- 외부 고객용 SaaS 기준: 68~72/100점

현재 앱은 실제 업무를 처리할 수 있는 내부 운영툴로는 충분히 높은 수준이다. 메뉴마스터, 원가계산, 영양성분, 원산지, 알레르기, 제때 데이터, 판매량, 보고서, 백업/복원까지 연결되어 있고 테스트도 많다.

다만 장기 운영, 다중 사용자, 외부 배포, 데이터 복구, 신규 사용자 UX 기준으로는 보완 여지가 있다.

## 2. 주요 감점 이유

### 2.1 데이터 안정성

- IndexedDB와 localStorage 중심이라 사용자 PC와 브라우저 상태에 의존한다.
- 백업/복원이 있어도 자동 복구나 중앙 저장소가 있는 구조는 아니다.
- 복원 실패, 일부 store 누락, 버전 불일치, row count 불일치를 사용자가 놓치면 데이터 신뢰도가 떨어질 수 있다.

### 2.2 보안

- 현재 인증은 내부 로컬 도구 기준이다.
- 외부 배포나 LAN 다중 사용자 운영에는 서버 권한 검증, HttpOnly 쿠키, 세션 만료, 감사 로그가 부족하다.
- 관리자/조회자 권한은 UI에서 많이 막혀 있지만, 실행 함수와 데이터 계층까지 완전히 검증되는지 계속 확인해야 한다.

### 2.3 UX 복잡도

- 기능이 많고 도메인이 넓다.
- 신규 사용자는 메뉴마스터, 원가, 영양성분, 원산지, 알레르기, 판매량, 보고서 관계를 한 번에 이해하기 어렵다.
- 화면별 이슈, 다음 작업, 누락 데이터 안내가 더 강해야 한다.

### 2.4 실제 업무 흐름 E2E 부족

- Jest와 구조 테스트는 많지만 긴 업무 흐름 테스트는 더 필요하다.
- 예: 식자재 단가 변경 → 레시피 원가 변경 → 원가마진표 반영 → 보고서 출력 검증.

### 2.5 도메인 결합과 큰 파일 위험

- 많이 분리됐지만 출력, 백업/복원, 식자재 관리, 원가/영양성분 builder는 계속 복잡해질 가능성이 있다.
- 공통 helper 변경이 여러 화면에 영향을 줄 수 있다.

### 2.6 문서 최신성

- `docs/SITE_STATUS.md` 같은 현황 문서는 코드 변화에 따라 수치가 빨리 어긋날 수 있다.
- route 수, hook 사용 수, store 수처럼 자동 계산 가능한 항목은 검증 스크립트 또는 문서 갱신 규칙이 필요하다.

## 3. 개선 목표

- 내부 운영툴 기준 90점 이상을 목표로 한다.
- 데이터 손실 가능성을 줄인다.
- 주요 업무 흐름을 실제 브라우저 E2E로 검증한다.
- 신규 사용자도 누락 작업과 다음 행동을 쉽게 알 수 있게 한다.
- 보안 정책을 내부용과 외부 배포용으로 분리한다.
- 큰 도메인 파일을 계속 작게 나눠 유지보수성을 높인다.
- 현황 문서와 실제 코드 수치가 어긋나지 않게 한다.

## 4. Claude Code 작업 원칙

모든 단계는 아래 순서로 진행한다.

1. 작업 범위 확인
2. 구현
3. 관련 테스트 실행
4. 버그 탐색
5. 브라우저 사이트 확인
6. 한 번 더 반복 검사
7. 문서 업데이트
8. 단계별 커밋
9. 다음 단계 이동

### 공통 금지 사항

- 여러 큰 단계를 한 커밋에 섞지 않는다.
- 테스트 실패 상태로 커밋하지 않는다.
- 사용자 또는 다른 작업자가 만든 변경을 되돌리지 않는다.
- 실제 운영 데이터로 삭제, 복원, 초기화 테스트를 바로 하지 않는다.
- CSS 대규모 변경과 기능 변경을 같은 커밋에 섞지 않는다.

### 공통 확인 명령

- `git status --short`
- `npm run lint`
- 관련 Jest 테스트
- 필요 시 `npm run test:ci`
- 필요 시 `npm run qa:smoke`
- 화면 영향이 크면 `npm run qa:runtime`

## 5. 우선순위별 작업 계획

### P0. 데이터 안전성 강화

목표: 데이터 손실, 복원 실패, 저장 누락을 사용자가 놓치지 않게 한다.

#### 작업 항목

- 백업/복원 결과 검증 강화
  - 복원 전 미리보기 row count와 복원 후 실제 row count 비교.
  - 일부 store 실패 시 실패 store 이름, 실패 row 수, 복구 가능 여부 표시.
  - 알 수 없는 store, 버전 불일치, localStorage key 누락을 명확히 표시.
- 자동 백업 실패 노출
  - 복원 전 자동 백업이 실패하면 복원 진행을 막거나 강한 경고를 표시.
  - 사용자가 실패 상태를 확인하지 않고 넘어가지 않게 한다.
- 위험 액션 보호
  - DB 삭제, 전체 초기화, seed 덮어쓰기, 브랜드 복원은 관리자만 가능해야 한다.
  - 실행 함수에서도 viewer 권한을 차단한다.
- 백업 범위 정합성 점검
  - 브랜드별 데이터와 공통 localStorage key가 예상대로 포함/제외되는지 테스트한다.
  - 임시저장, 스크롤 위치, 최근 방문처럼 복원하면 이상한 키는 제외한다.

#### 확인 대상 파일

- `app/settings/backup/page.jsx`
- `app/settings/restore/page.jsx`
- `app/settings/brands/page.jsx`
- `lib/backup/*`
- `lib/backup-history.js`
- `lib/db/*`
- `hooks/useModuleScopes.js`
- `hooks/useRestoreFile.js`

#### 테스트 계획

- 백업 payload validation 테스트 추가 또는 보강.
- 복원 실패 store fixture 테스트 추가.
- localStorage backup scope 테스트 보강.
- 관리자/viewer 권한 테스트 추가.
- 브라우저 확인:
  - `/settings/backup`
  - `/settings/restore`
  - `/settings/brands`

#### 완료 기준

- 복원 실패와 위험 상태가 화면에 명확히 보인다.
- row count 검증이 자동으로 수행된다.
- viewer가 위험 액션을 실행할 수 없다.
- 관련 테스트와 smoke QA가 통과한다.
- 작업 내용이 문서에 반영되고 커밋된다.

### P1. 핵심 업무 E2E 테스트 추가

목표: 실제 사용자가 하는 긴 업무 흐름을 브라우저 테스트로 검증한다.

#### 우선 E2E 시나리오

1. 메뉴 등록 → 레시피 저장 → 원가마진표 반영
2. 식자재 단가 변경 → 메뉴 원가 변경 → 원가 보고서 반영
3. 공통원가 체크 → 원가/원산지/알레르기 출력 반영
4. 판매량 업로드 → 미매칭 처리 → 보고서 생성
5. 백업 생성 → 복원 미리보기 → 복원 완료 검증

#### 구현 방향

- Playwright 기반 QA 스크립트 또는 별도 E2E 스크립트로 만든다.
- 테스트 데이터는 실제 운영 데이터가 아닌 fixture 또는 임시 브라우저 context를 사용한다.
- 테스트 실행 전후 데이터 초기화 방식을 명확히 한다.
- 실패 시 어느 단계에서 깨졌는지 로그를 남긴다.

#### 확인 대상 파일

- `scripts/smoke-qa.mjs`
- `scripts/full-rt.mjs`
- `scripts/qa-browser-utils.mjs`
- `__tests__/scripts/*`
- 필요 시 신규 `scripts/workflow-qa.mjs`

#### 테스트 계획

- E2E 스크립트 자체 구조 테스트 추가.
- 최소 1개 시나리오부터 구현하고 점진 확장.
- `npm run qa:smoke`와 충돌하지 않게 별도 명령으로 분리 검토.

#### 완료 기준

- 최소 3개 이상의 핵심 업무 시나리오가 자동 QA로 검증된다.
- 실패 로그가 단계별로 읽기 쉽다.
- 기존 smoke/runtime QA와 역할이 구분된다.

### P2. UX 단순화와 이슈 중심 안내

목표: 사용자가 다음에 해야 할 작업과 누락 데이터를 바로 알 수 있게 한다.

#### 작업 항목

- 화면별 이슈 패널 강화
  - 메뉴마스터: 레시피 미작성, 수량 누락, 단가 누락, 판매가 누락.
  - 식자재관리: 단가 없음, 제품코드 중복, 원산지 없음, 알레르기 미확인, 미사용 분류/태그.
  - 영양성분: 기본값 없음, 엣지 값 누락, 출력 제외 상태.
  - 판매량: 미매칭, 제외 처리 필요, 규칙 충돌.
- 홈 대시보드에 주요 이슈 요약 추가
  - 오늘 확인해야 할 데이터 문제.
  - 최근 백업 경과일.
  - 원가율 위험 메뉴 수.
  - 미매칭 판매량 건수.
- 빈 상태/오류 상태 통일
  - 데이터 없음, 로딩 실패, 권한 없음, 저장 실패 UI를 공통 패턴으로 맞춘다.

#### 확인 대상 파일

- `app/page.jsx`
- `app/menu-master/page.jsx`
- `app/ingredient/manage/page.jsx`
- `app/nutrition/menu/page.jsx`
- `app/menu-sales/unmatched/page.jsx`
- `components/ui/*`
- `components/Toast.jsx`

#### 테스트 계획

- 이슈 계산 helper 단위 테스트.
- 화면 구조 테스트.
- viewer/admin 상태 테스트.
- 모바일 390px에서 이슈 패널 겹침 확인.

#### 완료 기준

- 사용자가 누락 작업을 화면에서 바로 확인할 수 있다.
- 빈 상태와 오류 상태의 UI가 화면마다 크게 다르지 않다.
- 홈에서 주요 위험 상태가 요약된다.

### P3. 보안 정책 분리와 실행 가드 강화

목표: 내부 로컬툴 기준과 외부 배포 기준을 분리하고, 위험 액션은 UI뿐 아니라 실행 함수에서도 막는다.

#### 작업 항목

- `docs/SECURITY_POLICY.md` 보강
  - 내부 LAN 운영 기준.
  - 외부 배포 불가 조건.
  - 외부 배포 전 필수 변경 사항.
- 권한 실행 가드 점검
  - 삭제, 초기화, 복원, seed, 데이터 덮어쓰기 함수.
  - viewer가 UI를 우회해도 실행되지 않아야 한다.
- 세션/쿠키 정책 점검
  - 현재 쿠키 구조와 한계 문서화.
  - 외부 배포 시 HttpOnly/Secure/서버 세션 필요성을 명시.
- 감사 로그 후보 정리
  - 백업/복원.
  - 메뉴 삭제.
  - 식자재 삭제/복구.
  - 데이터 초기화.

#### 확인 대상 파일

- `docs/SECURITY_POLICY.md`
- `lib/auth.js`
- `lib/auth/accounts.js`
- `middleware.ts`
- `app/settings/*`
- 위험 액션을 실행하는 도메인 store 파일

#### 테스트 계획

- 권한 가드 구조 테스트.
- viewer 실행 차단 테스트.
- 설정/백업/브랜드 route smoke 확인.

#### 완료 기준

- 내부용/외부용 보안 정책이 문서로 구분된다.
- 위험 액션은 UI와 실행 함수 양쪽에서 보호된다.
- 외부 배포 전 필요한 작업이 명확하다.

### P4. 큰 도메인 분리 지속

목표: 기능 추가가 계속돼도 유지보수 가능한 구조를 유지한다.

#### 우선 분리 후보

- 백업/복원
  - backup controller hook
  - restore flow controller
  - preview/result/error panels
- 출력/다운로드
  - PDF/print/XLSX/CSV 공통 실패 처리
  - 파일명 생성 규칙
  - 출력 HTML escaping 점검
- 식자재 관리
  - 대량 액션 hook
  - 이슈 패널 계산 helper
  - PDF/export builder 분리
- 원가/영양성분 builder
  - 계산 helper와 출력 helper 분리
  - fixture 기반 snapshot 또는 구조 테스트 강화
- TopBar/AppShell
  - 전역 영향이 크므로 마지막에 처리

#### 테스트 계획

- 리팩토링 전후 결과 동일성 테스트.
- import 순환 검사.
- 관련 route smoke 확인.
- 큰 파일 라인 수 변화 기록.

#### 완료 기준

- page 컴포넌트는 데이터 로드, 상태 조립, UI 배치 중심으로 줄어든다.
- 계산/저장/출력 로직은 helper 또는 hook으로 분리된다.
- 기능 결과가 분리 전과 동일하다.

### P5. 문서 최신성 자동 검증

목표: `SITE_STATUS.md` 같은 현황 문서의 숫자가 코드와 어긋나지 않게 한다.

#### 작업 항목

- 문서 수치 보정
  - page 파일 수.
  - 실제 화면 page 수.
  - redirect page 수.
  - hook 파일 수와 line 수.
  - DB version/store 수.
  - `useDBLoad` 사용 파일 수.
  - CSS import 수.
  - 테스트 파일 수.
  - QA route 수.
- 자동 점검 스크립트 검토
  - `scripts/site-status-audit.mjs` 후보.
  - 문서 숫자와 실제 숫자를 비교해 mismatch를 출력.
- 문서 업데이트 규칙 추가
  - 구조 변경 커밋에는 관련 문서 수치 확인.
  - 문서만 수정해도 `prettier --check`와 수치 audit 실행.

#### 확인 대상 파일

- `docs/SITE_STATUS.md`
- `docs/SITE_REFACTOR_AND_HARDENING_PLAN.md`
- `scripts/*`
- `lib/db/constants.js`
- `lib/navigation/route-classification.js`

#### 테스트 계획

- audit 스크립트 단위 테스트.
- 문서 mismatch fixture 테스트.
- `npx prettier --check docs/SITE_STATUS.md`

#### 완료 기준

- 문서의 주요 숫자가 실제 코드와 맞는다.
- 숫자 drift를 자동으로 찾을 수 있다.
- 문서 최신성 문제가 반복되지 않는다.

### P6. 운영 안정성 보강

목표: 실제 사용 중 문제가 생겼을 때 원인을 빠르게 찾고 복구할 수 있게 한다.

#### 작업 항목

- 사용자에게 보이는 진단 카드 강화
  - DB 상태.
  - 최근 백업.
  - store row count.
  - localStorage backup 대상.
  - 권한 상태.
- 오류 로그 정책 정리
  - 사용자 액션 실패는 toast 또는 화면에 표시.
  - background 실패는 문서화된 allowlist만 허용.
- 출력 실패 처리 개선
  - 팝업 차단.
  - 인쇄 취소.
  - 이미지 로딩 실패.
  - 긴 표 페이지 분할.
- 성능 점검
  - 1천 행, 5천 행, 1만 행 기준 검색/필터 반응성 점검.
  - 필요한 화면만 pagination, debounce, virtual list 적용.

#### 확인 대상 화면

- `/ingredient/manage`
- `/menu-master`
- `/cost/margin`
- `/report/cost`
- `/nutrition/export`
- `/settings/system`
- `/settings/backup`

#### 완료 기준

- 사용자 액션 실패가 조용히 묻히지 않는다.
- 시스템 상태를 확인할 수 있는 화면이 충분하다.
- 대량 데이터에서도 핵심 검색/필터가 멈추지 않는다.

## 6. 권장 작업 순서

1. P5 문서 수치 보정
   - 작고 안전하며 바로 정리 가능.
2. P0 데이터 안전성 강화
   - 가장 중요한 신뢰도 작업.
3. P1 핵심 업무 E2E 테스트 추가
   - 이후 리팩토링의 안전망.
4. P2 UX 단순화와 이슈 중심 안내
   - 실제 사용 편의성 향상.
5. P3 보안 정책과 실행 가드 강화
   - 내부용/외부용 기준 분리.
6. P4 큰 도메인 분리 지속
   - 안전망이 생긴 뒤 진행.
7. P6 운영 안정성 보강
   - 진단/성능/출력 실패 처리 정리.

## 7. 단계별 커밋 예시

- `docs: align site status counts`
- `test: add backup restore count validation`
- `fix: block restore when automatic backup fails`
- `test: add menu recipe to margin workflow qa`
- `feat: summarize critical issues on home dashboard`
- `fix: enforce viewer guards for destructive actions`
- `refactor: split restore flow controller`
- `test: add site status audit script`

## 8. 완료 후 기대 점수

위 작업이 완료되면 목표 점수는 다음과 같다.

- 내부 R&D/운영툴 기준: 90~92점
- 외부 고객용 SaaS 기준: 76~80점

외부 SaaS 기준 점수를 더 올리려면 클라이언트 DB 중심 구조를 서버 DB, 서버 인증, 감사 로그, 중앙 백업 구조로 바꾸는 별도 프로젝트가 필요하다.
