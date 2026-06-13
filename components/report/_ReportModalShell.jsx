'use client';
import { Icon } from '@/components/icons';
import { noop } from '@/lib/ui/prop-guards';

export function ReportModalShell({ className, title, titleId, onClose, children, footer }) {
  const handleClose = typeof onClose === 'function' ? onClose : noop;

  return (
    <div className="modal-scrim">
      <div
        className={className}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-head">
          <h3 id={titleId}>{title}</h3>
          <button className="modal-close" onClick={handleClose}>
            <Icon.x style={{ width: 20, height: 20 }} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
