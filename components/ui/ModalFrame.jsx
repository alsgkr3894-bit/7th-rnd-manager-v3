'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { useModalOrigin } from '@/hooks/useModalOrigin';

/**
 * 앱 전반에서 공통으로 쓰는 모달 틀.
 * - createPortal로 document.body에 렌더링
 * - 스크림(어두운 배경) + 카드 + 헤더(제목+닫기버튼)를 제공
 * - title, subtitle은 문자열 또는 ReactNode 모두 가능
 * - 포커스 트랩: 모달 내부 요소 간 Tab/Shift+Tab 순환, 닫힐 때 이전 포커스 복원
 * - Esc 키로 닫기, 180ms 닫기 애니메이션
 */
export function ModalFrame({
  title,
  subtitle,
  onClose,
  width     = 'min(860px, 96vw)',
  zIndex    = 200,
  padding   = '22px 26px',
  maxHeight = '92vh',
  children,
}) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [isClosing, setIsClosing] = useState(false);

  // 클릭한 위치에서 모달이 펼쳐지도록 transform-origin 설정
  useModalOrigin(containerRef);

  const handleClose = useCallback(() => {
    if (closeTimerRef.current) return; // 이미 닫히는 중
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => onClose(), 180);
  }, [onClose]);

  // 타이머 cleanup (컴포넌트 언마운트 시)
  useEffect(() => () => { clearTimeout(closeTimerRef.current); }, []);

  // Esc 키 닫기
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleClose]);

  // 포커스 트랩
  useEffect(() => {
    previousFocusRef.current = document.activeElement;

    const el = containerRef.current;
    if (!el) return;

    const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(el.querySelectorAll(FOCUSABLE)).filter(
        (node) => !node.disabled && node.offsetParent !== null
      );

    getFocusable()[0]?.focus();

    const handle = (e) => {
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
  }, []);

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,.45)',
      display: 'grid', placeItems: 'center',
      zIndex,
    }}>
      <div
        ref={containerRef}
        className={`card modal-anim${isClosing ? ' modal-exit' : ''}`}
        style={{ width, maxHeight, overflowY: 'auto', padding }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 16,
        }}>
          <div>
            {title    && <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button type="button" className="btn" style={{ padding: '4px 8px' }} onClick={handleClose}>
            <Icon.close style={{ width: 16, height: 16 }}/>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
