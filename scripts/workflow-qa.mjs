/**
 * scripts/workflow-qa.mjs — 핵심 업무 흐름 E2E QA (P1)
 *
 * dev 서버가 떠 있는 상태에서 실행: npm run qa:workflow
 *
 * smoke/runtime QA(읽기 전용 라우트 순회)와 역할이 다르다. 실제 사용자의 긴 업무
 * 흐름을 브라우저에서 멀티스텝으로 구동하고 단계별로 검증한다.
 */
import { main } from './workflow/runner.mjs';

main();
