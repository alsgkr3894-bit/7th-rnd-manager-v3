# 보안 정책 문서

작성일: 2026-06-17

## 1. 현재 운영 환경

이 플랫폼은 **단일 LAN 환경**에서 내부 직원 전용으로 운영되는 로컬 도구다. 공개 인터넷 배포를 전제하지 않는다.

---

## 2. 현재 인증 구조

### 2-1. 비밀번호 저장

| 항목 | 현황 |
|---|---|
| 알고리즘 | SHA-256 (순수 JS 구현 + `crypto.subtle` 병행) |
| 저장 위치 | `localStorage['v3:auth-hash']` |
| 솔트 | **없음** — 단일 계정 해시만 저장 |
| 계정 구조 | 배열 형태 설계 (멀티 사용자 확장 여지 있음) |

### 2-2. 세션 관리

| 항목 | 현황 |
|---|---|
| 쿠키명 | `v3:auth` |
| 값 | `1` (presence-check만 사용) |
| 속성 | `path=/; SameSite=Strict` |
| **Secure** | **미적용** — LAN HTTP 환경에서는 불필요 |
| **HttpOnly** | **미적용** — 클라이언트 JS에서 직접 작성/삭제 |

### 2-3. 라우트 가드

`middleware.ts`가 모든 경로에서 `v3:auth` 쿠키 존재 여부를 확인한다.
- 쿠키 없음 → `/login`으로 리디렉트
- `/login`에서 이미 인증된 상태 → `/`로 리디렉트
- `/_next`, `/favicon.ico`, `/api/` 등 공개 경로는 통과

### 2-4. 권한 체계

| 역할 | 접근 범위 |
|---|---|
| admin | 설정 편집, 계정 추가/삭제, 브랜드 생성/수정/삭제, DB 재생성 |
| 일반 | 나머지 모든 기능 (원가, 레시피, 출고량 등) |

`isAdminProfile(profile)` → `lib/profile.js:47` 에서 role 확인.
admin 전용 액션은 실행 함수(`useBrandActions`, `useCurrentRole` 등)에서 `if (!isAdmin) return` 조기 반환으로 차단됨. UI disabled와 실행 함수 양쪽에서 보호함.

#### 2-4-1. 실행함수 레이어 권한 가드 (defense-in-depth)

UI disabled 우회(프로그램적 직접 호출)에 대비해, 파괴적 **실행 함수 내부**에서도 viewer를 차단한다. `lib/auth/guard.js`의 `assertActiveAdmin(label)`(async, canonical `getActiveRole()` 재사용, 비-admin이면 `PermissionDeniedError` throw)을 다음 함수 진입부에서 호출한다:

| 영역 | 가드된 함수 |
|---|---|
| 계정 | `addAccount` / `updateAccount` / `deleteAccount` (`lib/auth/accounts.js`) |
| 메뉴마스터 | `deleteMenuMaster` / `resetAllMenuMaster` (`lib/menu-master/store.js`), `seedMenuMaster` (`seed.js`) |
| 식자재 | `deleteIngredient` / `bulkDeleteIngredients` (`lib/ingredient/store.js`) |
| 복원 | `importAllToBrand` (`lib/db/backup.js`) |
| 시스템 | `handleReset` / `handleRecreate` (`app/settings/system/page.jsx`) |

원칙:
- 저수준 DB 프리미티브(`clearStore`/`deleteDatabase`, `lib/db/crud.js`)에는 가드를 넣지 않는다 — 복원 등 정상 경로에서 공유되므로 핸들러/도메인 레이어에서 처리.
- `getActiveRole`은 계정 0개(신규 설치) 시 `'admin'`을 반환 → 초기 설정 흐름 무손상. DB 오류 시 `'viewer'`(fail-closed).
- `guard.js`는 `accounts.js`를 **동적 import**해 순환 import를 회피한다.

**보류 (의도적)**: 브랜드 메타 함수 `upsertBrand`/`setBrandHidden`/`setDefaultBrandId`(`lib/brand-master.js`)는 **sync**·localStorage만 수정·**비파괴**라 실행함수 가드를 적용하지 않았다. async 전환은 광범위 회귀, sync 가드는 새 캐시 인프라가 필요해 비용 대비 효과가 낮다. UI 가드(`app/settings/brands/page.jsx`의 `useCurrentRole`, `role-gating-source.test.mjs`가 강제)로 커버한다. 향후 이 함수들이 데이터 파괴 작업으로 승격되면 재검토한다.

