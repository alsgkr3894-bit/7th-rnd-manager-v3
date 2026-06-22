# 로컬 운영 DB 구축 계획

기준일: 2026-06-22

## 1. 결론

현재 컴퓨터는 개발/검증용으로 사용하고, 실제 운영 DB는 다른 컴퓨터에 구축한다.

추천 구조:

```text
사용자 PC들
  -> 브라우저 접속
운영 컴퓨터
  -> Next 앱 서버
  -> PostgreSQL DB
  -> 자동 백업
```

중요 원칙:

- 브라우저가 DB에 직접 접속하지 않는다.
- 사용자는 사이트 URL로만 접속한다.
- DB 접속은 Next 서버/API에서만 수행한다.
- 실제 DB 데이터, `.env`, 비밀번호, 백업 파일은 Git에 올리지 않는다.

## 2. 추천 방식

현재 컴퓨터에서 DB 전환 코드와 구축 파일을 만들고, 운영 컴퓨터에서 Git으로 받아 실제 구축한다.

```text
현재 컴퓨터
1. DB 스키마 작성
2. migration 작성
3. IndexedDB/localStorage -> 서버 DB import 스크립트 작성
4. 테스트/빌드 확인
5. Git push

운영 컴퓨터
1. Git clone 또는 git pull
2. PostgreSQL 설치
3. .env.production 직접 작성
4. migration 실행
5. 백업 JSON import
6. build
7. 서버 실행
```

이 방식이 좋은 이유:

- 운영 컴퓨터에는 검증된 코드만 배포할 수 있다.
- DB 데이터와 비밀번호를 Git에서 분리할 수 있다.
- 문제가 생기면 현재 컴퓨터에서 수정 후 다시 push/pull 흐름으로 반영할 수 있다.
- 운영 컴퓨터를 바꿔도 같은 절차로 재구축할 수 있다.

## 3. Git에 올릴 것 / 올리지 말 것

### Git에 올릴 것

- DB schema 파일
- migration 파일
- seed/import 스크립트
- IndexedDB 백업 JSON -> 서버 DB 변환 스크립트
- `.env.example`
- 운영 구축 문서
- Docker Compose 파일
- 테스트 코드

### Git에 올리면 안 되는 것

- `.env`
- `.env.production`
- 실제 DB dump
- 실제 백업 JSON
- DB 비밀번호
- 관리자 비밀번호
- 운영 서버 IP/접속 계정 정보
- 개인 데이터가 들어간 CSV/XLSX

## 4. 운영 컴퓨터 구성

권장:

- 항상 켜져 있는 컴퓨터, 미니 PC, NAS, 사내 서버 중 1대
- 내부 LAN 고정 IP 사용
- PostgreSQL 설치
- Next 앱도 같은 컴퓨터에서 실행
- 매일 자동 백업 설정

피해야 할 구성:

- 사용자 PC마다 DB를 따로 설치
- SQLite 파일을 네트워크 공유 폴더에 두고 여러 명이 같이 사용
- PostgreSQL 포트를 인터넷에 직접 공개
- 자동 백업 없이 운영 시작

## 5. 운영 컴퓨터 구축 절차

### 1단계. 코드 받기

```bash
git clone <repository-url>
cd 7th-rnd-manager-v3
```

이미 받아둔 경우:

```bash
git pull
```

### 2단계. 의존성 설치

```bash
npm ci
```

### 3단계. PostgreSQL 준비

운영 컴퓨터에 PostgreSQL을 설치하고 앱 전용 DB와 계정을 만든다.

예시:

```text
DB name: rnd_manager
DB user: rnd_app
DB password: 운영 컴퓨터에서만 관리
```

### 4단계. 환경변수 작성

운영 컴퓨터에서만 `.env.production`을 만든다.

예시:

```env
DATABASE_URL="postgresql://rnd_app:비밀번호@127.0.0.1:5432/rnd_manager"
APP_ENV="production"
```

