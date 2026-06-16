import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  emptySupplierForm,
  filterSuppliers,
  supplierFormFromInitial,
} from '../../components/cost/ingredient-price/suppliers/supplierViewUtils.js';

const viewSource = readFileSync(resolve('components/cost/ingredient-price/SuppliersView.jsx'), 'utf8');
const modalSource = readFileSync(
  resolve('components/cost/ingredient-price/suppliers/SupplierModal.jsx'),
  'utf8'
);
const toolbarSource = readFileSync(
  resolve('components/cost/ingredient-price/suppliers/SuppliersToolbar.jsx'),
  'utf8'
);
const listSource = readFileSync(
  resolve('components/cost/ingredient-price/suppliers/SuppliersListPanel.jsx'),
  'utf8'
);
const utilsSource = readFileSync(
  resolve('components/cost/ingredient-price/suppliers/supplierViewUtils.js'),
  'utf8'
);

describe('suppliers view structure', () => {
  test('SuppliersView delegates modal, toolbar, list, and filter helpers', () => {
    expect(viewSource).toContain('<SuppliersToolbar');
    expect(viewSource).toContain('<SuppliersListPanel');
    expect(viewSource).toContain('<SupplierModal');
    expect(viewSource).toContain('filterSuppliers');
    expect(viewSource).not.toContain('<ModalFrame');
    expect(viewSource).not.toContain('function SupplierModal');
    expect(viewSource).not.toContain('등록된 공급업체가 없습니다');
    expect(viewSource).not.toContain('업체명·담당자·연락처 검색');
    expect(viewSource.split('\n').length).toBeLessThanOrEqual(160);

    expect(modalSource).toContain('export function SupplierModal');
    expect(modalSource).toContain('<ModalFrame');
    expect(modalSource).toContain('업체명을 입력해주세요');
    expect(toolbarSource).toContain('export function SuppliersToolbar');
    expect(toolbarSource).toContain('공급업체 추가');
    expect(listSource).toContain('export function SuppliersListPanel');
    expect(listSource).toContain('function SuppliersTable');
    expect(listSource).toContain('등록된 공급업체가 없습니다');
    expect(utilsSource).toContain('export function filterSuppliers');
  });

  test('supplier helpers keep empty form, edit form, and search behavior stable', () => {
    expect(emptySupplierForm()).toEqual({ name: '', contact: '', phone: '', memo: '' });
    expect(
      supplierFormFromInitial({
        name: '대림수산',
        contact: '홍길동',
        phone: '010',
        memo: '메모',
      })
    ).toEqual({ name: '대림수산', contact: '홍길동', phone: '010', memo: '메모' });
    expect(supplierFormFromInitial({ name: '업체' })).toEqual({
      name: '업체',
      contact: '',
      phone: '',
      memo: '',
    });

    const suppliers = [
      { id: 1, name: '대림수산', contact: '홍길동', phone: '010-1111' },
      { id: 2, name: '청과물', contact: '김철수', phone: '02-2222' },
      { id: 3, name: '이마트', contact: '', phone: '' },
    ];

    expect(filterSuppliers(suppliers, '').map(row => row.id)).toEqual([1, 2, 3]);
    expect(filterSuppliers(suppliers, '수산').map(row => row.id)).toEqual([1]);
    expect(filterSuppliers(suppliers, '김철').map(row => row.id)).toEqual([2]);
    expect(filterSuppliers(suppliers, '02-').map(row => row.id)).toEqual([2]);
    expect(filterSuppliers(suppliers, '없음')).toEqual([]);
  });
});
