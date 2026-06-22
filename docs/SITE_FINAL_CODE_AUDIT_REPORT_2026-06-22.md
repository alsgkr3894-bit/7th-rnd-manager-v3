# 사이트 전체 코드 최종 검수 보고서

- 작성일: 2026-06-22
- 대상 프로젝트: `7th-rnd-manager-v3`
- 검수 범위: `app`, `components`, `hooks`, `lib`, `scripts`, `__tests__`, `docs`
- 직접 수정 여부: 코드 및 문서 수정 있음.
- 확인한 명령:
  - `npm run format:check` PASS
  - `npm run lint` PASS
  - `npm run audit:docs` PASS
  - `node --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/lib/output-artifact-builders.test.mjs --runInBand` PASS — 대표 XLSX 4종 workbook + 실제 `.xlsx` 바이너리 write/read 검증
  - `npm run test:ci` PASS, 295 suites / 1771 tests
  - `npm run build:clean` PASS — compiled successfully, static pages 57/57
- 브라우저 QA:
  - `HOST=127.0.0.1 PORT=3101 BASE=http://127.0.0.1:3101 npm run qa:prod` PASS
  - prod 서버 기준 `qa:smoke` 22/22, `qa:mobile` 22/22, `qa:runtime` 67/67 통과
  - dev `npm run qa:workflow` 단독 재실행 21/21 통과: 백업 실제 복원 실행, 메뉴마스터 CSV 다운로드 파일 검증, 판매량 잘못된 확장자 UX, 출고량 CSV 실제 업로드 오류/저장 UX, 메뉴판매가 실패행 CSV 다운로드 포함
  - prod `qa:workflow`도 21/21 통과. 3000번 dev 서버 재기동과 충돌한 1차 `qa:prod`는 14/21에서 서버 연결 끊김으로 실패했으나, 3101번 격리 포트 재실행은 전체 통과.
  - dev server 단독 `qa:full`은 이번 문서 갱신 중 별도 실행하지 않았다.
- 워크트리 주의:
  - 검수 중 `git status --short` 기준으로 `app/ingredient/manage/IngredientManagePanel.jsx`, `app/ingredient/manage/page.jsx`, `components/ingredient/ManageRow.jsx`, `hooks/usePaletteItems.js`, `docs/SITE_STATUS.md`, `__tests__/lib/settings-guards.test.mjs` 등의 미커밋 수정이 보였다.
  - `components/action-center/`, `components/ui/SavedViewSelector.jsx`, `lib/action-center/`, `lib/saved-views.js`, `docs/CONVENIENCE_FEATURE_ROADMAP.md`는 untracked 상태로 확인됐다.
  - 본 검수에서는 위 변경들을 되돌리거나 수정하지 않았고, 새로 추가한 파일은 이 보고서뿐이다.

---

## 1. 전체 요약

프로젝트는 내부 운영 도구 기준으로 상당히 많이 정리되어 있다. 페이지 분리, `useDBLoad` 확산, 업로드 정책 공통화, CSV 수식 인젝션 방어, 백업 복원 가드, 관리자 권한 가드, 정적 테스트가 이미 넓게 들어가 있다. 현재 `format`, `lint`, 문서 감사, 단위/구조 테스트는 통과한다.

가장 위험한 문제는 코드 품질보다 **운영 정책이 확정되지 않은 데이터 무결성 영역**이다. 특히 판매가 전체 교체, 백업 복원, 식자재 삭제 cascade, 원가 산출 시점, 과거 원가 보존 정책은 실제 매장 데이터에 영향을 줄 수 있다.

가장 먼저 확인해야 할 문제는 아래 4개다.

1. 클라이언트 전용 인증/권한 모델을 운영 환경에서 허용할지
2. 판매가 업로드가 기존 데이터를 전부 교체하는 현재 정책이 맞는지
3. 원가마진표가 최신 단가 기준으로 다시 계산되는 것이 맞는지
4. 백업 복원 실패 시 부분 적용 복구 절차가 충분한지

운영 전 반드시 보완해야 할 문제는 백업/복원 리허설, 업로드 덮어쓰기 경고, 수동 검산 fixture, 권한/인증 정책 확정이다. 장기적으로는 JavaScript 기반 런타임 검증을 더 강하게 만들고, 원가/영양/업로드의 공통 schema 계층을 분리하는 것이 좋다.

---

## 2. 최우선 위험 항목 TOP 10

### 1. 클라이언트 전용 인증/권한 모델

- 우선순위: P0
- 위치: `lib/auth.js:1-137`, `docs/SECURITY_POLICY.md`
- 문제 내용: 비밀번호 해시는 localStorage에 저장되고, 로그인 상태는 클라이언트 쿠키 `v3:auth=1`로 판단한다.
- 왜 위험한지: 사내 단말 내부 도구로는 허용 가능한 구조지만, 외부 네트워크나 여러 사용자 환경에서는 인증 우회와 데이터 접근 위험이 있다.
- 실제 발생 가능한 상황: 브라우저 개발자 도구로 쿠키/localStorage를 조작하거나 IndexedDB에 직접 접근해 데이터를 볼 수 있다.
- 추천 조치: 외부 배포 또는 다중 사용자 운영 전에는 서버 세션, HttpOnly/Secure cookie, 서버 권한 체크, 감사 로그를 추가한다.
- 직접 수정 여부: 수정하지 않음, 문서화만 진행

### 2. 백업 복원이 그룹 단위로만 원자적임

- 우선순위: P0
- 위치: `lib/db/backup.js:54-97`, `lib/db/backup.js:266-323`
- 문제 내용: 같은 DB 그룹 안에서는 트랜잭션으로 보호되지만, 브랜드 store 그룹과 공유 store 그룹 사이에는 완전한 원자성이 없다.
- 왜 위험한지: 한 그룹 복원 후 다음 그룹이 실패하면 일부 데이터만 새 백업 상태가 될 수 있다.
- 실제 발생 가능한 상황: 브랜드 데이터는 복원됐지만 공유 노트/일정은 미복원되거나, localStorage 복원이 실패해 설정이 DB와 어긋날 수 있다.
- 추천 조치: 복원 전 자동 백업을 필수화하고, 부분 복원 발생 시 자동 롤백 또는 재복원 안내를 강제한다.
- 직접 수정 여부: 수정하지 않음, 문서화만 진행

### 3. 판매가 업로드가 기존 데이터를 전부 교체함

