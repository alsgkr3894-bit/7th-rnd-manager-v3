'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import {
  buildIngredientDraftFromJettePrice,
  filterJettePriceRows,
} from '@/lib/ingredient/jette-price-import';
import { Field } from './IngredientFieldPrimitives';

function PriceMeta({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <span style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
      {label}: {value}
    </span>
  );
}

export function JettePriceImportField({
  priceRows = [],
  form,
  existingProductCodes = [],
  onApply,
}) {
  const blurTimerRef = useRef(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(null);
  const results = useMemo(
    () =>
      filterJettePriceRows(priceRows, query, {
        existingProductCodes,
        currentProductCode: form.productCode,
        limit: 10,
      }),
    [existingProductCodes, form.productCode, priceRows, query]
  );
  const hasQuery = query.trim().length > 0;
  const open = focused && hasQuery;

  useEffect(() => () => clearTimeout(blurTimerRef.current), []);

  function apply(row) {
    if (row.alreadyRegistered) return;
    clearTimeout(blurTimerRef.current);
    const draft = buildIngredientDraftFromJettePrice(row);
    onApply(draft);
    setSelected(row);
    setQuery(`${draft.ingredientName || row.productName} (${draft.productCode})`);
    setFocused(false);
  }

  return (
    <Field
      label="제때 단가에서 가져오기"
      hint="최신 제때 단가 파일의 제품코드와 품목 정보를 현재 식자재에 적용합니다"
    >
      {priceRows.length === 0 ? (
        <div
          style={{
            padding: '10px 12px',
            border: '1px dashed var(--border)',
            borderRadius: 8,
            color: 'var(--text-3)',
            fontSize: 13,
            background: 'var(--surface-2)',
          }}
        >
          제때 단가 파일이 아직 없습니다.
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div className="filter-search" style={{ gap: 6 }}>
            <Icon.search style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }} />
            <input
              value={query}
              type="search"
              aria-label="제때 단가 품목 검색"
              onChange={e => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              onFocus={() => {
                clearTimeout(blurTimerRef.current);
                setFocused(true);
              }}
              onBlur={() => {
                clearTimeout(blurTimerRef.current);
                blurTimerRef.current = window.setTimeout(() => {
                  setFocused(false);
                  blurTimerRef.current = null;
                }, 120);
              }}
              placeholder="제품명 또는 제품코드 검색"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelected(null);
                }}
                aria-label="검색어 지우기"
                style={{
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-4)',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                <Icon.close style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>

          {open && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                zIndex: 240,
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                boxShadow: 'var(--shadow-md)',
                maxHeight: 260,
                overflowY: 'auto',
              }}
            >
              {results.length === 0 ? (
                <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-3)' }}>
                  검색 결과가 없습니다.
                </div>
              ) : (
                results.map(row => {
                  const disabled = row.alreadyRegistered;
                  return (
                    <button
                      key={row.productCode}
                      type="button"
                      disabled={disabled}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => apply(row)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '9px 12px',
                        border: 0,
                        borderBottom: '1px solid var(--divider)',
                        background: 'transparent',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.55 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{row.displayName}</span>
                        <span className="mono muted" style={{ fontSize: 12 }}>
                          {row.productCode}
                        </span>
                      </div>
                      <div
                        style={{
                          marginTop: 2,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px 10px',
                          fontSize: 11,
                        }}
                      >
                        <PriceMeta label="원명" value={row.productName} />
                        <PriceMeta label="온도" value={row.temperature} />
                        <PriceMeta label="단위" value={row.salesUnit} />
                        <PriceMeta label="과세" value={row.taxType} />
                        <PriceMeta
                          label="단가"
                          value={
                            row.priceWithTax != null ? `${formatNumber(row.priceWithTax)}원` : null
                          }
                        />
                        {disabled && <span style={{ color: 'var(--negative)' }}>등록됨</span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {selected && (
            <div
              style={{
                marginTop: 8,
                padding: '8px 10px',
                borderRadius: 8,
                background: 'var(--positive-soft)',
                color: 'var(--positive)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {selected.displayName} · {selected.productCode} 적용됨
            </div>
          )}
        </div>
      )}
    </Field>
  );
}
