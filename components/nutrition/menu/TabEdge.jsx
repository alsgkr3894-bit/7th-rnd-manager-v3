'use client';
import { useState, useEffect } from 'react';
import { showToast } from '@/components/Toast';
import {
  upsertEdge,
  EDGE_CODES,
  EDGE_NAMES,
  NUTRITION_EDGE_GROUPS,
  CRUST_DISPLAY_NAMES,
} from '@/lib/nutrition/values/store';
import { NutritionGrid } from '@/components/nutrition/NutritionGrid';
import { asRecord, noop } from '@/lib/ui/prop-guards';

export function TabEdge({ edges, edgeMap, onRefresh }) {
  const safeEdgeMap = asRecord(edgeMap);
  const refresh = typeof onRefresh === 'function' ? onRefresh : noop;
  const [selCode, setSelCode] = useState(EDGE_CODES[0]);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const existing = safeEdgeMap[selCode];

  useEffect(() => {
    setForm(existing ? { ...existing } : {});
  }, [selCode, existing]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertEdge({
        ...(existing?.id ? { id: existing.id } : {}),
        edgeCode: selCode,
        edgeName: EDGE_NAMES[selCode],
        displayOrder: EDGE_CODES.indexOf(selCode) + 1,
        ...form,
      });
      showToast('저장 완료', 'ok');
      refresh();
    } catch {
      showToast('저장 실패', 'error');
    }
    setSaving(false);
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div className="card" style={{ padding: '14px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
          총 엣지는 <strong>석쇠, 치즈크러스트, 골드스윗, 씬바샤삭</strong> 기준으로
          관리합니다.
          <br />
          석쇠와 씬바샤삭은 베이스 영양성분 탭에서 메뉴별 직접 입력하고,
          치즈크러스트와 골드스윗은 아래에서 사이즈별 조정값을 직접 입력합니다.
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
                const done = entry.edgeCode
                  ? !!safeEdgeMap[entry.edgeCode]?.kcal
                  : false;
                return (
                  <span
                    key={code}
                    className={'chip' + (done ? ' active' : '')}
                    style={{ fontSize: 11, padding: '3px 7px' }}
                  >
                    {entry.edgeCode ? EDGE_NAMES[entry.edgeCode] : CRUST_DISPLAY_NAMES[entry.crustType]}
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
          석쇠 베이스 대비 조정 영양성분 값. 자동계산 없이 직접 입력/검수합니다.
        </div>
        <NutritionGrid values={form} onChange={setField} />
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중…' : `${EDGE_NAMES[selCode]} 저장`}
          </button>
        </div>
      </div>
    </div>
  );
}