- 우선순위: P0
- 위치: `lib/cost/menu-price/store.js:86-103`, `components/cost/menu-price/MenuPriceUploadCard.jsx`
- 문제 내용: `replaceAllMenuPrices`는 기존 `cost_selling_prices`를 `clear()` 후 새 레코드로 교체한다.
- 왜 위험한지: 실무자가 일부 메뉴만 담긴 파일을 업로드하면 나머지 판매가가 사라진다.
- 실제 발생 가능한 상황: 원가마진표에서 판매가 누락이 대량 발생하고 원가율이 계산되지 않는다.
- 추천 조치: 전체 교체와 부분 병합 모드를 분리하고, 업로드 전에 삭제 예정 메뉴 수를 크게 표시한다.
- 직접 수정 여부: 수정하지 않음, 문서화만 진행

### 4. 판매가 교체 후 메뉴마스터 동기화 실패 표시

- 우선순위: P1
- 위치: `lib/cost/menu-price/store.js:23-25`, `lib/cost/menu-price/store.js:92-103`
- 현재 상태: 보완 완료. `_syncAfter()`는 `syncMenuMasterFromPrices` 실패를 `sync.error`로 반환하고, 업로드 UI는 `판매가 N개 반영 · 메뉴마스터 동기화 실패...` 경고 toast로 노출한다.
- 남은 판단: 판매가 저장 성공 후 메뉴마스터 동기화만 실패했을 때 별도 재동기화 버튼을 둘지는 운영 필요에 따라 결정한다.
- 검증: `menu-price-store-safety.test.mjs`가 동기화 실패 반환을 고정하고, `MenuPriceUploadCard.jsx`가 `sync?.error` 경고 경로를 가진다.
- 직접 수정 여부: 이미 보완됨, 현재 문서는 상태 정정

### 5. 식자재 삭제 cascade가 완전한 단일 트랜잭션이 아님

- 우선순위: P1
- 위치: `lib/ingredient/destructive.js:104-139`
- 문제 내용: 식자재는 먼저 삭제되고, 이후 알레르기 legacy 링크 삭제가 별도로 실행된다.
- 왜 위험한지: cascade 단계 실패 시 식자재는 삭제됐지만 연결 정보 일부가 남을 수 있다.
- 실제 발생 가능한 상황: 삭제 후 알레르기/원산지 진단에서 orphan 데이터가 나타난다.
- 추천 조치: 삭제 전 영향 preview를 강화하고, cascade 실패 시 복구/재시도 액션을 UI에 노출한다.
- 직접 수정 여부: 수정하지 않음, 문서화만 진행

### 6. 원가마진표가 최신 단가 기준으로 계산됨

- 우선순위: P1
- 위치: `app/cost/margin/useMarginData.js:31-50`, `lib/cost/margin/build-rows.js:89-177`
- 문제 내용: 최신 제때 단가 파일과 현재 식자재 단가를 기반으로 원가를 계산한다.
- 왜 위험한지: 과거 보고서나 이전 판매가 기준 원가율을 다시 열었을 때 값이 바뀔 수 있다.
- 실제 발생 가능한 상황: 지난달 원가율 보고를 다시 확인했더니 단가 갱신 후 숫자가 달라진다.
- 추천 조치: “현재 원가”와 “스냅샷 원가”를 명확히 분리하고, 보고서 저장 시 원가 snapshot을 남긴다.
- 직접 수정 여부: 수정하지 않음, 문서화만 진행

### 7. 숫자 변환 실패가 0으로 흡수되는 계산 경로가 있음

- 우선순위: P1
- 위치: `lib/cost/shared/calc.js:3-23`
- 문제 내용: `Number(c.quantity) || 0`, `Number(c.unitPrice) || 0` 패턴으로 잘못된 숫자가 0 처리된다.
- 왜 위험한지: 빈 값은 이슈로 잡히지만, `abc`, `1,000`, 공백 포함 문자열 등은 실제 의도와 다르게 0 또는 다른 값으로 계산될 수 있다.
- 실제 발생 가능한 상황: 수량/단가 입력이 잘못됐는데 총 원가가 낮게 계산된다.
- 추천 조치: 계산 전 `parseStrictNumber` 같은 공통 숫자 검증을 통과하지 못하면 이슈로 표시한다.
- 직접 수정 여부: 수정하지 않음, 문서화만 진행

### 8. 엣지 판매가 매칭이 이름 문자열에 의존함

- 우선순위: P1
- 위치: `lib/cost/margin/build-rows.js:186-220`
- 문제 내용: 엣지 판매가를 `menuName` 공백 제거 후 `edgeType`과 비교해 찾는다.
- 왜 위험한지: 판매가 파일의 명칭이 조금만 달라져도 엣지 추가금이 누락될 수 있다.
- 실제 발생 가능한 상황: “치즈 크러스트”와 “치즈크러스트”는 처리되지만, 별칭/오타/브랜드 표기 차이는 누락될 수 있다.
- 추천 조치: 엣지 master에 판매가 메뉴코드 또는 displayGroupKey를 명시 연결한다.
- 직접 수정 여부: 수정하지 않음, 문서화만 진행

### 9. 업로드 실패행 처리 방식이 모듈마다 다름

- 우선순위: P1
- 위치: `lib/upload-policy.js`, `lib/price/use-price-upload.js`, `lib/shipment/use-shipment.js`, `components/cost/menu-price/MenuPriceUploadCard.jsx`
- 문제 내용: 크기/확장자 정책은 공통화됐지만, 실패행 다운로드, 부분 성공 안내, 덮어쓰기 경고는 화면별로 다르다.
- 왜 위험한지: 실무자가 같은 “엑셀 업로드”라고 인식하는 기능에서 오류 대응 방식이 달라진다.
- 실제 발생 가능한 상황: 어떤 화면은 실패행 CSV가 있고, 어떤 화면은 실패 수만 보여 원인 파악이 느려진다.
- 추천 조치: 업로드 preview/result 공통 컴포넌트를 만들고 실패행 다운로드 규칙을 통일한다.
- 직접 수정 여부: 수정하지 않음, 문서화만 진행

### 10. 대량 데이터 처리가 대부분 클라이언트 메모리 기반임

- 우선순위: P2
- 위치: `app/cost/margin/useMarginFilters.js`, `hooks/usePaletteItems.js`, `lib/excel.js`
- 문제 내용: IndexedDB 전체 로드, 배열 필터/정렬, 엑셀 전체 파싱을 브라우저에서 수행한다.
- 왜 위험한지: 데이터가 커지면 렌더링 지연, 메모리 사용 증가, 브라우저 멈춤이 발생할 수 있다.
- 실제 발생 가능한 상황: 제때 파일이나 식자재/판매량 데이터가 커질수록 검색과 업로드 미리보기가 느려진다.
- 추천 조치: 큰 테이블 virtualization, worker 기반 파싱, 페이지네이션/인덱스 검색을 단계적으로 도입한다.
- 직접 수정 여부: 수정하지 않음, 문서화만 진행

