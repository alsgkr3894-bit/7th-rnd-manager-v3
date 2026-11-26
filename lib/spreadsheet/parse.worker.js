// 올린 Excel/CSV 파일을 별도 스레드에서 해석한다(lib/excel.js가 만든다).
import { parseSpreadsheetBuffer } from '../excel-core';

self.onmessage = async ({ data }) => {
  try {
    const result = await parseSpreadsheetBuffer(data.buffer, data.fileName);
    self.postMessage({ type: 'done', result });
  } catch (error) {
    self.postMessage({ type: 'error', message: error?.message || String(error) });
  }
};
