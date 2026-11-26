import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import {
  BACKUP_LIMITS,
  createBackupBlob,
  isGzipBlob,
  parseBackupBlob,
} from '../../lib/backup/file-format.js';
import { backupFileStamp } from '../../lib/backup/file-check.js';
import { validateBackupPayload } from '../../lib/backup/validation.js';
import { UPLOAD_EXT, checkFileExt } from '../../lib/upload-policy.js';

// 2026-11-26: 백업이 399MB로 복원 한도(500MB)·브라우저 문자열 한계에 가까워, 줄 단위 압축 형식으로 바꿨다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const sample = () => ({
  version: 'v3',
  exportedAt: '2026-11-26T01:00:00.000Z',
  scopes: 'all',
  localStorage: { 'v3:theme': 'dark' },
  stores: {
    menu_dev_notes: [
      // 줄바꿈·구분 문자·큰 사진이 들어 있어도 한 레코드는 한 줄이다
      { id: 1, testContent: '첫 줄\n둘째 줄\u2028셋째', photos: ['x'.repeat(3_000_000)] },
      { id: 2, title: '치즈 🍕' },
    ],
    cost_ingredients: [],
    menu_master: [{ id: 3, menuCode: 'P-1' }],
  },
});
const lines = async blob =>
  gunzipSync(Buffer.from(await blob.arrayBuffer()))
    .toString('utf8')
    .split('\n')
    .filter(Boolean);
const gzipLines = list => new Blob([gzipSync(`${list.join('\n')}\n`)]);

describe('압축 백업 형식', () => {
  test('내보낸 객체를 그대로 되읽는다(빈 저장소 포함)', async () => {
    const data = sample();
    const blob = await createBackupBlob(data);
    expect(await isGzipBlob(blob)).toBe(true);
    expect(blob.size).toBeLessThan(JSON.stringify(data).length / 10);
    const parsed = await parseBackupBlob(blob);
    expect(parsed).toEqual(data);
    expect(validateBackupPayload(parsed).summary.totalRows).toBe(3);
    expect(backupFileStamp(parsed)).toEqual(backupFileStamp(data));
  });

  test('레코드 하나가 한 줄이고 끝 표시가 있다', async () => {
    const written = await lines(await createBackupBlob(sample()));
    expect(written).toHaveLength(1 + 3 + 3 + 1);
    expect(JSON.parse(written[0])).toMatchObject({ rndBackup: 2, version: 'v3' });
    expect(JSON.parse(written.at(-1))).toEqual({ end: true, stores: 3, rows: 3 });
  });

  test('저장이 끝나지 않았거나 잘린 파일은 거부한다', async () => {
    const blob = await createBackupBlob(sample());
    await expect(parseBackupBlob(blob.slice(0, Math.floor(blob.size / 2)))).rejects.toThrow(
      '손상되었거나'
    );
    const written = await lines(blob);
    await expect(parseBackupBlob(gzipLines(written.slice(0, -1)))).rejects.toThrow('손상되었거나');
    // 레코드 한 줄이 빠진 파일
    await expect(
      parseBackupBlob(gzipLines([...written.slice(0, 2), ...written.slice(3)]))
    ).rejects.toThrow('손상되었거나');
    await expect(parseBackupBlob(gzipLines([...written, '{}']))).rejects.toThrow('손상되었거나');
  });

  test('더 새로운 형식, 다른 압축 파일, 위험한 저장소 이름은 거부한다', async () => {
    await expect(parseBackupBlob(gzipLines(['{"rndBackup":3}']))).rejects.toThrow('더 새로운');
    await expect(parseBackupBlob(gzipLines(['{"hello":1}']))).rejects.toThrow('형식이 아닙니다');
    await expect(
      parseBackupBlob(gzipLines(['{"rndBackup":2}', '{"store":"__proto__","rows":0}']))
    ).rejects.toThrow('손상되었거나');
  });

  test('압축을 푼 크기와 한 줄 길이에 상한이 있다', async () => {
    const blob = await createBackupBlob(sample());
    await expect(parseBackupBlob(blob, { ...BACKUP_LIMITS, totalChars: 1000 })).rejects.toThrow(
      '너무 큽니다'
    );
    await expect(parseBackupBlob(blob, { ...BACKUP_LIMITS, lineChars: 1000 })).rejects.toThrow(
      '손상되었거나'
    );
  });

  test('예전 JSON 백업(BOM 포함)도 읽고, 깨진 JSON은 안내한다', async () => {
    const legacy = { version: 'v3', stores: { menu_master: [{ id: 1 }] } };
    expect(await parseBackupBlob(new Blob([`\ufeff${JSON.stringify(legacy)}`]))).toEqual(legacy);
    await expect(parseBackupBlob(new Blob(['{"stores":']))).rejects.toThrow('잘못된 JSON');
  });
});

describe('화면 연결', () => {
  test('.gz와 .json을 모두 고를 수 있다', () => {
    expect(checkFileExt({ name: '백업_20261126.gz' }, UPLOAD_EXT.backup)).toBeNull();
    expect(checkFileExt({ name: 'old.json' }, UPLOAD_EXT.backup)).toBeNull();
    expect(checkFileExt({ name: 'a.zip' }, UPLOAD_EXT.backup)).not.toBeNull();
  });

  test.each([
    'app/settings/backup/useBackupActions.js',
    'app/settings/restore/page.jsx',
    'app/settings/brands/useBrandActions.jsx',
  ])('%s는 압축 형식으로 내려받는다', file => {
    const source = read(file);
    expect(source).toContain('await downloadBackup(');
    expect(source).not.toContain('downloadJson(');
  });

  test('명령줄 가져오기도 같은 읽기를 쓴다', () => {
    expect(read('prisma/import-backup.mjs')).toContain('parseBackupBlob(await openAsBlob(');
  });
});
