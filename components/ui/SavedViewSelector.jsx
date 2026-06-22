'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSavedViews,
  saveView,
  deleteView,
  setDefaultView,
  getDefaultView,
  renameView,
} from '@/lib/saved-views';

/**
 * SavedViewSelector — 자주 쓰는 필터 조합 저장/적용 드롭다운
 *
 * @param {string} screen - 화면 식별자 (예: 'ingredient-manage')
 * @param {object} currentFilters - 현재 필터 상태
 * @param {function} onApply - (filters) => void — 뷰 적용 시 호출
 * @param {function} [onLoad] - 뷰 목록이 로드될 때 기본 뷰 적용 용도
 */
export function SavedViewSelector({ screen, currentFilters, onApply, onLoad }) {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const [defaultName, setDefaultName] = useState(null);
  const ref = useRef(null);

  const refresh = useCallback(() => {
    const list = getSavedViews(screen);
    const def = getDefaultView(screen);
    setViews(list);
    setDefaultName(def);
    return { list, def };
  }, [screen]);

  useEffect(() => {
    const { list, def } = refresh();
    // 기본 뷰가 있고 onLoad가 있을 때 자동 적용
    if (def && onLoad) {
      const found = list.find(v => v.name === def);
      if (found) onLoad(found.filters);
    }
  }, [onLoad, refresh]);

  useEffect(() => {
    if (!open) return;
    refresh();
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open, refresh]);

  function handleSave() {
    const name = saveName.trim();
    if (!name) return;
    saveView(screen, name, currentFilters);
    setSaveName('');
    setSaving(false);
    refresh();
  }

  function handleApply(v) {
    onApply(v.filters);
    setOpen(false);
  }

  function handleDelete(name, e) {
    e.stopPropagation();
    deleteView(screen, name);
    if (defaultName === name) {
      setDefaultView(screen, null);
      setDefaultName(null);
    }
    refresh();
  }

  function handleToggleDefault(name, e) {
    e.stopPropagation();
    const next = defaultName === name ? null : name;
    setDefaultView(screen, next);
    setDefaultName(next);
  }

  function handleRenameStart(v, e) {
    e.stopPropagation();
    setRenaming(v.name);
    setRenameVal(v.name);
  }

  function handleRenameConfirm() {
    if (!renaming) return;
    const next = renameVal.trim();
    if (next && next !== renaming) renameView(screen, renaming, next);
    setRenaming(null);
    refresh();
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn"
        style={{ fontSize: 12, gap: 4, display: 'flex', alignItems: 'center' }}
        onClick={() => setOpen(v => !v)}
        title="저장된 뷰"
      >
        <BookmarkIcon />뷰 {views.length > 0 ? `(${views.length})` : ''}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 300,
            background: 'var(--surface)',
            border: '1px solid var(--divider)',
            borderRadius: 8,
            boxShadow: 'var(--shadow-lg)',
            minWidth: 220,
            padding: 8,
          }}
        >
          {views.length === 0 && !saving && (
            <div style={{ padding: '8px 4px', fontSize: 12, color: 'var(--text-3)' }}>
              저장된 뷰가 없습니다
            </div>
          )}

          {views.map(v => (
            <div
              key={v.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 4px',
                borderRadius: 5,
                cursor: 'pointer',
                background: renaming === v.name ? 'var(--surface-2)' : undefined,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => {
                if (renaming === v.name) {
                  e.currentTarget.style.background = 'var(--surface-2)';
                } else {
                  e.currentTarget.style.removeProperty('background');
                }
              }}
            >
              {renaming === v.name ? (
                <>
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameConfirm();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                    style={{
                      flex: 1,
                      fontSize: 12,
                      border: '1px solid var(--accent)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                    }}
                  />
                  <button
                    className="btn"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    onClick={handleRenameConfirm}
                  >
                    확인
                  </button>
                </>
              ) : (
                <>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => handleApply(v)}
                    title={v.name}
                  >
                    {defaultName === v.name && (
                      <span style={{ color: 'var(--accent)', marginRight: 4 }}>★</span>
                    )}
                    {v.name}
                  </span>
                  <button
                    className="icon-btn"
                    style={{ opacity: 0.5, fontSize: 10 }}
                    onClick={e => handleToggleDefault(v.name, e)}
                    title={defaultName === v.name ? '기본 뷰 해제' : '기본 뷰로 지정'}
                  >
                    {defaultName === v.name ? '★' : '☆'}
                  </button>
                  <button
                    className="icon-btn"
                    style={{ opacity: 0.5, fontSize: 10 }}
                    onClick={e => handleRenameStart(v, e)}
                    title="이름 변경"
                  >
                    ✏️
                  </button>
                  <button
                    className="icon-btn"
                    style={{ opacity: 0.5, fontSize: 10, color: 'var(--negative)' }}
                    onClick={e => handleDelete(v.name, e)}
                    title="삭제"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}

          <div
            style={{
              borderTop: views.length > 0 ? '1px solid var(--divider)' : 'none',
              marginTop: views.length > 0 ? 6 : 0,
              paddingTop: 6,
            }}
          >
            {saving ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  autoFocus
                  placeholder="뷰 이름 입력"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') setSaving(false);
                  }}
                  style={{
                    flex: 1,
                    fontSize: 12,
                    border: '1px solid var(--divider)',
                    borderRadius: 4,
                    padding: '4px 8px',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                  }}
                />
                <button className="btn primary" style={{ fontSize: 11 }} onClick={handleSave}>
                  저장
                </button>
                <button className="btn" style={{ fontSize: 11 }} onClick={() => setSaving(false)}>
                  취소
                </button>
              </div>
            ) : (
              <button
                className="btn"
                style={{ width: '100%', fontSize: 12, justifyContent: 'center' }}
                onClick={() => setSaving(true)}
              >
                + 현재 필터 저장
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BookmarkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
