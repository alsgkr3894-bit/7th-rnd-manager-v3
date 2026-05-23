# Step 3 검증 가이드

완료 일자: 2026-05-17
검증 방법: 브라우저 개발자도구 + IndexedDB Inspector + Console

---

## 검증 체크리스트

### 1️⃣ DB v5 업그레이드 검증

**방법:**
1. 앱 로드 후 개발자도구 → 새로고침 (캐시 clear + DB 강제 업그레이드)
2. IndexedDB Inspector에서 확인

**확인 항목:**
- [ ] DB 버전이 5로 업그레이드됨
- [ ] `migration_flags` 스토어 생성됨
- [ ] `price_files` 스토어에 `updateDate` unique 인덱스 존재

**콘솔 검증 코드:**
```javascript
// 1. DB 버전 확인
const db = await (async () => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('rnd_manager_v2');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
})();
console.log('Current DB Version:', db.version); // 5 출력 예상

// 2. migration_flags 스토어 존재 확인
console.log('Store names:', Array.from(db.objectStoreNames)); // migration_flags 포함 예상

// 3. price_files 인덱스 확인
const tx = db.transaction('price_files', 'readonly');
const store = tx.objectStore('price_files');
console.log('price_files indexes:', Array.from(store.indexNames)); // updateDate 포함 예상
```

**예상 출력:**
```
Current DB Version: 5
Store names: [..., 'migration_flags', ...]
price_files indexes: DOMStringList [ 'updateDate' ]
```

---

### 2️⃣ Price 중복 차단 검증 (DUPLICATE_DATE)

**준비:**
1. 앱에서 "메뉴 판매량" → "제때 상품 가격 비교"로 이동
2. 기존 가격 파일 1개 확인 (없으면 하나 먼저 업로드)

**테스트 시나리오:**
1. 동일한 updateDate로 다른 파일 업로드 시도
2. DUPLICATE_DATE 오류 메시지 확인

**예상 동작:**
```
1. "2026-05-15" updateDate로 파일 업로드 (성공)
2. 다시 "2026-05-15" updateDate로 다른 파일 업로드 시도
   → 토스트: "이미 해당 날짜의 가격 파일이 업로드되어 있습니다..."
   → price_files, price_rows, upload_log 모두 저장 안 됨
```

**콘솔 검증:**
```javascript
// 업로드 후 확인
const priceFiles = await (async () => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('rnd_manager_v2');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('price_files', 'readonly');
      const store = tx.objectStore('price_files');
      const getReq = store.getAll();
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    };
  });
})();
console.log('Price files:', priceFiles.map(f => ({
  id: f.id, 
  updateDate: f.updateDate, 
  uploadedAt: new Date(f.uploadedAt).toLocaleString()
})));
```

---

### 3️⃣ Shipment 단일 트랜잭션 검증

**준비:**
1. 앱에서 "제때상품관리" → "제때 범용상품 출고량"로 이동
2. 출고량 파일 업로드

**검증 방법:**
- 업로드 시 shipment_files + shipment_rows + upload_log가 동시에 저장
- 부분 저장 없음 (원자성)

**콘솔 검증:**
```javascript
// 출고량 업로드 후 확인
async function verifyShipmentAtomic() {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open('rnd_manager_v2');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const getTx = (storeName) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const files = await getTx('shipment_files');
  const rows = await getTx('shipment_rows');
  const logs = await getTx('upload_log');

  console.log('Shipment Files:', files.length, files.slice(-1)[0]);
  console.log('Shipment Rows:', rows.length, 'linked to file:', rows.filter(r => r.fileId === files.slice(-1)[0]?.id).length);
  console.log('Shipment Logs:', logs.filter(l => l.module === 'shipment').length);
  
  return {
    files: files.length,
    rows: rows.filter(r => r.fileId === files.slice(-1)[0]?.id).length,
    logs: logs.filter(l => l.module === 'shipment' && l.linkedFileId === files.slice(-1)[0]?.id).length
  };
}
await verifyShipmentAtomic();
// 예상: { files: N, rows: M, logs: 1 } (모두 >= 0)
```

---

### 4️⃣ Rollback 테스트 실행

**콘솔에서 직접 실행:**

