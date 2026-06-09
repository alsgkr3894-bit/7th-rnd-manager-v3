'use client';
import { useMemo, useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { SearchBox } from '@/components/ui/SearchBox';
import { SortableTh } from '@/components/ui/SortableTh';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { formatNumber } from '@/lib/format';
import { sortByKey } from '@/lib/jette/utils';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const PRODUCT_TYPE_ORDER = { exclusive: 0, generic: 1, 'generic-managed': 2 };
const SHIPMENT_KEY_TRANSFORM = {
  productType: v => PRODUCT_TYPE_ORDER[v] ?? 9,
  isManaged: v => (v ? 1 : 0),
};

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * ShipmentTable — 단일 파일 집계 테이블
 *
 * @param {Array} aggRows — aggregateShipmentRows 결과
 */
export function ShipmentTable({ aggRows }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | exclusive | generic
  const [managedOnly, setManagedOnly] = useState(false);
  const [sortKey, setSortKey] = useState('totalAmount');
  const [sortDir, setSortDir] = useState('desc');
  const safeAggRows = useMemo(() => asObjectArray(aggRows), [aggRows]);

  const filtered = useMemo(() => {
    let list = safeAggRows;
    if (typeFilter !== 'all') list = list.filter(r => r.productType === typeFilter);
    if (managedOnly) list = list.filter(r => r.isManaged);
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(
        r =>
          asDisplayText(r.productName).toLowerCase().includes(q) ||
          asDisplayText(r.productCode).toLowerCase().includes(q)
      );
    return sortByKey(list, sortKey, sortDir, SHIPMENT_KEY_TRANSFORM[sortKey] ?? null);
  }, [safeAggRows, search, typeFilter, managedOnly, sortKey, sortDir]);
  const { page, goTo, totalPages, paged, total } = usePagination(filtered, 80);

  const counts = useMemo(
    () => ({
      all: safeAggRows.length,
      exclusive: safeAggRows.filter(r => r.productType === 'exclusive').length,
      generic: safeAggRows.filter(r => r.productType === 'generic').length,
      'generic-managed': safeAggRows.filter(r => r.productType === 'generic-managed').length,
      managed: safeAggRows.filter(r => r.isManaged).length,
    }),
    [safeAggRows]
  );

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <div>
          <div className="card-title">출고량 집계</div>
          <div className="card-sub">
            {formatNumber(filtered.length)} / {formatNumber(safeAggRows.length)}개 표시
          </div>
        </div>
      </div>

      {/* 분류 필터 + 관리품목 토글 */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          marginBottom: 12,
          alignItems: 'center',
        }}
      >
        <Chip
          label="전체"
          count={counts.all}
          active={typeFilter === 'all'}
          onClick={() => setTypeFilter('all')}
        />
        <Chip
          label="전용상품"
          count={counts.exclusive}
          active={typeFilter === 'exclusive'}
          onClick={() => setTypeFilter('exclusive')}
        />
        <Chip
          label="범용상품"
          count={counts.generic}
          active={typeFilter === 'generic'}
          onClick={() => setTypeFilter('generic')}
        />
        <Chip
          label="범용관리"
          count={counts['generic-managed']}
          active={typeFilter === 'generic-managed'}
          onClick={() => setTypeFilter('generic-managed')}
        />
        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
        <Chip
          label="관리품목만"
          count={counts.managed}
          active={managedOnly}
          onClick={() => setManagedOnly(v => !v)}
        />
      </div>

      <SearchBox value={search} onChange={setSearch} />

      {filtered.length === 0 ? (
        <div
          style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}
        >
          조건에 맞는 항목이 없습니다
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <SortableTh
                  sortKey="productCode"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={100}
                >
                  제품코드
                </SortableTh>
                <SortableTh
                  sortKey="productName"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                >
                  제품명
                </SortableTh>
                <SortableTh
                  sortKey="unit"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={90}
                >
                  단위
                </SortableTh>
                <SortableTh
                  sortKey="temperature"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={90}
                >
                  온도
                </SortableTh>
                <SortableTh
                  sortKey="taxType"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={80}
                >
                  과세
                </SortableTh>
                <SortableTh
                  sortKey="totalQuantity"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={120}
                  right
                >
                  총 출고량
                </SortableTh>
                <SortableTh
                  sortKey="priceWithTax"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={120}
                  right
                >
                  부가세포함가
                </SortableTh>
                <SortableTh
                  sortKey="totalAmount"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={140}
                  right
                >
                  총 출고 금액
                </SortableTh>
                <SortableTh
                  sortKey="productType"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={100}
                >
                  분류
                </SortableTh>
                <SortableTh
                  sortKey="isManaged"
                  active={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  width={80}
                >
                  관리
                </SortableTh>
              </tr>
            </thead>
            <tbody>
              {paged.map((row, i) => (
                <Row
                  key={`${asDisplayText(row.productCode || row.productName, 'product')}-${page}-${i}`}
                  row={row}
                />
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPage={goTo}
            total={total}
            pageSize={80}
          />
        </div>
      )}
    </div>
  );
}

function Row({ row }) {
  const safeRow = row && typeof row === 'object' ? row : {};
  const productCode = asDisplayText(safeRow.productCode, '-');
  const productName = asDisplayText(safeRow.productName, '-');
  const unit = asDisplayText(safeRow.unit, '-');
  const temperature = asDisplayText(safeRow.temperature, '-');
  const taxType = asDisplayText(safeRow.taxType, '-');
  const totalQuantity = toFiniteNumber(safeRow.totalQuantity);
  const priceWithTax = Number.isFinite(Number(safeRow.priceWithTax))
    ? Number(safeRow.priceWithTax)
    : null;
  const totalAmount = toFiniteNumber(safeRow.totalAmount);
  const isManaged = Boolean(safeRow.isManaged);

  return (
    <tr>
      <td className="num" style={{ color: 'var(--text-3)', fontSize: 12 }}>
        {productCode}
      </td>
      <td className="cell-name">
        <div className="menu-name">{productName}</div>
      </td>
      <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{unit}</td>
      <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{temperature}</td>
      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{taxType}</td>
      <td className="num right" style={{ fontWeight: 700 }}>
        {formatNumber(totalQuantity)}
        <span className="unit">개</span>
      </td>
      <td className="num right">
        {priceWithTax != null ? (
          `${formatNumber(priceWithTax)}원`
        ) : (
          <span
            className="chip"
            style={{ background: 'var(--warn-soft)', color: 'var(--warn)', fontSize: 11 }}
          >
            단가 미연동
          </span>
        )}
      </td>
      <td className="num right" style={{ fontWeight: 700 }}>
        {formatNumber(totalAmount)}
        <span className="unit">원</span>
      </td>
      <td>
        <ProductTypeChip type={safeRow.productType} />
      </td>
      <td style={{ textAlign: 'center' }}>
        {isManaged ? (
          <span title="관리품목" style={{ color: 'var(--warn)', fontSize: 14 }}>
            ★
          </span>
        ) : (
          <span style={{ color: 'var(--text-4)', fontSize: 12 }}>—</span>
        )}
      </td>
    </tr>
  );
}

const PRODUCT_TYPE_META = {
  exclusive: { label: '전용상품', bg: 'var(--accent-soft)', color: 'var(--accent-text)' },
  generic: { label: '범용상품', bg: 'var(--scope-generic-soft)', color: 'var(--scope-generic)' },
  'generic-managed': {
    label: '범용관리',
    bg: 'var(--scope-generic)',
    color: 'var(--scope-generic-ink)',
  },
};

function ProductTypeChip({ type }) {
  const safeType = asDisplayText(type);
  const meta = PRODUCT_TYPE_META[safeType] || PRODUCT_TYPE_META.generic;
  return (
    <span className="chip" style={{ background: meta.bg, color: meta.color }}>
      {meta.label}
    </span>
  );
}
