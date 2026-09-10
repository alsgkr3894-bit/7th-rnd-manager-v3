'use client';
import { useState } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import MenuCodePicker from '@/components/ui/MenuCodePicker';
import { getMenuCodeBase } from '@/lib/menu-master/code-policy';
import { updateMenuRefIdentity } from '@/lib/nutrition/values/store';

/**
 * 베이스 메뉴 수정 모달 — 메뉴명/코드를 고칠 수 있게 한다.
 * 이전에는 AddMenuModal(readOnly 필드)만 있어 한 번 등록하면 이름·코드를
 * 절대 고칠 수 없었다. 코드 변경은 updateMenuRefIdentity가 raw_values도
 * 함께 이관하므로 여기서는 그 함수만 호출하면 된다.
 */
export function EditMenuModal({ menu, safeMenuMasters, onSaved, onClose }) {
  const [menuCode, setMenuCode] = useState(menu?.menuCode || '');
  const [menuName, setMenuName] = useState(menu?.menuName || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!menuCode.trim() || !menuName.trim()) {
      showToast('메뉴코드와 메뉴명을 입력하세요', 'warn');
      return;
    }
    setSaving(true);
    try {
      const result = await updateMenuRefIdentity(menu, {
        menuCode: menuCode.trim(),
        menuName: menuName.trim(),
      });
      const migratedNote =
        result?._rawValuesMigrated > 0 ? ` (영양값 ${result._rawValuesMigrated}건 함께 이동)` : '';
      showToast(`메뉴 정보를 수정했습니다${migratedNote}`, 'ok');
      onSaved?.(result);
      onClose?.();
    } catch (err) {
      showToast(err?.message || '수정 실패', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame
      title="메뉴 정보 수정"
      onClose={onClose}
      width="min(400px,95vw)"
      zIndex={300}
      padding="24px 28px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label
            style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}
          >
            메뉴코드 *
          </label>
          <MenuCodePicker
            menuMasters={safeMenuMasters}
            value={menuCode}
            mode="base"
            onChange={code => {
              setMenuCode(code || menuCode);
              const matchedMenu = code
                ? safeMenuMasters.find(m => getMenuCodeBase(m) === code)
                : null;
              if (matchedMenu?.menuName) setMenuName(matchedMenu.menuName);
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>
            코드를 바꾸면 이 메뉴에 입력된 영양성분값도 새 코드로 함께 옮겨집니다.
          </div>
        </div>
        <div>
          <label
            style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}
          >
            메뉴명 *
          </label>
          <input
            className="input"
            value={menuName}
            onChange={e => setMenuName(e.target.value)}
            placeholder="메뉴명"
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn" onClick={onClose} disabled={saving}>
          취소
        </button>
        <button
          className="btn primary"
          onClick={handleSave}
          disabled={saving || !menuCode.trim() || !menuName.trim()}
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </ModalFrame>
  );
}
