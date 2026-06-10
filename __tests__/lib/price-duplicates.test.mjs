import {
  buildPriceProductCodeDuplicateDiagnostics,
  buildPriceRowMap,
  dedupePriceRowsByProductCode,
} from '../../lib/price/duplicates.js';

describe('price productCode duplicate helpers', () => {
  test('diagnoses duplicate productCode rows and keeps the last row', () => {
    const rows = [
      { productCode: 'A-001', productName: 'old', priceWithTax: 1000 },
      { productCode: '', productName: 'blank 1', priceWithTax: 2000 },
      { productCode: 'a-001', productName: 'new', priceWithTax: 3000 },
      { productCode: '', productName: 'blank 2', priceWithTax: 4000 },
    ];

    const diagnostics = buildPriceProductCodeDuplicateDiagnostics(rows);
    const deduped = dedupePriceRowsByProductCode(rows);

    expect(diagnostics).toMatchObject({
      groupCount: 1,
      duplicateRows: 1,
      hasDuplicates: true,
    });
    expect(diagnostics.groups[0]).toMatchObject({
      productCode: 'a-001',
      keepIndex: 2,
      removeIndexes: [0],
    });
    expect(deduped.rows).toEqual([rows[1], rows[2], rows[3]]);
  });

  test('blank productCode rows are not treated as duplicates', () => {
    const rows = [
      { productCode: '', productName: 'blank 1' },
      { productCode: '', productName: 'blank 2' },
    ];

    expect(dedupePriceRowsByProductCode(rows).rows).toEqual(rows);
    expect(buildPriceProductCodeDuplicateDiagnostics(rows).hasDuplicates).toBe(false);
  });

  test('buildPriceRowMap uses the deduped effective rows', () => {
    const rows = [
      { productCode: 'A', productName: 'old', priceWithTax: 100 },
      { productCode: 'A', productName: 'new', priceWithTax: 200 },
    ];

    const result = buildPriceRowMap(rows);

    expect(result.rows).toEqual([rows[1]]);
    expect(result.map.get('A')).toBe(rows[1]);
    expect(result.diagnostics.duplicateRows).toBe(1);
  });
});
