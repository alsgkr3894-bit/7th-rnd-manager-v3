'use client';
import { useState, useCallback } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import { parseLabExcel, buildImportRows, toRawValueRecord } from '@/lib/nutrition/values/import';
import { upsertMenuRef, upsertRawValue } from '@/lib/nutrition/values/store';
import { asObjectArray, asRecord, noop } from '@/lib/ui/prop-guards';
import { parseErrorMsg } from '@/lib/upload-policy';
import { ImportBasePreviewTable } from './import-base/ImportBasePreviewTable';
import { ImportBaseSummaryBar } from './import-base/ImportBaseSummaryBar';
import { ImportBaseUploadStep } from './import-base/ImportBaseUploadStep';
import { categoryForImportRow } from './import-base/importBaseRows';

export function ImportBaseModal({ menuMasters, menus, rawMap, onClose, onRefresh }) {
  const safeMenuMasters = asObjectArray(menuMasters);
  const safeMenus = asObjectArray(menus);
  const safeRawMap = asRecord(rawMap);
  const close = typeof onClose === 'function' ? onClose : noop;
  const refresh = typeof onRefresh === 'function' ? onRefresh : noop;
  const [step, setStep] = useState('upload');
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleFile = async (file, err) => {
    if (err) {
      showToast(err, 'error');
      return;
    }
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const rawRows = await parseLabExcel(buf);
      const existingKeys = Object.fromEntries(Object.keys(safeRawMap).map(k => [k, true]));
      setRows(buildImportRows({ rawRows, menuMasters: safeMenuMasters, existingKeys }));
      setStep('preview');
    } catch (e) {
      showToast(parseErrorMsg(e), 'error');
    }
  };

  const toggleInclude = useCallback(idx => {
    setRows(r => r.map((row, i) => (i === idx ? { ...row, include: !row.include } : row)));
  }, []);

  const updateRow = useCallback((idx, patch) => {
    setRows(r => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }, []);

  const handleSave = async () => {
    const toSave = rows.filter(r => r.include && r.menuCode && r.crustType);
    if (toSave.length === 0) {
      showToast('저장할 항목이 없어요', 'warn');
      return;
    }
    setSaving(true);
    let saved = 0;
    const savedMenuCodes = new Set(safeMenus.map(m => m.menuCode));
    try {
      for (const row of toSave) {
        const normalizedCategory = categoryForImportRow(row);
        if (!savedMenuCodes.has(row.menuCode)) {
          await upsertMenuRef({
            menuCode: row.menuCode,
            menuName: row.menuName,
            category: normalizedCategory,
          });
          savedMenuCodes.add(row.menuCode);
        }
        const existing = safeRawMap[`${row.menuCode}__${row.crustType}`];
        await upsertRawValue({
          ...(existing?.id ? { id: existing.id } : {}),
          ...toRawValueRecord({ ...row, category: normalizedCategory }),
        });
        saved++;
      }
      const skipped = rows.filter(r => !r.include).length;
      showToast(`${saved}건 저장 완료 (${skipped}건 제외)`, 'ok');
      refresh();
      close();
    } catch (e) {
      // 행별 개별 트랜잭션이라 saved건은 이미 커밋된 상태 — 부분 저장 사실을 알리고
      // 화면을 갱신해 stale 미리보기에 머물지 않도록 한다.
      if (saved > 0) {
        showToast(`${saved}건 저장 후 ${toSave.length - saved}건 실패 — 부분 저장됨`, 'warn');
        refresh();
      } else {
        showToast(`저장 실패: ${e?.message || e}`, 'error');
      }
    }
    setSaving(false);
  };

  const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});
  const included = rows.filter(r => r.include).length;

  const isToggleable = r => r.status !== 'skipped' && r.status !== 'exists';
  const toggleableCount = rows.filter(isToggleable).length;
  const allSelected = toggleableCount > 0 && rows.filter(isToggleable).every(r => r.include);
  const hasSelectedToggleable = rows.filter(isToggleable).some(r => r.include);

  const handleSelectAll = () => {
    setRows(r => r.map(row => (isToggleable(row) ? { ...row, include: true } : row)));
  };
  const handleDeselectAll = () => {
    setRows(r => r.map(row => (isToggleable(row) ? { ...row, include: false } : row)));
  };

  if (step === 'upload') {
    return <ImportBaseUploadStep onClose={close} onFile={handleFile} />;
  }

  return (
    <ModalFrame
      title="베이스 영양성분 가져오기 — 미리보기"
      onClose={close}
      width="min(1060px,98vw)"
      zIndex={300}
      padding="16px 20px"
    >
      <ImportBaseSummaryBar
        rows={rows}
        counts={counts}
        included={included}
        allSelected={allSelected}
        toggleableCount={toggleableCount}
        hasSelectedToggleable={hasSelectedToggleable}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
      />

      <ImportBasePreviewTable
        rows={rows}
        menuMasters={safeMenuMasters}
        onToggle={toggleInclude}
        onUpdate={updateRow}
      />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={() => setStep('upload')}>
          ← 다시 선택
        </button>
        <button className="btn primary" onClick={handleSave} disabled={saving || included === 0}>
          {saving ? '저장 중…' : `${included}건 저장`}
        </button>
      </div>
    </ModalFrame>
  );
}
