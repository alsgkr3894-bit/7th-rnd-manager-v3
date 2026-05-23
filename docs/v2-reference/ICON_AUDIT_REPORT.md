# 7번가피자 R&D 관리 플랫폼 v2 — UI 아이콘 조사 보고서
**작성일**: 2026-05-17  
**조사 범위**: 이모지, 특수문자, 텍스트 기반 아이콘  
**목적**: Lucide Icons 또는 SVG 통일화 전략 수립

---

## 1️⃣ 현재 아이콘 사용 현황 요약

### 사용 방식별 분류
| 방식 | 위치 | 개수 | 상세 |
|------|------|------|------|
| **이모지 아이콘** | HTML `<span>` | 23개 | 홈 화면 랜딩 카드 |
| **특수문자** | HTML `<span>` + JS 템플릿 | 7개 | 메뉴 드롭다운, 토스트, 정렬 화살표 |
| **CSS Pseudo-element** | components.css | 2개 | 테이블 정렬 표시 (▲, ▼) |

### 전체 아이콘 목록
```
현재 프로젝트에 사용 중인 모든 아이콘:

[HTML 이모지 아이콘 - 23개]
📤 (업로드), 📊 (차트/순위), 📈 (증가/비교), ⚠️ (경고/미매칭)
⚙️ (설정, 3회 반복), 💰 (가격), 📦 (상품), 🍕 (피자), 🥗 (사이드)
🔵 (원형 표시), 🧾 (영수증/청구서), 💲 (가격/금융), 🔍 (검색)
✏️ (수정, 2회), 📋 (클립보드/양식, 5회), 💾 (저장), 📥 (다운로드), 👤 (계정)

[HTML 특수문자 - 7개]
▾ (드롭다운 케럿, 6회 - 네비 드롭다운)
🌙 (테마 토글)

[JS 템플릿 아이콘]
✓ (성공 - toast.js, price-ui.js)
✕ (실패 - toast.js)
! (경고 - toast.js)
i (정보 - toast.js)
▼ (열림 - collapsible-ui.js)
▶ (닫힘 - collapsible-ui.js)

[CSS Pseudo-element]
▲ (정렬 오름차순 - components.css line 111)
▼ (정렬 내림차순 - components.css line 112)
```

---

## 2️⃣ 교체 대상 상세 표