---

## 3. 우선순위별 보완 목록

### P0 - 즉시 확인 필요

- 클라이언트 인증/권한 모델 운영 범위 확정
- 판매가 업로드 전체 교체 정책 확정 및 삭제 예정 데이터 preview 강화
- 백업 복원 부분 적용 발생 시 자동 백업/복구 절차를 운영 매뉴얼에 포함
- 원가 계산 결과를 실무 fixture로 수동 검산
- `qa:workflow`, `qa:mobile`, `qa:runtime`을 dev server에서 재실행해 실제 화면 회귀 확인

### P1 - 빠른 개선 권장

- 원가 계산의 숫자 parsing/rounding 정책을 공통 함수로 고정
- 과거 원가/현재 원가/snapshot 원가 표시 정책 분리
- 식자재 삭제 cascade 실패 복구 UI 추가
- 엣지 판매가 매칭을 이름이 아닌 코드/키 기반으로 전환
- 업로드 실패행 다운로드와 부분 성공 메시지를 공통화
- 영양성분 누락/파생 메뉴 계산 정책을 fixture로 고정
- localStorage 영속 키와 세션성 키 백업 범위 재점검

### P2 - 개선하면 좋은 항목

- 큰 테이블 virtualization 또는 sticky summary 도입
- 명령 팔레트 검색 결과에 deep link/highlight 추가
- 업로드 preview 공통 컴포넌트 분리
- 빈 상태/오류 상태/권한 부족 상태를 공통 컴포넌트로 통일
- `lib/session.js`의 외부 IP 조회를 설정으로 끄거나 명확히 표시
- 대형 seed/rules 파일은 생성 스크립트와 데이터 파일로 분리 검토

### P3 - 장기 개선 항목

- TypeScript 또는 Zod 기반 런타임 schema 도입
- 원가/영양/업로드 도메인별 공통 타입 분리
- IndexedDB access layer에 migration rehearsal와 schema diff 도구 추가
- 브라우저 E2E를 운영 전 체크리스트에 포함
- 성능 예산과 fixture 크기 기준 문서화
- 외부 배포 가능성을 고려한 서버 인증/감사 로그 설계

---

## 4. 카테고리별 상세 점검 결과

### 인증과 권한이 클라이언트에 집중됨

- 분류: 보안
- 위치: `lib/auth.js:97-137`
- 관련 파일: `lib/auth.js`, `lib/auth/guard.js`, `docs/SECURITY_POLICY.md`
- 문제 내용: 로그인 여부와 password hash가 클라이언트 저장소에 의존한다.
- 근거: `verifyPassword`는 localStorage hash와 비교하고, `isLoggedIn`은 document.cookie를 직접 확인한다.
- 영향도: 외부 접근 가능 환경에서는 높음. 단일 PC 내부 도구라면 낮음.
- 실제 발생 가능한 문제: 쿠키 조작, IndexedDB 직접 접근, 계정 추적 어려움.
- 추천 조치: 운영 범위를 내부 단말로 고정하거나 서버 인증을 도입한다.
- 우선순위: P0
- 예상 작업 난이도: 높음
- 직접 수정 여부: 수정하지 않음

### 백업 복원 부분 적용 가능성

- 분류: 데이터 무결성
- 위치: `lib/db/backup.js:266-323`
- 관련 파일: `lib/db/backup.js`, `app/settings/restore/page.jsx`
- 문제 내용: 그룹별 트랜잭션은 있으나 전체 복원 단위 rollback은 없다.
- 근거: 코드 주석에서도 그룹 간 원자성이 없음을 명시한다.
- 영향도: 높음
- 실제 발생 가능한 문제: 복원 실패 후 일부 store만 새 데이터로 변경된다.
- 추천 조치: 복원 전 자동 백업을 필수로 두고, 부분 복원 발생 시 복구 버튼을 제공한다.
- 우선순위: P0
- 예상 작업 난이도: 중간
- 직접 수정 여부: 수정하지 않음

### 판매가 전체 교체와 메뉴마스터 동기화 분리

- 분류: 데이터 저장/동기화
- 위치: `lib/cost/menu-price/store.js:23-25`, `lib/cost/menu-price/store.js:92-103`
- 관련 파일: `lib/cost/menu-price/store.js`, `lib/menu-master/store.js`
- 문제 내용: 판매가 교체 transaction과 메뉴마스터 동기화가 한 작업처럼 보이지만 실패 처리가 다르다.
- 근거: `_syncAfter`는 실패를 throw하지 않고 console.error만 한다.
- 영향도: 높음
- 실제 발생 가능한 문제: 판매가와 메뉴마스터가 서로 다른 상태가 된다.
- 추천 조치: 동기화 결과를 반환하고 UI에서 별도 상태로 노출한다.
- 우선순위: P0
- 예상 작업 난이도: 중간
- 직접 수정 여부: 수정하지 않음

### 원가 계산이 최신 단가에 종속됨

- 분류: 원가 계산
- 위치: `app/cost/margin/useMarginData.js:31-50`
- 관련 파일: `app/cost/margin/useMarginData.js`, `lib/cost/margin/build-rows.js`, `lib/recipe.js`
- 문제 내용: 최신 제때 단가 파일과 현재 식자재 단가로 unit price map을 만든다.
- 근거: `files[0]`을 latest로 사용하고 `buildUnitPriceMap`으로 현재 원가를 계산한다.
- 영향도: 높음
- 실제 발생 가능한 문제: 과거 보고서를 다시 열면 현재 단가 기준으로 수치가 바뀐다.
- 추천 조치: “현재 기준 원가표”와 “저장된 보고서 snapshot”을 화면/파일명에서 분리한다.
- 우선순위: P1
- 예상 작업 난이도: 중간
- 직접 수정 여부: 수정하지 않음

### 숫자 입력과 계산 검증 기준이 약함

- 분류: 계산 정확성
- 위치: `lib/cost/shared/calc.js:3-23`
- 관련 파일: `lib/cost/shared/calc.js`, `components/menu-master/MenuRecipeSection.jsx`
- 문제 내용: 숫자 변환 실패가 0으로 흡수되는 경로가 있다.
- 근거: `Number(value) || 0` 패턴을 사용한다.
- 영향도: 중간~높음
- 실제 발생 가능한 문제: 잘못된 숫자 문자열이 원가 누락으로 이어진다.
- 추천 조치: 공통 `parseStrictNumber`를 만들고 입력/저장/출력 전부 같은 기준을 사용한다.
- 우선순위: P1
- 예상 작업 난이도: 낮음~중간
- 직접 수정 여부: 수정하지 않음

