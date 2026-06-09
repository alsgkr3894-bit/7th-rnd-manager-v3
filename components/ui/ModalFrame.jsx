'use client';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { useModalShell } from '@/hooks/useModalShell';
import { normalizeModalFrameStyle } from '@/lib/ui/modal-frame';
import { OVERLAY_COLOR } from '@/lib/ui/styles';

/**
 * 앱 전반에서 공통으로 쓰는 모달 틀.
 * - createPortal로 document.body에 렌더링
 * - 스크림(어두운 배경) + 카드 + 헤더(제목+닫기버튼)를 제공
 * - title, subtitle은 문자열 또는 ReactNode 모두 가능
 * - 공통 동작(포커스 트랩·복원, Esc, origin·exit 애니메이션)은 useModalShell이 담당
 */
export function ModalFrame({
  title,
  subtitle,
  onClose,
  width = 'min(860px, 96vw)',
  zIndex = 200,
  padding = '22px 26px',
  maxHeight = '92vh',
  children,
}) {
  const { containerRef, isClosing, close: handleClose } = useModalShell(onClose);
  const modalStyle = normalizeModalFrameStyle({ width, zIndex, padding, maxHeight });

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: OVERLAY_COLOR,
        display: 'grid',
        placeItems: 'center',
        zIndex: modalStyle.zIndex,
      }}
    >
      <div
        ref={containerRef}
        className={`card modal-anim${isClosing ? ' modal-exit' : ''}`}
        style={{
          width: modalStyle.width,
          maxHeight: modalStyle.maxHeight,
          overflowY: 'auto',
          padding: modalStyle.padding,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div>
            {title && <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>}
            {subtitle && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
          <button
            type="button"
            className="btn"
            style={{ padding: '4px 8px' }}
            onClick={handleClose}
          >
            <Icon.close style={{ width: 16, height: 16 }} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
