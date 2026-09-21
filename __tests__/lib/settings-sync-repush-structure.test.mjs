import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

describe('설정 > 서버 데이터 페이지 — 서버로 전체 재전송', () => {
  test('재전송 카드는 운영 PC(authoritative) 브라우저에서만 보이고 가드 중엔 비활성이다', () => {
    const page = src('app/settings/sync/page.jsx');
    expect(page).toContain("import { ServerRepushCard } from './_ServerRepushCard'");
    expect(page).toMatch(/\{!forcedReadonly && !isReadonly && \(\s*<ServerRepushCard/);
    expect(page).toContain('disabled={running || loading || guardState.blocked}');
  });

  test('카드는 계획을 먼저 세우고 confirm 뒤에만 실행한다', () => {
    const card = src('app/settings/sync/_ServerRepushCard.jsx');
    expect(card).toContain('const plan = await planServerRepush()');
    expect(card).toContain('if (!window.confirm(describePlan(plan))) return;');
    expect(card).toContain('await runServerRepush(plan');
    expect(card).toContain('서버로 전체 재전송');
  });
});