### 식자재 삭제 cascade 실패 복구 부족

- 분류: 삭제/복구
- 위치: `lib/ingredient/destructive.js:104-139`
- 관련 파일: `lib/ingredient/destructive.js`, `lib/nutrition/allergen/store.js`
- 문제 내용: 식자재 삭제 후 연결 링크 삭제 실패가 발생해도 삭제 자체는 이미 끝난다.
- 근거: 식자재 삭제 transaction 이후 allergen store import/delete가 실행된다.
- 영향도: 중간~높음
- 실제 발생 가능한 문제: orphan 링크, 진단 오류, 복구 난이도 증가.
- 추천 조치: 삭제 전 영향도 preview에 원산지/알레르기/레시피 연결을 모두 포함하고, cascade 실패 재시도를 제공한다.
- 우선순위: P1
- 예상 작업 난이도: 중간
- 직접 수정 여부: 수정하지 않음

### 업로드 정책은 공통화됐지만 결과 UX는 화면별로 다름

- 분류: 업로드/운영 UX
- 위치: `lib/upload-policy.js:1-82`
- 관련 파일: `lib/price/use-price-upload.js`, `lib/shipment/use-shipment.js`, `components/cost/menu-price/MenuPriceUploadCard.jsx`
- 문제 내용: 파일 크기/확장자는 공통화됐지만 실패행, 덮어쓰기, partial commit 안내는 통일되지 않았다.
- 근거: 메뉴 판매가 업로드에는 실패행 CSV가 있으나 다른 import 경로는 정책이 다르다.
- 영향도: 중간
- 실제 발생 가능한 문제: 실무자가 화면마다 다른 방식으로 오류를 처리해야 한다.
- 추천 조치: 업로드 미리보기 공통 모델을 만든다.
- 우선순위: P1
- 예상 작업 난이도: 중간
- 직접 수정 여부: 수정하지 않음

### CSV 직접 다운로드 함수가 남아 있음

- 분류: 다운로드 보안
- 위치: `lib/download.js`
- 관련 파일: `lib/download.js`, `__tests__/lib/print-export-safety.test.mjs`
- 문제 내용: 현재 테스트로 실제 호출 금지는 걸려 있지만, `downloadCsvText` 자체는 직접 사용 시 rowsToCsv 살균을 우회할 수 있다.
- 근거: 기존 안전 테스트가 direct 호출 금지를 회귀 방지하고 있다.
- 영향도: 낮음~중간
- 실제 발생 가능한 문제: 신규 코드가 직접 호출하면 CSV 수식 인젝션 방어를 놓칠 수 있다.
- 추천 조치: unsafe 함수명으로 바꾸거나 내부 전용 주석/테스트를 강화한다.
- 우선순위: P2
- 예상 작업 난이도: 낮음
- 직접 수정 여부: 수정하지 않음

### 외부 IP 조회가 기본 코드에 포함됨

- 분류: 개인정보/네트워크
- 위치: `lib/session.js:102-129`
- 관련 파일: `lib/session.js`
- 문제 내용: `https://api.ipify.org?format=json`으로 공인 IP를 조회한다.
- 근거: 주석과 fetch 호출이 외부 공개 API 사용을 명시한다.
- 영향도: 내부망 정책에 따라 중간
- 실제 발생 가능한 문제: 외부망 차단 환경에서 경고 로그 발생, 개인정보 정책 문의, 보안 점검 지적.
- 추천 조치: 설정에서 끌 수 있게 하거나, 내부 운영 문서에 외부 호출 목적을 명시한다.
- 우선순위: P2
- 예상 작업 난이도: 낮음
- 직접 수정 여부: 수정하지 않음

### 대형 파일과 도메인 규칙 파일이 많음

- 분류: 유지보수성
- 위치: `lib/ingredient/data/master-import-seed.js`, `lib/sales/data/rules/rules-pizza.js`, `lib/sales/data/rules/rules-side.js`
- 관련 파일: `lib/ingredient/data/*`, `lib/sales/data/rules/*`
- 문제 내용: seed/rules 파일이 700~1300줄대다.
- 근거: `wc -l` 기준 `master-import-seed.js` 1383줄, `rules-pizza.js` 1110줄, `rules-side.js` 774줄.
- 영향도: 중간
- 실제 발생 가능한 문제: 도메인 데이터 변경 시 코드 리뷰가 어려워진다.
- 추천 조치: 실제 규칙은 JSON/CSV fixture로 분리하고 builder/validator만 코드로 유지한다.
- 우선순위: P3
- 예상 작업 난이도: 중간
- 직접 수정 여부: 수정하지 않음

---

## 5. 원가 계산 관련 위험 요소

- g당 단가 계산:
  - `lib/cost/calc-unit-price.js`는 가격과 기준 수량이 없거나 0 이하이면 `null`을 반환한다.
  - 수동 단가와 제때 단가의 최신성 정책은 이미 방향이 정해졌지만, 화면에서 “수동 최신값”과 “제때 최신 연동값”의 출처를 더 명확히 보여주는 것이 좋다.
- 총 원가 계산:
  - `lib/cost/shared/calc.js`는 구성품별 수량과 단가를 곱해 합산하고 `Math.round`한다.
  - 숫자 변환 실패가 0으로 흡수되는 부분은 엄격 검증으로 보강해야 한다.
- 원가율 계산:
  - 판매가가 없거나 0이면 원가율 계산이 불가능하다.
  - 원가마진표에서 판매가 누락과 원가 누락을 별도 이슈로 계속 노출해야 한다.
- 배합 비율 계산:
  - 레시피 구성품 수량 합계 기준의 배합비가 필요한 경우, 단위가 혼합되면 의미가 달라진다.
  - g, 개, 장, ml 등 단위를 섞은 배합비는 “수량 비율”과 “중량 비율”을 구분해야 한다.
- 단위 변환:
  - g 단가 소수점 1자리 정책은 문서화되어야 한다.
  - 개/장 단위는 g 단가와 다른 계산 축이므로 단위별 검증 메시지가 필요하다.
- 소수점 처리:
  - 원가 합계는 `Math.round`, g 단가는 별도 round 정책을 사용한다.
  - 화면/엑셀/보고서가 같은 반올림 기준을 쓰는지 fixture로 고정해야 한다.
- 사이즈별 계산:
  - 피자는 L/R, 단일 메뉴는 단일 사이즈로 분리하는 방향은 최근 보완됐다.
  - 엣지/1인피자/씬바샤삭처럼 예외 size가 있는 메뉴는 fixture가 필요하다.
- 과거 원가 보존:
  - 현재 구현은 최신 단가 기반 계산이 중심이다.
  - 운영 보고서에는 저장 당시 단가 snapshot을 별도 저장하는 방식을 추천한다.