```javascript
// Step 1: 테스트 모듈 동적 import
const testModule = await import('./src/test/shipment-transaction-rollback.test.js');

// Step 2: 테스트 실행
const result = await testModule.runShipmentRollbackTest();

// Step 3: 결과 확인
console.log('Rollback Test Result:', result ? '✅ PASS' : '❌ FAIL');
```

**예상 출력:**
```
[Test] Shipment 트랜잭션 롤백 테스트 시작
[Test] 기준값 — files: N, rows: M, log: K
[Test] 의도적 롤백 발생 ✓
[Test] 롤백 후 — files: N, rows: M, log: K
[Test] ✅ 롤백 검증 성공 — 모든 데이터 원래대로 복구됨
[Test] 최종 결과: 통과
```

---

## 전체 검증 절차

### A. 환경 준비
1. 브라우저에서 앱 로드
2. 개발자도구 열기 (F12)
3. Console 탭 선택

### B. 검증 순서

**B1. DB 버전 확인 (필수)**
```javascript
const db = await (async () => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('rnd_manager_v2');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
})();
console.log('✓ DB Version:', db.version);
console.log('✓ Stores:', Array.from(db.objectStoreNames).includes('migration_flags') ? 'migration_flags 있음' : 'migration_flags 없음');
```

**B2. Price 중복 차단 테스트**
1. 메뉴 판매량 → 제때 상품 가격 비교
2. 기존 가격 파일 1개 확인 또는 신규 업로드
3. 동일 updateDate로 재업로드 시도
4. 오류 메시지 확인

**B3. Shipment 단일 트랜잭션 테스트**
1. 제때상품관리 → 제때 범용상품 출고량
2. 출고량 파일 업로드
3. shipment_files + shipment_rows + upload_log 행 수 확인

**B4. Rollback 테스트 실행**
```javascript
const testModule = await import('./src/test/shipment-transaction-rollback.test.js');
await testModule.runShipmentRollbackTest();
```

### C. 결과 정리

| 항목 | 예상 | 실제 | 상태 |
|------|------|------|------|
| DB v5 업그레이드 | 5 | ? | [ ] |
| migration_flags 생성 | O | ? | [ ] |
| price_files updateDate 인덱스 | O | ? | [ ] |
| Price DUPLICATE_DATE | 오류 발생 | ? | [ ] |
| Shipment 원자적 저장 | 3개 동시 | ? | [ ] |
| Rollback 테스트 | 통과 | ? | [ ] |

---

## 트러블슈팅

### Q: "migration_flags 스토어가 없어요"
**A:** 
1. 개발자도구 → Application → IndexedDB → rnd_manager_v2 → 새로고침
2. 또는 캐시 삭제 후 새로고침: Ctrl+Shift+Delete

### Q: "Price 파일을 2번 업로드해도 중복 오류가 안 나요"
**A:**
1. 첫 번째는 다른 updateDate (예: 2026-05-15)
2. 두 번째는 **정확히 동일한 updateDate** (2026-05-15)로 업로드
3. 콘솔에서 에러 로그 확인: `console.error` 메시지

### Q: "Rollback 테스트에서 import 오류가 나요"
**A:**
```javascript
// 대신 이 코드로 테스트
await fetch('./src/test/shipment-transaction-rollback.test.js')
  .then(r => r.text())
  .then(text => eval(text));
// 또는 개발 서버를 통해 직접 로드
```

### Q: "콘솔에서 async/await 문법이 안 되나요"
**A:** 최신 브라우저는 Console에서 Top-level await 지원:
- Chrome 89+, Firefox 92+, Safari 15+
- 아니면 IIFE로 감싸기:
```javascript
(async () => {
  // 코드 여기
})();
```

---

## 완료 기준

✅ **최소 요건** (모두 통과)
1. DB 버전 = 5
2. migration_flags 스토어 존재
3. price_files updateDate unique 인덱스 존재

✅ **권장 검증** (추가 확인)
4. Price DUPLICATE_DATE 오류 발생
5. Shipment 원자적 저장 (3개 동시)
6. Rollback 테스트 통과

✅ **최종 판정**
- 모두 통과 → Step 3 완료 ✨
- 1개 이상 실패 → 원인 조사 후 수정
