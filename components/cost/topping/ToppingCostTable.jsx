'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { IngredientSearch } from '@/components/cost/shared/IngredientSearch';
import { InlineEditCell } from '@/components/cost/manage/table-utils';
import { formatNumber } from '@/lib/format';
import { getCostRateStyles } from '@/lib/cost/rate-color';

function formatCost(value) {
  return value != null ? `${formatNumber(value)}원` : '—';
}

function CostRateBadge({ value }) {
  const styles = getCostRateStyles(value);
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        color: styles.text,
        background: styles.bg,
      }}
    >
      {value != null ? `${value.toFixed(1)}%` : '—'}
    </span>
  );
}

function ToppingCostRow({
  row,
  allIngredients,
  unitPriceMap,
  canEdit,
  onMenuSave,
  onRecipeSave,
  onDeleteRow,
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <tr>
      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-3)' }}>
        {row.menuCode}
      </td>
      <InlineEditCell
        value={row.menuName}
        required
        readOnly={!canEdit}
        onSave={value => onMenuSave(row, { menuName: value })}
        formatter={value => <span style={{ fontWeight: 600 }}>{value}</span>}
      />
      <td style={{ minWidth: 200 }}>
        {row.component?.ingredientName ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px',
              background: 'var(--accent-soft)',
              border: '1px solid var(--accent)',
              borderRadius: 7,
              fontSize: 13,
              width: 'fit-content',
            }}
          >
            <span style={{ color: 'var(--accent-text)', fontWeight: 600 }}>
              {row.component.ingredientName}
            </span>
            {canEdit && (
              <button
                type="button"
                aria-label="식자재 지우기"
                onClick={() => onRecipeSave(row, { productCode: null, ingredientName: '' })}
                style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
              >
                <Icon.close style={{ width: 11, height: 11 }} />
              </button>
            )}
          </div>
        ) : canEdit ? (
          <IngredientSearch
            allMeta={allIngredients}
            unitPriceMap={unitPriceMap}
            onSelect={meta => {
              const info = unitPriceMap.get(meta.productCode);
              onRecipeSave(row, {
                productCode: meta.productCode || null,
                ingredientName: meta.ingredientName || '',
                unit: info?.baseUnitType || meta.baseUnitType || 'g',
              });
            }}
            style={{ marginTop: 0 }}
          />
        ) : (
          <span style={{ color: 'var(--text-4)' }}>—</span>
        )}
        {row.multiComponent && (
          <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 2 }}>
            ⚠ 메뉴마스터에 구성품이 여러 개 등록돼 있습니다 — 첫 번째만 표시
          </div>
        )}
      </td>
      <InlineEditCell
        value={row.component?.quantity ?? ''}
        type="number"
        nonNegative
        align="right"
        readOnly={!canEdit || !row.component}
        onSave={value => onRecipeSave(row, { quantity: value === '' ? null : Number(value) })}
        formatter={value => (value !== '' && value != null ? formatNumber(value) : '—')}
      />
      <td style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
        {row.component?.unit || '—'}
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right' }}>
        {row.unitPrice != null ? `${formatNumber(row.unitPrice)}원` : '—'}
      </td>
      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCost(row.cost)}</td>
      <InlineEditCell
        value={row.price ?? ''}
        type="number"
        nonNegative
        align="right"
        readOnly={!canEdit}
        onSave={value => onMenuSave(row, { price: value === '' ? null : Number(value) })}
        formatter={value => (value !== '' && value != null ? `${formatNumber(value)}원` : '—')}
      />
      <td style={{ textAlign: 'center' }}>
        <CostRateBadge value={row.costRate} />
      </td>
      <td style={{ textAlign: 'center' }}>
        {deleting ? (
          <span style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
            <button
              className="btn sm"
              style={{ background: 'var(--negative)', color: '#fff', border: 'none', fontSize: 11 }}
              onClick={() => onDeleteRow(row)}
            >
              삭제
            </button>
            <button className="btn sm" style={{ fontSize: 11 }} onClick={() => setDeleting(false)}>
              취소
            </button>
          </span>
        ) : (
          <button
            className="btn sm"
            onClick={() => setDeleting(true)}
            disabled={!canEdit}
            style={{ color: 'var(--text-3)' }}
          >
            <Icon.trash style={{ width: 13, height: 13 }} />
          </button>
        )}
      </td>
    </tr>
  );
}

export function ToppingCostTable({
  rows,
  allIngredients,
  unitPriceMap,
  canEdit,
  onMenuSave,
  onRecipeSave,
  onDeleteRow,
}) {
  if (rows.length === 0) {
    return (
      <div className="card" style={{ minHeight: 160, display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
          <Icon.calc style={{ width: 32, height: 32, marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>등록된 추가토핑이 없습니다</div>
          <div style={{ fontSize: 13 }}>
            <b>토핑 추가</b> 또는 <b>토핑마스터에서 식자재 불러오기</b>로 시작하세요
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 110 }}>메뉴코드</th>
            <th>토핑명</th>
            <th>식자재</th>
            <th style={{ width: 90 }}>수량</th>
            <th style={{ width: 60 }}>단위</th>
            <th style={{ width: 90 }}>단가</th>
            <th style={{ width: 100 }}>원가</th>
            <th style={{ width: 110 }}>판매가</th>
            <th style={{ width: 80 }}>원가율</th>
            <th style={{ width: 50 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <ToppingCostRow
              key={row.id}
              row={row}
              allIngredients={allIngredients}
              unitPriceMap={unitPriceMap}
              canEdit={canEdit}
              onMenuSave={onMenuSave}
              onRecipeSave={onRecipeSave}
              onDeleteRow={onDeleteRow}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