- 단가 변경 영향:
  - 제때 단가 파일이 바뀌면 원가마진표 숫자가 바뀔 수 있다.
  - “마지막 단가 파일 기준일”을 원가표 상단과 다운로드 파일에 포함하는 것이 좋다.
- 계산 로직 중복:
  - 메뉴마스터, 원가마진표, 보고서 출력, 임시 원가 계산이 같은 숫자 정책을 공유해야 한다.
  - 추천 공통화 대상은 `parseStrictNumber`, `roundCost`, `roundUnitPrice`, `calcMarginRate`, `buildCostSnapshot`이다.

---

## 6. 데이터 저장 / 수정 / 삭제 관련 위험 요소

- 저장 실패:
  - IndexedDB transaction 실패는 대부분 throw되지만, 일부 sync 후속 작업은 console 로그로만 끝난다.
  - 판매가 저장 후 메뉴마스터 sync 실패를 사용자에게 알려야 한다.
- 수정 실패:
  - 메뉴/식자재/브랜드 수정은 화면별로 저장 흐름이 다르다.
  - 공통 저장 toast와 실패 retry 패턴을 통일하는 것이 좋다.
- 삭제 실패:
  - 식자재 삭제는 원본 삭제와 연결 데이터 삭제가 분리된다.
  - cascade 실패 시 “삭제됨 + 연결 정리 실패” 상태를 별도 관리해야 한다.
- 중복 저장:
  - 업로드 중복 정책은 날짜/해시/덮어쓰기 3가지로 나뉜다.
  - 화면마다 현재 정책을 명시해야 운영 실수를 줄일 수 있다.
- 데이터 덮어쓰기:
  - 판매가 업로드, 백업 복원, 영양성분 import는 기존 데이터를 덮을 수 있다.
  - 덮어쓰기 전 삭제/변경 예정 건수를 preview로 보여줘야 한다.
- 연결 데이터 손상:
  - 원가 레시피, 메뉴마스터, 판매가, 원산지, 알레르기, 영양성분이 서로 연결된다.
  - 메뉴코드/displayGroupKey 변경 시 연결 검증이 필요하다.
- 메뉴 복사 문제:
  - 메뉴 복사/레시피 복사는 편의 기능으로 좋지만, 코드/사이즈/공통원가 포함 여부가 명확해야 한다.
  - 복사 후 저장 전 diff를 보여주면 실수를 줄일 수 있다.
- 식자재 삭제 문제:
  - 삭제 전 사용 중 메뉴, 공통원가, 알레르기, 원산지 연결을 모두 보여줘야 한다.
  - 삭제보다 숨김/단종을 기본 동작으로 유지하는 것이 안전하다.
- 과거 데이터 보존 문제:
  - 노트/보고서/원가표가 현재 master 데이터에 의존하면 과거 조회 값이 달라질 수 있다.
  - 운영용 보고서는 snapshot 저장을 추천한다.
- 복구 필요 여부:
  - 백업/복원과 식자재 삭제는 복구 UI가 이미 일부 있지만, “실제 복구 성공 여부”를 E2E로 반복 확인해야 한다.

---

## 7. 엑셀 업로드 / 다운로드 관련 위험 요소

- 필수 컬럼 검증:
  - 판매량 import는 필수 header 검증이 강한 편이다.
  - 메뉴 판매가 import는 메뉴명/가격 중심이라 category/size 누락 기본값이 의도와 맞는지 확인해야 한다.
- 잘못된 행 처리:
  - 일부 화면은 실패행 CSV를 제공하지만 모든 화면이 동일하지 않다.
  - 실패행 공통 다운로드가 필요하다.
- 숫자 변환:
  - 날짜/숫자 normalization은 보강됐지만, 메뉴 가격/수량에 쉼표·공백·문자 혼입 시 정책을 명확히 해야 한다.
- 단위 처리:
  - 식자재 단위(g, 개 등)와 원가 계산 단위가 다르면 자동 계산을 막고 수동 확인을 요구해야 한다.
- 중복 데이터 처리:
  - 판매량/제때 가격은 날짜/해시 중복 차단, 메뉴 판매가/영양성분은 덮어쓰기 계열이다.
  - 같은 “업로드”라도 정책이 다르므로 버튼 주변에 고정 안내가 필요하다.
- 기존 데이터 덮어쓰기:
  - 전체 교체 import는 업로드 전 자동 백업을 권장한다.
  - 삭제 예정 수, 신규 수, 변경 수, 유지 수를 보여줘야 한다.
- 대용량 파일 처리:
  - `xlsx`와 CSV 파싱은 브라우저 메인 스레드에서 수행된다.
  - 대용량 파일은 worker 이전을 장기 과제로 둔다.
- 다운로드 데이터 정확성:
  - CSV 수식 인젝션 방어와 브랜드 파일명 규칙은 테스트로 보호되고 있다.
  - XLSX cell formula injection도 주요 sink를 계속 회귀 테스트해야 한다.
- 실무자가 보기 좋은 양식 여부:
  - 실패행 CSV, 업로드 샘플 파일, required column 설명이 화면별로 통일되면 운영성이 좋아진다.

---

## 8. 중복 코드 목록

### 업로드 결과 UI와 실패행 처리

- 위치: `lib/price/use-price-upload.js`, `lib/shipment/use-shipment.js`, `components/cost/menu-price/MenuPriceUploadCard.jsx`
- 중복 내용: 파일 크기 검사, 파싱 실패 메시지, 성공/실패 건수 표시, 중복 업로드 안내가 화면별로 유사하다.
- 왜 문제인지: 정책 변경 시 여러 화면을 같이 수정해야 하고 UX가 흔들린다.
- 공통화 추천 방향: `UploadPreviewResult`, `UploadFailureDownload`, `useUploadPreview`로 분리한다.
- 우선순위: P1

### 숫자 변환과 반올림

- 위치: `lib/cost/shared/calc.js`, `lib/cost/margin/build-rows.js`, `lib/cost/calc-unit-price.js`, import parser 계열
- 중복 내용: `Number`, `parseFloat`, `Math.round`, custom round가 혼재한다.
- 왜 문제인지: 화면별 계산 결과가 1원 또는 소수점 단위로 달라질 수 있다.
- 공통화 추천 방향: `lib/number-policy.js` 또는 `lib/cost/number-policy.js`를 만든다.
- 우선순위: P1

### Empty / Error / Permission 상태 UI

