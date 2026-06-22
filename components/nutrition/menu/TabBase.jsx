'use client';
import { useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { ImportBaseModal } from '@/components/nutrition/menu/ImportBaseModal';
import { MenuGroupList } from '@/components/nutrition/menu/base/MenuGroupList';
import { NutritionInputPanel } from '@/components/nutrition/menu/base/NutritionInputPanel';
import { AddMenuModal } from '@/components/nutrition/menu/base/AddMenuModal';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { asRecord, noop } from '@/lib/nutrition/values/base-helpers';
import { clearAllBaseData } from '@/lib/nutrition/values/store';
import { useNutritionBaseEditor } from '@/hooks/useNutritionBaseEditor';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

export function TabBase({ menus, rawMap, onRefresh, menuMasters, canEdit = false }) {
  const safeMenus = useMemo(() => asObjectArray(menus), [menus]);
  const safeMenuMasters = useMemo(() => asObjectArray(menuMasters), [menuMasters]);
  const safeRawMap = asRecord(rawMap);
  const refresh = typeof onRefresh === 'function' ? onRefresh : noop;
  const masterByCode = useMemo(
    () => Object.fromEntries(safeMenuMasters.map(m => [m.menuCode, m])),
    [safeMenuMasters]
  );

  const editor = useNutritionBaseEditor({ safeRawMap, refresh, canEdit });
  const {
    selMenu,
    setSelMenu,
    selCrust,
    setSelCrust,
    form,
    setForm,
    setField,
    saving,
    setSaving,
    addMenu,
    setAddMenu,
    newMenuForm,
    setNewMenuForm,
    handleSave,
    handleAddMenu,
    handleDeleteMenu,
    confirmElement: editorConfirmElement,
  } = editor;
  const { showConfirm, confirmElement } = useConfirmDialog();

  const [importOpen, setImportOpen] = useState(false);
  const selectedMenuName = asDisplayText(selMenu?.menuName, '선택한 메뉴');

  return (
    <div style={{ display: 'flex', gap: 20, marginTop: 20, alignItems: 'flex-start' }}>
      {/* 메뉴 목록 */}
      <div
        className="card"
        style={{
          width: 220,
          flexShrink: 0,
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 220px)',
        }}
      >
        <div
          style={{
            padding: '12px 14px 8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700 }}>메뉴 목록</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn sm ghost"
              title="엑셀 가져오기"
              onClick={() => setImportOpen(true)}
              disabled={!canEdit}
              style={{ fontSize: 11, padding: '3px 7px' }}
            >
              엑셀
            </button>
            <button className="btn sm ghost" onClick={() => setAddMenu(true)} disabled={!canEdit}>
              <Icon.plus style={{ width: 13, height: 13 }} />
            </button>
            <button
              className="btn sm ghost"
              title="전체 삭제"
              style={{ fontSize: 11, padding: '3px 7px', color: 'var(--danger)' }}
              onClick={async () => {
                if (!canEdit) return;
                const ok = await showConfirm({
                  message: '베이스 영양성분 전체(메뉴 목록 + 값)를 삭제합니다. 계속할까요?',
                  danger: true,
                });
                if (!ok) return;
                await clearAllBaseData();
                setSelMenu(null);
                showToast('전체 삭제 완료', 'ok');
                refresh();
              }}
              disabled={!canEdit}
            >
              전체삭제
            </button>
          </div>
        </div>
        {safeMenus.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 12px' }}>
            <div className="empty-icon-wrap">
              <Icon.doc style={{ width: 28, height: 28 }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>메뉴가 없어요</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>+ 버튼으로 메뉴를 추가하세요</div>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <MenuGroupList
              menus={safeMenus}
              rawMap={safeRawMap}
              menuMasters={safeMenuMasters}
              selMenu={selMenu}
              onSelect={setSelMenu}
            />
          </div>
        )}
      </div>

      {/* 영양성분 입력 패널 */}
      <div style={{ flex: 1 }}>
        <NutritionInputPanel
          selMenu={selMenu}
          selectedMenuName={selectedMenuName}
          selCrust={selCrust}
          setSelCrust={setSelCrust}
          safeRawMap={safeRawMap}
          masterByCode={masterByCode}
          form={form}
          setField={setField}
          saving={saving}
          onSave={handleSave}
          onDeleteMenu={handleDeleteMenu}
          readOnly={!canEdit}
        />
      </div>

      {canEdit && importOpen && (
        <ImportBaseModal
          menuMasters={menuMasters}
          menus={safeMenus}
          rawMap={safeRawMap}
          onClose={() => setImportOpen(false)}
          onRefresh={refresh}
        />
      )}

      {canEdit && addMenu && (
        <AddMenuModal
          newMenuForm={newMenuForm}
          setNewMenuForm={setNewMenuForm}
          safeMenuMasters={safeMenuMasters}
          onAdd={handleAddMenu}
          onClose={() => setAddMenu(false)}
        />
      )}

      {confirmElement}
      {editorConfirmElement}
    </div>
  );
}
