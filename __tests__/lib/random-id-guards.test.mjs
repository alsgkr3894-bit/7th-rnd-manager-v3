import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(path) {
  return readFileSync(resolve(path), 'utf8');
}

describe('random id/key guards', () => {
  test('데이터 id/key fallback은 Math.random에 의존하지 않는다', () => {
    const dataIdFiles = [
      'components/cost/margin/PlatformSettingsModal.jsx',
      'components/cost/margin/platform-settings/platformSettingsState.js',
      'app/note/calendar/_calendar-utils.js',
    ];

    for (const file of dataIdFiles) {
      expect(read(file)).not.toContain('Math.random');
    }
  });

  test('시각 효과용 랜덤은 저장 id/key가 아님을 문서화한다', () => {
    expect(read('components/ProgressBar.jsx')).toContain('저장 id/key에는 사용하지 않는다');
    expect(read('app/not-found.jsx')).toContain('저장 id/key에는 사용하지 않는다');
  });
});