- 위치: 여러 `app/**/page.jsx`, settings/ingredient/report 계열
- 중복 내용: 빈 상태, 권한 부족, 로딩 실패 메시지를 각 화면에서 직접 만든다.
- 왜 문제인지: 안내 문구와 버튼 위치가 달라져 사용자가 다음 행동을 예측하기 어렵다.
- 공통화 추천 방향: `EmptyState`, `ErrorState`, `PermissionNotice`, `RetryPanel`로 통일한다.
- 우선순위: P2

### 출력/다운로드 파일명과 toast 처리

- 위치: `lib/download.js`, report/export 계열, nutrition export 계열
- 중복 내용: 다운로드 파일명, 실패 toast, 인쇄 실패 메시지.
- 왜 문제인지: 출력 오류 원인 추적과 파일 관리가 화면별로 다르게 보인다.
- 공통화 추천 방향: `exportResultToast`, `makeReportFileName`, `safeSheetCell` 계층을 고정한다.
- 우선순위: P2

#### 추가 보완: 브랜드별 업무 CSV 파일명 통일

- 위치: `app/ingredient/usage/page.jsx`, `components/sales/UploadErrorBanner.jsx`, `components/jette/ManagedProductsCard.jsx`, `components/jette/PriceLatestView.jsx`, `components/jette/PriceCompareTable.jsx`
- 조치 내용: 식자재 사용현황, 판매량 업로드 오류 목록, 제때 대상제품목록, 제때 최신단가, 제때 가격비교 CSV가 `makeFileNameWithBrand()`를 사용하도록 통일했다.
- 검증: `download-filename.test.mjs`에 업무 CSV export 구조 테스트를 추가했고, `sales-upload-error-banner.test.mjs` 파일명 기대값을 갱신했다. 전체 `test:ci`는 295 suites / 1771 tests 통과.
- 남은 정책: 샘플기록은 공유 DB 성격이라 active brand prefix 적용 여부를 별도로 결정한다. 업로드 양식/백업 이력 CSV는 전역·템플릿 파일로 예외 유지 가능하다.

### 대형 도메인 seed/rule 파일

- 위치: `lib/ingredient/data/master-import-seed.js`, `lib/sales/data/rules/rules-pizza.js`, `lib/sales/data/rules/rules-side.js`
- 중복 내용: 데이터와 코드가 한 파일에 크게 섞여 있다.
- 왜 문제인지: 규칙 변경 리뷰가 어려워지고 테스트 fixture 관리가 커진다.
- 공통화 추천 방향: 데이터는 fixture 파일, 검증/정규화는 builder 함수로 분리한다.
- 우선순위: P3

---

## 9. 타입 안정성 문제 목록

- any 사용 위치:
  - 프로젝트가 JavaScript 기반이라 TypeScript의 `any` 자체보다 “형태가 불명확한 object”가 주요 위험이다.
  - IndexedDB row, Excel row, recipe component, backup store row에 런타임 schema가 필요하다.
- 타입 단언 남용 위치:
  - TypeScript 단언은 없지만, `row[field]`, `item.foo || ''` 같은 암묵적 구조 가정이 많다.
  - 업로드 parser와 backup import가 우선 대상이다.
- null / undefined 위험 위치:
  - 메뉴 가격, 단가, 레시피 구성품, edge 가격, nutrition value는 null 가능 값이 많다.
  - 계산 직전 null을 명시 이슈로 바꾸는 공통 helper가 필요하다.
- 숫자 / 문자열 혼용 위치:
  - Excel/CSV에서 온 값은 문자열, Date, number가 섞일 수 있다.
  - `parseFloat`, `Number`, `Math.round` 사용 전 strict normalization을 통일해야 한다.
- API 응답 타입 불명확 위치:
  - 외부 API는 `lib/session.js`의 ipify 응답 정도지만, IndexedDB와 localStorage도 사실상 API 응답처럼 취급해야 한다.
  - backup JSON import에는 store별 schema 검증이 필요하다.
- 공통 타입 분리 필요 위치:
  - `RecipeComponent`
  - `MenuMasterRow`
  - `SellingPriceRow`
  - `IngredientRow`
  - `NutritionValueRow`
  - `BackupPayload`
  - `UploadPreviewResult`

---

## 10. 보안 관련 확인 목록

- 인증 필요 페이지:
  - settings, backup, restore, ingredient destructive action, menu price replace, brand action은 인증/관리자 권한이 필요하다.
  - 현재는 클라이언트 중심이므로 운영 범위를 내부 도구로 제한해야 한다.
- 권한 체크 필요 API:
  - 서버 API가 거의 없고 IndexedDB 직접 접근 구조다.
  - `assertActiveAdmin`이 destructive 함수에 들어간 것은 좋지만, 외부 배포용 보안은 아니다.
- 환경변수 노출 위험:
  - 현재 검수 범위에서는 서버 비밀키 기반 구조가 핵심이 아니지만, 외부 서비스 추가 시 `NEXT_PUBLIC_` 노출을 별도 검토해야 한다.
- 파일 업로드 위험:
  - 확장자/크기 검사는 공통화됐다.
  - 실제 파일 내용 MIME 검증과 malicious XLSX 대응은 브라우저 xlsx parser 의존이다.
- XSS 위험:
  - print/export HTML builder는 escaping 테스트가 있다.
  - 신규 HTML 출력 경로가 생기면 `esc()` 사용을 테스트로 고정해야 한다.
- SQL Injection 위험:
  - SQL DB를 사용하지 않고 IndexedDB 중심이라 SQL Injection 위험은 낮다.
- 민감 정보 로그 위험:
  - 실패 로그에 파일 내용 전체, 비밀번호, 백업 payload가 찍히지 않는지 계속 확인해야 한다.
  - 현재 일부 console.warn/error는 디버깅용으로 남아 있으므로 운영 브라우저에서 로그 민감도 확인 필요.
- 다운로드 데이터 노출 위험:
  - CSV/XLSX 다운로드는 내부 데이터 반출이다.
  - 브랜드명/업무명 파일명 규칙은 있으나, 권한 없는 사용자의 다운로드를 서버에서 막는 구조는 아니다.

---

## 11. 성능 개선 필요 목록

- 불필요한 렌더링:
  - 큰 화면 대부분이 `useMemo`/hook 분리로 개선됐지만, 대량 rows 필터링이 state 변경마다 돌 수 있다.
  - cost margin, ingredient manage, command palette가 우선 점검 대상이다.
- 무거운 계산 반복:
  - 원가마진표는 판매가, 식자재, 레시피, 엣지, 메뉴마스터를 한 번에 조합한다.
  - 계산 cache 또는 snapshot 저장을 검토한다.
- 큰 테이블 성능:
  - 테이블 wrapper overflow는 있지만 virtualization은 제한적이다.
  - 1000행 이상 운영 fixture로 스크롤/검색 체감 확인이 필요하다.
