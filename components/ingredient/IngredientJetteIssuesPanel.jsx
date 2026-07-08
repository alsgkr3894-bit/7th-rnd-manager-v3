'use client';

import { useMemo, useState } from 'react';
import { ComboBox } from '@/components/ui/ComboBox';

function rowLabel(row) {
  return row?.displayName || row?.productName || row?.ingredientName || row?.productCode || '';
}

function rowCode(row) {
  return String(row?.productCode || '').trim();
}

function rowKey(row) {
  return rowCode(row) || String(row?.id || rowLabel(row));
}

function buildReplacementOptions(newJetteRows, replacementRows) {
  const byCode = new Map();
  for (const row of [...(newJetteRows || []), ...(replacementRows || [])]) {
    const code = rowCode(row);
    if (!code || byCode.has(code)) continue;
    byCode.set(code, row);
  }
  return [...byCode.values()].sort((a, b) => rowLabel(a).localeCompare(rowLabel(b), 'ko'));
}

function replacementOptionLabel(row) {
  const label = rowLabel(row);
  const code = rowCode(row);
  if (!label && !code) return '';
  if (!code) return label;
  return `${label || code} (${code})`;
}

function replacementOptionFromLabel(options, label) {
  const target = String(label || '').trim();
  if (!target) return null;
  return options.find(option => replacementOptionLabel(option) === target) || null;
}

export function IngredientJetteIssuesPanel({
  newJetteRows = [],
  jetteRemovedRows = [],
  replacementRows = [],
  onAutoRegister,
  onExclude,
  onReplace,
  isViewer,
}) {
  const [replacementByOldCode, setReplacementByOldCode] = useState({});
  const [replacementInputByOldCode, setReplacementInputByOldCode] = useState({});
  const replacementOptions = useMemo(
    () => buildReplacementOptions(newJetteRows, replacementRows),
    [newJetteRows, replacementRows]
  );
  const replacementOptionLabels = useMemo(
    () => replacementOptions.map(replacementOptionLabel).filter(Boolean),
    [replacementOptions]
  );

  const handleReplacementChange = (oldCode, nextValue) => {
    const replacement = replacementOptionFromLabel(replacementOptions, nextValue);
    setReplacementInputByOldCode(prev => ({ ...prev, [oldCode]: nextValue }));
    setReplacementByOldCode(prev => ({
      ...prev,
      [oldCode]: replacement ? rowCode(replacement) : '',
    }));
  };

  const handleReplace = row => {
    const oldCode = rowKey(row);
    const selectedCode = replacementByOldCode[oldCode];
    const replacement = replacementOptions.find(option => rowCode(option) === selectedCode);
    if (!replacement || typeof onReplace !== 'function') return;
    onReplace(row, replacement);
  };

  return (
    <>
      {newJetteRows.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ color: 'var(--accent)' }}>
                제때 신규 미등록 ({newJetteRows.length}개)
              </div>
              <div className="card-sub">
                최신 제때 파일에는 있지만 식자재 관리에 아직 연결되지 않은 제품입니다.
              </div>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>제품명</th>
                <th style={{ width: 120 }}>제품코드</th>
                <th style={{ width: 174 }} />
              </tr>
            </thead>
            <tbody>
              {newJetteRows.map(row => (
                <tr key={rowKey(row)}>
                  <td style={{ fontWeight: 500 }}>{rowLabel(row)}</td>
                  <td className="mono muted" style={{ fontSize: 12 }}>
                    {rowCode(row) || '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className="btn sm"
                        onClick={() => onAutoRegister(row)}
                        disabled={isViewer}
                      >
                        자동 등록
                      </button>
                      <button
                        className="btn sm"
                        onClick={() => onExclude(row)}
                        disabled={isViewer || !rowCode(row)}
                        style={{ color: 'var(--text-3)' }}
                        title="등록하지 않아도 되는 제때 제품은 목록에서 제외합니다."
                      >
                        등록 안함
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {jetteRemovedRows.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ color: 'var(--warn)' }}>
                제때 제거 후보 ({jetteRemovedRows.length}개)
              </div>
              <div className="card-sub">
                이전 파일에는 있었지만 최신 제때 파일에서 사라진 제품입니다. 코드가 바뀐 경우에는 새
                제품으로 대체 연결할 수 있습니다.
              </div>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>식자재명</th>
                <th style={{ width: 120 }}>기존 코드</th>
                <th style={{ width: 260 }}>대체 제품</th>
                <th style={{ width: 184 }} />
              </tr>
            </thead>
            <tbody>
              {jetteRemovedRows.map(row => {
                const key = rowKey(row);
                const selectedCode = replacementByOldCode[key] || '';
                const selectedOption = replacementOptions.find(
                  option => rowCode(option) === selectedCode
                );
                const inputValue =
                  replacementInputByOldCode[key] ??
                  (selectedOption ? replacementOptionLabel(selectedOption) : '');
                return (
                  <tr key={key}>
                    <td style={{ fontWeight: 500 }}>
                      {row.ingredientName || row.displayName || row.productName || '-'}
                    </td>
                    <td className="mono muted" style={{ fontSize: 12 }}>
                      {rowCode(row) || '-'}
                    </td>
                    <td>
                      {replacementOptions.length > 0 ? (
                        <ComboBox
                          value={inputValue}
                          onChange={value => handleReplacementChange(key, value)}
                          options={replacementOptionLabels}
                          inputClassName="form-input"
                          placeholder="대체 제품 검색"
                          maxItems={8}
                          disabled={isViewer}
                          inputStyle={{ minHeight: 34, fontSize: 13 }}
                          style={{ width: '100%' }}
                        />
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>
                          최신 제때 제품이 없습니다
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn sm"
                          onClick={() => handleReplace(row)}
                          disabled={
                            isViewer ||
                            !rowCode(row) ||
                            !selectedCode ||
                            typeof onReplace !== 'function'
                          }
                        >
                          대체 연결
                        </button>
                        <button
                          className="btn sm"
                          style={{ color: 'var(--negative)' }}
                          onClick={() => rowCode(row) && onExclude(row)}
                          disabled={isViewer || !rowCode(row)}
                        >
                          단종 처리
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
