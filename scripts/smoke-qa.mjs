/**
 * scripts/smoke-qa.mjs — 대표 라우트 스모크 QA (702px viewport)
 *
 * dev 서버(localhost:3000)가 떠 있는 상태에서 실행:
 *   npm run qa:smoke
 *
 * 공통 실행 로직은 qa-viewport-runner.mjs에 있음.
 * IndexedDB가 비어 있어도(빈 데이터) 통과해야 정상 — 빈 상태 UI 검증 목적.
 */
import { runViewportQa } from './qa-viewport-runner.mjs';

const VIEWPORT = { width: 702, height: 900 };

runViewportQa({
  viewport: VIEWPORT,
  title: '스모크 QA 결과',
  errorLabel: 'smoke-qa 실행 실패',
}).catch(e => {
  console.error('smoke-qa 실행 실패:', e);
  process.exit(2);
});