- 검색 / 필터 / 정렬 성능:
  - 현재는 대체로 배열 전체 순회 방식이다.
  - IndexedDB index 검색 또는 memoized normalized index를 도입할 수 있다.
- API 중복 호출:
  - 서버 API보다 IndexedDB getAll 중복이 주요 관심사다.
  - `useDBLoad`가 확산됐으나 화면별 reload 타이밍을 점검해야 한다.
- 이미지 최적화:
  - 노트/샘플 사진이 커질 경우 썸네일 생성과 용량 제한을 더 강화해야 한다.
- 엑셀 파싱 성능:
  - `xlsx`는 lazy import지만 파싱은 메인 스레드에서 실행된다.
  - 대용량 제때 파일은 worker 또는 chunk preview를 장기 검토한다.
- 번들 크기 개선:
  - `xlsx` lazy import는 긍정적이다.
  - 대형 seed/rule 파일이 초기 bundle에 끌려들지 않는지 build 분석이 필요하다.

---

## 12. UI / UX 보완 목록

- 사용자 실수 방지:
  - 전체 교체, 삭제, 복원, 단종, 분류 일괄 변경은 변경 예정 건수를 confirm에 표시한다.
- 버튼 위치:
  - destructive 버튼은 일반 저장 버튼과 떨어뜨리고, preview 후 confirm 흐름을 유지한다.
- 경고 문구:
  - “전체 교체”, “현재 단가 기준”, “복원 후 되돌릴 수 있음/없음”을 버튼 근처에 직접 표시한다.
- 빈 상태:
  - 레시피 미작성, 단가 없음, 판매가 없음, 영양성분 없음은 이슈 탭과 빈 상태를 연결한다.
- 로딩 상태:
  - 큰 DB load 화면은 skeleton과 reload 버튼을 유지한다.
- 성공 / 실패 안내:
  - 저장 성공 toast만으로 끝내지 말고, 동기화 후속 작업 실패를 별도 안내한다.
- 모바일 사용성:
  - `qa:mobile` 스크립트가 있으므로 실제 390px viewport에서 테이블/모달/필터 겹침을 반복 확인한다.
- 입력 폼 흐름:
  - 메뉴마스터 레시피 입력은 키보드 Enter, 행 복사, 단가 없음 보정, 규격 드롭다운 개선이 이미 진행됐다.
  - 다음 단계는 “저장 전 변경 요약”과 “최근 사용 구성품 고정”이다.
- 계산 결과 표시 방식:
  - 원가표 상단에 기준 단가 파일, 계산 시각, 반올림 정책, snapshot 여부를 표시한다.

---

## 13. 테스트 코드 추천 목록

### 판매가 전체 교체 안전 테스트

- 테스트 대상: `replaceAllMenuPrices`, 메뉴마스터 sync
- 필요한 이유: 판매가 store 교체 후 sync 실패가 성공처럼 보일 수 있다.
- 검증해야 할 조건: sync 실패 시 사용자 경고 또는 반환 상태가 생기는지, 기존 데이터 손실 preview가 있는지
- 우선순위: P0

### 백업 복원 부분 실패 리허설

- 테스트 대상: `importAllToBrand`, restore page flow
- 필요한 이유: 그룹 간 부분 복원 위험을 운영 전에 재현해야 한다.
- 검증해야 할 조건: 자동 백업 생성, 부분 복원 warning, 복구 안내, localStorage skip 조건
- 우선순위: P0

### 원가 수동 검산 fixture

- 테스트 대상: 메뉴마스터 레시피, 공통원가, 원가마진표, 보고서 출력
- 필요한 이유: 자동 테스트가 많아도 실무 계산 신뢰는 fixture 검산으로 확보해야 한다.
- 검증해야 할 조건: L/R/단일/엣지/공통원가/수동단가/제때단가 조합의 기대 원가와 원가율
- 우선순위: P0

### 숫자 strict parsing 테스트

- 테스트 대상: 원가 계산 공통 helper
- 필요한 이유: 잘못된 문자열이 0으로 흡수되는 것을 막아야 한다.
- 검증해야 할 조건: `''`, `null`, `abc`, `1,000`, `0`, 음수, 소수점, 공백 포함 값
- 우선순위: P1

### 식자재 삭제 cascade 테스트 확장

- 테스트 대상: `deleteIngredient`, `bulkDeleteIngredients`
- 필요한 이유: cascade 실패 시 복구 가능성을 확인해야 한다.
- 검증해야 할 조건: 삭제 전 preview, cascade 실패 반환, undo/restore, orphan 진단
- 우선순위: P1

### 엣지 판매가 매칭 테스트

- 테스트 대상: `buildEdgeMetadata`, `buildDerivedRows`
- 필요한 이유: 이름 기반 매칭은 실무 파일 명칭 차이에 취약하다.
- 검증해야 할 조건: 공백, 별칭, 코드 연결, 판매가 누락 경고
- 우선순위: P1

### 업로드 실패행 공통 UX 테스트

- 테스트 대상: 판매량, 제때 단가, 메뉴 판매가, 영양성분 import
- 필요한 이유: 실무자가 오류 원인을 빠르게 찾아야 한다.
- 검증해야 할 조건: 실패행 수, 실패행 다운로드, 부분 성공 메시지, 덮어쓰기 경고. 빈 CSV·헤더-only·대표 필수 컬럼 누락은 자동 테스트로 보강됐고, 남은 것은 실제 화면 다운로드/중복/대용량 UX 확인이다.
- 우선순위: P1

### 모바일 모달/테이블 회귀 테스트

- 테스트 대상: `qa:mobile`, 주요 22 route
- 필요한 이유: 내부 도구도 현장에서는 작은 화면으로 확인할 수 있다.
- 검증해야 할 조건: 390px에서 horizontal overflow, 버튼 겹침, modal 높이, sticky header
- 우선순위: P2

### 외부 IP 조회 설정 테스트

- 테스트 대상: `lib/session.js`
- 필요한 이유: 내부망/개인정보 정책에 따라 외부 호출을 꺼야 할 수 있다.
- 검증해야 할 조건: timeout, 실패 표시, 설정 off 상태, console noise 감소
- 우선순위: P2

---

## 14. 추가로 확인해야 할 질문 목록