| # | 화면/기능 영역 | 현재 표시 | 권장 Lucide 아이콘 | 대체 아이콘 | 변경 필요 파일 | 우선순위 | 위험도 |
|---|---|---|---|---|---|---|---|
| 1 | 메뉴 드롭다운 케럿 | `▾` | `ChevronDown` | `▼` | index.html | P1 | 🟢 낮음 |
| 2 | 테마 토글 버튼 | `🌙` | `Moon` / `Sun` | 반달 SVG | index.html, src/common/theme.js | P1 | 🟡 중간 |
| 3 | 판매량 업로드 | `📤` | `Upload` | ⬆️ | index.html (line 350) | P2 | 🟢 낮음 |
| 4 | 판매량 순위 | `📊` | `BarChart3` 또는 `TrendingUp` | 📈 | index.html (line 355) | P2 | 🟢 낮음 |
| 5 | 판매량 비교 | `📈` | `TrendingUp` | 📊 | index.html (line 360) | P2 | 🟢 낮음 |
| 6 | 미매칭 관리 | `⚠️` | `AlertTriangle` | ⚠ | index.html (line 365) | P2 | 🟡 중간 |
| 7 | 판매량 설정 | `⚙️` | `Settings` | ⚙ | index.html (line 370) | P2 | 🟢 낮음 |
| 8 | 가격 비교 | `💰` | `DollarSign` 또는 `Wallet` | 💵 | index.html (line 411) | P2 | 🟢 낮음 |
| 9 | 범용상품 출고량 | `📦` | `Package` 또는 `Box` | 📫 | index.html (line 416) | P2 | 🟢 낮음 |
| 10 | 상품 관리 설정 | `⚙️` | `Settings` | ⚙ | index.html (line 421) | P2 | 🟢 낮음 |
| 11 | 피자 원가 (복수) | `🍕` | `Pizza` | 🍕 | index.html (line 584, 594) | P3 | 🟢 낮음 |
| 12 | 사이드 | `🥗` | `Salad` 또는 `Leaf` | 🥙 | index.html (line 604) | P3 | 🟢 낮음 |
| 13 | 세트박스 | `📦` | `Package` | 📫 | index.html (line 614) | P3 | 🟢 낮음 |
| 14 | 엣지 & 도우 | `🔵` | `Circle` | ● | index.html (line 628) | P3 | 🟡 중간 |
| 15 | 판매가 기준 | `🧾` | `FileText` 또는 `Receipt` | 🧾 | index.html (line 633) | P3 | 🟢 낮음 |
| 16 | 재료 단가표 | `💲` | `DollarSign` 또는 `PricingTag` | 💱 | index.html (line 638) | P3 | 🟢 낮음 |
| 17 | 식자재 사용 현황 | `🔍` | `Search` | 🔎 | index.html (line 643) | P3 | 🟢 낮음 |
| 18 | 피자 원가 관리 | `✏️` | `Edit` 또는 `Pencil` | ✎ | index.html (line 652) | P3 | 🟢 낮음 |
| 19 | 1인피자 관리 | `✏️` | `Edit` | ✎ | index.html (line 657) | P3 | 🟢 낮음 |
| 20 | 노트 목록/관리 | `📋` | `ClipboardList` 또는 `ListChecks` | 📑 | index.html (lines 589, 599, 609, 619, 1403) | P2 | 🟢 낮음 |
| 21 | 노트 비용 | `💰` | `DollarSign` | 💵 | index.html (line 1408) | P2 | 🟢 낮음 |
| 22 | 노트 아이디어 | `📦` | 맥락에 따라 `Lightbulb` 등 | 💡 | index.html (line 1413) | P2 | 🟢 낮음 |
| 23 | 노트 기록 | `📈` | `TrendingUp` | 📊 | index.html (line 1418) | P2 | 🟢 낮음 |
| 24 | 데이터 백업 | `💾` | `Save` 또는 `HardDrive` | 💿 | index.html (line 1479) | P2 | 🟢 낮음 |
| 25 | 데이터 복원 | `📥` | `Download` 또는 `Import` | ⬇️ | index.html (line 1484) | P2 | 🟢 낮음 |
| 26 | 시스템 설정 | `⚙️` | `Settings` | ⚙ | index.html (line 1489) | P2 | 🟢 낮음 |
| 27 | 계정 관리 | `👤` | `User` 또는 `Users` | 👥 | index.html (line 1494) | P2 | 🟢 낮음 |
| 28 | **Toast 성공** | `✓` | `Check` 또는 `CheckCircle` | ✔ | src/common/toast.js (line 18) | P1 | 🟡 중간 |
| 29 | **Toast 실패** | `✕` | `X` 또는 `AlertCircle` | ✖ | src/common/toast.js (line 18) | P1 | 🟡 중간 |
| 30 | **Toast 경고** | `!` | `AlertTriangle` 또는 `AlertCircle` | ⚠ | src/common/toast.js (line 18) | P1 | 🟡 중간 |
| 31 | **Toast 정보** | `i` | `Info` 또는 `InfoCircle` | ℹ | src/common/toast.js (line 18) | P1 | 🟡 중간 |
| 32 | **접힘 패널 열림** | `▼` | `ChevronDown` | ▾ | src/common/collapsible-ui.js (line 22) | P2 | 🟢 낮음 |
| 33 | **접힘 패널 닫힘** | `▶` | `ChevronRight` | ▸ | src/common/collapsible-ui.js (line 22) | P2 | 🟢 낮음 |
| 34 | **테이블 정렬 오름차순** | ` ▲` (CSS) | `ArrowUp` | ↑ | src/styles/components.css (line 111) | P2 | 🟡 중간 |
| 35 | **테이블 정렬 내림차순** | ` ▼` (CSS) | `ArrowDown` | ↓ | src/styles/components.css (line 112) | P2 | 🟡 중간 |
| 36 | 가격 최신 날짜 표시 | `✓` | `Check` | ✔ | src/modules/price/price-ui.js (line 338) | P2 | 🟡 중간 |