실제 비밀번호가 들어간 파일은 Git에 올리지 않는다.

### 5단계. migration 실행

추후 migration 도구가 정해지면 아래처럼 실행한다.

```bash
npm run db:migrate
```

아직 스크립트가 없으므로 DB 구축 작업 때 추가해야 한다.

### 6단계. 기존 데이터 import

현재 앱의 백업 JSON을 만든 뒤 운영 컴퓨터에서 import한다.

```bash
npm run db:import -- ./backup.json
```

아직 스크립트가 없으므로 DB 구축 작업 때 추가해야 한다.

### 7단계. build

```bash
npm run build
```

### 8단계. 실행

단순 실행:

```bash
npm run start
```

운영에서는 `pm2`, `systemd`, 또는 Docker Compose를 권장한다.

## 6. Docker Compose 선택안

운영 컴퓨터에서 가장 관리하기 쉬운 방식은 Docker Compose다.

목표:

```text
docker compose up -d --build
```

구성:

- app 컨테이너
- postgres 컨테이너
- DB volume
- backup volume 또는 백업 폴더

장점:

- 운영 컴퓨터 재설치가 쉬움
- PostgreSQL 버전 고정 가능
- 앱/DB 시작 순서 관리 가능
- 나중에 다른 컴퓨터로 옮기기 쉬움

주의:

- DB volume은 절대 삭제하면 안 됨
- `.env.production` 또는 compose용 `.env`는 Git 제외
- 백업 폴더는 별도 디스크나 NAS에도 복사

## 7. 업데이트 절차

현재 컴퓨터에서 수정 후:

```bash
git push
```

운영 컴퓨터에서:

```bash
git pull
npm ci
npm run db:migrate
npm run build
pm2 restart rnd-manager
```

Docker Compose 사용 시:

```bash
git pull
docker compose up -d --build
```

## 8. DB 구축 전 필수 준비물

| 항목 | 해야 할 일 |
| --- | --- |
| DB 종류 | PostgreSQL 우선 추천 |
| 서버 위치 | 운영 컴퓨터 1대 확정 |
| 접속 방식 | 내부 LAN URL 확정 |
| schema | IndexedDB 43개 store를 서버 table로 매핑 |
| localStorage | 서버 이동 / 브라우저 유지 / 폐기 3그룹 분류 |
| 브랜드 | `v3:brand-master`를 서버 table로 옮길지 결정 |
| 권한 | admin/viewer를 서버 API에서 검증 |
| 백업 | 매일 자동 백업 + 수동 복구 테스트 |
| import | 백업 JSON -> PostgreSQL import 스크립트 작성 |
| QA | `test:ci`, `qa:full`, `qa:prod`, 백업/복원 리허설, `v3:restore-journal:last` 확인 |

## 9. localStorage 분류 초안

2026-06-22 현재 실제 코드 기준으로 다시 분류했다. DB 구축 전에는 이 표를 기준으로 서버 table, 브라우저 유지 설정, 폐기/세션 키를 나눈다.

