# 프로젝트 버그/QA 정비 계획

검증일: 2026-06-09

## 검증 요약

- `npm test`: 112개 test suite, 667개 test 통과.
- `npm run lint`: ESLint 경고/오류 없음.
- `npm run build`: Next.js production build 통과.
- `npm run qa:smoke`: 클린 빌드 서버 기준 대표 라우트 22/22 통과.
- `node scripts/full-rt.mjs`: main/china4 브랜드 및 직접 진입 포함 60/60 통과.
- `npm run format:check`: 499개 파일 포맷 불일치로 실패 확인.

## 발견 이슈

1. `.next` 산출물이 dev/build 상태로 오염되면 `next start`에서 `Cannot find module './chunks/vendor-chunks/next.js'`가 발생할 수 있다.
2. `verify-dashboard.mjs`, `verify-data-path.mjs`, `verify-4th.mjs`가 인증 쿠키 없이 보호 라우트에 진입하거나 현재 존재하지 않는 selector를 검사했다.
3. `npm test`가 stderr를 숨기고 `npx jest` fallback을 사용해 실패 원인과 네트워크 의존성이 불명확했다.
4. 포맷 기준은 존재하지만 전체 코드가 `.prettierrc.json` 기준으로 정리되어 있지 않았다.
5. 실제 업무 파일 형식에 가까운 익명화 fixture가 부족해 업로드/계산 회귀를 작게 재현하기 어려웠다.

## 구현 계획

- `build:clean`, `qa:runtime`, `qa:prod`, `test:ci` 스크립트를 추가한다.
- production QA는 `.next` 삭제, build, `next start`, smoke QA, full runtime QA, 서버 종료를 한 번에 수행한다.
- Playwright QA helper에서 `BASE`/`QA_BASE`와 인증 쿠키 주입을 공통화한다.
- 보조 검증 스크립트는 현재 앱의 인증 정책과 사이드바 active-class 구조에 맞춘다.
- 판매량, 제때 단가, 메뉴 판매가, 원가 기준표 CSV fixture와 회귀 테스트를 추가한다.
- Prettier를 적용해 `format:check`가 통과하도록 한다.

## 재현 및 검증 명령

```bash
npm test
npm run test:ci
npm run lint
npm run build
npm run build:clean
npm run qa:smoke
npm run qa:runtime
npm run qa:prod
npm run format:check
```

`qa:smoke`, `qa:runtime`, `verify-*.mjs`는 실행 중인 서버가 필요하다. 기본 대상은 `http://localhost:3000`이며, `BASE` 또는 `QA_BASE`로 변경할 수 있다.

## 우선순위

- P0: 클린 production QA 경로 고정 및 `.next` 오염 회피.
- P1: 보조 QA 스크립트 복구.
- P2: 포맷 정리와 익명화 fixture 기반 회귀 확대.

