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
| QA | `test:ci`, `qa:full`, `qa:prod`, 백업/복원 리허설 |

## 9. localStorage 분류 초안

서버 이동 후보:

- `v3:brand-master`
- `v3:profile`
- `rnd_active_account_id:*`
- 계정/권한 관련 설정
- 업무 설정 중 여러 사용자에게 공유되어야 하는 값

브라우저 유지 후보:

- `v3:theme`
- 화면 밀도/폰트 크기
- 최근 검색어
- 사이드바 열림 상태
- 스크롤 위치
- 임시 draft

폐기 또는 세션 전용 후보:

- `v3:session-active`
- `v3:last-ip`
- `v3:last-login`
- `v3:settings-auth-session`
- 일시적인 handoff 키

주의:

- 이 분류는 초안이다.
- DB 구축 전에 실제 키 목록을 기준으로 최종 표를 작성해야 한다.

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
