# DB 구축 인수인계 메모

작성일: 2026-06-22

## 현재 상태

PostgreSQL 기반 서버 DB 구축 1차 작업은 완료된 상태다.

이번 단계의 목적은 기존 브라우저 IndexedDB/localStorage 데이터를 바로 정규화하지 않고, 먼저 PostgreSQL에 손실 없이 담을 수 있는 호환 계층을 만드는 것이다. 앱의 전체 IndexedDB store 43개는 `store_catalog`에 catalog seed로 기록하고, 실제 백업 JSON의 row는 `store_rows`에 JSON 원본으로 보존하는 구조를 잡았다.

검증 기준으로는 아래가 통과했다.

- `npm run db:bootstrap`
- `npm run db:import:backup:dry-run -- prisma/fixtures/sample-backup.json --brand china4`
- `npm run db:validate`
- `npm run db:migration:check`
- `npm run lint`
- `npm run audit:docs`
- `npm run test:ci`

마지막 확인 시 DB 상태는 `brands=3`, `storeCatalog=43`이었다.

## 주요 변경 파일

DB 스키마와 Prisma 설정:

- `prisma/schema.prisma`
- `prisma.config.ts`
- `prisma/migrations/20260622060000_init_server_store/migration.sql`
- `prisma/migrations/migration_lock.toml`
- `lib/server/prisma.js`

seed, 검증, import 도구:

- `prisma/store-catalog.mjs`
- `prisma/seed-store-catalog.mjs`
- `prisma/check-db.mjs`
- `prisma/check-migration.mjs`
- `prisma/bootstrap-db.mjs`
- `prisma/backup-import-core.mjs`
- `prisma/import-backup.mjs`
- `prisma/fixtures/sample-backup.json`

로컬 PostgreSQL 실행/자동 실행:

- `prisma/local-postgres.mjs`
- `scripts/start-local-postgres.ps1`
- `scripts/start-local-postgres.cmd`
- `scripts/register-db-autostart.ps1`

환경 예시와 문서:

- `.env.example`
- `.env.db.example`
- `docker-compose.db.yml`
- `docs/DB_BUILD_PREP.md`
- `docs/DB_BUILD_HANDOFF.md`

Windows 테스트 안정화:

- `scripts/clean-build.mjs`
- `__tests__/lib/browser-api-policy.test.mjs`
- `__tests__/lib/storage-access-policy.test.mjs`
- `__tests__/lib/silent-catch-policy.test.mjs`
- `__tests__/lib/eslint-disable-policy.test.mjs`
- `__tests__/lib/route-classification.test.mjs`
- `__tests__/lib/css-primitive-ownership.test.mjs`
- `__tests__/lib/system-policy-settings-usage.test.mjs`

## 로컬 DB 실행

현재 PC에는 시스템 설치 대신 portable PostgreSQL이 프로젝트 내부에 준비되어 있다.

Git에 넣지 않는 로컬 파일/폴더:

- `.env`
- `.env.db`
- `.postgresql/`
- `.pgdata/`
- `.pglog/`

수동 시작:

```powershell
npm.cmd run db:pg:start
```

상태 확인:

```powershell
npm.cmd run db:check
```

종료:

```powershell
npm.cmd run db:pg:stop
```

로그인 시 자동 실행 등록:

```powershell
npm.cmd run db:pg:autostart
```

이 PC에서는 작업 스케줄러 등록이 권한 문제로 막혀서, 현재 사용자 시작프로그램 레지스트리 방식으로 등록했다.

등록된 시작 항목:

- `7thRNDManagerLocalPostgreSQL`

바탕화면 바로가기:

- `C:\Users\user\Desktop\7th RND DB Start.lnk`

## 앱 실행 주소

개발 서버는 아래 명령으로 3000 포트에 띄운다.

```powershell
npm.cmd run dev:clean
```

브라우저 주소:

```text
http://localhost:3000/login
```

## DB 명령어

스키마 검증:

```powershell
npm.cmd run db:validate
```

Prisma Client 생성:

```powershell
npm.cmd run db:generate
```

마이그레이션 적용:

```powershell
npm.cmd run db:migrate
```

초기 seed:

```powershell
npm.cmd run db:seed
```

마이그레이션, seed, 상태 확인 일괄 실행:

```powershell
npm.cmd run db:bootstrap
```

백업 JSON dry-run:

```powershell
npm.cmd run db:import:backup:dry-run -- prisma/fixtures/sample-backup.json --brand china4
```

실제 백업 import:

```powershell
npm.cmd run db:import:backup -- <backup.json> --brand <brandId>
```

## 다음 작업자가 주의할 점

- 실제 운영 데이터, DB dump, `.env`, `.env.db`, `.env.production`은 Git에 넣지 않는다.
- 현재 구조는 "손실 없는 이관 호환 계층"이다. 아직 전체 앱이 서버 DB API를 사용하도록 전환된 것은 아니다.
- 기존 IndexedDB 호출부를 한 번에 전부 API로 바꾸지 않는다.
- 먼저 백업 JSON import 결과와 row count를 확인한 뒤, 자주 조회하는 업무 테이블부터 순차적으로 정규화한다.
- 포트 `5432`는 로컬 전용으로만 사용하고 외부 인터넷에 직접 공개하지 않는다.

## 커밋 의도

이 커밋은 DB 구축의 1차 기준점을 남기기 위한 것이다.

다른 작업 환경에서 이 커밋을 보면 PostgreSQL 스키마, seed, 마이그레이션, 백업 import CLI, 로컬 실행 방식, 검증 명령을 한 번에 파악할 수 있어야 한다.