| 그룹 | 키/패턴 | 현재 백업 포함 | DB 구축 전 결정 |
| --- | --- | --- | --- |
| 서버 이동 후보 | `v3:brand-master` | ✅ 포함 | `brands` 또는 `brand_settings` table로 승격. 브랜드명/색/숨김/default를 서버 source of truth로 옮김 |
| 서버 이동 후보 | `v3:profile` | ✅ 포함 | 단일 운영자 프로필이면 서버 `app_profile`; 개인별이면 `users.profile`로 분리 |
| 서버 이동 후보 | `rnd_active_account_id`, `rnd_active_account_id:*` | ✅ 포함 | 서버 세션/사용자 테이블 도입 시 브라우저 키는 제거하고 서버 로그인 상태로 대체 |
| 서버 이동 후보 | `monthly_close_log_v1` | ✅ 포함 | 월마감 완료 이력. 여러 PC에서 공유해야 하면 `monthly_close_runs` 또는 `report_jobs` table로 승격하고, 체크리스트 전용이면 폐기 정책 확정 |
| 서버 이동 후보 | `change_log_v1` | ❌ 미포함 | 최근 200건 변경 이력. 현재는 기록 전용 localStorage라 백업 원본에는 넣지 않음. 진짜 감사 로그가 필요하면 서버 `change_logs` table로 승격 |
| 브라우저 유지 후보 | `v3:theme`, `v3:density`, `v3:fontScale`, `v3:roundMode`, `v3:autoRecalc`, `v3:strictPosting`, `v3:unmatchedAlert`, `v3:costRateAlert` | ✅ 포함 | 사용자 표시/계산 선호값. 여러 PC 공유가 필요하면 `user_preferences` table로 이동 |
| 브라우저 유지 후보 | `v3:sidebar-open`, `v3:palette-recent`, `v3:home-widgets`, `v3:home-widget-*`, `v3:home-todo-done` | ✅ 포함 | 개인 UI 상태와 홈 할 일 완료 상태. 서버 DB의 핵심 업무 데이터로 보지 않음 |
| 브라우저 유지 후보 | `v3:nutrition-*`, `v3:note-sort`, `v3:note-view`, `v3:note-pins`, `v3:note-presets`, `v3:note-calendar-checklist`, `v3:note_lastCategory`, `v3:sample-*`, `v3:recipe-sort`, `v3:cost-platforms`, `v3:margin-*`, `v3:ingredient-*`, `v3:jette-settings` | ✅ 포함 | 업무 설정 성격. 서버 전환 후에도 백업 import 대상이며, 공유 설정이면 table화 |
| 브라우저 유지 후보 | `saved_views_v1__{brand}__{screen}`, `saved_views_v1_default__{brand}__{screen}` | ✅ 동적 키 포함 | 개인 필터 프리셋. 현재는 백업/복원 대상이며, 여러 PC에서 공유하려면 `saved_views` table 추가 |
| 브라우저 유지 후보 | `action_center_state_v1`, `recipe_recent_ingredients` | ❌ 미포함 | 액션센터 숨김/나중에 보기, 레시피 최근 재료. 개인 편의 캐시라 백업/DB 원본에서 제외 |
| 브라우저 유지 후보 | `v3:*search-history`, `v3:*search`, `v3:*filter` | ❌ 미포함 | 검색/필터 상태. 서버 DB로 옮기지 않음 |
| 브라우저 유지 후보 | `v3:note-draft-*`, `v3:note-draft-write`, `v3:home-quick-note-draft`, `report_draft_*` | ❌ 미포함 | 노트/보고서 임시 작성 상태. 백업/마이그레이션 원본에서 제외 |
| 폐기 또는 세션 전용 | `v3:active-brand` | ❌ 미포함 | 현재 브라우저에서 보고 있는 브랜드 선택값. 서버 DB 데이터가 아니라 세션/UI 상태 |
| 폐기 또는 세션 전용 | `v3:backup-history` | ❌ 미포함 | 백업 이력 표시용 로컬 메타. 서버 백업 시스템 도입 후 서버 작업 로그로 대체 |
| 폐기 또는 세션 전용 | `v3:restore-journal:last` | ❌ 미포함 | 마지막 복원 시도 추적용 로컬 저널. 서버 import 원본이 아니라 리허설/운영 확인 로그로만 사용 |
| 폐기 또는 세션 전용 | `v3:auth-hash`, `v3:settings-pin`, `v3:auth` cookie | ❌ 미포함 | 로컬 인증/설정 잠금 값. 서버 전환 시 서버 auth/session으로 대체하고 백업 JSON에 넣지 않음 |
| 폐기 또는 세션 전용 | `v3:last-ip`, `v3:last-login`, `v3:settings-auth-session`, `v3:session-active`, `v3:sales-pending-reclassify`, note handoff session keys | ❌ 미포함 | 운영 감사/세션/일시 작업 플래그는 서버 로그, 재계산 또는 세션으로 대체 |

