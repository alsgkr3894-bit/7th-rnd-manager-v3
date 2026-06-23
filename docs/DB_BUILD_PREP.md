# DB 구축 진행 문서

작성일: 2026-06-22

## 1. 현재 결론

운영 DB는 PostgreSQL로 준비한다.

다만 현재 앱은 브라우저 IndexedDB/localStorage를 직접 쓰는 구조라서, 처음부터 43개 store를 전부 업무 정규화 테이블로 바꾸면 위험하다. 1차 구축은 PostgreSQL에 기존 백업 JSON을 손실 없이 담는 **호환 계층**을 만들고, 이후 API 전환 단계에서 자주 조회하는 업무 테이블부터 정규화한다.

이번 준비에서 만든 기준:

- `prisma/schema.prisma`: PostgreSQL 기준 Prisma schema 초안
- `prisma.config.ts`: Prisma 7 기준 datasource/migration/seed 설정
- `lib/server/prisma.js`: `@prisma/adapter-pg` 기반 서버용 Prisma Client 생성 헬퍼
- `prisma/store-catalog.mjs`, `prisma/seed-store-catalog.mjs`: 43개 IndexedDB store catalog seed
- `prisma/migrations/20260622060000_init_server_store/migration.sql`: 초기 PostgreSQL DDL
- `prisma/backup-import-core.mjs`, `prisma/import-backup.mjs`: 백업 JSON dry-run/import CLI
- `prisma/bootstrap-db.mjs`: migration, seed, optional import, check 일괄 실행 CLI
- `prisma/fixtures/sample-backup.json`: dry-run 검증용 샘플 백업
- `docker-compose.db.yml`, `.env.db.example`: Docker 기반 PostgreSQL 실행 예시
- `.env.example`: 운영/개발 DB 접속 문자열 예시
- `package.json`: Prisma 검증/생성/마이그레이션 스크립트

## 2. 1차 DB 구조

1차 DB는 아래 테이블을 기준으로 한다.

| 테이블 | 역할 |
| --- | --- |
| `brands` | 브랜드 기준 정보. 기존 `main`, `chinax4`, `icheon` 같은 브랜드 ID의 서버 기준점 |
| `store_catalog` | IndexedDB store 43개의 이름, 모듈, scope, keyPath, index 메타 |
| `store_rows` | 기존 IndexedDB 각 store의 row 원본 JSON 저장 |
| `local_storage_entries` | 백업 대상 localStorage key/value 저장 |
| `data_import_jobs` | 백업 JSON import 실행 이력 |
| `data_import_errors` | import 중 store/key별 오류 |
| `server_settings` | 서버 전환 후 공통 설정 저장소 |

이 구조는 완전 정규화가 아니라 **이관 안전성**을 우선한다. 장점은 기존 백업 JSON을 거의 그대로 넣을 수 있고, 데이터 손실 없이 서버 DB 구축 리허설을 할 수 있다는 점이다.

## 3. Store Scope

현재 앱의 store는 두 범위로 나뉜다.

| scope | 의미 | 대상 |
| --- | --- | --- |
| `BRAND` | 브랜드별 DB에 분리 저장되는 업무 데이터 | 대부분의 store |
| `SHARED` | 항상 main DB에 저장되는 공유 데이터 | `menu_dev_notes`, `sample_records`, `note_schedules`, `work_log` |

서버 DB에서도 `store_rows.scope`로 이 구분을 보존한다. `SHARED` store도 `brand_id='main'`으로 저장해 PostgreSQL unique 제약에서 null 중복 문제를 피한다.

## 4. IndexedDB Store 매핑

### 공통

| store | keyPath | 주요 index | scope | 서버 이관 |
| --- | --- | --- | --- | --- |
| `settings` | `key` | 없음 | BRAND | legacy 호환용. 실제 설정은 localStorage/server setting 분류 후 결정 |
| `upload_log` | `id`, auto | `fileHash`, `module`, `module_fileHash`, `linkedFileId` | BRAND | `store_rows` 원본 보존 |
| `migration_flags` | `flag` | 없음 | BRAND | `store_rows` 원본 보존 |
| `menu_master` | `id`, auto | `menuCode` unique, `category`, `status`, `displayOrder` | BRAND | 이후 정규화 1순위 |
| `generated_reports` | `id`, auto | `kind`, `createdAt`, `fav` | BRAND | 원본 보존 후 보고서 table 분리 검토 |
| `ref_accounts` | `id`, auto | `role` | BRAND | 서버 auth 전환 시 `users/accounts`로 재설계 |

### 판매량

| store | keyPath | 주요 index | 서버 이관 |
| --- | --- | --- | --- |
| `sales_files` | `id`, auto | `year_month` | 원본 보존. 업로드 파일 메타 정규화 후보 |
| `sales_rows` | `id`, auto | `fileId`, `category`, `normalizedMenuName`, `year_month`, `category_normalizedMenuName`, `status` | 정규화 1순위 |
| `sales_rules` | `id`, auto | `rawMenuName`, `enable` | 정규화 후보 |
| `menu_sales_issues` | `id`, auto | `fileId`, `issueType`, `status`, `year_month` | 정규화 후보 |
| `ref_sales_categories` | `id`, auto | `categoryName` unique, `displayOrder`, `enabled` | 정규화 후보 |
| `ref_sales_aliases` | `id`, auto | `rawName`, `enable` | 정규화 후보 |
| `ref_excluded` | `id`, auto | `menuName` | 정규화 후보 |
| `ref_discontinued` | `id`, auto | `menuName` | 정규화 후보 |
| `ref_event_menus` | `id`, auto | `menuName` | 정규화 후보 |

