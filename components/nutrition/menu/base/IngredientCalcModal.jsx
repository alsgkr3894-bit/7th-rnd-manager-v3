'use client';
import { Icon } from '@/components/icons';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { IngredientSearch } from '@/components/cost/shared/IngredientSearch';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { NUTRITION_FIELDS } from '@/lib/nutrition/values/store';
import {
  formatCalcValue,
  getCrustPair,
  getCrustSize,
  formatCrustPairLabel,
} from '@/lib/nutrition/values/base-helpers';

const EMPTY_UNIT_PRICE_MAP = new Map();

/**
 * 식자재 영양값 + L/R 사용량 계산 모달. useIngredientNutritionCalc 훅의 상태/핸들러를 받는다.
 */
export function IngredientCalcModal({
  onClose,
  selCrust,
  saving,
  ingredientCalcLoading,
  ingredientCalcIngredients,
  ingredientNutritionMap,
  ingredientCalcRows,
  ingredientCalcPreview,
  addIngredientCalcRow,
  updateIngredientCalcAmount,
  removeIngredientCalcRow,
  buildIngredientCalcPreview,
  applyIngredientCalc,
}) {
  const ingredientCalcCrustPair = getCrustPair(selCrust);
  const ingredientCalcAddedCodes = ingredientCalcRows.map(row => asDisplayText(row.productCode));
  const ingredientCalcPairLabel = formatCrustPairLabel(ingredientCalcCrustPair);
  const ingredientCalcPairCount = ['L', 'R'].filter(size => ingredientCalcCrustPair[size]).length;

  return (
    <ModalFrame
      title="식자재 영양값 계산"
      onClose={onClose}
      width="min(860px, 96vw)"
      zIndex={310}
      padding="24px 28px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-3)',
            lineHeight: 1.5,
            padding: '10px 12px',
            background: 'var(--surface-2)',
            borderRadius: 8,
          }}
        >
          식자재 영양값 탭에 입력된 100g 기준값을 가져와 L/R 사용량으로 계산합니다. 적용하면 선택한
          메뉴의 100g 기준 영양값과 한판 총중량이 저장됩니다.
          <br />
          계산 미리보기만으로는 저장되지 않고, 아래 적용 버튼을 눌러야 저장됩니다.
        </div>

        {ingredientCalcLoading ? (
          <div className="card" style={{ padding: 20, textAlign: 'center' }}>
            식자재 영양값을 불러오는 중…
          </div>
        ) : ingredientCalcIngredients.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 12px' }}>
            <div className="empty-icon-wrap">
              <Icon.beaker style={{ width: 28, height: 28 }} />
            </div>
            <div className="empty-title">가져올 식자재 영양값이 없어요</div>
            <div className="empty-sub">
              식자재 영양값 탭에서 재료별 100g 기준값을 먼저 입력하세요.
            </div>
          </div>
        ) : (
          <>
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: 'var(--text-3)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                식자재 추가
              </label>
              <IngredientSearch
                allMeta={ingredientCalcIngredients}
                unitPriceMap={EMPTY_UNIT_PRICE_MAP}
                alreadyAdded={ingredientCalcAddedCodes}
                onSelect={addIngredientCalcRow}
                style={{ marginTop: 0 }}
              />
            </div>

            {ingredientCalcRows.length === 0 ? (
              <div className="empty-state" style={{ padding: '22px 12px' }}>
                <div className="empty-title">계산할 식자재를 추가하세요</div>
                <div className="empty-sub">
                  검색으로 식자재를 추가한 뒤 L/R 사용량(g)을 입력하세요.
                </div>
              </div>
            ) : (
              <div className="card table-card">
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ minWidth: 720 }}>
                    <thead>
                      <tr>
                        <th>식자재</th>
                        <th style={{ width: 120 }}>코드</th>
                        <th style={{ width: 110 }}>100g 열량</th>
                        <th style={{ width: 120 }}>L 사용량(g)</th>
                        <th style={{ width: 120 }}>R 사용량(g)</th>
                        <th style={{ width: 56 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredientCalcRows.map(row => {
                        const productCode = asDisplayText(row.productCode);
                        const nutr = ingredientNutritionMap.get(`code:${productCode}`);
                        return (
                          <tr key={productCode}>
                            <td style={{ fontWeight: 800 }}>
                              {asDisplayText(row.ingredientName, '식자재')}
                            </td>
                            <td className="mono muted">{productCode}</td>
                            <td style={{ textAlign: 'right' }}>
                              {formatCalcValue(nutr?.kcal, 'kcal')}
                            </td>
                            <td>
                              <input
                                className="input"
                                type="number"
                                min="0"
                                step="0.1"
                                value={row.lAmount}
                                onChange={e =>
                                  updateIngredientCalcAmount(productCode, 'lAmount', e.target.value)
                                }
                                placeholder="0"
                              />
                            </td>
                            <td>
                              <input
                                className="input"
                                type="number"
                                min="0"
                                step="0.1"
                                value={row.rAmount}
                                onChange={e =>
                                  updateIngredientCalcAmount(productCode, 'rAmount', e.target.value)
                                }
                                placeholder="0"
                              />
                            </td>
                            <td>
                              <button
                                className="btn sm ghost"
                                type="button"
                                onClick={() => removeIngredientCalcRow(productCode)}
                                style={{ color: 'var(--danger)' }}
                              >
                                <Icon.trash style={{ width: 13, height: 13 }} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {ingredientCalcPreview && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 10,
                }}
              >
                {['L', 'R'].map(size => {
                  const result = ingredientCalcPreview[size];
                  return (
                    <div key={size} className="card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 8 }}>
                        {size} 계산 결과
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 11,
                            color: 'var(--text-4)',
                            fontWeight: 700,
                          }}
                        >
                          {ingredientCalcCrustPair[size]}
                        </span>
                      </div>
                      {result ? (
                        <>
                          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            총중량 {formatCalcValue(result.totalGrams, 'g')} · 매칭 {result.matched}
                            /{result.total}
                          </div>
                          <div
                            style={{
                              marginTop: 10,
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: 6,
                            }}
                          >
                            {['kcal', 'carbs', 'protein', 'fat', 'sodium', 'sugar'].map(key => {
                              const field = NUTRITION_FIELDS.find(f => f.key === key);
                              return (
                                <div
                                  key={key}
                                  style={{
                                    padding: '7px 8px',
                                    borderRadius: 8,
                                    background: 'var(--surface-2)',
                                  }}
                                >
                                  <div style={{ fontSize: 10, color: 'var(--text-4)' }}>
                                    {field?.label || key}
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 800 }}>
                                    {formatCalcValue(result.values[key])}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
                          {size} 사용량이 없어 계산되지 않았습니다.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          marginTop: 20,
          flexWrap: 'wrap',
        }}
      >
        <button className="btn" onClick={onClose} disabled={saving}>
          취소
        </button>
        <button
          className="btn"
          type="button"
          onClick={buildIngredientCalcPreview}
          disabled={ingredientCalcLoading || saving || ingredientCalcRows.length === 0}
        >
          계산 미리보기
        </button>
        <button
          className="btn primary"
          type="button"
          onClick={() => applyIngredientCalc({ mode: 'current' })}
          disabled={ingredientCalcLoading || saving || ingredientCalcRows.length === 0}
        >
          {saving ? '적용 중…' : `${selCrust} 적용`}
        </button>
        <button
          className="btn primary"
          type="button"
          onClick={() => applyIngredientCalc({ mode: 'both' })}
          disabled={
            ingredientCalcLoading ||
            saving ||
            ingredientCalcRows.length === 0 ||
            ingredientCalcPairCount < 2
          }
        >
          {saving
            ? '적용 중…'
            : ingredientCalcPairCount < 2
              ? 'L/R 둘 다 적용 불가'
              : `${ingredientCalcPairLabel} 둘 다 적용`}
        </button>
      </div>
    </ModalFrame>
  );
}
