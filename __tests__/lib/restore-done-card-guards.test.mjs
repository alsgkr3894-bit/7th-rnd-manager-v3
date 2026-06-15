import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve('components/settings/restore/RestoreDoneCard.jsx'),
  'utf8'
);

describe('restore done card guards', () => {
  test('복원 실패 store와 복구 경로를 완료 카드에 노출한다', () => {
    expect(source).toContain('복원 완료 (확인 필요)');
    expect(source).toContain('복원 실패 store');
    expect(source).toContain("item.store || 'unknown'");
    expect(source).toContain("item.error || item.message || '알 수 없는 오류'");
    expect(source).toContain('DB 완전 재생성');
    expect(source).toContain("window.location.href = '/settings/system'");
  });
});