### 2-5. 설정 PIN

`app/settings/system/` 등 위험 영역(DB 재생성, 초기화)은 PIN 입력 후 진행한다. PIN은 localStorage에 해시로 저장되며 admin 권한과 분리된 별도 방어선이다.

---

## 3. 현재 보안 수준 평가

### 충족된 항목

- [x] 로그인하지 않은 사용자는 모든 페이지 접근 불가 (middleware route guard)
- [x] admin 전용 실행 함수는 역할 확인 후 차단 (UI 전용 disabled가 아님)
- [x] 위험 영역(DB 재생성)은 PIN 이중 확인
- [x] SameSite=Strict으로 CSRF 리스크 최소화
- [x] 모든 데이터는 클라이언트 IndexedDB에만 저장 (서버 유출 경로 없음)

### 미충족 항목 (로컬 LAN 환경에서는 허용)

- [ ] 비밀번호 해시에 솔트 없음 — 단일 계정 LAN 환경이므로 현재는 허용
- [ ] 쿠키에 Secure 플래그 없음 — LAN HTTP 환경이므로 현재는 허용
- [ ] 쿠키에 HttpOnly 없음 — 클라이언트 JS 세션 관리 구조상 의도적

---

## 4. 외부 배포 또는 LAN 다중 사용자 전환 시 필요한 변경사항

아래 항목은 공개 인터넷 또는 HTTPS LAN 배포 전 반드시 구현해야 한다.

### 4-1. 인증 강화

```
[ ] 비밀번호 해시에 솔트 추가 (계정별 랜덤 솔트)
[ ] bcrypt 또는 argon2 도입 (SHA-256 단독 → 브루트포스 취약)
[ ] 계정 잠금 정책 (N회 실패 후 잠금)
[ ] 비밀번호 최소 복잡도 정책
```

### 4-2. 세션/쿠키 강화

```
[ ] 쿠키 값을 서버 발급 랜덤 토큰으로 교체 (현재는 단순 '1')
[ ] Secure 플래그 추가 (HTTPS 전용)
[ ] HttpOnly 플래그 추가 (XSS로 쿠키 탈취 방지)
[ ] 세션 만료 시간 설정 (현재 무기한)
[ ] 서버 측 세션 저장소 (현재 쿠키 존재만 확인)
```

### 4-3. 서버 사이드 라우트 가드

```
[ ] API route handler에서 서버 측 토큰 검증 추가
    (현재 middleware는 Edge Runtime에서 쿠키 presence만 확인)
[ ] admin 전용 API endpoint는 서버에서도 role 확인
[ ] /api/ 경로가 PUBLIC_PATHS에 포함되어 있어 API 인증이 없음 → 수정 필요
```

### 4-4. XSS/CSRF 방어

```
[ ] Content-Security-Policy 헤더 추가
[ ] 현재 SameSite=Strict으로 CSRF는 대부분 막히지만,
    CORS 정책 명시 필요 (multi-origin 환경 진입 시)
```

### 4-5. 데이터 접근 제어

```
[ ] 비-admin 사용자가 admin 기능 URL을 직접 입력해도
    서버에서 막히는지 확인 (현재 클라이언트 isAdmin 체크 의존)
[ ] IndexedDB는 동일 origin에서만 접근 가능 → 현재 안전
```

---

## 5. 현재 허용된 취약점 목록 (의도적 허용)

| 항목 | 사유 |
|---|---|
| 비밀번호 솔트 없음 | 단일 계정 LAN 도구, 공개 DB 없음 |
| 쿠키 Secure 미적용 | LAN HTTP 운영 환경 |
| 쿠키 HttpOnly 미적용 | 클라이언트 JS 로그아웃(`clearAuthCookie`) 구조 의존 |
| API 경로 인증 없음 (`/api/` 공개) | 현재 API route 없음, 향후 추가 시 재검토 필요 |
| 설정 PIN localStorage 저장 | 물리적 기기 접근 환경이므로 허용 |

---

## 6. 향후 검토 일정

외부 배포 결정 시 `SECURITY_POLICY.md`의 4-1 ~ 4-5 항목을 별도 작업 계획으로 전환한다.
현재 로컬 LAN 운영 범위에서는 보안 현황이 운영 요구사항을 충족한다.
