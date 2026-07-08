'use client';
import { useEffect, useRef } from 'react';
import { applyAllSettings, getSetting, setSetting } from '@/lib/settings';
import { useSettingValue } from '@/hooks/useSettingValue';

const G_NAV = {
  h: '/',
  n: '/note',
  c: '/cost',
  r: '/report',
  i: '/ingredient',
  u: '/nutrition',
  b: '/report',
  j: '/jette',
};

/**
 * 앱 전역 키보드 단축키를 등록한다.
 *
 * @param {object} opts
 * @param {Function} opts.router - Next.js router
 * @param {Function} opts.onOpenPalette - 커맨드 팔레트 열기 콜백
 * @param {Function} opts.onToggleShortcuts - 단축키 도움말 토글 콜백
 * @param {Function} opts.onClosePalette - 팔레트 닫기 콜백
 * @param {Function} opts.onCloseShortcuts - 단축키 도움말 닫기 콜백
 */
export function useKeyboardShortcuts({
  router,
  onOpenPalette,
  onToggleShortcuts,
  onClosePalette,
  onCloseShortcuts,
  canEdit = false,
}) {
  const gPressedRef = useRef(false);
  const gTimerRef = useRef(null);
  const shortcutsEnabled = useSettingValue('keyboardShortcuts') !== 'off';

  useEffect(
    () => () => {
      if (gTimerRef.current) clearTimeout(gTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (!shortcutsEnabled) return undefined;

    const unmodified = e => !e.metaKey && !e.ctrlKey && !e.altKey;

    const PLAIN_KEY_ACTIONS = {
      n: e => {
        e.preventDefault();
        if (canEdit) router.push('/note/write');
      },
      '/': e => {
        e.preventDefault();
        document
          .querySelector('.filter-search input, [data-search-input], input[placeholder*="검색"]')
          ?.focus();
      },
      d: e => {
        e.preventDefault();
        setSetting('theme', getSetting('theme') === 'dark' ? 'light' : 'dark');
        applyAllSettings();
      },
    };

    const handleKeyDown = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenPalette();
        return;
      }

      const active = document.activeElement;
      const tag = active?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // 모달/다이얼로그 내부에 포커스가 있으면 전역 단축키(n/d/g 등) 비활성화
      // — 편집 중 'n'으로 페이지 이탈해 미저장 폼이 소실되는 것 방지
      if (active?.closest?.('[role="dialog"], [contenteditable="true"]')) return;

      if (gPressedRef.current) {
        const dest = G_NAV[e.key.toLowerCase()];
        gPressedRef.current = false;
        clearTimeout(gTimerRef.current);
        if (dest) {
          e.preventDefault();
          router.push(dest);
        }
        return;
      }
      if (e.key === 'g' && unmodified(e)) {
        e.preventDefault();
        gPressedRef.current = true;
        clearTimeout(gTimerRef.current);
        gTimerRef.current = setTimeout(() => {
          gPressedRef.current = false;
        }, 800);
        return;
      }

      if (unmodified(e) && PLAIN_KEY_ACTIONS[e.key]) {
        PLAIN_KEY_ACTIONS[e.key](e);
        return;
      }

      if (e.key === '?') onToggleShortcuts();
      if (e.key === 'Escape') {
        onCloseShortcuts();
        onClosePalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    router,
    onOpenPalette,
    onToggleShortcuts,
    onClosePalette,
    onCloseShortcuts,
    canEdit,
    shortcutsEnabled,
  ]);
}
