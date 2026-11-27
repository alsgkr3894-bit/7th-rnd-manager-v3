import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { syncBackupCopy } from '../../prisma/backup-copy.mjs';
import { backupFiles, copyBackups } from '../../prisma/local-db-backup.mjs';
import { listLocalDbBackups } from '../../lib/server/local-db-backups.js';

let root;
let source;
let target;
let warn;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'rnd-backup-copy-'));
  source = join(root, 'source');
  target = join(root, 'target');
  mkdirSync(source);
  mkdirSync(target);
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
  rmSync(root, { recursive: true, force: true });
});

function dump(day, text = `dump ${day}`, dir = source) {
  const path = join(dir, `db-202611${day}-090000.dump`);
  writeFileSync(path, text);
  writeFileSync(`${path}.json`, '{"database":"db"}');
  // 백업 목록은 수정 시각 순이다 — 날짜가 클수록 새 파일이 되게 맞춘다
  const time = new Date(`2026-11-${day}T09:00:00Z`);
  utimesSync(path, time, time);
  return path;
}
const sync = (options = {}) =>
  syncBackupCopy({
    files: backupFiles(source),
    sourceDir: source,
    targetDir: target,
    keep: 14,
    ...options,
  });
const dumps = dir =>
  readdirSync(dir)
    .filter(name => name.endsWith('.dump'))
    .sort();

describe('다른 드라이브 사본', () => {
  test('내용이 같은 사본과 설명 파일을 만든다', () => {
    const path = dump('01');
    writeFileSync(`${path}.verify.json`, '{"ok":true}');

    const status = sync();

    expect(status).toMatchObject({ ok: true, copied: 1, reason: 'ok' });
    expect(readFileSync(join(target, 'db-20261101-090000.dump'), 'utf8')).toBe('dump 01');
    expect(existsSync(join(target, 'db-20261101-090000.dump.verify.json'))).toBe(true);
    expect(sync().copied).toBe(0);
  });

  test('한 번에 옮기는 수를 제한하면 최신부터 옮기고 다음에 이어 간다', () => {
    ['01', '02', '03'].forEach(day => dump(day));

    expect(sync({ limit: 1 })).toMatchObject({ ok: true, copied: 1 });
    expect(dumps(target)).toEqual(['db-20261103-090000.dump']);
    expect(sync().copied).toBe(2);
    expect(dumps(target)).toHaveLength(3);
  });

  test('크기가 다른 사본과 중단된 파일은 다시 만든다', () => {
    dump('01');
    dump('01', 'x', target);
    writeFileSync(join(target, 'db-20261101-090000.dump.partial'), 'half');

    expect(sync().copied).toBe(1);
    expect(readFileSync(join(target, 'db-20261101-090000.dump'), 'utf8')).toBe('dump 01');
    expect(readdirSync(target).some(name => name.endsWith('.partial'))).toBe(false);
  });

  test('보관 수를 넘는 우리 백업만 지우고 다른 파일은 남긴다', () => {
    dump('01', 'old', target);
    dump('02', 'old', target);
    writeFileSync(join(target, '사진.dump'), 'mine');
    writeFileSync(join(target, 'notes.txt'), 'mine');
    dump('03');

    sync({ keep: 2 });

    expect(dumps(target)).toEqual([
      'db-20261102-090000.dump',
      'db-20261103-090000.dump',
      '사진.dump',
    ]);
    expect(existsSync(join(target, 'notes.txt'))).toBe(true);
  });

  test('폴더가 없으면 만들지 않고 연결 안 됨으로 기록하며 마지막 성공 시각을 남긴다', () => {
    dump('01');
    const first = sync();
    const missing = join(root, 'usb');

    const status = sync({ targetDir: missing });

    expect(status).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(status.lastSuccessAt).toBe(first.checkedAt);
    expect(existsSync(missing)).toBe(false);
    const shown = listLocalDbBackups({ backupDir: source }).copy;
    expect(shown).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(JSON.stringify(shown)).not.toContain('usb');
  });

  test('원본과 같은 폴더는 거부한다', () => {
    dump('01');
    expect(sync({ targetDir: source })).toMatchObject({ ok: false, reason: 'same-folder' });
  });

  test('설정이 없거나 기본 백업 폴더가 아닌 실행은 아무것도 하지 않는다', () => {
    process.env.DB_BACKUP_COPY_DIR = target;
    try {
      dump('01');
      expect(copyBackups(source)).toEqual({ configured: false });
      expect(dumps(target)).toEqual([]);
    } finally {
      delete process.env.DB_BACKUP_COPY_DIR;
    }
    expect(syncBackupCopy({ files: [], sourceDir: source, keep: 1 })).toEqual({
      configured: false,
    });
  });
});
