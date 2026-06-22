import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  filterAndSortShipmentRows,
  getShipmentCounts,
  getShipmentProductTypeMeta,
  getShipmentRowValues,
  shipmentRowKey,
} from '../../components/jette/shipment-table/shipmentTableUtils.js';

const tableSource = readFileSync(resolve('components/jette/ShipmentTable.jsx'), 'utf8');
const pageSource = readFileSync(resolve('app/jette/shipment/page.jsx'), 'utf8');
const historySource = readFileSync(resolve('components/jette/ShipmentHistory.jsx'), 'utf8');
const cardSource = readFileSync(
  resolve('components/jette/shipment-table/ShipmentTableCard.jsx'),
  'utf8'
);
const filtersSource = readFileSync(
  resolve('components/jette/shipment-table/ShipmentFilters.jsx'),
  'utf8'
);
const dataTableSource = readFileSync(
  resolve('components/jette/shipment-table/ShipmentDataTable.jsx'),
  'utf8'
);
const utilsSource = readFileSync(
  resolve('components/jette/shipment-table/shipmentTableUtils.js'),
  'utf8'
);

describe('shipment table structure', () => {
  test('ShipmentTable keeps state orchestration and delegates card, filters, table, and helpers', () => {
    expect(tableSource).toContain('<ShipmentTableCard');
    expect(tableSource).toContain('filterAndSortShipmentRows');
    expect(tableSource).toContain('getShipmentCounts');
    expect(tableSource).not.toContain('<Chip');
    expect(tableSource).not.toContain('<SearchBox');
    expect(tableSource).not.toContain('<SortableTh');
    expect(tableSource).not.toContain('<Pagination');
    expect(tableSource).not.toContain('function Row');
    expect(tableSource).not.toContain('ProductTypeChip');
    expect(tableSource.split('\n').length).toBeLessThanOrEqual(70);

    expect(cardSource).toContain('export function ShipmentTableCard');
    expect(cardSource).toContain('<ShipmentFilters');
    expect(cardSource).toContain('<ShipmentDataTable');
    expect(filtersSource).toContain('export function ShipmentFilters');
    expect(filtersSource).toContain('<SearchBox');
    expect(filtersSource).toContain('관리품목만');
    expect(dataTableSource).toContain('export function ShipmentDataTable');
    expect(dataTableSource).toContain('function ShipmentRow');
    expect(dataTableSource).toContain('<SortableTh');
    expect(dataTableSource).toContain('<Pagination');
    expect(utilsSource).toContain('export function getShipmentRowValues');
  });

  test('shipment upload and delete controls follow current role', () => {
    expect(pageSource).toContain("from '@/hooks/useCurrentRole'");
    expect(pageSource).toContain('const canEdit = roleReady && isAdmin');
    expect(pageSource).toContain('disabled={!ready || busy || !canEdit}');
    expect(pageSource).toContain('canEdit={canEdit}');
    expect(historySource).toContain('canEdit = false');
    expect(historySource).toContain('const canDelete = canEdit && handleDelete && fileId != null');
  });

  test('helpers keep counts, filters, row values, type meta, sorting, and row keys stable', () => {
    const rows = [
      {
        productCode: 'A',
        productName: '치즈',
        productType: 'exclusive',
        isManaged: true,
        totalAmount: 3000,
        totalQuantity: 3,
        priceWithTax: 1000,
      },
      {
        productCode: 'B',
        productName: '소스',
        productType: 'generic',
        isManaged: false,
        totalAmount: 1000,
        totalQuantity: 5,
        priceWithTax: null,
      },
      {
        productCode: 'C',
        productName: '박스',
        productType: 'generic-managed',
        isManaged: true,
        totalAmount: 2000,
        totalQuantity: 2,
        priceWithTax: '500',
      },
    ];

    expect(getShipmentCounts(rows)).toEqual({
      all: 3,
      exclusive: 1,
      generic: 1,
      'generic-managed': 1,
      managed: 2,
    });
    expect(
      filterAndSortShipmentRows({
        rows,
        search: '소',
        typeFilter: 'all',
        managedOnly: false,
        sortKey: 'totalAmount',
        sortDir: 'desc',
      }).map(row => row.productCode)
    ).toEqual(['B']);
    expect(
      filterAndSortShipmentRows({
        rows,
        search: '',
        typeFilter: 'all',
        managedOnly: true,
        sortKey: 'productType',
        sortDir: 'asc',
      }).map(row => row.productCode)
    ).toEqual(['A', 'C']);
    expect(getShipmentRowValues(rows[0])).toMatchObject({
      productCode: 'A',
      productName: '치즈',
      totalQuantity: 3,
      priceWithTax: 1000,
      totalAmount: 3000,
      isManaged: true,
    });
    expect(getShipmentRowValues(null)).toMatchObject({
      productCode: '-',
      productName: '-',
      priceWithTax: null,
      totalAmount: 0,
    });
    expect(getShipmentProductTypeMeta('exclusive').label).toBe('전용상품');
    expect(getShipmentProductTypeMeta('unknown').label).toBe('범용상품');
    expect(shipmentRowKey({ productCode: 'A' }, 2, 3)).toBe('A-2-3');
  });
});
