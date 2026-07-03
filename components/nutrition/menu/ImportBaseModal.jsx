'use client';
import { useState, useCallback } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import { parseLabExcel, buildImportRows, toRawValueRecord } from '@/lib/nutrition/values/import';
import { bulkUpsertBaseData } from '@/lib/nutrition/values/store';
import { SERVING_CRUST_TYPE } from '@/lib/nutrition/crust-config';
import {
  loadNutritionImportAliases,
  rememberNutritionImportAliases,
  upsertNutritionImportAlias,
} from '@/lib/nutrition/import-aliases';
import { asObjectArray, asRecord, noop } from '@/lib/ui/prop-guards';
import { parseErrorMsg } from '@/lib/upload-policy';
import { ImportBasePreviewTable } from './import-base/ImportBasePreviewTable';
import { ImportBaseSummaryBar } from './import-base/ImportBaseSummaryBar';
import { ImportBaseUploadStep } from './import-base/ImportBaseUploadStep';
import { categoryForImportRow } from './import-base/importBaseRows';

function existingRawValueForImportRow(rawMap, row) {
  const primary = rawMap[`${row.menuCode}__${row.crustType}`];
  if (primary) return primary;
  if (row.basis === 'serving' || row.crustType === SERVING_CRUST_TYPE) {
    return rawMap[`${row.menuCode}__석쇠L`];
  }
  return null;
}

export function ImportBaseModal({ menuMasters, rawMap, onClose, onRefresh }) {
  const safeMenuMasters = asObjectArray(menuMasters);
  const safeRawMap = asRecord(rawMap);
  const close = typeof onClose === 'function' ? onClose : noop;
  const refresh = typeof onRefresh === 'function' ? onRefresh : noop;
  const [step, setStep] = useState('upload');
  const [rows, setRows] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [saving, setSaving] = useState(false);

  function buildPreviewRows(nextRawRows, nextOverwrite = overwriteExisting) {
    const existingKeys = nextOverwrite
      ? {}
      : Object.fromEntries(Object.keys(safeRawMap).map(k => [k, true]));
    return buildImportRows({
      rawRows: nextRawRows,
      menuMasters: safeMenuMasters,
      existingKeys,
      aliasMap: loadNutritionImportAliases(),
    });
  }

  const handleFile = async (file, err) => {
    if (err) {
      showToast(err, 'error');
      return;
    }
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const parsedRows = await parseLabExcel(buf);
      setRawRows(parsedRows);
      setRows(buildPreviewRows(parsedRows));
      setStep('preview');
    } catch (e) {
      showToast(parseErrorMsg(e), 'error');
    }
  };

  const toggleInclude = useCallback(idx => {
    setRows(r => r.map((row, i) => (i === idx ? { ...row, include: !row.include } : row)));
  }, []);

  const updateRow = useCallback((idx, patch) => {
    setRows(r =>
      r.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, ...patch };
        if (patch?.menuCode) {
          upsertNutritionImportAlias(row.rawName, next);
          if (row.baseName && row.baseName !== row.rawName) upsertNutritionImportAlias(row.baseName, next);
        }
        return next;
      })
    );
  }, []);

  const handleOverwriteChange = checked => {
    setOverwriteExisting(checked);
    setRows(buildPreviewRows(rawRows, checked));
  };

  const handleSave = async () => {
    const toSave = rows.filter(r => r.include && r.menuCode && r.crustType);
    if (toSave.length === 0) {
      showToast('저장할 항목이 없어요', 'warn');
      return;
    }
    setSaving(true);
    try {
      const payload = toSave.map(row => {
        const normalizedCategory = categoryForImportRow(row);
        const existing = existingRawValueForImportRow(safeRawMap, row);
        return {
          menuCode: row.menuCode,
          menuName: row.menuName,
          category: normalizedCategory,
          crustType: row.crustType,
          rawValue: {
            ...(existing?.id ? { id: existing.id } : {}),
            ...toRawValueRecord({ ...row, category: normalizedCategory }),
          },
        };
      });
      const { rawValues } = await bulkUpsertBaseData(payload);
      rememberNutritionImportAliases(toSave);
      const skipped = rows.filter(r => !r.include).length;
      showToast(`${rawValues}건 저장 완료 (${skipped}건 제외)`, 'ok');
      refresh();
      close();
    } catch (e) {
      showToast(`저장 실패: ${parseErrorMsg(e)}`, 'error');
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
        overwriteExisting={overwriteExisting}
        onOverwriteExistingChange={handleOverwriteChange}
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
