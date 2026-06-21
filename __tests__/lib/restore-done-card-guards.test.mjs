import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('components/settings/restore/RestoreDoneCard.jsx'), 'utf8');

describe('restore done card guards', () => {
  test('복원 실패 store와 복구 경로를 완료 카드에 노출한다', () => {
    expect(source).toContain('복원 완료 (확인 필요)');
    expect(source).toContain('복원 실패 store');
    expect(source).toContain("item.store || 'unknown'");
    expect(source).toContain("item.error || item.message || '알 수 없는 오류'");
    expect(source).toContain('DB 완전 재생성');
    expect(source).toContain("window.location.href = '/settings/system'");
  });

  test('공유 store 보호 skip은 실패 store와 분리해 정보성으로 보여준다', () => {
    expect(source).toContain("const SHARED_SKIP_STORE = '__shared_skipped__'");
    expect(source).toContain('infoMessages');
    expect(source).toContain('보호 skip');
    expect(source).toContain('보호를 위해 건너뛴 항목');
    expect(source).toContain('공유 store 보호로 복원을 건너뛰었습니다.');
  });
});
