'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { SettingTile } from '@/components/ui/SettingTile';
import { normalizeBrandId } from '@/lib/brand-master';
import { getActiveBrandId } from '@/lib/active-brand';
import { getBrands } from '@/lib/brand-master';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { EMPTY_FORM, brandFormOf } from './brandUtils';
import { useBrandActions } from './useBrandActions';

const S_GUARD_CARD = { marginTop: 16, padding: 24 };
const S_CARD_MT = { marginTop: 16 };
const S_SECTION_TITLE = { fontSize: 15, fontWeight: 700, marginBottom: 12 };

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

  const {
    handleSave,
    handleHide,
    handleDefault,
    handleSwitch,
    handleBackup,
    openRestore,
    handleRestoreFile,
  } = useBrandActions({
    isAdmin,
    form,
    activeId,
    busyBrandId,
    setBusyBrandId,
    restoreTarget,
    setRestoreTarget,
    restoreInputRef,
    reloadBrands,
    resetForm,
    showConfirm,
  });

  if (!roleReady) {
    return (
      <main className="main page-enter">
        <PageHeader
          breadcrumb={['설정 / 백업', '브랜드마스터']}
          title="브랜드마스터"
          sub="브랜드 권한을 확인하고 있습니다."
        />
        <div className="card" style={S_GUARD_CARD}>
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
        <div className="card" style={S_GUARD_CARD}>
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
        <SettingTile
          label="상단 노출"
          value={`${visibleCount}개`}
          sub={`숨김 ${hiddenCount}개`}
          num
        />
        <SettingTile
          label="기본 브랜드"
          value={defaultBrand?.name || '없음'}
          sub="신규 작업 기본값"
        />
      </div>

      <section className="card" style={S_CARD_MT}>
        <h2 style={S_SECTION_TITLE}>{editingId ? '브랜드 수정' : '브랜드 추가'}</h2>
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

      <section className="card" style={S_CARD_MT}>
        <h2 style={S_SECTION_TITLE}>브랜드 목록</h2>
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