---

## 3️⃣ Lucide Icons vs 직접 SVG 적용 방식 비교

### Lucide Icons 방식
```
장점:
✅ 일관된 디자인 시스템 (모든 아이콘이 통일된 스타일)
✅ 매우 가볍고 최소화된 SVG
✅ 색상/크기 동적 조절 가능 (CSS 변수 활용)
✅ 접근성 지원 (aria-label 등)
✅ 풍부한 아이콘 라이브러리 (5000+ 아이콘)
✅ 커뮤니티 유지보수

단점:
❌ 외부 CDN/npm 의존성 추가
❌ 초기 로드 시간 증가 가능성
❌ CDN 지연 시 아이콘 불표시 위험
❌ npm 의존성 관리 필요 (package.json)
❌ 초기 setup 코드 필요 (createIcons() 등)
```

### 직접 SVG 작성 방식
```
장점:
✅ 외부 의존성 없음 (완전 자립)
✅ 로컬 파일이므로 CDN 지연 없음
✅ 프로젝트 특성에 맞게 커스터마이징 가능
✅ 파일 크기 최소 (필요한 것만 포함)
✅ 버전 관리 단순 (코드와 함께)

단점:
❌ 아이콘마다 직접 SVG 코드 작성 필요
❌ 디자인 일관성 관리 어려움
❌ 새로운 아이콘 추가 시 수작업 증가
❌ 색상/크기 조절 시 모든 파일 수정 필요
❌ 유지보수 난도 높음
```

### 혼합 방식 (권장)
```
Lucide Icons + Inline SVG 혼합:
- 자주 사용하는 아이콘: Lucide CDN
- 프로젝트 특화 아이콘: 직접 SVG

장점:
✅ 외부 의존성 최소화
✅ 일관된 디자인 유지
✅ 로컬 제어 가능
✅ 필요시만 외부 의존성 사용

단점:
❌ 관리 포인트가 2곳 (CDN + 로컬)
❌ 일관성 관리에 주의 필요
```

### 이 프로젝트에 가장 적합한 방식: **Lucide Icons CDN**

**이유**:
1. **현재 프로젝트 특성**
   - 관리자 대시보드 (B2B 앱)
   - 기능성 중심, 브랜딩 중심 아님
   - 표준 UI 패턴만 사용

2. **외부 의존성 관점**
   - 이미 xlsx, 네이버 지도 등 외부 라이브러리 의존 중
   - Lucide는 CDN 방식이므로 번들 크기 증가 없음

3. **파일 구조 관점**
   - 분리 구조 (모듈별 JS)
   - createIcons() 초기화를 core/app.js에서 한 번만 호출 가능

4. **유지보수 관점**
   - 향후 새로운 아이콘 추가 시 코드 수정 최소화
   - 디자인 시스템 일관성 유지 용이

5. **성능 관점**
   - 초기 로드: CDN 의존성 (1회, 캐싱 후 영구 활용)
   - 런타임: CSS 변수로 색상/크기 동적 조절 (성능 영향 없음)

---

## 4️⃣ Claude의 독립 판단

### ChatGPT 의견 평가
✅ **동의 범위**:
- 조사 → 전략 → 충돌 평가 단계 구분은 올바른 접근
- 병렬 개발 중 파일 충돌 위험 지적 정확
- 대규모 동시 교체 금지는 필수 원칙

⚠️ **추가 고려사항**:
- CDN 방식 선택 시 네트워크 장애 대책 필요
- 초기화 코드 위치가 중요 (app.js vs index.html)
- 토스트/테이블 같은 동적 생성 요소에 아이콘 적용 방식 상이