- 단가 변경 시 기존 원가표 숫자도 바뀌어야 하나요, 아니면 저장 당시 원가 snapshot으로 보존해야 하나요?
- 원가마진표는 “현재 기준 시뮬레이션”인가요, “보고서 보관용 확정값”인가요?
- 판매가 엑셀 업로드는 항상 전체 교체인가요, 아니면 부분 갱신 모드도 필요하나요?
- 판매가 전체 교체 전 자동 백업을 필수로 둘까요?
- 메뉴마스터 동기화 실패 시 판매가 교체를 rollback해야 하나요, 아니면 경고 후 재동기화 버튼을 둘까요?
- 식자재 삭제 시 기존 메뉴 레시피에서는 삭제된 구성품을 어떻게 보여줘야 하나요?
- 식자재 삭제보다 단종/숨김을 기본 정책으로 고정해도 되나요?
- 원가 계산 소수점은 모든 화면에서 반올림인가요, 버림인가요, 원 단위 절사인가요?
- g당 단가 1자리 반올림 후 총 원가를 계산하나요, 원 단가를 유지하고 마지막에만 반올림하나요?
- 판매가 기준 원가율은 부가세 포함 판매가 기준인가요?
- 엣지 판매가는 이름 매칭이 아니라 메뉴코드로 관리해도 되나요?
- 영양성분 값이 일부 누락된 메뉴는 출력에서 제외하나요, 경고와 함께 출력하나요?
- 백업 복원에서 공유 노트/일정은 브랜드별 복원 대상에서 항상 제외하는 현재 정책이 맞나요?
- 외부 IP 조회 기능은 계속 필요한가요, 설정에서 끄는 옵션이 필요한가요?
- 운영 전 QA는 사용자가 직접 실행하는 dev server 기준인가요, 별도 build/prod server 기준인가요?

---

## 15. 리팩터링 추천 순서

1. 가장 먼저 해야 할 작업
   - 판매가 전체 교체 정책을 운영 기준으로 확정한다. 메뉴마스터 동기화 실패 표시는 보강 완료됐고, 재동기화 버튼 필요 여부만 남았다.
   - 백업 복원 부분 실패 리허설과 자동 백업 필수화를 확인한다.
   - 원가 수동 검산 fixture를 만들고 현재 계산값을 고정한다.
2. 그 다음 해야 할 작업
   - 숫자 parsing/rounding 공통 정책을 만든다.
   - 업로드 preview/result UI를 공통화한다.
   - 식자재 삭제 cascade 실패 복구/재시도 UX를 보강한다.
3. 안정화 후 해야 할 작업
   - 원가 snapshot 저장 구조를 설계한다.
   - 엣지 판매가 매칭을 코드 기반으로 바꾼다.
   - Empty/Error/Permission 상태 컴포넌트를 통일한다.
4. 장기적으로 해야 할 작업
   - TypeScript 또는 Zod schema를 도입한다.
   - 큰 테이블 virtualization과 worker 기반 엑셀 파싱을 검토한다.
   - 외부 배포 가능성이 생기면 서버 인증/권한/감사 로그로 전환한다.

---

## 16. 운영 전 최종 체크리스트

- [ ] 원가 계산 결과 수동 검산 완료
- [ ] L/R/단일/1인피자/사이드/소스/음료/엣지 메뉴 fixture 검산 완료
- [ ] 공통원가 포함/미포함 원가마진표 검산 완료
- [ ] 제때 단가 최신값과 수동 단가 최신값 출처 확인 완료
- [ ] 판매가 업로드 전체 교체 정책 확인 완료
- [ ] 판매가 업로드 전 자동 백업 또는 삭제 예정 preview 확인 완료
- [x] 메뉴마스터 동기화 실패 시 사용자 안내 경로 확인 완료
- [ ] 엑셀 업로드 테스트 완료
- [ ] 실패행 다운로드/오류 메시지 확인 완료
- [ ] 저장 / 수정 / 삭제 / 복구 테스트 완료
- [ ] 식자재 삭제 전 영향도 preview 확인 완료
- [ ] 백업 export/import 리허설 완료
- [ ] 부분 복원 발생 시 복구 방법 확인 완료
- [x] 모바일 390px 화면 확인 완료 (`qa:prod` 내 `qa:mobile` 22/22)
- [x] `qa:smoke` 실행 완료 (`qa:prod` 기준 22/22)
- [x] `qa:mobile` 실행 완료 (`qa:prod` 기준 22/22)
- [x] `qa:runtime` 실행 완료 (`qa:prod` 기준 67/67)
- [x] dev `qa:workflow` 실행 완료 (최신 기준 21/21)
- [x] `qa:prod` 21시나리오 기준 재확인 완료 (`HOST=127.0.0.1 PORT=3101 BASE=http://127.0.0.1:3101 npm run qa:prod`)
- [ ] 권한 체크 확인 완료
- [ ] 외부 IP 조회 사용 여부 확인 완료
- [ ] 환경변수 노출 여부 확인 완료
- [ ] 다운로드 파일명/브랜드명 규칙 확인 완료
- [ ] 운영 중 장애 발생 시 백업 위치와 복구 담당자 확인 완료

---

## 17. 결론

현재 프로젝트에서 가장 위험한 부분은 화면 코드의 미정리가 아니라 **실제 데이터가 바뀌는 작업의 정책과 복구 절차**다. 특히 판매가 전체 교체, 백업 복원, 식자재 삭제, 원가 snapshot 여부는 운영 전에 반드시 확정해야 한다.

운영 전에 반드시 고쳐야 할 부분은 아래 5개다.

1. 판매가 전체 교체 전 삭제/변경 preview와 자동 백업
2. 메뉴 판매가 교체 후 메뉴마스터 동기화 실패 표시
3. 원가 계산 수동 검산 fixture
4. 백업 복원 부분 실패 리허설과 복구 안내
5. 내부 도구 인증/권한 모델의 운영 범위 확정

나중에 문제가 커질 수 있는 부분은 숫자 변환 정책, 엣지 판매가 이름 매칭, 최신 단가 기준 원가표, 업로드 실패행 UX 불일치, 대량 데이터 클라이언트 처리다. 이 항목들은 당장 치명적 오류로 보이지는 않지만, 데이터가 쌓이고 사용자가 늘면 추적 비용이 커진다.

우선순위 높은 개선 작업 5개는 다음 순서를 추천한다.

1. 판매가 업로드와 메뉴마스터 sync 안전장치
2. 원가 계산/반올림/숫자 parsing 공통 정책
3. 백업 복원 리허설과 부분 실패 복구 플로우
4. 업로드 preview/result 공통화
5. 원가 snapshot 설계

추가로 확인해야 할 정책 결정 사항은 “과거 원가 보존 여부”, “판매가 업로드 전체 교체 여부”, “식자재 삭제 기본 정책”, “엣지 판매가 코드 연결 여부”, “외부 IP 조회 사용 여부”다. 이 다섯 가지가 확정되면 클로드가 구현 작업을 더 안전하게 단계화할 수 있다.