### 제때 가격/출고

| store | keyPath | 주요 index | 서버 이관 |
| --- | --- | --- | --- |
| `price_files` | `id`, auto | `updateDate` unique | 정규화 후보 |
| `price_rows` | `id`, auto | `fileId`, `updateDate`, `productCode`, `fileId_productCode` | 정규화 1순위 |
| `shipment_files` | `id`, auto | 없음 | 원본 보존 |
| `shipment_rows` | `id`, auto | `fileId`, `productCode`, `year_month` | 정규화 후보 |
| `ref_shipment_products` | `id`, auto | `productCode` unique, `enable` | 정규화 후보 |
| `ref_shipment_rules` | `id`, auto | `rawName`, `mappedCode`, `enable` | 정규화 후보 |

### 원가/식자재

| store | keyPath | 주요 index | 서버 이관 |
| --- | --- | --- | --- |
| `menu_recipes` | `id`, auto | `menuCode` unique, `displayGroupKey`, `category`, `kind`, `updatedAt` | 정규화 1순위 |
| `cost_ingredients` | `id`, auto | `productCode`, `ingredientName` | 정규화 1순위 |
| `cost_selling_prices` | `id`, auto | `menuCode`, `menuName`, `size` | 정규화 1순위 |
| `cost_edge_dough` | `id`, auto | `edgeType`, `size` | 원본 보존 후 정규화 |
| `cost_upload_log` | `id`, auto | `uploadType`, `uploadedAt` | 원본 보존 |
| `cost_recipe_groups` | `id`, auto | `name` | 정규화 후보 |
| `cost_suppliers` | `id`, auto | `name` | 정규화 후보 |
| `cost_margin_snapshots` | `id`, auto | `capturedAt` | 원본 보존 |
| `cost_ingredient_price_history` | `id`, auto | `ingredientId`, `changedAt` | 원본 보존 후 이력 table 후보 |
| `cost_platform_fees` | `id` | 없음 | server setting 또는 별도 table 후보 |

### 노트/샘플/일정

이 그룹은 현재 항상 main DB에 저장되는 공유 데이터다.

| store | keyPath | 주요 index | scope | 서버 이관 |
| --- | --- | --- | --- | --- |
| `menu_dev_notes` | `id`, auto | `status`, `category`, `createdAt`, `parentId`, `brand` | SHARED | 정규화 후보 |
| `sample_records` | `id`, auto | `category`, `menuName`, `testDate`, `createdAt` | SHARED | 정규화 후보 |
| `note_schedules` | `id`, auto | `date`, `type`, `createdAt` | SHARED | 정규화 후보 |
| `work_log` | `id`, auto | `date`, `type`, `at` | SHARED | 감사/작업 로그 table 후보 |

### 영양/원산지/알레르기

| store | keyPath | 주요 index | 서버 이관 |
| --- | --- | --- | --- |
| `nutrition_menu_ref` | `id`, auto | `menuCode`, `category`, `displayOrder` | 정규화 후보 |
| `nutrition_raw_values` | `id`, auto | `menuCode`, `crustType`, `menu_crust` | 정규화 1순위 |
| `nutrition_pizza_composition` | `id`, auto | `menuCode`, `baseMenuCode` | 정규화 후보 |
| `nutrition_origin_master` | `id`, auto | `ingredientName`, `category`, `displayOrder` | 정규화 후보 |
| `nutrition_allergy_master` | `id`, auto | `allergenCode`, `displayOrder` | 정규화 후보 |
| `nutrition_topping_master` | `id`, auto | `toppingCode`, `displayOrder` | 정규화 후보 |
| `nutrition_edge_master` | `id`, auto | `edgeCode`, `displayOrder` | 정규화 후보 |
| `nutrition_set_composition` | `id`, auto | `setCode`, `kind` | 정규화 후보 |

## 5. localStorage 분류

서버 이관 전 localStorage는 세 그룹으로 나눈다.

| 그룹 | 예시 | 처리 |
| --- | --- | --- |
| 서버 이관 후보 | `v3:brand-master`, `v3:profile`, `monthly_close_log_v1`, `saved_views_v1__*` | `local_storage_entries`에 보존 후 table 분리 여부 결정 |
| 브라우저 유지 | `v3:theme`, `v3:density`, `v3:fontScale`, 화면별 필터/정렬 | 사용자 편의 상태. 서버 이관은 선택 |
| 폐기/세션 전용 | `v3:auth-hash`, `v3:settings-pin`, `v3:session-*`, draft류 | 서버 인증/세션으로 대체하거나 import 제외 |