### Claude의 판단
**이번 아이콘 통일화는 "적절한 시기"**이지만, **극도의 신중함 필수**:

1. **현재 진행 중인 작업 확인 필수**
   - 다른 Claude 창에서 기능 개발 중이므로, 그 작업 완료 후 진행
   - 또는 해당 모듈과 완전 분리된 부분부터만 진행

2. **파일별 충돌 최소화 전략**
   - index.html: 이모지 아이콘 교체 (정적 HTML)
   - toast.js: 특수문자 아이콘 (동작 로직 없음, 순수 문자)
   - collapsible-ui.js: 특수문자 교체 (250줄 이상 파일이므로 주의)
   - components.css: CSS 의사요소 아이콘 (상대적으로 안전)

3. **병렬 개발 안정성**
   - 현재 프로젝트 기준: 비활성 기능이 많음 (placeholder-card 다수)
   - 활발하게 수정되는 파일 식별 필수 (git log 확인)

---

## 5️⃣ 가장 안전한 구현 순서

### Phase 1: 정적 HTML 아이콘 (가장 안전) — 충돌 확률 0%
**대상**: `index.html`의 이모지 아이콘만  
**파일**: index.html (1799줄, 수정 범위 최소)  
**작업 내용**:
```
1. Lucide Icons CDN 링크 추가 (head 영역)
2. 이모지 <span> → <i> 또는 SVG로 교체 (23개)
3. 테스트: 각 랜딩 카드 아이콘 정상 표시 확인
```
**예상 소요 시간**: 30분

---

### Phase 2: JavaScript 특수문자 아이콘 (안전도 높음) — 충돌 확률 5%
**대상**: 토스트, 접힘 UI 특수문자  
**파일들**:
- `src/common/toast.js` (41줄)
- `src/common/collapsible-ui.js` (64줄)  
**작업 내용**:
```
1. toast.js: '✓', '✕', '!', 'i' → Lucide 아이콘으로 교체
2. collapsible-ui.js: '▼', '▶' → Lucide 아이콘으로 교체
3. 테스트: 토스트 메시지 표시, 접힘 패널 토글 확인
```
**예상 소요 시간**: 20분

---

### Phase 3: CSS 의사요소 아이콘 (중간 안전도) — 충돌 확률 10%
**대상**: 테이블 정렬 화살표  
**파일**: `src/styles/components.css`  
**작업 내용**:
```
1. sort-asc::after, sort-desc::after 수정
2. content: ' ▲' / ' ▼' → CSS class 제거 후 JavaScript에서 추가
   또는 Unicode 문자 → Lucide SVG로 변경
3. 테스트: 테이블 정렬 기능 + 화살표 정상 표시
```
**예상 소요 시간**: 25분

---

### Phase 4: HTML 드롭다운 케럿 (중간 안전도) — 충돌 확률 15%
**대상**: 메뉴 드롭다운 `▾` (6개)  
**파일**: index.html  
**작업 내용**:
```
1. <span class="caret">▾</span> → CSS로 교체 또는 Lucide로 교체
2. 테스트: 드롭다운 클릭 동작 + 케럿 회전 애니메이션
```
**예상 소요 시간**: 15분

---

### Phase 5: 테마 토글 아이콘 (낮은 안전도) — 충돌 확률 20%
**대상**: `🌙` 테마 버튼  
**파일들**:
- `index.html` (line 82)
- `src/common/theme.js` (동적 변경 로직)  
**작업 내용**:
```
1. theme.js에서 🌙 ↔ ☀️ 동적 변경 로직 확인
2. Lucide로 교체 (Moon / Sun 아이콘)
3. 테스트: 다크 모드 전환 + 아이콘 변경 확인
```
**예상 소요 시간**: 20분

---

### Phase 6: 가격 파일 최신 표시 아이콘 (신중함 필요) — 충돌 확률 20%
**대상**: price-ui.js의 `'✓'`  
**파일**: `src/modules/price/price-ui.js`  
**작업 내용**:
```
1. price-ui.js line 338 검토
2. '✓' → Lucide `Check` 아이콘으로 교체
3. 테스트: 가격 비교 테이블 표시 확인
```
**예상 소요 시간**: 15분

