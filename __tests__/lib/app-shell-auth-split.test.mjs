import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@jest/globals';

// 2026-11-26 점검 목록 1번: 로그인 화면에서는 업무용 shell(DB 조회·동기화 가드·이슈 배지)을 마운트하지 않는다.
const source = readFileSync(new URL('../../components/AppShell.jsx', import.meta.url), 'utf8');
const between = (from, to) => source.slice(source.indexOf(from), source.indexOf(to));

describe('로그인 화면과 업무 shell 분리', () => {
  const entry = between('export default function AppShell', 'function AuthShell');
  const auth = between('function AuthShell', 'function WorkShell');
  const work = source.slice(source.indexOf('function WorkShell'));

  test('경로가 /login이면 AuthShell만 그린다', () => {
    expect(entry).toContain("pathname === '/login'");
    expect(entry).toContain('<AuthShell>{children}</AuthShell>');
    expect(entry).toContain('<WorkShell>{children}</WorkShell>');
  });

  test('로그인 shell에는 데이터 접근 훅·컴포넌트가 없다', () => {
    for (const name of [
      'usePageStats',
      'useCurrentRole',
      'useAppBrands',
      'hydratePlatformsFromDB',
      'pruneOldWorkLogs',
      'SyncGuardNotice',
      'CommandPalette',
    ]) {
      expect(entry + auth).not.toContain(name);
    }
  });

  test('업무 shell에는 기존 기능이 남아 있다', () => {
    for (const name of ['usePageStats', 'hydratePlatformsFromDB', '<SyncGuardNotice />']) {
      expect(work).toContain(name);
    }
  });
});
