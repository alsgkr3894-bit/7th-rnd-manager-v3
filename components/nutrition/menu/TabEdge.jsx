'use client';
import { useState, useEffect } from 'react';
import { showToast } from '@/components/Toast';
import { upsertEdge, EDGE_CODES, EDGE_NAMES } from '@/lib/nutrition/values/store';
import { NutritionGrid } from '@/components/nutrition/NutritionGrid';

export function TabEdge({ edges, edgeMap, onRefresh }) {
  const [selCode, setSelCode] = useState(EDGE_CODES[0]);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);

  const existing = edgeMap[selCode];

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
      onRefresh();
    } catch { showToast('저장 실패', 'error'); }
    setSaving(false);
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div className="card" style={{ padding: '14px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
          엣지 영양성분은 <strong>석쇠 베이스값에 추가되는 delta 값</strong>입니다.<br />
          치즈크러스트L = 석쇠L + 치즈크러스트L 추가값 / 골드스윗R = 석쇠R + 골드스윗R 추가값
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {EDGE_CODES.map(code => {
          const done = !!edgeMap[code]?.kcal;
          return (
            <button key={code} onClick={() => setSelCode(code)}
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '1.5px solid',
                borderColor: selCode === code ? 'var(--accent)' : 'var(--border)',
                background: selCode === code ? 'var(--accent-soft)' : 'var(--surface)',
                color: selCode === code ? 'var(--accent-text)' : 'var(--text-2)',
                fontWeight: selCode === code ? 700 : 400,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              {EDGE_NAMES[code]}
              {done && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
            </button>
          );
        })}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{EDGE_NAMES[selCode]}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>베이스 대비 추가 영양성분 값 (delta)</div>
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
