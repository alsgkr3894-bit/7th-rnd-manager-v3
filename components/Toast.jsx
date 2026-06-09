'use client';
import { useState, useEffect } from 'react';

let _setToasts = null;
let _toastSeq = 0;
const EXIT_MS = 220;
const DEFAULT_DURATION_MS = 2800;

function updateToasts(updater) {
  if (!_setToasts) return false;
  _setToasts(updater);
  return true;
}

function normalizeToastDuration(duration, fallback = DEFAULT_DURATION_MS) {
  const n = Number(duration);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    _setToasts = setToasts;
    return () => {
      _setToasts = null;
    };
  }, []);

  function dismiss(id) {
    updateToasts(t => t.map(x => (x.id === id ? { ...x, exiting: true } : x)));
    setTimeout(() => updateToasts(t => t.filter(x => x.id !== id)), EXIT_MS);
  }

  const icons = {
    ok: (
      <svg
        viewBox="0 0 16 16"
        width="11"
        height="11"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <polyline points="2,8 6,12 14,4" />
      </svg>
    ),
    error: (
      <svg
        viewBox="0 0 16 16"
        width="11"
        height="11"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M4 4l8 8M12 4l-8 8" />
      </svg>
    ),
    info: (
      <svg
        viewBox="0 0 16 16"
        width="11"
        height="11"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M8 7v5M8 5v.01" />
      </svg>
    ),
    warn: (
      <svg
        viewBox="0 0 16 16"
        width="11"
        height="11"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M8 6v4M8 11.5v.5" />
      </svg>
    ),
  };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={'toast ' + t.type + (t.exiting ? ' exit' : '')}>
          <div className="toast-icon">{icons[t.type] || icons.ok}</div>
          {t.msg}
          {t.action && (
            <button
              className="toast-action"
              onClick={() => {
                dismiss(t.id);
                t.action?.onClick?.();
              }}
            >
              {t.action.label}
            </button>
          )}
          <button className="toast-dismiss" onClick={() => dismiss(t.id)} title="닫기">
            <svg
              viewBox="0 0 16 16"
              width="9"
              height="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export function showToast(msg, type = 'ok', duration = DEFAULT_DURATION_MS, action = null) {
  const id = ++_toastSeq;
  const resolvedType = type === 'err' ? 'error' : type;
  // 최대 3개까지만 쌓임 — 초과 시 가장 오래된 것부터 제거
  if (
    !updateToasts(t => {
      const next = [...t, { id, msg, type: resolvedType, action }];
      return next.length > 3 ? next.slice(next.length - 3) : next;
    })
  )
    return;
  setTimeout(() => {
    updateToasts(t => t.map(x => (x.id === id ? { ...x, exiting: true } : x)));
    setTimeout(() => updateToasts(t => t.filter(x => x.id !== id)), EXIT_MS);
  }, normalizeToastDuration(duration));
}
