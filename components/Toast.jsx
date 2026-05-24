'use client';
import { useState, useEffect } from 'react';

let _setToasts = null;

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { _setToasts = setToasts; return () => { _setToasts = null; }; }, []);

  const icons = {
    ok:    <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="2,8 6,12 14,4"/></svg>,
    error: <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>,
    info:  <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M8 7v5M8 5v.01"/></svg>,
    warn:  <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M8 6v4M8 11.5v.5"/></svg>,
  };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={'toast ' + t.type + (t.exiting ? ' exit' : '')}>
          <div className="toast-icon">{icons[t.type] || icons.ok}</div>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export function showToast(msg, type = 'ok', duration = 2800) {
  if (!_setToasts) return;
  const id = Date.now() + Math.random();
  _setToasts(t => [...t, { id, msg, type }]);
  setTimeout(() => {
    _setToasts(t => t.map(x => x.id === id ? { ...x, exiting: true } : x));
    setTimeout(() => _setToasts(t => t.filter(x => x.id !== id)), 220);
  }, duration);
}
