import { beforeEach, describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  acknowledgeRestoreJournal,
  createRestoreJournal,
  endActiveRestore,
  readRestoreJournal,
  restoreAttentionOf,
  updateRestoreJournal,
} from '../../lib/backup/restore-journal.js';
import { describeRestoreAttention } from '../../lib/backup/restore-attention-text.js';

// 2026-11-26 점검 목록 9번: 중단·부분 실패한 복원을 다음 실행에서 알리고 복구 절차를 안내한다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const stored = {};
globalThis.localStorage = {
  getItem: key => stored[key] ?? null,
  setItem: (key, value) => {
    stored[key] = value;
  },
  removeItem: key => delete stored[key],
};
const attention = () => restoreAttentionOf(readRestoreJournal());
const start = (extra = {}) =>
  createRestoreJournal({ brandId: 'main', requestedStores: ['menu_master'], ...extra });
const finish = (journal, patch) => {
  updateRestoreJournal(journal, patch);
  endActiveRestore();
};

beforeEach(() => {
  endActiveRestore();
  for (const key of Object.keys(stored)) delete stored[key];
});

describe('복원 일지 확인 필요 판정', () => {
  test('이 탭에서 진행 중인 복원은 알리지 않고, 다시 열었을 때 남아 있으면 알린다', () => {
    start({ fileName: '백업.json', safetyBackupFileName: '직전.json' });
    expect(attention()).toBeNull();
    endActiveRestore(); // 새로고침·강제 종료 후 다시 연 상태
    expect(attention()).toMatchObject({
      status: 'running',
      fileName: '백업.json',
      safetyBackupFileName: '직전.json',
    });
  });

  test('부분 실패는 적용·실패 그룹과 함께 알린다', () => {
    finish(start(), {
      status: 'failed_partial',
      failedGroup: 'sharedStores',
      appliedGroups: [{ name: 'brandScopedStores', storeCount: 3 }],
    });
    const text = describeRestoreAttention(attention());
    expect(text.title).toBe('데이터 복원이 일부만 적용됐어요');
    expect(Object.fromEntries(text.details)).toMatchObject({
      '적용된 부분': '브랜드 데이터',
      '실패한 부분': '공용 데이터(노트·샘플 등)',
    });
    expect(text.steps.join(' ')).toContain('DB 완전 재생성');
  });

  test.each(['completed', 'completed_with_warnings', 'blocked_invalid_backup'])(
    '%s는 알리지 않는다',
    status => {
      finish(start(), { status });
      expect(attention()).toBeNull();
    }
  );

  test('확인 완료를 해야 사라진다', () => {
    finish(start(), { status: 'completed_with_errors' });
    expect(attention()).not.toBeNull();
    expect(acknowledgeRestoreJournal()).toBe(true);
    expect(attention()).toBeNull();
    expect(readRestoreJournal().acknowledgedAt).toBeTruthy();
  });

  test('확인하기 전에 다른 복원이 일지를 덮어써도 이전 경고는 남는다', () => {
    finish(start({ fileName: '실패.json' }), { status: 'failed_partial' });
    finish(start({ fileName: '일부만.json' }), { status: 'completed' });
    expect(attention()).toMatchObject({ status: 'failed_partial', fileName: '실패.json' });
    acknowledgeRestoreJournal();
    expect(attention()).toBeNull();
  });
});

describe('화면 연결', () => {
  test('복원은 끝나면 진행 표시를 해제하고 파일 이름을 일지에 남긴다', () => {
    const backup = read('lib/db/backup.js');
    expect(backup).toMatch(/finally \{\s*endActiveRestore\(\);/);
    expect(backup).toContain('fileName: options.fileName || data._fileName');
  });

  test('상단 배너는 인쇄물에 찍히지 않는다', () => {
    expect(read('components/settings/restore/RestoreJournalNotice.jsx')).toContain(
      'className="no-print"'
    );
  });

  test('업무 화면 배너와 복원 화면 카드가 있고 로그인 shell에는 없다', () => {
    const shell = read('components/AppShell.jsx');
    expect(shell.slice(shell.indexOf('function WorkShell'))).toContain('<RestoreJournalNotice />');
    expect(shell.slice(0, shell.indexOf('function WorkShell'))).not.toContain(
      '<RestoreJournalNotice'
    );
    expect(read('app/settings/restore/page.jsx')).toContain('<RestoreJournalNotice variant="card"');
  });
});
