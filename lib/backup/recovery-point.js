/**
 * lib/backup/recovery-point.js — 대량 삭제 직전에 지워질 저장소만 담은 복구 파일을 내려받는다.
 *
 * 설정 > 복원에서 그 파일을 고르면 담긴 저장소만 되돌아간다. 만들지 못하면 예외를 던지므로
 * 호출부는 삭제를 진행하지 않는다.
 */
import { exportSelected } from '@/lib/db';
import { downloadBackup, makeFileName } from '@/lib/download';

export async function downloadRecoveryPoint(storeNames, label) {
  const data = await exportSelected(
    storeNames,
    { scopes: 'recovery' },
    // 지울 저장소를 되돌리려는 파일이므로 지정한 것은 민감 store라도 담는다
    { includeLocalStorage: false, includeSensitive: true }
  );
  if (data.failedStores?.length) {
    const names = data.failedStores.map(item => item.store).join(', ');
    throw new Error(`복구 파일을 만들 수 없어 삭제하지 않았습니다 (읽기 실패: ${names})`);
  }
  // 비어 있는 저장소는 넣지 않는다 — 복원할 때 그 사이에 생긴 데이터를 지우게 된다
  const stores = Object.fromEntries(
    Object.entries(data.stores).filter(([, rows]) => rows.length > 0)
  );
  const rows = Object.values(stores).reduce((sum, list) => sum + list.length, 0);
  if (rows === 0) return null;
  const fileName = makeFileName(`삭제전복구_${label}`, 'gz');
  await downloadBackup({ ...data, stores }, fileName);
  return { fileName, rows };
}

/** 완료 안내에 붙이는 문장 */
export function recoveryNote(recovery) {
  return recovery ? ` · 복구 파일 ${recovery.fileName}` : '';
}