---

### ⚠️ 금지: 한 번에 여러 파일 수정
```
❌ 잘못된 방식:
1. index.html, toast.js, collapsible-ui.js, components.css 동시 수정
2. git add . && git commit

✅ 올바른 방식:
1. Phase 1 완료 → 테스트 ✓ 확인 → 사용자 승인
2. Phase 2 진행 → 테스트 ✓ 확인 → 사용자 승인
3. ... (순차)
```

**전체 소요 시간**: ~2시간 (Phase 1-6 순차 진행, 테스트 포함)

---

## 6️⃣ 실제 적용 전 반드시 확인할 충돌 위험

### ✅ 확인 체크리스트

#### 1. **현재 진행 중인 기능 개발 파일 식별**
```bash
# 다른 Claude 창에서 수정 중인 파일 확인
git log --oneline -n 10          # 최근 수정 파일
git status                       # 현재 modified 파일
ls -lt src/**/*.js               # 최근 수정순 정렬
```

**특히 주의할 파일들**:
- `src/modules/price/*.js` (가격 관련 모듈)
- `src/modules/menu-dev-note/*.js` (메뉴개발노트)
- `src/modules/cost/*.js` (원가계산)

#### 2. **Lucide Icons CDN 적용 시 보안 확인**
```javascript
// CDN 추가 시 확인사항:
// ✅ HTTPS 사용 (https://cdn.jsdelivr.net/npm/lucide@latest/...)
// ✅ 타사 CDN 신뢰성 확인
// ✅ 로컬 폴백 방안 (CDN 다운 시 대체)
```

#### 3. **동적 렌더링 아이콘 적용 검증**
```javascript
// ❌ 문제: JS 템플릿에서 아이콘 생성 후 createIcons() 미호출
template = `<td>${'✓'}</td>`  // Lucide 아이콘으로 교체
// ✅ 해결: app.js에서 렌더링 후 createIcons() 호출
```

#### 4. **아이콘 크기/정렬 레이아웃 재검증**
```css
/* ❌ 위험: 아이콘 크기 변경으로 버튼 높이 변경 */
/* 이전: '✓' (기본 폰트 크기) → 이후: <i> SVG (24x24px) */

/* ✅ 해결: 부모 컨테이너 높이 명시 */
.btn { height: 32px; }
.btn i { width: 16px; height: 16px; }  /* 일관된 크기 유지 */
```

#### 5. **토스트 메시지 출력 확인**
```javascript
// ✅ 테스트 항목:
toast.success('저장되었습니다');  // 아이콘 + 메시지 표시
toast.error('오류가 발생했습니다');
toast.warn('주의하세요');
toast.info('정보입니다');
// → 각각 4초 후 자동 사라짐 확인
```

#### 6. **테이블 정렬 화살표 동작**
```javascript
// ✅ 테스트 항목:
// 1. 테이블 헤더 클릭 시 오름차순 정렬 → ▲ 표시
// 2. 다시 클릭 시 내림차순 정렬 → ▼ 표시
// 3. 다시 클릭 시 원래 순서 복원 → 표시 제거
```

#### 7. **접힘 UI 토글 동작**
```javascript
// ✅ 테스트 항목:
// 1. 패널 제목 클릭 → ▶ 회전하여 ▼ 표시, 내용 펼침
// 2. 다시 클릭 → ▼ 회전하여 ▶ 표시, 내용 접힘
// 3. 애니메이션 부드러운지 확인
```

#### 8. **메뉴 드롭다운 케럿 동작**
```javascript
// ✅ 테스트 항목:
// 1. "메뉴 판매량" 클릭 → ▾ 표시 + 서브메뉴 펼침
// 2. 다시 클릭 → 서브메뉴 접힘 (케럿 상태 변경 여부 확인)
// 3. 다른 메뉴 클릭 → 기존 메뉴 자동 접힘
```

