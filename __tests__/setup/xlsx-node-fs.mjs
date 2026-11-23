import * as fs from 'node:fs';
import * as XLSX from 'xlsx';

// SheetJS 0.20+ ESM builds do not auto-bind Node's filesystem APIs.
// Production exports use browser downloads; tests bind fs explicitly when
// verifying the bytes written to disk and reading fixture workbooks.
XLSX.set_fs(fs);
