'use client';
import { useState, useEffect, useMemo } from 'react';
import { showToast } from '@/components/Toast';
import { SearchBox } from '@/components/ui/SearchBox';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/icons';
import { getAllIngredients } from '@/lib/ingredient/store';
import {
  getAllIngredientValues,
  upsertIngredientValue,
  deleteIngredientValueByCode,
  NUTRITION_FIELDS,
} from '@/lib/nutrition/values/store';
import { initDB } from '@/lib/db';

const VALUE_FIELDS = NUTRITION_FIELDS.filter(f => f.key !== 'weight');

function IngredientValueForm({ ingredient, existing, onSave, onCancel }) {
  const [form, setForm] = useState(() => existing ? { ...existing } : {});
  const [saving, setSaving] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertIngredientValue({
        ...(existing?.id ? { id: existing.id } : {}),
        productCode: ingredient.productCode,
        ingredientName: ingredient.ingredientName,
        ...form,
      });
      showToast('저장 완료', 'ok');
      onSave();
    } catch {
      showToast('저장 실패', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!existing) return;
    setSaving(true);
    try {
      await deleteIngredientValueByCode(ingredient.productCode);
      showToast('삭제 완료', 'ok');
      onSave();
    } catch {
      showToast('삭제 실패', 'error');
    }
    setSaving(false);
  };

  return (
    <div className="card" style={{ padding: 20, marginTop: 2, border: '1.5px solid var(--accent)', borderRadius: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{ingredient.ingredientName}</div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 16 }}>
        재료 100g 기준 영양성분 — 레시피의 사용량(g)과 곱해 메뉴 영양값을 자동 계산합니다
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 12px' }}>
        {VALUE_FIELDS.map(f => (
          <div key={f.key}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 2 }}>
              {f.label} <span style={{ color: 'var(--text-4)' }}>({f.unit})</span>
            </label>
            <input
              className="input" type="number" min="0" step="0.1"
              value={form[f.key] ?? ''}
              onChange={e => setField(f.key, e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {existing && (
          <button className="btn danger-ghost" onClick={handleDelete} disabled={saving} style={{ marginRight: 'auto' }}>
            삭제
          </button>
        )}
        <button className="btn ghost" onClick={onCancel} disabled={saving}>취소</button>
        <button className="btn primary" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  );
}

export function TabIngredientValues({ onRefresh }) {
  const [ingredients, setIngredients] = useState([]);
  const [valuesMap,   setValuesMap]   = useState({});
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [editCode,    setEditCode]    = useState(null);

  const load = async () => {
    await initDB();
    const [ings, vals] = await Promise.all([getAllIngredients(), getAllIngredientValues()]);
    const withCode = ings.filter(i => i.productCode && !i.discontinued && !i.excluded);
    const map = {};
    vals.forEach(v => { if (v.productCode) map[v.productCode] = v; });
    setIngredients(withCode);
    setValuesMap(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter(i =>
      i.ingredientName?.toLowerCase().includes(q) ||
      i.productCode?.toLowerCase().includes(q)
    );
  }, [ingredients, search]);

  const entered = Object.keys(valuesMap).length;

  const handleSave = () => {
    setEditCode(null);
    load();
    onRefresh?.();
  };

  if (loading) {
    return (
      <div style={{ marginTop: 20 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={44} radius={8} style={{ marginBottom: 4 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div className="card" style={{ padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)', flex: 1 }}>
          재료 100g당 영양값을 입력하면 레시피 구성 기반으로 메뉴 영양성분이 <strong>자동 계산</strong>됩니다.
        </div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          <span style={{ color: 'var(--positive)' }}>{entered}</span>
          <span style={{ color: 'var(--text-3)' }}> / {ingredients.length}개 입력완료</span>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <SearchBox value={search} onChange={setSearch} placeholder="재료명·코드 검색" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Icon.beaker} title="재료 없음" sub="식자재 관리에서 제때 코드가 있는 재료를 추가하세요." />
      ) : (
        <div className="card table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 160 }}>재료명</th>
                  <th style={{ width: 100 }}>코드</th>
                  <th style={{ width: 80 }}>분류</th>
                  <th style={{ width: 70 }}>열량</th>
                  <th style={{ width: 70 }}>탄수화물</th>
                  <th style={{ width: 70 }}>단백질</th>
                  <th style={{ width: 70 }}>지방</th>
                  <th style={{ width: 60 }}>상태</th>
                  <th style={{ width: 56 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ing => {
                  const v = valuesMap[ing.productCode];
                  const isEditing = editCode === ing.productCode;
                  return (
                    <>
                      <tr
                        key={ing.productCode}
                        style={{ cursor: 'pointer', background: isEditing ? 'var(--accent-soft)' : undefined }}
                        onClick={() => setEditCode(isEditing ? null : ing.productCode)}
                      >
                        <td style={{ fontWeight: 600 }}>{ing.ingredientName}</td>
                        <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{ing.productCode}</td>
                        <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{ing.category || '—'}</td>
                        <td style={{ textAlign: 'right' }}>{v?.kcal ?? <span style={{ color: 'var(--text-4)' }}>—</span>}</td>
                        <td style={{ textAlign: 'right' }}>{v?.carbs ?? <span style={{ color: 'var(--text-4)' }}>—</span>}</td>
                        <td style={{ textAlign: 'right' }}>{v?.protein ?? <span style={{ color: 'var(--text-4)' }}>—</span>}</td>
                        <td style={{ textAlign: 'right' }}>{v?.fat ?? <span style={{ color: 'var(--text-4)' }}>—</span>}</td>
                        <td>
                          {v
                            ? <span style={{ fontSize: 11, color: 'var(--positive)', fontWeight: 600 }}>입력</span>
                            : <span style={{ fontSize: 11, color: 'var(--text-4)' }}>미입력</span>}
                        </td>
                        <td>
                          <button
                            className="icon-btn"
                            onClick={e => { e.stopPropagation(); setEditCode(isEditing ? null : ing.productCode); }}
                            title={isEditing ? '접기' : '편집'}
                          >
                            {isEditing ? <Icon.chevDown /> : <Icon.edit />}
                          </button>
                        </td>
                      </tr>
                      {isEditing && (
                        <tr key={`${ing.productCode}__form`}>
                          <td colSpan={9} style={{ padding: '0 8px 8px' }}>
                            <IngredientValueForm
                              ingredient={ing}
                              existing={valuesMap[ing.productCode]}
                              onSave={handleSave}
                              onCancel={() => setEditCode(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