## 6. 구축 순서

1. 운영 PC 또는 Docker Compose 방식 확정
2. Docker 방식이면 `.env.db.example`을 기준으로 `.env.db` 작성 후 `docker compose --env-file .env.db -f docker-compose.db.yml up -d`
3. 직접 설치 방식이면 PostgreSQL DB와 앱 계정 생성
4. `.env.production` 또는 `.env`에 `DATABASE_URL` 작성
5. 현재 개발 PC에서 `npm run db:validate`
6. 초기 migration 확인: `npm run db:migration:check`
7. 운영 PC에서 `npm ci`
8. 운영 PC에서 `npm run db:migrate`
9. 기본 브랜드/store catalog seed: `npm run db:seed`
10. 백업 JSON dry-run: `npm run db:import:backup:dry-run -- <backup.json> --brand <brandId>`
11. 백업 JSON import: `npm run db:import:backup -- <backup.json> --brand <brandId>`
12. import 결과를 `data_import_jobs`, `data_import_errors`로 확인
13. DB 상태 확인: `npm run db:check`
14. 기존 앱 화면 QA와 서버 DB row count 대조

DB 서버와 `DATABASE_URL`이 이미 준비된 경우에는 아래처럼 일괄 실행할 수 있다.

```bash
npm run db:bootstrap -- --plan
npm run db:bootstrap
npm run db:bootstrap -- --backup ./backup.json --brand main --dry-run-import
npm run db:bootstrap -- --backup ./backup.json --brand main
```

현재 개발 PC에는 시스템 설치 대신 portable PostgreSQL을 `.postgresql/`에 내려받고, 데이터 디렉터리를 `.pgdata/`에 초기화했다. 두 폴더와 `.env`, `.env.db`는 Git에 넣지 않는다.

portable PostgreSQL을 다시 켤 때는 별도 터미널에서 아래 명령을 유지한다.

```bash
npm run db:pg:serve
```

다른 터미널에서 상태 확인과 종료를 실행한다.

```bash
npm run db:pg:status
npm run db:pg:stop
```

백업 파일 없이 import dry-run 형식만 확인할 때는 샘플 파일을 사용한다.

```bash
npm run db:import:backup:dry-run -- prisma/fixtures/sample-backup.json --brand china4
```

로컬 개발 PC에서는 DB 연결 상태를 앱에서도 확인할 수 있다.

```text
http://localhost:3000/api/db/health
```

로컬 PostgreSQL dump 백업은 `.db-backups/`에 저장한다. 이 폴더는 Git에 넣지 않는다.

```bash
npm run db:backup
npm run db:backup:list
npm run db:backup:prune
npm run db:backup:autostart
```

`db:backup:autostart`는 Windows 현재 사용자 시작프로그램에 자동 백업 명령을 등록한다. 기본값은 마지막 백업이 20시간보다 오래된 경우에만 새 dump를 생성하는 방식이다.

로컬 앱 서버와 브라우저 창까지 자동화하려면 아래 명령을 사용한다.

```bash
npm run site:start
npm run site:autostart
```

`site:start`는 로컬 PostgreSQL을 먼저 확인한 뒤 3000 포트에 사이트를 띄우고 `http://localhost:3000/login`을 연다. `site:autostart`는 Windows 현재 사용자 시작프로그램에 사이트 자동 실행을 등록하고, 바탕화면에 `7th RND Site Start.lnk` 바로가기를 만든다.

## 7. 아직 하지 말아야 할 것

- 실제 운영 데이터를 Git에 넣지 않는다.
- `.env.production`, DB dump, `.db-backups/`, 백업 JSON을 Git에 넣지 않는다.
- IndexedDB 호출부를 한 번에 전부 API로 바꾸지 않는다.
- 판매량/원가/영양 계산 로직을 DB 이관과 동시에 리팩토링하지 않는다.
- PostgreSQL 포트를 외부 인터넷에 직접 공개하지 않는다.

## 8. 다음 구현 단위

다음 단계는 아래 순서가 안전하다.

1. 실제 PostgreSQL 서버 준비 후 migration/seed 실행
2. 실제 백업 JSON dry-run/import 리허설
3. 서버 API 인증/권한 모델 확정
4. 읽기 전용 API부터 도입
5. 쓰기 API는 백업/복구 리허설 후 도입

## 9. 완료 기준

DB 구축 완료는 아래가 모두 만족될 때로 본다.

- Prisma schema validate 통과
- 초기 migration SQL 존재 및 `npm run db:migration:check` 통과
- `store_catalog`에 43개 store seed 가능
- 백업 JSON import dry-run 가능
- 실제 PostgreSQL DB에 `npm run db:migrate`, `npm run db:seed` 성공
- `npm run db:check`에서 `brands=3`, `storeCatalog=43` 이상 확인
- `GET /api/db/health`에서 DB 상태 확인 가능
- `npm run db:backup`으로 로컬 dump 생성 가능
- import 후 store별 row count 비교 가능
- `npm run test:ci`, `npm run build:clean` green
- 운영 PC의 `.env.production`과 DB 계정 정보가 Git 밖에 존재