주의:

- `v3:brand-master`는 이번 점검에서 백업 영속 키에 추가했다. 서버 DB import 원본에서 브랜드 정의가 빠지는 문제를 막기 위한 조치다.
- `saved_views_v1__*`는 안전한 키 패턴만 백업/복원에 동적 포함한다. 개인화 기능으로 유지할지, 서버 `saved_views` table로 승격할지는 DB 스키마 설계 때 결정한다.
- `monthly_close_log_v1`은 1~12월 기간과 알려진 완료 항목만 보존하도록 정규화한다. 서버 전환 시 운영 이력으로 볼지, 로컬 체크리스트로 폐기할지 결정한다.
- `change_log_v1`은 사용자가 지울 수 있는 보조 이력이다. 서버 감사 로그로 승격하기 전까지는 백업/복원 대상에서 제외해 복원 작업이 감사 이력을 덮어쓰지 않게 한다.
- `v3:home-todo-done`은 홈 위젯 설정과 같은 공통 백업 범위에 포함한다. 노트/일정 데이터와 함께 복원될 때 사용자의 완료 체크 상태가 유지된다.
- `v3:note_lastCategory`는 단순 필터가 아니라 새 노트 작성 기본 카테고리 선호값이므로 notes 스코프 백업에 포함한다.
- `report_draft_sales`, `report_draft_cost`, `report_draft_price`, `report_draft_shipment`, `report_draft_compare`는 보고서 빌더 임시 복원용 draft라 백업 JSON과 서버 import 원본에서 제외한다.
- `v3:restore-journal:last`는 복원 시작/완료/부분 실패를 확인하는 마지막 시도 저널이다. 대상 PC import 리허설 후 이 값을 보고 실패 그룹과 적용 수를 확인하되, 서버 DB로 승격할 업무 데이터는 아니다.
- 복원 미리보기는 백업 JSON의 `localStorage` 섹션을 복원 가능 키/무시 키/형식 오류/과대 입력으로 요약한다. 서버 import 스크립트도 같은 allowlist 기준을 재사용한다.

## 10. 백업 정책

필수:

- 매일 1회 자동 DB dump
- 배포 전 수동 백업
- 복원 리허설 월 1회
- 백업 파일은 운영 컴퓨터 외부에도 복사

권장 보관:

- 일별 백업 14일
- 주별 백업 8주
- 월별 백업 6개월

운영 중 실수 복구를 위해 앱 내부 백업 JSON과 PostgreSQL dump를 둘 다 유지하는 것을 권장한다.

## 11. 최종 착수 조건

DB 구축을 시작하기 전에 아래 조건을 만족해야 한다.

- [ ] 운영 컴퓨터 위치 확정
- [ ] PostgreSQL 또는 Docker Compose 방식 결정
- [ ] `qa:prod` 최신 green 기록
- [ ] 실제 출력물 열람 QA 기록
- [ ] 백업/복원 브라우저 수동 QA 기록
- [ ] IndexedDB store -> PostgreSQL table 매핑표 작성
- [ ] localStorage 키 분류표 작성
- [ ] 서버 권한 모델 확정
- [ ] 백업 JSON import 스크립트 설계

## 12. 현재 판단

현재 사이트는 로컬 브라우저 저장소에서 중앙 DB로 넘어가기 직전 단계다.

가장 좋은 방향:

```text
현재 컴퓨터 = 개발/검증/코드 작성
운영 컴퓨터 = Next 앱 실행 + PostgreSQL 보관 + 자동 백업
Git = 코드와 구축 절차만 전달
백업/비밀번호/운영 데이터 = Git 제외
```

이 방식으로 진행하면 운영 안정성과 복구 가능성이 가장 좋다.
