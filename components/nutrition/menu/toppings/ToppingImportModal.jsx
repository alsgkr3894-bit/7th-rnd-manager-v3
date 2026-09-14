'use client';
import { useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { UploadDropzone } from '@/components/ui/UploadDropzone';
import { upsertTopping } from '@/lib/nutrition/values/store';
import {
  buildToppingImportRows,
  downloadToppingImportTemplate,
  parseToppingExcel,
  toToppingImportRecord,
} from '@/lib/nutrition/values/topping-import';
import { parseErrorMsg } from '@/lib/upload-policy';
import { asObjectArray, asStringArray } from '@/lib/ui/prop-guards';
import { ToppingPreviewTable } from './ToppingPreviewTable';
import { buildIngredientOptions, findIngredientOption } from './toppingImportUtils';

export function ToppingImportModal({ toppings, ingredients, onClose, onRefresh }) {
  const safeToppings = asObjectArray(toppings);
  const safeIngredients = asObjectArray(ingredients);
  const ingredientOptions = buildIngredientOptions(safeIngredients);
  const [step, setStep] = useState('upload');
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  function rebuildRows(nextRows) {
    return buildToppingImportRows({
      rawRows: nextRows,
      toppings: safeToppings,
      ingredients: safeIngredients,
    }).map((row, index) => {
      const previous = nextRows[index] || {};
      const wasInvalid = previous.status === 'invalid';
      return {
        ...row,
        include: row.status === 'invalid' ? false : wasInvalid ? true : previous.include !== false,
      };
    });
  }

  function patchRow(index, patch) {
    setRows(prev =>
      rebuildRows(
        prev.map((row, rowIndex) => {
          if (rowIndex !== index) return row;
          return {
            ...row,
            ...patch,
            values: patch.values ? { ...row.values, ...patch.values } : row.values,
          };
        })
      )
    );
  }

  function handleIngredientInput(index, value) {
    const option = findIngredientOption(value, ingredientOptions);
    patchRow(
      index,
      option
        ? {
            productCode: option.productCode,
            ingredientName: option.ingredientName,
          }
        : {
            productCode: value,
            ingredientName: '',
          }
    );
  }

  async function handleFile(file, error) {
    if (error) {
      showToast(error, 'error');
      return;
    }
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const rawRows = await parseToppingExcel(buffer);
      setRows(
        buildToppingImportRows({
          rawRows,
          toppings: safeToppings,
          ingredients: safeIngredients,
        })
      );
      setStep('preview');
    } catch (err) {
      showToast(parseErrorMsg(err), 'error');
    }
  }

  async function handleTemplateDownload() {
    try {
      await downloadToppingImportTemplate(safeIngredients);
    } catch (err) {
      showToast(`양식 다운로드 실패: ${err?.message || err}`, 'error');
    }
  }

  function toggleRow(index) {
    setRows(prev =>
      prev.map((row, rowIndex) =>
        rowIndex === index && row.status !== 'invalid' ? { ...row, include: !row.include } : row
      )
    );
  }

  async function saveRows() {
    const selected = rows.filter(row => row.include && row.status !== 'invalid');
    if (!selected.length) {
      showToast('저장할 추가토핑이 없어요', 'warn');
      return;
    }
    setSaving(true);
    try {
      const now = Date.now();
      for (let index = 0; index < selected.length; index += 1) {
        await upsertTopping(toToppingImportRecord(selected[index], index, now));
      }
      showToast(`${selected.length}건 저장 완료`, 'ok');
      await onRefresh?.();
      onClose?.();
    } catch (err) {
      showToast(`저장 실패: ${err?.message || err}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  const included = rows.filter(row => row.include && row.status !== 'invalid').length;
  const counts = rows.reduce(
    (acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }),
    {}
  );

  return (
    <ModalFrame
      title={step === 'upload' ? '추가토핑 엑셀 가져오기' : '추가토핑 엑셀 미리보기'}
      onClose={onClose}
      width={step === 'upload' ? 'min(720px, 96vw)' : 'min(1120px, 98vw)'}
      zIndex={320}
      padding="20px 24px"
    >
      {step === 'upload' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn sm" type="button" onClick={handleTemplateDownload}>
              양식 다운로드
            </button>
          </div>
          <UploadDropzone
            onFile={handleFile}
            accept={['.xlsx', '.xls', '.csv']}
            title="추가토핑 영양성분 엑셀을 넣으세요"
            subText="양식의 식자재코드를 넣으면 식자재 관리의 알레르기/원산지 정보와 연결됩니다."
            rules={[
              {
                type: 'ok',
                text: '양식 파일에는 입력 시트와 현재 식자재코드 목록 시트가 함께 들어갑니다.',
              },
              {
                type: 'ok',
                text: '식자재코드는 공백·대소문자 차이가 있어도 가능한 범위에서 연결합니다.',
              },
              { type: 'warn', text: '추가토핑명은 반드시 필요합니다.' },
            ]}
          />
        </>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              신규 <b style={{ color: 'var(--text-1)' }}>{counts.ready || 0}</b>건 · 업데이트{' '}
              <b style={{ color: 'var(--text-1)' }}>{counts.exists || 0}</b>건 · 확인필요{' '}
              <b style={{ color: 'var(--text-1)' }}>{counts.invalid || 0}</b>건
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
              저장 대상 <b style={{ color: 'var(--text-1)' }}>{included}</b>건
            </div>
          </div>
          <ToppingPreviewTable
            rows={rows}
            ingredientOptions={ingredientOptions}
            onToggle={toggleRow}
            onPatchRow={patchRow}
            onIngredientInput={handleIngredientInput}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              className="btn"
              type="button"
              onClick={() => setStep('upload')}
              disabled={saving}
            >
              다시 선택
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={saveRows}
              disabled={saving || included === 0}
            >
              {saving ? '저장 중...' : `${included}건 저장`}
            </button>
          </div>
        </>
      )}
    </ModalFrame>
  );
}
