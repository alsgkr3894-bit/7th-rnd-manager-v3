'use client';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';

/**
 * 앱 전반에서 공통으로 쓰는 모달 틀.
 * - createPortal로 document.body에 렌더링
 * - 스크림(어두운 배경) + 카드 + 헤더(제목+닫기버튼)를 제공
 * - title, subtitle은 문자열 또는 ReactNode 모두 가능
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
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,.45)',
      display: 'grid', placeItems: 'center',
      zIndex,
    }}>
      <div className="card" style={{ width, maxHeight, overflowY: 'auto', padding }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 16,
        }}>
          <div>
            {title && <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button type="button" className="btn" style={{ padding: '4px 8px' }} onClick={onClose}>
            <Icon.close style={{ width: 16, height: 16 }}/>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
