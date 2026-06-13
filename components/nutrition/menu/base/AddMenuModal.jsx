'use client';
import { ModalFrame } from '@/components/ui/ModalFrame';
import MenuCodePicker from '@/components/ui/MenuCodePicker';
import { getMenuCodeBase } from '@/lib/menu-master/code-policy';
import {
  normalizeNutritionCategory,
  NUTRITION_CATEGORY_OPTIONS,
} from '@/lib/nutrition/menu-group';

/**
 * 베이스 메뉴 추가 모달.
 */
export function AddMenuModal({ newMenuForm, setNewMenuForm, safeMenuMasters, onAdd, onClose }) {
  return (
    <ModalFrame
      title="메뉴 추가"
      onClose={onClose}
      width="min(400px,95vw)"
      zIndex={300}
      padding="24px 28px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
            메뉴코드 <span style={{ color: 'var(--text-4)' }}>(선택 시 메뉴명 자동 입력)</span>
          </label>
          <MenuCodePicker
            menuMasters={safeMenuMasters}
            value={newMenuForm.menuCode}
            mode="base"
            onChange={(code, meta) => {
              const matchedMenu = code
                ? safeMenuMasters.find(m => getMenuCodeBase(m) === code)
                : null;
              setNewMenuForm(f => ({
                ...f,
                menuCode: code,
                menuName: code ? (matchedMenu?.menuName ?? f.menuName) : f.menuName,
                category: normalizeNutritionCategory(meta?.category || f.category, '피자'),
              }));
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
            메뉴명 *
          </label>
          <input
            className="input"
            value={newMenuForm.menuName}
            onChange={e => setNewMenuForm(f => ({ ...f, menuName: e.target.value }))}
            placeholder="예: 컨츄리치킨"
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
            카테고리
          </label>
          <select
            className="input"
            value={normalizeNutritionCategory(newMenuForm.category, '피자')}
            onChange={e => setNewMenuForm(f => ({ ...f, category: e.target.value }))}
          >
            {NUTRITION_CATEGORY_OPTIONS.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn" onClick={onClose}>
          취소
        </button>
        <button className="btn primary" onClick={onAdd}>
          추가
        </button>
      </div>
    </ModalFrame>
  );
}
