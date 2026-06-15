'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { SettingTile } from '@/components/ui/SettingTile';
import {
  getBrands,
  normalizeBrandId,
  setBrandHidden,
  setDefaultBrandId,
  upsertBrand,
} from '@/lib/brand-master';
import { getActiveBrandId, setActiveBrandId } from '@/lib/active-brand';
import { exportAllForBrand, importAllToBrand, MODULE_KEYS } from '@/lib/db';
import { validateBackupPayload } from '@/lib/backup/validation';
import { backupSourceMetadataOf, isBackupSourceMismatch } from '@/lib/backup/brand-source';
import { addEntry } from '@/lib/backup-history';
import { downloadJson, makeFileName, readFileAsText } from '@/lib/download';
import { formatNumber } from '@/lib/format';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

const EMPTY_FORM = {
  id: '',
  name: '',
  sub: '',
  logo: '',
  color: '#E1101F',
};

function brandFormOf(brand = EMPTY_FORM) {
  return {
    id: brand.id || '',
    name: brand.name || '',
    sub: brand.sub || '',
    logo: brand.logo || '',
    color: brand.color || '#E1101F',
  };
}

function countRows(stores) {
  return Object.values(stores || {}).reduce(
    (sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0),
    0
  );
}

export default function BrandMasterPage() {
  const [brands, setBrands] = useState([]);
  const [activeId, setActiveId] = useState('main');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busyBrandId, setBusyBrandId] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const restoreInputRef = useRef(null);
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const { showConfirm, confirmElement } = useConfirmDialog();

  const visibleCount = useMemo(() => brands.filter(brand => !brand.hidden).length, [brands]);
  const hiddenCount = brands.length - visibleCount;
  const defaultBrand = brands.find(brand => brand.isDefault);

  const reloadBrands = () => {
    setBrands(getBrands());
    setActiveId(getActiveBrandId());
  };

  useEffect(() => {
    reloadBrands();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(brand) {
    setEditingId(brand.id);
    setForm(brandFormOf(brand));
  }

  function updateForm(field, value) {
    setForm(current => ({
      ...current,
      [field]: field === 'id' ? normalizeBrandId(value) : value,
    }));
  }

  function handleSave(e) {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      const next = {
        ...form,
        id: normalizeBrandId(form.id),
        name: form.name.trim(),
        sub: form.sub.trim() || '브랜드',
      };
      if (!next.id || !next.name) {
        showToast('브랜드 ID와 브랜드명을 입력하세요.', 'warn');
        return;
      }
      upsertBrand(next);
      reloadBrands();
      resetForm();
      showToast('브랜드 정보를 저장했습니다.', 'ok');
    } catch (err) {
      showToast(err.message || '브랜드 저장에 실패했습니다.', 'err');
    }
  }

  function handleHide(brand, hidden) {
    if (!isAdmin) return;
    try {
      setBrandHidden(brand.id, hidden);
      if (hidden && brand.id === activeId) {
        const next = getBrands().find(item => item.isDefault && !item.hidden);
        if (next && setActiveBrandId(next.id)) {
          showToast('활성 브랜드가 숨김 처리되어 기본 브랜드로 전환합니다.', 'warn');
          window.location.reload();
          return;
        }
      }
      reloadBrands();
      showToast(hidden ? '브랜드를 숨김 처리했습니다.' : '브랜드 숨김을 해제했습니다.', 'ok');
    } catch (err) {
      showToast(err.message || '브랜드 상태 변경에 실패했습니다.', 'err');
    }
  }

  function handleDefault(brand) {
    if (!isAdmin) return;
    try {
      setDefaultBrandId(brand.id);
      reloadBrands();
      showToast('기본 브랜드를 변경했습니다.', 'ok');
    } catch (err) {
      showToast(err.message || '기본 브랜드 변경에 실패했습니다.', 'err');
    }
  }

  function handleSwitch(brand) {
    if (brand.hidden) {
      showToast('숨김 브랜드는 상단 전환 대상이 아닙니다.', 'warn');
      return;
    }
    if (brand.id === activeId) return;
    if (setActiveBrandId(brand.id)) window.location.reload();
  }

  async function handleBackup(brand) {
    if (!isAdmin || busyBrandId) return;
    setBusyBrandId(brand.id);
    try {
      const data = await exportAllForBrand(
        brand.id,
        {
          brandId: brand.id,
          brandName: brand.name,
          backupScope: 'brand',
        },
        { includeLocalStorage: false }
      );
      const fileName = makeFileName(`${brand.name}_브랜드백업`, 'json');
      downloadJson(data, fileName);
      addEntry({
        scopes: MODULE_KEYS,
        totalRows: countRows(data.stores),
        fileName,
      });
      showToast(`${brand.name} 백업 파일을 다운로드했습니다.`, 'ok');
    } catch (err) {
      console.error('[BrandMaster] 브랜드 백업 실패:', err);
      showToast('브랜드 백업에 실패했습니다.', 'err');
    } finally {
      setBusyBrandId(null);
    }
  }

  function openRestore(brand) {
    if (!isAdmin || busyBrandId) return;
    setRestoreTarget(brand);
    requestAnimationFrame(() => restoreInputRef.current?.click());
  }

  async function handleRestoreFile(e) {
    const file = e.target.files?.[0];
    const target = restoreTarget;
    e.target.value = '';
    setRestoreTarget(null);
    if (!file || !target || busyBrandId) return;

    setBusyBrandId(target.id);
    try {
      const text = await readFileAsText(file, ['.json']);
      const raw = JSON.parse(text);
      const { backup, summary } = validateBackupPayload(raw);
      const source = backupSourceMetadataOf(backup);
      const sourceMismatch = isBackupSourceMismatch(backup, target.id);
      const failedStores = summary.failedStores;
      const restoreOk = await showConfirm({
        title: `${target.name} 브랜드 복원`,
        message: (
          <div>
            <div>
              <b>파일:</b> {file.name}
            </div>
            <div>
              <b>백업 브랜드:</b>{' '}
              {source.hasSourceBrand
                ? `${source.sourceBrandName || source.sourceBrandId} (${source.sourceBrandId})`
                : '출처 정보 없음'}
            </div>
            <div>
              <b>복원 대상:</b> {target.name} ({target.id})
            </div>
            <div>
              <b>복원 행수:</b> {formatNumber(summary.totalRows)}건 · store{' '}
              {formatNumber(summary.knownStores.length)}개
            </div>
            {sourceMismatch && (
              <div style={{ color: 'var(--warn)', fontWeight: 700 }}>
                백업 브랜드와 복원 대상 브랜드가 다릅니다. 덮어쓰기 전 파일을 다시 확인하세요.
              </div>
            )}
            {failedStores.length > 0 && (
              <div style={{ color: 'var(--warn)', fontWeight: 700 }}>
                백업 생성 당시 읽기 실패 store {failedStores.length}개가 있어 해당 store는 복원되지
                않습니다. 별도 위험 승인 전까지 복원을 진행하지 않습니다.
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              복원 전 자동 백업 파일을 만든 뒤, 선택 브랜드 데이터를 이 파일 내용으로 덮어씁니다.
            </div>
          </div>
        ),
        confirmLabel: '덮어쓰기 복원',
        danger: true,
      });
      if (!restoreOk) return;

      if (failedStores.length > 0) {
        const riskOk = await showConfirm({
          title: '불완전 백업 위험 승인',
          message: (
            <div>
              <div style={{ color: 'var(--warn)', fontWeight: 700, marginBottom: 8 }}>
                이 백업은 생성 당시 store {failedStores.length}개 읽기에 실패했습니다.
              </div>
              <div>
                누락 store:{' '}
                {failedStores
                  .map(item => item.store)
                  .slice(0, 5)
                  .join(', ')}
                {failedStores.length > 5 ? ` 외 ${failedStores.length - 5}개` : ''}
              </div>
              <div style={{ marginTop: 8 }}>
                누락된 store는 현재 브랜드 데이터가 유지됩니다. 완전한 시점 복원이 아니라는 점을
                확인한 경우에만 진행하세요.
              </div>
            </div>
          ),
          confirmLabel: '누락 감수하고 복원',
          danger: true,
        });
        if (!riskOk) return;
      }

      const before = await exportAllForBrand(
        target.id,
        {
          brandId: target.id,
          brandName: target.name,
          backupScope: 'brand-before-restore',
        },
        { includeLocalStorage: false }
      );
      const beforeFileName = makeFileName(`${target.name}_복원전자동백업`, 'json');
      downloadJson(before, beforeFileName);

      const result = await importAllToBrand(backup, target.id);
      if (result.errors?.length > 0) {
        showToast(
          `${target.name} 복원 일부 완료 — 성공 ${result.imported}개 / 오류 ${result.errors.length}개`,
          'warn',
          7000
        );
        console.warn('[BrandMaster] 브랜드 복원 일부 실패:', result.errors);
      } else {
        showToast(
          `${target.name} 복원 완료 — ${result.imported}개 store, ${formatNumber(summary.totalRows)}건`,
          'ok'
        );
      }
      if (target.id === activeId) {
        setTimeout(() => window.location.reload(), 800);
      }
    } catch (err) {
      console.error('[BrandMaster] 브랜드 복원 실패:', err);
      showToast(err.message || '브랜드 복원에 실패했습니다.', 'err');
    } finally {
      setBusyBrandId(null);
    }
  }

  if (!roleReady) {
    return (
      <main className="main page-enter">
        <PageHeader
          breadcrumb={['설정 / 백업', '브랜드마스터']}
          title="브랜드마스터"
          sub="브랜드 권한을 확인하고 있습니다."
        />
        <div className="card" style={{ marginTop: 16, padding: 24 }}>
          <span style={{ color: 'var(--text-3)' }}>권한 확인 중...</span>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="main page-enter">
        <PageHeader
          breadcrumb={['설정 / 백업', '브랜드마스터']}
          title="브랜드마스터"
          sub="브랜드 추가/수정/복원은 관리자만 실행할 수 있습니다."
        />
        <div className="card" style={{ marginTop: 16, padding: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Icon.alert style={{ width: 18, height: 18, color: 'var(--warn)' }} />
            <span>현재 계정은 관리자 권한이 아닙니다.</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['설정 / 백업', '브랜드마스터']}
        title="브랜드마스터"
        sub="브랜드 추가/수정/숨김/기본 브랜드와 브랜드별 백업·덮어쓰기 복원을 관리합니다."
      />

      <input
        ref={restoreInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleRestoreFile}
        style={{ display: 'none' }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
          gap: 16,
          marginTop: 12,
        }}
      >
        <SettingTile label="전체 브랜드" value={`${brands.length}개`} sub="숨김 포함" num />
        <SettingTile label="상단 노출" value={`${visibleCount}개`} sub={`숨김 ${hiddenCount}개`} num />
        <SettingTile label="기본 브랜드" value={defaultBrand?.name || '없음'} sub="신규 작업 기본값" />
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
          {editingId ? '브랜드 수정' : '브랜드 추가'}
        </h2>
        <form
          onSubmit={handleSave}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
            gap: 10,
          }}
        >
          <input
            className="form-input"
            value={form.id}
            onChange={e => updateForm('id', e.target.value)}
            placeholder="브랜드 ID"
            disabled={Boolean(editingId)}
          />
          <input
            className="form-input"
            value={form.name}
            onChange={e => updateForm('name', e.target.value)}
            placeholder="브랜드명"
          />
          <input
            className="form-input"
            value={form.sub}
            onChange={e => updateForm('sub', e.target.value)}
            placeholder="보조 설명"
          />
          <input
            className="form-input"
            value={form.logo}
            onChange={e => updateForm('logo', e.target.value)}
            placeholder="/logo.png"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              type="color"
              value={form.color}
              onChange={e => updateForm('color', e.target.value)}
              aria-label="브랜드 색상"
              style={{ width: 52, padding: 4 }}
            />
            <button type="submit" className="btn primary" style={{ flex: 1 }}>
              저장
            </button>
            {editingId && (
              <button type="button" className="btn" onClick={resetForm}>
                취소
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>브랜드 목록</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>브랜드</th>
                <th style={{ width: 110 }}>상태</th>
                <th style={{ width: 110 }}>기본값</th>
                <th style={{ width: 120 }}>현재 작업</th>
                <th style={{ width: 330 }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {brands.map(brand => {
                const busy = Boolean(busyBrandId);
                return (
                  <tr key={brand.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {brand.logo ? (
                          <img
                            src={brand.logo}
                            alt=""
                            style={{
                              width: 40,
                              height: 30,
                              objectFit: 'contain',
                              background: 'white',
                              borderRadius: 4,
                              padding: 2,
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              display: 'grid',
                              placeItems: 'center',
                              background: brand.color,
                              color: 'white',
                              fontWeight: 800,
                            }}
                          >
                            {brand.name[0]}
                          </span>
                        )}
                        <span>
                          <b>{brand.name}</b>
                          <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)' }}>
                            {brand.id} · {brand.sub}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td>{brand.hidden ? '숨김' : '노출'}</td>
                    <td>{brand.isDefault ? '기본' : '-'}</td>
                    <td>{brand.id === activeId ? '현재' : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn sm" onClick={() => startEdit(brand)}>
                          수정
                        </button>
                        <button
                          className="btn sm"
                          onClick={() => handleDefault(brand)}
                          disabled={brand.hidden || brand.isDefault}
                        >
                          기본
                        </button>
                        <button
                          className="btn sm"
                          onClick={() => handleSwitch(brand)}
                          disabled={brand.hidden || brand.id === activeId}
                        >
                          전환
                        </button>
                        <button
                          className="btn sm"
                          onClick={() => handleBackup(brand)}
                          disabled={busy}
                        >
                          백업
                        </button>
                        <button
                          className="btn sm"
                          onClick={() => openRestore(brand)}
                          disabled={busy}
                        >
                          복원
                        </button>
                        <button
                          className="btn sm"
                          onClick={() => handleHide(brand, !brand.hidden)}
                          disabled={brand.isDefault}
                        >
                          {brand.hidden ? '숨김해제' : '숨김'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {confirmElement}
    </main>
  );
}
