'use client';
import { useEffect, useRef } from 'react';
import { applyAllSettings, getSetting, setSetting } from '@/lib/settings';

const G_NAV = {
  h: '/',
  n: '/note',
  c: '/cost',
  r: '/report',
  s: '/note/sample',
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
}) {
  const gPressedRef = useRef(false);
  const gTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (gTimerRef.current) clearTimeout(gTimerRef.current);
    },
    []
  );

  useEffect(() => {
    const unmodified = e => !e.metaKey && !e.ctrlKey && !e.altKey;

    const PLAIN_KEY_ACTIONS = {
      n: e => {
        e.preventDefault();
        router.push('/note/write');
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

      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

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
  }, [router, onOpenPalette, onToggleShortcuts, onClosePalette, onCloseShortcuts]);
}
