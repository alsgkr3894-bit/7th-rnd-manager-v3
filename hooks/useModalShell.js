'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import { useModalOrigin } from '@/hooks/useModalOrigin';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const CLOSE_MS = 180;

export function normalizeCloseMs(value, fallback = CLOSE_MS) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function normalizeCloseHandler(onClose) {
  return typeof onClose === 'function' ? onClose : () => {};
}

/**
 * 모달 공통 동작 훅 — 레이아웃/포털 여부는 호출 컴포넌트가 결정하고, 동작만 제공한다.
 *
 * 제공 동작:
 * - 클릭한 위치에서 펼쳐지는 transform-origin (useModalOrigin)
 * - Esc 키로 닫기
 * - 포커스 트랩(내부 Tab/Shift+Tab 순환) + 닫힐 때 이전 포커스 복원
 * - exit 애니메이션(기본 180ms) 후 onClose 호출
 *
 * @param {() => void} onClose
 * @param {{ closeMs?: number, autoFocus?: boolean }} [opts]
 * @returns {{ containerRef: React.RefObject, isClosing: boolean, close: () => void }}
 */
export function useModalShell(onClose, { closeMs = CLOSE_MS, autoFocus = true } = {}) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeHandler = normalizeCloseHandler(onClose);

  // 클릭한 위치에서 모달이 펼쳐지도록 transform-origin 설정
  useModalOrigin(containerRef);

  const close = useCallback(() => {
    if (closeTimerRef.current) return; // 이미 닫히는 중
    setIsClosing(true);
    closeTimerRef.current = setTimeout(closeHandler, normalizeCloseMs(closeMs));
  }, [closeHandler, closeMs]);

  // 타이머 cleanup
  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  // Esc 닫기
  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [close]);

  // 포커스 트랩 + 이전 포커스 복원
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const el = containerRef.current;
    if (!el) return;

    const getFocusable = () =>
      Array.from(el.querySelectorAll(FOCUSABLE)).filter(
        node => !node.disabled && node.offsetParent !== null
      );

    if (autoFocus) getFocusable()[0]?.focus();

    const handle = e => {
      if (e.key !== 'Tab') return;
      const nodes = getFocusable();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    el.addEventListener('keydown', handle);
    return () => {
      el.removeEventListener('keydown', handle);
      previousFocusRef.current?.focus?.();
    };
  }, [autoFocus]);

  return { containerRef, isClosing, close };
}
