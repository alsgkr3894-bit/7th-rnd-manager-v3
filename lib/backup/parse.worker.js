// 백업 파일을 별도 스레드에서 읽어 조금씩 화면에 넘긴다(lib/backup/read-file.js가 만든다).
import { parseBackupBlob } from './file-format';
import { backupMessages } from './transfer';

self.onmessage = async ({ data }) => {
  try {
    const parsed = await parseBackupBlob(data.blob, undefined, value =>
      self.postMessage({ type: 'progress', value })
    );
    for (const message of backupMessages(parsed)) self.postMessage(message);
  } catch (error) {
    self.postMessage({ type: 'error', message: error?.message || String(error) });
  }
};
