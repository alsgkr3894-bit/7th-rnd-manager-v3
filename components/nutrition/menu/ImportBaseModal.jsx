'use client';
import { useState, useRef, useCallback } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import MenuCodePicker from '@/components/ui/MenuCodePicker';
import { parseLabExcel, buildImportRows, toRawValueRecord } from '@/lib/nutrition/values/import';
import { upsertMenuRef, upsertRawValue } from '@/lib/nutrition/values/store';

const STATUS_CFG = {
  matched:   { label: '매칭',     color: '#16a34a', bg: '#dcfce7' },
  unmatched: { label: '미매칭',   color: '#ea580c', bg: '#ffedd5' },
  skipped:   { label: '건너뜀',   color: '#6b7280', bg: '#f3f4f6' },
  dup:       { label: '중복',     color: '#b45309', bg: '#fef3c7' },
  exists:    { label: '이미저장', color: '#6b7280', bg: '#f3f4f6' },
};

function StatusBadge({ status }) {
  const s = STATUS_CFG[status] || STATUS_CFG.unmatched;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
      color: s.color, background: s.bg, whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

function FmtNum({ v, unit }) {
  if (v === '' || v == null) return <span style={{ color: 'var(--text-4)' }}>–</span>;
  return <span>{v}<span style={{ fontSize: 10, color: 'var(--text-4)', marginLeft: 1 }}>{unit}</span></span>;
}

const TH = {
  padding: '7px 8px', textAlign: 'left', fontWeight: 700, fontSize: 11,
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  background: 'var(--surface-2)',
};
const TD = { padding: '5px 8px', borderBottom: '1px solid var(--divider)', verticalAlign: 'middle' };

function ImportRow({ row, idx, menuMasters, onToggle, onUpdate }) {
  const disabled = row.status === 'skipped' || row.status === 'exists';
  const showPicker = !disabled && (row.status === 'unmatched' || (!row.menuCode && row.status !== 'skipped'));

  return (
    <tr style={{ opacity: (disabled || !row.include) ? 0.4 : 1 }}>
      <td style={{ ...TD, fontSize: 11, color: 'var(--text-3)', maxWidth: 130 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.rawName}>
          {row.rawName}
        </div>
        {row.skipReason && <div style={{ fontSize: 10, color: '#6b7280' }}>{row.skipReason}</div>}
        {row.dupNote    && <div style={{ fontSize: 10, color: '#b45309' }}>{row.dupNote}</div>}
      </td>
      <td style={{ ...TD, minWidth: 170 }}>
        {showPicker ? (
          <MenuCodePicker
            menuMasters={menuMasters}
            value={row.menuCode}
            onChange={(code, meta) => {
              const m = code ? menuMasters.find(m2 => {
                const base = m2.size ? m2.menuCode.replace(new RegExp(`-${m2.size}$`), '') : m2.menuCode;
                return base === code;
              }) : null;
              onUpdate(idx, {
                menuCode: code,
                menuName: m?.menuName || row.baseName,
                category: meta?.category || '',
                status: code ? 'matched' : 'unmatched',
                include: !!code,
              });
            }}
          />
        ) : (
          <div>
            {row.menuCode && (
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent-text)', marginRight: 4 }}>
                {row.menuCode}
              </span>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{row.menuName}</span>
          </div>
        )}
      </td>
      <td style={{ ...TD, fontFamily: 'monospace', fontSize: 11 }}>{row.crustType || '–'}</td>
      <td style={TD}><FmtNum v={row.values.kcal}    unit="kcal" /></td>
      <td style={TD}><FmtNum v={row.values.sugar}   unit="g" /></td>
      <td style={TD}><FmtNum v={row.values.protein} unit="g" /></td>
      <td style={TD}><FmtNum v={row.values.satFat}  unit="g" /></td>
      <td style={TD}><FmtNum v={row.values.sodium}  unit="mg" /></td>
      <td style={TD}><StatusBadge status={row.status} /></td>
      <td style={{ ...TD, textAlign: 'center' }}>
        <input
          type="checkbox"
          checked={!!row.include}
          disabled={disabled}
          onChange={() => onToggle(idx)}
          style={{ cursor: disabled ? 'default' : 'pointer' }}
        />
      </td>
    </tr>
  );
}

export function ImportBaseModal({ menuMasters, menus, rawMap, onClose, onRefresh }) {
  const [step,     setStep]     = useState('upload');
  const [rows,     setRows]     = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const rawRows = await parseLabExcel(buf);
      const existingKeys = Object.fromEntries(Object.keys(rawMap).map(k => [k, true]));
      setRows(buildImportRows({ rawRows, menuMasters, existingKeys }));
      setStep('preview');
    } catch (e) {
      showToast(`파싱 실패: ${e.message}`, 'error');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const toggleInclude = useCallback((idx) => {
    setRows(r => r.map((row, i) => i === idx ? { ...row, include: !row.include } : row));
  }, []);

  const updateRow = useCallback((idx, patch) => {
    setRows(r => r.map((row, i) => i === idx ? { ...row, ...patch } : row));
  }, []);

  const handleSave = async () => {
    const toSave = rows.filter(r => r.include && r.menuCode && r.crustType);
    if (toSave.length === 0) { showToast('저장할 항목이 없어요', 'warn'); return; }
    setSaving(true);
    let saved = 0;
    const savedMenuCodes = new Set(menus.map(m => m.menuCode));
    try {
      for (const row of toSave) {
        if (!savedMenuCodes.has(row.menuCode)) {
          await upsertMenuRef({ menuCode: row.menuCode, menuName: row.menuName, category: row.category });
          savedMenuCodes.add(row.menuCode);
        }
        const existing = rawMap[`${row.menuCode}__${row.crustType}`];
        await upsertRawValue({
          ...(existing?.id ? { id: existing.id } : {}),
          ...toRawValueRecord(row),
        });
        saved++;
      }
      const skipped = rows.filter(r => !r.include).length;
      showToast(`${saved}건 저장 완료 (${skipped}건 제외)`, 'ok');
      onRefresh();
      onClose();
    } catch (e) {
      showToast(`저장 실패: ${e.message}`, 'error');
    }
    setSaving(false);
  };

  const counts   = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});
  const included = rows.filter(r => r.include).length;

  const isToggleable = (r) => r.status !== 'skipped' && r.status !== 'exists';
  const toggleableCount = rows.filter(isToggleable).length;
  const allSelected = toggleableCount > 0 && rows.filter(isToggleable).every(r => r.include);

  const handleSelectAll = () => {
    setRows(r => r.map(row => isToggleable(row) ? { ...row, include: true } : row));
  };
  const handleDeselectAll = () => {
    setRows(r => r.map(row => isToggleable(row) ? { ...row, include: false } : row));
  };

  if (step === 'upload') {
    return (
      <ModalFrame title="베이스 영양성분 엑셀 가져오기" onClose={onClose} width="min(480px,95vw)" zIndex={300} padding="24px 28px">
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.7 }}>
          연구기관 분석 엑셀 파일을 업로드하면 베이스 영양성분에 일괄 저장됩니다.<br />
          <span style={{ fontSize: 12, color: 'var(--text-4)' }}>
            ※ 값은 100g 기준으로 저장됩니다 | 지원 형식: .xlsx, .xls
          </span>
        </div>
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 10, padding: '44px 20px', textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'var(--accent-soft)' : 'var(--surface-2)',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 4 }}>
            엑셀 파일을 드래그하거나 클릭하여 선택
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-4)' }}>.xlsx / .xls</div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={onClose}>취소</button>
        </div>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame
      title="베이스 영양성분 가져오기 — 미리보기"
      onClose={onClose}
      width="min(1060px,98vw)"
      zIndex={300}
      padding="16px 20px"
    >
      {/* 요약 바 */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>총 {rows.length}행</span>
        {counts.matched   ? <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>매칭 {counts.matched}</span> : null}
        {counts.exists    ? <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>이미저장 {counts.exists}</span> : null}
        {counts.dup       ? <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>중복 {counts.dup}</span> : null}
        {counts.unmatched ? <span style={{ fontSize: 12, color: '#ea580c', fontWeight: 700 }}>미매칭 {counts.unmatched}</span> : null}
        {counts.skipped   ? <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 700 }}>건너뜀 {counts.skipped}</span> : null}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn sm ghost" style={{ fontSize: 11 }}
            onClick={handleSelectAll} disabled={allSelected || toggleableCount === 0}>
            전체선택
          </button>
          <button className="btn sm ghost" style={{ fontSize: 11 }}
            onClick={handleDeselectAll} disabled={!rows.filter(isToggleable).some(r => r.include)}>
            전체해제
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 4 }}>
            저장 대상: <strong style={{ color: 'var(--text-1)' }}>{included}건</strong>
          </span>
        </div>
      </div>

      {/* 미리보기 테이블 */}
      <div style={{ maxHeight: '56vh', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={TH}>원본명</th>
              <th style={{ ...TH, minWidth: 170 }}>메뉴 매칭</th>
              <th style={TH}>크러스트</th>
              <th style={TH}>열량</th>
              <th style={TH}>당류</th>
              <th style={TH}>단백질</th>
              <th style={TH}>포화지방</th>
              <th style={TH}>나트륨</th>
              <th style={TH}>상태</th>
              <th style={{ ...TH, textAlign: 'center' }}>포함</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <ImportRow
                key={idx}
                row={row}
                idx={idx}
                menuMasters={menuMasters}
                onToggle={toggleInclude}
                onUpdate={updateRow}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={() => setStep('upload')}>← 다시 선택</button>
        <button className="btn primary" onClick={handleSave} disabled={saving || included === 0}>
          {saving ? '저장 중…' : `${included}건 저장`}
        </button>
      </div>
    </ModalFrame>
  );
}
