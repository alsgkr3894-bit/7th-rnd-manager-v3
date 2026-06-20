/**
 * scripts/mobile-qa.mjs — 모바일 뷰포트(390px) 스모크 QA
 *
 * dev 서버(localhost:3000)가 떠 있는 상태에서 실행:
 *   npm run qa:mobile
 *
 * smoke-qa.mjs와 동일한 라우트를 390px(iPhone 14 기준) viewport로 순회.
 * 가로 스크롤 발생 여부가 주요 검사 항목.
 * 공통 실행 로직은 qa-viewport-runner.mjs에 있음.
 */
import { runViewportQa } from './qa-viewport-runner.mjs';

const VIEWPORT = { width: 390, height: 844 }; // iPhone 14 기준 모바일 뷰포트

runViewportQa({
  viewport: VIEWPORT,
  title: '모바일 QA 결과',
  errorLabel: 'mobile-qa 실행 실패',
}).catch(e => {
  console.error('mobile-qa 실행 실패:', e);
  process.exit(2);
});
