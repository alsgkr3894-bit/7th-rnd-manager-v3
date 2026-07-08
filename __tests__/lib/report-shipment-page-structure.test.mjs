import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/report/shipment/page.jsx'), 'utf8');
const optionsSource = readFileSync(
  resolve('components/report/shipment/ShipmentReportOptions.jsx'),
  'utf8'
);
const previewSource = readFileSync(
  resolve('components/report/shipment/ShipmentReportPreview.jsx'),
  'utf8'
);

describe('shipment report page structure', () => {
  test('page wires preview options and Excel export through focused helpers', () => {
    expect(pageSource).toContain('<ShipmentReportOptions');
    expect(pageSource).toContain('<ShipmentReportPreview');
    expect(pageSource).toContain('buildShipmentCategorySummaryRows');
    expect(pageSource).toContain('exportShipmentReportXlsx');
    expect(pageSource).toContain('onExcelExport={handleExcelExport}');
    expect(pageSource).toContain('catSummaryRows={catSummaryRows}');

    expect(optionsSource).toContain('분류별 합계');
    expect(optionsSource).toContain('Excel (.xlsx)');
    expect(optionsSource).toContain("updFmt('excel', v)");

    expect(previewSource).toContain('safeOpts.catSummary');
    expect(previewSource).toContain('분류별 합계');
    expect(previewSource).toContain('safeCatSummaryRows');
  });
});
