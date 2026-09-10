'use client';
import { useState } from 'react';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';
import { useDBLoad } from '@/hooks/useDBLoad';
import {
  findOrphanRecipeVersions,
  restoreRecipeFromVersion,
} from '@/lib/menu-master/recipe-versions';

/**
 * 메뉴마스터 상단 배너 — 과거엔 레시피 구성품이 있었는데(menu_recipe_versions
 * 스냅샷) 지금은 비어 있거나 메뉴 자체가 사라진 경우를 찾아 복구 UI를 제공한다.
 * 중분류 변경 캐스케이드 버그(수정 완료)로 유실된 레시피를 되살리기 위한 안전망.
 */
export function MenuRecipeOrphanBanner({ isViewer = false }) {
  const [open, setOpen] = useState(false);
  const {
    data: orphans,
    loading,
    reload,
  } = useDBLoad(findOrphanRecipeVersions, {
    initialData: [],
  });
  const safeOrphans = Array.isArray(orphans) ? orphans : [];

  if (isViewer || loading || safeOrphans.length === 0) return null;

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          marginBottom: 12,
          borderRadius: 8,
          border: '1px solid var(--warn)',
          background: 'var(--warn-soft)',
          fontSize: 13,
        }}
      >
        <span style={{ fontWeight: 700 }}>⚠ 복구 가능한 레시피 {safeOrphans.length}건</span>
        <span style={{ color: 'var(--text-3)' }}>
          과거엔 식자재가 등록돼 있었는데 지금은 비어 있는 메뉴가 있습니다.
        </span>
        <button className="btn xs" style={{ marginLeft: 'auto' }} onClick={() => setOpen(true)}>
          확인
        </button>
      </div>
      {open && (
        <OrphanRecipeModal
          orphans={safeOrphans}
          onClose={() => setOpen(false)}
          onRestored={reload}
        />
      )}
    </>
  );
}

function OrphanRecipeModal({ orphans, onClose, onRestored }) {
  const [restoringCode, setRestoringCode] = useState(null);

  async function handleRestore(orphan) {
    setRestoringCode(orphan.menuCode);
    try {
      const result = await restoreRecipeFromVersion(orphan.lastGoodVersion);
      showToast(
        `'${orphan.menuName || orphan.menuCode}' 레시피 복구됨 (${result.restoredCount}개)`,
        'ok'
      );
      onRestored();
    } catch (err) {
      showToast('복구 실패: ' + (err?.message || err), 'error');
    } finally {
      setRestoringCode(null);
    }
  }

  return (
    <ModalFrame
      title="복구 가능한 레시피"
      subtitle="이전에 저장된 구성품으로 되돌립니다"
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {orphans.map(orphan => (
          <div
            key={orphan.menuCode}
            style={{
              border: '1px solid var(--divider)',
              borderRadius: 8,
              padding: '10px 12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700 }}>{orphan.menuName || '(이름 없음)'}</span>
              <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'monospace' }}>
                {orphan.menuCode}
              </span>
              {!orphan.menuExists && (
                <span className="chip" style={{ fontSize: 10 }}>
                  메뉴마스터에 없음
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
              마지막 저장: {String(orphan.lastGoodVersion.at).slice(0, 16).replace('T', ' ')} ·
              구성품 {orphan.lastGoodVersion.components.length}개 · 현재{' '}
              {orphan.currentComponentCount}개
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-2)' }}>
              {orphan.lastGoodVersion.components
                .map(c => c.ingredientName)
                .filter(Boolean)
                .join(', ')}
            </div>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn sm primary"
                disabled={!orphan.menuExists || restoringCode === orphan.menuCode}
                onClick={() => handleRestore(orphan)}
                title={
                  orphan.menuExists ? undefined : '메뉴마스터에 이 메뉴가 없어 복구할 수 없습니다'
                }
              >
                {restoringCode === orphan.menuCode ? '복구 중…' : '이 구성품으로 복구'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </ModalFrame>
  );
}