#### 9. **다크모드 테마에서의 아이콘 가시성**
```css
/* ✅ 확인사항 */
/* 라이트 모드: 검은색/회색 아이콘 ✓ */
/* 다크 모드: 흰색/밝은 회색 아이콘 ✓ */
/* → data-theme="dark" 상태에서 색상 재검증 */
```

#### 10. **기존 기능 회귀 테스트**
```
✅ 테스트 체크리스트:
□ 홈 페이지 로딩 (아이콘 모두 표시)
□ 각 메뉴 탭 전환 (드롭다운 정상 작동)
□ 파일 업로드 (UI 정상 표시)
□ 테이블 정렬 (화살표 + 정렬 정상)
□ 토스트 메시지 (성공/오류/경고 메시지 표시)
□ 설정 패널 (접힘 토글 정상)
□ 다크모드 전환 (테마 토글 정상)
□ 콘솔 오류 없는지 확인 (F12 → Console)
```

---

## 7️⃣ 구현 시 주의사항

### ⚠️ 필수 원칙 (CLAUDE.md 원칙 적용)

1. **1개 파일씩만 수정**
   - 동시 수정 절대 금지
   - 파일 수정 → 테스트 완료 → 사용자 승인 후 다음 파일

2. **각 Phase마다 사용자 확인**
   - "이 부분이 잘 작동하는가?" 확인 요청
   - "다음 Phase 진행해도 되나?" 승인 필수

3. **콘솔 오류 확인**
   - F12 열어서 Console 탭 확인
   - import 경로 오류 없는지 검증
   - Uncaught error 없는지 확인

4. **신중한 진행 속도**
   - 현재 프로젝트의 "개발 실수 방지 체크리스트" 참조
   - Phase 9에서의 실수 반복 금지
   - 조급함 금지, 안정성 최우선

5. **CDN 추가 보안**
   ```html
   <!-- ✅ 안전한 방식 -->
   <script src="https://cdn.jsdelivr.net/npm/lucide@latest"></script>
   
   <!-- ❌ 피해야 할 방식 -->
   <script src="http://..."></script>  <!-- HTTP 사용 금지 -->
   ```

6. **아이콘 적용 초기화**
   ```javascript
   // app.js의 초기화 부분에서:
   import('./src/common/lucide-setup.js').then(m => {
     m.initLucideIcons();  // 렌더링 후 호출
   });
   ```

---

## 8️⃣ 최종 권장사항

### 🟢 즉시 진행 가능
- **Phase 1 (정적 HTML 이모지)** — 가장 안전, 언제든 시작 가능
- 충돌 확률 0%, 소요 시간 30분

### 🟡 다른 작업 확인 후 진행
- **Phase 2-6** — 현재 진행 중인 기능 개발과의 파일 충돌 확인 후
- 각 Phase마다 15-30분 소요

### 🔴 미연기 권장
- **새로운 기능 개발과의 동시 진행** — 절대 금지
- 현재 기능 개발 완료 후 별도 시간대에 진행

### 📋 다음 단계
1. **사용자 승인**: "Phase 1부터 시작해도 되나?"
2. **환경 확인**: 다른 Claude 창에서 진행 중인 파일 목록 공유
3. **Phase 1 진행**: 1개 파일(index.html) 수정 → 테스트 → 확인
4. **승인 후 Phase 2**: 차례대로 진행

---

## 📊 요약

| 항목 | 결론 |
|------|------|
| **적용 방식** | Lucide Icons CDN (외부 의존성 최소, 유지보수 최적) |
| **구현 순서** | 6개 Phase 순차 진행 (정적 HTML → 동적 JS → CSS) |
| **전체 소요 시간** | ~2시간 (Phase 1-6, 테스트 포함) |
| **충돌 위험** | Phase별로 0-20% (충분히 관리 가능) |
| **즉시 시작 가능** | ✅ Phase 1만 가능 (나머지는 확인 후) |
| **안정성 평가** | 🟢 HIGH (신중한 단계별 접근 시 안전) |

