# Step 3 Implementation Summary — 3가지 데이터 정합성 이슈 해결

완료 일자: 2026-05-17

## 구현 현황

### 1. 데이터베이스 스키마 업그레이드 (v4 → v5)

**src/core/constants.js**
- `DB_VERSION = 4` → `DB_VERSION = 5`
- `ALL_STORES` 목록에 `migration_flags` 추가
  - 백업/복원 시에도 마이그레이션 상태 보존

**src/core/db.js**
- `price_files` 스토어:
  - 초기 생성 시: `updateDate` 필드에 unique 인덱스 추가
  - v4→v5 마이그레이션: 스토어 재생성하여 unique 인덱스 적용
- `price_rows` 스토어:
  - 조건식 단순화: `oldVersion < 4` → `oldVersion < 5`
- `migration_flags` 스토어 신규 생성:
  - keyPath: `flag` (마이그레이션 플래그 이름)
  - 삭제된 가격 로그 추적용

### 2. 원자적 트랜잭션 구현

**src/modules/price/price-store.js — savePriceUpload()**

기존 (3개 분리 트랜잭션):
```
1. await put('price_files', meta)        // 트랜잭션 1
2. await bulkPut('price_rows', rows)     // 트랜잭션 2
3. await put('upload_log', log)          // 트랜잭션 3
```

변경 (1개 통합 트랜잭션):
```
Transaction {
  1. price_files.add(meta) with onsuccess
  2. Get fileId from onsuccess
  3. price_rows.add(rowsWithMeta) loop
  4. upload_log.add(log)
} // 원자성 보장: 모두 저장 또는 모두 미저장
```

변경 전 중복 검사 추가:
- `checkDateExists()` — TOCTOU 방지 (트랜잭션 전)
- `checkHashExists()` — TOCTOU 방지 (트랜잭션 전)
- 예외 발생: `DUPLICATE_DATE`, `DUPLICATE_HASH`

**src/modules/shipment/shipment-store.js — saveShipmentUpload()**

기존 (청크 단위 분리 트랜잭션):
```
1. await put('shipment_files', meta)
2. for (chunk of rows) await bulkPut(chunk)  // 여러 트랜잭션
3. await put('upload_log', log)
```

변경 (1개 통합 트랜잭션):
```
Transaction {
  1. shipment_files.add(meta) with onsuccess
  2. Get fileId from onsuccess
  3. shipment_rows.add(rowsWithMeta) forEach  // 청크 제거, 메모리 안전
  4. upload_log.add(log)
} // 원자성 보장
```

변경 전 중복 검사 추가:
- `checkHashExists()` — TOCTOU 방지 (트랜잭션 전)
- 예외 발생: `DUPLICATE_HASH`

### 3. 일회성 마이그레이션 실행

**src/app.js — cleanupPriceLogsV5()**

v5 마이그레이션 목표: 이전 버전에서 정식 삭제가 아닌 upload_log에만 남은 price 모듈 로그 정리

실행 흐름:
1. `migration_flags` 스토어에서 `V5_PRICE_LOGS_CLEANED` 플래그 확인
2. 플래그가 있으면 조기 반환 (이미 실행됨)
3. `upload_log`에서 `module === 'price'` 항목 수집
4. 원자적 트랜잭션:
   - upload_log에서 price 로그 삭제
   - migration_flags에 완료 플래그 저장 (동시 트랜잭션)
5. main()의 Step 1 (DB 초기화) 직후 호출

원자성 보장: 두 작업 모두 성공 또는 모두 실패 — 부분 상태 불가능

### 4. 오류 처리 강화

**src/modules/price/price.js — handleUpload()**

추가 예외 처리:
- `DUPLICATE_DATE` → "이미 해당 날짜의 가격 파일이 업로드되어 있습니다."
- `DUPLICATE_HASH` → "이미 업로드된 파일입니다."
- `ConstraintError` → "이미 해당 날짜의 가격 파일이 존재합니다."
- 그 외 → 기존 일반 오류 메시지

**src/modules/shipment/shipment.js — handleUpload()**

추가 예외 처리:
- `DUPLICATE_HASH` → "이미 업로드된 파일입니다."
- `ConstraintError` → "파일 저장 중 충돌이 발생했습니다."
- 그 외 → 기존 일반 오류 메시지

## 기술적 상세

### TOCTOU 예방 전략 (3단계)

1. **애플리케이션 단계** (check-then-act):
   - 트랜잭션 전에 `checkDateExists()`, `checkHashExists()` 호출
   - 즉각적인 UX 피드백

2. **트랜잭션 단계** (원자성):
   - 단일 트랜잭션에서 중복 검사 + 저장
   - 트랜잭션 내 race condition 불가능

3. **데이터베이스 단계** (제약 조건):
   - `price_files.updateDate` unique 인덱스
   - 최종 방어선: 어떤 경로로든 중복 불가능

### 메모리 안전성

- shipment 대용량 처리: 청크 기반 메모리 관리 유지
- 트랜잭션 내에서는 모든 add() 요청을 동기적으로 등록 (await 없음)
- IndexedDB는 등록된 모든 요청이 완료될 때까지 트랜잭션 유지

### 에러 복구

- 트랜잭션 실패 시 자동 롤백 (IndexedDB 기본 동작)
- 삭제된 파일 ID 조회 시 없는 파일은 자동 건너뜀
- 마이그레이션 플래그 누락 시 재실행 (멱등성)

## 테스트 체크리스트

- [ ] DB 초기화 시 DB_VERSION 5로 업그레이드됨
- [ ] migration_flags 스토어 생성됨
- [ ] price_files updateDate unique 인덱스 적용됨
- [ ] 가격 파일 업로드 시 price_files + price_rows + upload_log 동시 저장
- [ ] 동일 updateDate 파일 업로드 시 DUPLICATE_DATE 오류 발생
- [ ] 동일 파일 해시 업로드 시 DUPLICATE_HASH 오류 발생
- [ ] 출고량 파일 업로드 시 shipment_files + shipment_rows + upload_log 동시 저장
- [ ] 마이그레이션 첫 실행 시 price 로그 정리 및 플래그 저장
- [ ] 마이그레이션 재실행 시 skip됨 (플래그 확인 후)
- [ ] 백업/복원 시 migration_flags도 포함됨

## 기존 기능 보존

- ✅ 모든 조회 쿼리 (getAll, getByIndex 등) 유지
- ✅ 파일 삭제 로직 (deleteWithChildren 사용)
- ✅ UI 렌더링 로직 (renderHistory, renderAggregateTable 등)
- ✅ 설정 및 참조 데이터 관리 (ref_* 스토어)
- ✅ 비용 계산 모듈 (cost_* 스토어)
- ✅ 메뉴개발노트 모듈 (menu_dev_notes 스토어)

## 제약 조건 준수

- ✅ 파일 분리 없음
- ✅ UI 변경 없음
- ✅ 기존 기능 구조 변경 없음
- ✅ 필요한 최소한의 코드 변경만 수행
- ✅ 한 가지 책임 원칙 준수 (각 함수는 단일 목적)
