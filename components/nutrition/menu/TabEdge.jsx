'use client';
import { useState, useEffect } from 'react';
import { showToast } from '@/components/Toast';
import {
  upsertEdge,
  EDGE_CODES,
  EDGE_NAMES,
  NUTRITION_EDGE_GROUPS,
  CRUST_DISPLAY_NAMES,
  convertEdgeTotalToPer100g,
} from '@/lib/nutrition/values/store';
import { NutritionGrid } from '@/components/nutrition/NutritionGrid';
import { asRecord, noop } from '@/lib/ui/prop-guards';
import { useCurrentRole } from '@/hooks/useCurrentRole';

function hasNutritionValue(row) {
  return [
    'weight',
    'kcal',
    'carbs',
    'sugar',
    'fat',
    'satFat',
    'transFat',
    'cholesterol',
    'protein',
    'sodium',
  ].some(key => row?.[key] !== '' && row?.[key] != null);
}

function baseStatusOf({ entry, menus, rawMap }) {
  if (!entry?.crustType) return null;
  const safeMenus = Array.isArray(menus) ? menus : [];
  const menuCodes = safeMenus.map(menu => String(menu?.menuCode || '').trim()).filter(Boolean);
  const total = menuCodes.length;
  const done = menuCodes.filter(code =>
    hasNutritionValue(rawMap[`${code}__${entry.crustType}`])
  ).length;
  return { done, total };
}

export function TabEdge({ edges, edgeMap, rawMap, menus, onRefresh, onOpenBase }) {
  const safeEdgeMap = asRecord(edgeMap);
  const safeRawMap = asRecord(rawMap);
  const refresh = typeof onRefresh === 'function' ? onRefresh : noop;
  const openBase = typeof onOpenBase === 'function' ? onOpenBase : null;
  const [selCode, setSelCode] = useState(EDGE_CODES[0]);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const { isAdmin, ready: roleReady } = useCurrentRole();

  const existing = safeEdgeMap[selCode];

  useEffect(() => {
    setForm(existing ? { ...existing } : {});
  }, [selCode, existing]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleConvertTotalToPer100g = () => {
    const converted = convertEdgeTotalToPer100g(form);
    if (!converted) {
      showToast('중량(g)을 먼저 입력하세요.', 'warn');
      return;
    }
    setForm(converted);
    showToast('중량 기준 총량 → 100g 기준으로 환산했습니다. 값을 확인한 뒤 저장하세요.', 'ok');
  };

  const handleSave = async () => {
    if (!isAdmin) {
      showToast('엣지 영양성분 저장은 관리자만 가능합니다.', 'warn');
      return;
    }
    setSaving(true);
    try {
      await upsertEdge({
        ...form,
        ...(existing?.id ? { id: existing.id } : {}),
        edgeCode: selCode,
        edgeName: EDGE_NAMES[selCode],
        displayOrder: EDGE_CODES.indexOf(selCode) + 1,
      });
      showToast(existing ? '덮어쓰기 저장 완료' : '저장 완료', 'ok');
      refresh();
    } catch {
      showToast('저장 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div className="card" style={{ padding: '14px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
          총 엣지는 <strong>석쇠, 치즈크러스트, 골드스윗, 씬바샤삭</strong> 기준으로 관리합니다.
          <br />
          석쇠와 씬바샤삭은 베이스 영양성분 탭에서 메뉴별 직접 입력하고, 치즈크러스트와 골드스윗은
          아래에서 사이즈별 조정값을 직접 입력합니다.
          {openBase && (
            <>
              <br />
              <button className="btn sm" type="button" onClick={openBase} style={{ marginTop: 8 }}>
                베이스 영양성분 열기
              </button>
            </>
          )}
          {!roleReady && (
            <>
              <br />
              현재 계정 권한을 확인하는 중입니다.
            </>
          )}
          {roleReady && !isAdmin && (
            <>
              <br />
              현재 계정은 조회 전용입니다. 저장과 덮어쓰기는 관리자만 가능합니다.
            </>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {NUTRITION_EDGE_GROUPS.map(group => (
          <div
            key={group.key}
            style={{
              padding: '12px 14px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--surface)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{group.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
              {group.desc}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
              {group.entries.map(entry => {
                const code = entry.edgeCode || entry.crustType;
                const baseStatus = baseStatusOf({ entry, menus, rawMap: safeRawMap });
                const done = entry.edgeCode
                  ? hasNutritionValue(safeEdgeMap[entry.edgeCode])
                  : baseStatus?.done > 0;
                const label = entry.edgeCode
                  ? EDGE_NAMES[entry.edgeCode]
                  : CRUST_DISPLAY_NAMES[entry.crustType];
                return (
                  <span
                    key={code}
                    className={'chip' + (done ? ' active' : '')}
                    style={{ fontSize: 11, padding: '3px 7px' }}
                  >
                    {label}
                    {baseStatus && baseStatus.total > 0
                      ? ` ${baseStatus.done}/${baseStatus.total}`
                      : ''}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {EDGE_CODES.map(code => {
          const done = !!safeEdgeMap[code]?.kcal;
          return (
            <button
              key={code}
              onClick={() => setSelCode(code)}
              style={{
                padding: '7px 16px',
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
                border: '1.5px solid',
                borderColor: selCode === code ? 'var(--accent)' : 'var(--border)',
                background: selCode === code ? 'var(--accent-soft)' : 'var(--surface)',
                color: selCode === code ? 'var(--accent-text)' : 'var(--text-2)',
                fontWeight: selCode === code ? 700 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {EDGE_NAMES[code]}
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
            </button>
          );
        })}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{EDGE_NAMES[selCode]}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
          석쇠 베이스 대비 조정 영양성분 값. <strong>중량(g)</strong>은 이 크러스트가 한판(해당 사이즈)에
          실제로 추가하는 중량, 나머지 항목은 <strong>100g 기준</strong>으로 입력합니다.
          <br />
          중량 전체에 들어간 총 영양성분으로 입력했다면, 아래 버튼으로 100g 기준으로 환산한 뒤
          저장하세요.
        </div>
        <NutritionGrid values={form} onChange={setField} disabled={!isAdmin || saving} />
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <button
            className="btn sm"
            type="button"
            onClick={handleConvertTotalToPer100g}
            disabled={saving || !isAdmin}
            title="중량(g) 전체에 들어간 총 영양성분으로 입력한 값을 100g 기준으로 환산합니다"
          >
            중량 기준 총량 → 100g 기준 환산
          </button>
          <button className="btn primary" onClick={handleSave} disabled={saving || !isAdmin}>
            {saving ? '저장 중…' : `${EDGE_NAMES[selCode]} ${existing ? '덮어쓰기 저장' : '저장'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
