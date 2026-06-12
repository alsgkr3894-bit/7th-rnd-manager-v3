'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { calcUnitPrice } from '@/lib/cost/calc-unit-price';
import { calcCostRate } from '@/lib/cost/rate-color';

function parseTempCost(value) {
  try {
    if (!value) return { rows: [], sellingPrice: '' };
    const p = typeof value === 'string' ? JSON.parse(value) : value;
    return { rows: p?.rows || [], sellingPrice: p?.sellingPrice || '' };
  } catch {
    return { rows: [], sellingPrice: '' };
  }
}

function nonNeg(value) {
  return Number(value) < 0 ? '' : value;
}

export function TempCostCalculator({ value, onChange }) {
  const parsedCostCalc = useMemo(() => parseTempCost(value), [value]);

  function updCost(rows, sellingPrice) {
    onChange(JSON.stringify({ rows, sellingPrice }));
  }

  const [ingredients, setIngredients] = useState([]);
  const [ingSearch, setIngSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const dropdownTimerRef = useRef(null);

  useEffect(() => {
    let ignore = false;
    initDB()
      .then(() => getAllIngredients())
      .then(list => {
        if (!ignore) setIngredients(list.filter(i => !i.excluded && !i.discontinued));
      })
      .catch(err => {
        if (!ignore) console.warn('[TempCostCalculator]', err);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    },
    []
  );

  function closeDropdownSoon() {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    dropdownTimerRef.current = setTimeout(() => {
      setShowDropdown(false);
      dropdownTimerRef.current = null;
    }, 150);
  }

  const filteredIngs = useMemo(() => {
    if (!ingSearch.trim()) return [];
    const q = ingSearch.toLowerCase().replace(/\s/g, '');
    return ingredients
      .filter(i => {
        const name = (i.ingredientName || i.productName || '').toLowerCase().replace(/\s/g, '');
        const code = (i.productCode || '').toLowerCase().replace(/\s/g, '');
        return name.includes(q) || code.includes(q);
      })
      .slice(0, 8);
  }, [ingSearch, ingredients]);

  function unitPriceFromIngredient(ing) {
    const baseQty = ing.baseQuantity;
    const price = ing.priceOverride ?? ing.priceWithTax ?? ing.price ?? null;
    const up = calcUnitPrice(price, baseQty);
    return up != null ? String(up) : price ? String(Math.round(price)) : '';
  }

  function linkedIngredient(row) {
    if (!row) return null;
    const productCode = row.productCode ? String(row.productCode) : '';
    return (
      ingredients.find(i => row.ingredientId && i.id === row.ingredientId) ||
      ingredients.find(i => productCode && i.productCode === productCode) ||
      null
    );
  }

  const hasLinkedCostRows = parsedCostCalc.rows.some(r => r.productCode || r.ingredientId);

  function addIngRow(ing) {
    const newRow = {
      id: Date.now(),
      ingredientId: ing.id ?? null,
      productCode: ing.productCode || '',
      name: ing.ingredientName || ing.productName || '',
      unit: ing.baseUnitType || 'g',
      quantity: '',
      unitPrice: unitPriceFromIngredient(ing),
    };
    updCost([...parsedCostCalc.rows, newRow], parsedCostCalc.sellingPrice);
    setIngSearch('');
    setShowDropdown(false);
  }

  function refreshLinkedCostRows() {
    const rows = parsedCostCalc.rows.map(row => {
      const ing = linkedIngredient(row);
      if (!ing) return row;
      return {
        ...row,
        ingredientId: ing.id ?? row.ingredientId ?? null,
        productCode: ing.productCode || row.productCode || '',
        name: ing.ingredientName || ing.productName || row.name || '',
        unit: ing.baseUnitType || row.unit || 'g',
        unitPrice: unitPriceFromIngredient(ing),
      };
    });
    updCost(rows, parsedCostCalc.sellingPrice);
    showToast('식자재 연동값을 갱신했습니다', 'ok');
  }

  function removeIngRow(rowId) {
    updCost(
      parsedCostCalc.rows.filter(r => r.id !== rowId),
      parsedCostCalc.sellingPrice
    );
  }

  function updateIngRow(rowId, field, fieldValue) {
    updCost(
      parsedCostCalc.rows.map(r => (r.id === rowId ? { ...r, [field]: fieldValue } : r)),
      parsedCostCalc.sellingPrice
    );
  }

  const totalCost = parsedCostCalc.rows.reduce((sum, r) => {
    return sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0);
  }, 0);
  const sellNum = Number(parsedCostCalc.sellingPrice) || 0;
  const costRate = calcCostRate(totalCost, sellNum);

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 4 }}>
        임시 원가 계산
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
        식자재를 검색해 대략적인 원가율을 계산합니다. 저장 시 함께 보관됩니다.
      </div>

      {/* 재료 검색 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', flex: 1 }} ref={searchRef}>
          <input
            className="form-input"
            value={ingSearch}
            onChange={e => {
              setIngSearch(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => ingSearch.trim() && setShowDropdown(true)}
            onBlur={closeDropdownSoon}
            placeholder="재료명·식자재 코드 검색 후 클릭해서 추가…"
          />
          {showDropdown && ingSearch.trim() && filteredIngs.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                zIndex: 20,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                boxShadow: 'var(--shadow-md)',
                padding: '12px 14px',
                fontSize: 12,
                color: 'var(--text-3)',
              }}
            >
              &quot;{ingSearch}&quot; 결과 없음 — 식자재 관리에서 먼저 등록하세요
            </div>
          )}
          {showDropdown && filteredIngs.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                zIndex: 20,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                boxShadow: 'var(--shadow-md)',
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {filteredIngs.map(ing => {
                const name = ing.ingredientName || ing.productName || '';
                const unitPrice = unitPriceFromIngredient(ing);
                const up = unitPrice ? Number(unitPrice) : null;
                return (
                  <button
                    key={ing.id}
                    onMouseDown={() => addIngRow(ing)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'var(--text-1)',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{name}</span>
                    {up != null && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-3)' }}>
                        {up.toLocaleString()}원/{ing.baseUnitType || 'g'}
                      </span>
                    )}
                    {ing.productCode && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-4)' }}>
                        {ing.productCode}
                      </span>
                    )}
                    {ing.category && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 10,
                          background: 'var(--surface-2)',
                          color: 'var(--text-3)',
                          padding: '1px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {ing.category}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {hasLinkedCostRows && (
          <button
            type="button"
            className="btn sm"
            onClick={refreshLinkedCostRows}
            style={{ height: 34, whiteSpace: 'nowrap' }}
          >
            연동값 갱신
          </button>
        )}
      </div>

      {/* 재료 테이블 */}
      {parsedCostCalc.rows.length > 0 ? (
        <div style={{ overflowX: 'auto', marginBottom: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['재료명', '사용량', '단가(원)', '소계(원)', ''].map(h => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '4px 8px',
                      color: 'var(--text-3)',
                      fontWeight: 600,
                      fontSize: 11,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedCostCalc.rows.map(r => {
                const subtotal = (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0);
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                    <td style={{ padding: '6px 8px', color: 'var(--text-1)', minWidth: 120 }}>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      {r.productCode && (
                        <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 1 }}>
                          {r.productCode}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          className="form-input"
                          style={{ width: 64, padding: '3px 6px', fontSize: 12 }}
                          type="number"
                          min="0"
                          value={r.quantity}
                          onChange={e => updateIngRow(r.id, 'quantity', nonNeg(e.target.value))}
                          placeholder="0"
                        />
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.unit}</span>
                      </div>
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        className="form-input"
                        style={{ width: 80, padding: '3px 6px', fontSize: 12 }}
                        type="number"
                        min="0"
                        value={r.unitPrice}
                        onChange={e => updateIngRow(r.id, 'unitPrice', nonNeg(e.target.value))}
                        placeholder="0"
                      />
                    </td>
                    <td
                      style={{
                        padding: '6px 8px',
                        color: 'var(--text-2)',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {subtotal > 0 ? Math.round(subtotal).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <button
                        onClick={() => removeIngRow(r.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-4)',
                          padding: 2,
                        }}
                      >
                        <Icon.close style={{ width: 13, height: 13 }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '20px 0',
            color: 'var(--text-4)',
            fontSize: 12,
          }}
        >
          재료를 검색해서 추가하세요
        </div>
      )}

      {/* 원가 합계 + 원가율 */}
      <div
        style={{
          background: 'var(--surface-2)',
          borderRadius: 10,
          padding: '12px 14px',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '8px 16px',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>식재료 원가 합계</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', textAlign: 'right' }}>
          {Math.round(totalCost).toLocaleString()}원
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
            판매가 입력
          </span>
          <input
            className="form-input"
            style={{ width: 100, padding: '3px 8px', fontSize: 12 }}
            type="number"
            min="0"
            value={parsedCostCalc.sellingPrice}
            onChange={e => updCost(parsedCostCalc.rows, nonNeg(e.target.value))}
            placeholder="판매가"
          />
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>원</span>
        </div>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            textAlign: 'right',
            color:
              costRate == null
                ? 'var(--text-3)'
                : Number(costRate) > 35
                  ? 'var(--negative)'
                  : 'var(--positive)',
          }}
        >
          {costRate != null ? `${costRate}%` : '—'}
        </span>
      </div>
    </div>
  );
}
