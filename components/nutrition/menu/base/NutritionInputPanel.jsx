'use client';
import { useEffect, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { NutritionGrid } from '@/components/nutrition/NutritionGrid';
import { CRUST_TYPES, CRUST_DISPLAY_NAMES } from '@/lib/nutrition/values/store';
import { SERVING_CRUST_TYPE } from '@/lib/nutrition/crust-config';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';

/**
 * 선택한 메뉴의 영양성분 입력 패널(크러스트 탭 + NutritionGrid + 계산/저장 버튼).
 * 메뉴 미선택 시 안내 카드만 렌더한다.
 */
export function NutritionInputPanel({
  selMenu,
  selectedMenuName,
  selCrust,
  setSelCrust,
  safeRawMap,
  masterByCode,
  form,
  setField,
  saving,
  onSave,
  onDeleteMenu,
  readOnly = false,
}) {
  const isPizza = selMenu ? resolveNutritionGroup(selMenu, masterByCode) === '피자' : true;
  const crustOptions = useMemo(() => (isPizza ? CRUST_TYPES : [SERVING_CRUST_TYPE]), [isPizza]);

  useEffect(() => {
    if (selMenu && !crustOptions.includes(selCrust)) setSelCrust(crustOptions[0]);
  }, [crustOptions, selCrust, selMenu, setSelCrust]);

  if (!selMenu) {
    return (
      <div className="card" style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
        <div style={{ textAlign: 'center', color: 'var(--text-4)' }}>
          <Icon.beaker style={{ width: 28, height: 28 }} />
          <div style={{ marginTop: 8, fontSize: 13 }}>
            메뉴를 선택하면 영양성분을 입력할 수 있어요
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedMenuName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            영양성분 수치 입력 (업체 분석값)
          </div>
        </div>
        <button
          className="btn sm ghost"
          style={{ color: 'var(--danger)' }}
          onClick={() => onDeleteMenu(selMenu)}
          disabled={readOnly}
        >
          <Icon.trash style={{ width: 13, height: 13 }} />
          메뉴 삭제
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {crustOptions.map(ct => {
          const key = `${selMenu.menuCode}__${ct}`;
          const done =
            !!safeRawMap[key]?.kcal ||
            (ct === SERVING_CRUST_TYPE && !!safeRawMap[`${selMenu.menuCode}__석쇠L`]?.kcal);
          const cert =
            !!safeRawMap[key]?.certLinked ||
            (ct === SERVING_CRUST_TYPE && !!safeRawMap[`${selMenu.menuCode}__석쇠L`]?.certLinked);
          return (
            <button
              key={ct}
              onClick={() => setSelCrust(ct)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
                border: '1.5px solid',
                borderColor: selCrust === ct ? 'var(--accent)' : 'var(--border)',
                background: selCrust === ct ? 'var(--accent-soft)' : 'var(--surface)',
                color: selCrust === ct ? 'var(--accent-text)' : 'var(--text-2)',
                fontWeight: selCrust === ct ? 700 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {CRUST_DISPLAY_NAMES[ct] || ct}
              {done && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'inline-block',
                  }}
                />
              )}
              {cert && (
                <span
                  style={{
                    fontSize: 9,
                    padding: '0 3px',
                    borderRadius: 3,
                    lineHeight: 1.5,
                    background: 'var(--positive-soft)',
                    color: 'var(--positive)',
                    fontWeight: 700,
                  }}
                >
                  성적서
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        style={{
          fontSize: 11,
          color: 'var(--text-3)',
          marginBottom: 8,
          padding: '6px 10px',
          background: 'var(--surface-2)',
          borderRadius: 6,
          lineHeight: 1.5,
        }}
      >
        ※ 영양성분 수치는 <strong>100g 기준</strong>으로 입력하세요.
        {isPizza && (
          <>
            {' '}
            · <strong>중량</strong>은 이 크러스트의 <strong>한판 총중량(g)</strong>을 입력하면
            하프앤하프·세트·조각 계산에 사용됩니다.
          </>
        )}
      </div>

      <NutritionGrid values={form} onChange={setField} disabled={readOnly} />

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          cursor: 'pointer',
          marginTop: 12,
          color: 'var(--text-2)',
        }}
      >
        <input
          type="checkbox"
          checked={!!form.certLinked}
          onChange={e => setField('certLinked', e.target.checked)}
          disabled={readOnly}
        />
        시험성적서 기반 입력
      </label>

      <div
        style={{
          marginTop: 16,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <button className="btn primary" onClick={onSave} disabled={saving || readOnly}>
          {saving ? '저장 중…' : `${selectedMenuName} ${CRUST_DISPLAY_NAMES[selCrust] || selCrust} 저장`}
        </button>
      </div>
    </div>
  );
}
