# Step 3 검증 — 빠른 가이드

**예상 시간:** 10분

---

## 준비 (1분)

```
1. 브라우저에서 앱 URL 로드 (새 탭)
2. 캐시 삭제:
   - Windows/Linux: Ctrl+Shift+Delete
   - macOS: Cmd+Shift+Delete
   → "All time" 선택 → Clear
3. 페이지 새로고침: Ctrl+R
4. 개발자도구: F12 → Console 탭
```

---

## 검증 1: DB v5 업그레이드 (1분)

**콘솔에 복사 후 실행:**

```javascript
const db = await new Promise((resolve, reject) => {
  const req = indexedDB.open('rnd_manager_v2');
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
console.log('✓ DB Version:', db.version);
console.log('✓ Has migration_flags:', Array.from(db.objectStoreNames).includes('migration_flags'));
```

**예상 출력:**
```
✓ DB Version: 5
✓ Has migration_flags: true
```

---

## 검증 2: Price 중복 차단 (3분)

**UI에서 진행:**

```
1. 메뉴: 메뉴 판매량 → 제때 상품 가격 비교
2. 기존 파일 확인
   - 없으면: 일단 가격 파일 1개 업로드 (updateDate 선택)
   - 있으면: 파일 날짜 확인
3. 동일 updateDate로 다른 파일 업로드 시도
4. 결과:
   ✓ 토스트 오류: "이미 해당 날짜의 가격 파일이..."
   ✓ 파일 저장 안 됨
```

**확인:**
```javascript
// 콘솔에서 파일 수 확인
const db = await new Promise((resolve, reject) => {
  const req = indexedDB.open('rnd_manager_v2');
  req.onsuccess = () => {
    const tx = req.result.transaction('price_files', 'readonly');
    const getReq = tx.objectStore('price_files').getAll();
    getReq.onsuccess = () => resolve(getReq.result.length);
  };
});
console.log('Price files count:', db);
```

---

## 검증 3: Shipment 원자적 저장 (3분)

**UI에서 진행:**

```
1. 메뉴: 제때상품관리 → 제때 범용상품 출고량
2. 출고량 파일 업로드 (월도 선택)
3. 업로드 완료 후 콘솔에서 확인
```

**콘솔에서 확인:**

```javascript
const db = await new Promise((resolve, reject) => {
  const req = indexedDB.open('rnd_manager_v2');
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const getTx = (storeName) => new Promise((resolve) => {
  const tx = db.transaction(storeName, 'readonly');
  const getReq = tx.objectStore(storeName).getAll();
  getReq.onsuccess = () => resolve(getReq.result.length);
});

const fileCount = await getTx('shipment_files');
const rowCount = await getTx('shipment_rows');
const logCount = await getTx('upload_log');

console.log(`✓ Shipment: files=${fileCount}, rows=${rowCount}, logs=${logCount}`);
```

**예상 출력:**
```
✓ Shipment: files=N, rows=M, logs=K
(N, M, K > 0)
```

---

## 검증 4: Rollback 테스트 (2분)

**콘솔에 복사 후 실행:**

```javascript
const testModule = await import('./src/test/shipment-transaction-rollback.test.js');
const result = await testModule.runShipmentRollbackTest();
console.log('Rollback Test:', result ? '✅ PASS' : '❌ FAIL');
```

**예상 출력:**
```
[Test] Shipment 트랜잭션 롤백 테스트 시작
[Test] 기준값 — files: X, rows: Y, log: Z
[Test] 의도적 롤백 발생 ✓
[Test] 롤백 후 — files: X, rows: Y, log: Z
[Test] ✅ 롤백 검증 성공 — 모든 데이터 원래대로 복구됨
[Test] 최종 결과: 통과
Rollback Test: ✅ PASS
```

---

## 결과 정리

| 검증 항목 | 상태 | 문제 |
|---------|------|------|
| DB v5 | [ ] | |
| migration_flags | [ ] | |
| Price DUPLICATE_DATE | [ ] | |
| Shipment 원자적 저장 | [ ] | |
| Rollback 테스트 | [ ] | |

---

## 문제 해결

### Q: "command not found" 오류
**A:** 콘솔 코드를 정확히 복사했는지 확인하세요. 모두 JavaScript 코드입니다.

### Q: "import error" 발생
**A:** 앱이 번들러로 빌드된 경우, import 실행이 불가합니다.
→ 대신 개발자도구 → Application → IndexedDB → rnd_manager_v2에서 수동 확인

### Q: "오류가 발생했습니다" 토스트
**A:** 콘솔에서 상세 오류 메시지 확인:
```javascript
// F12 → Console → 오류 메시지에서 stack trace 복사 후 분석
```

### Q: "rollback 테스트 파일을 찾을 수 없음"
**A:** 개발 서버가 파일을 인식하지 못했을 수 있습니다.
→ 페이지 새로고침 후 재시도

---

## 완료 기준

✅ **최소 (Step 3 완료):**
- DB v5 = true
- migration_flags = true

✅ **권장 (프로덕션 준비):**
- 모든 4가지 검증 통과

---

**완료 후:** 결과를 사용자에게 리포팅하면 Step 3 종료
