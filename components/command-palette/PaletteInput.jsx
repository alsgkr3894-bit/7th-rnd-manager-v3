'use client';
import { Icon } from '../icons';

/** 팔레트 상단 검색 입력 영역 */
export function PaletteInput({ inputRef, value, onChange, onKeyDown }) {
  return (
    <div className="palette-input">
      <Icon.search style={{ width: 18, height: 18, color: 'var(--text-3)' }} />
      <input
        ref={inputRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="메뉴, 재료, 보고서, 노트, 작업 검색"
        aria-label="검색어 입력"
        aria-controls="palette-results"
      />
      <kbd>ESC</kbd>
    </div>
  );
}

export function PaletteFooter() {
  return (
    <div className="palette-foot">
      <span>
        <kbd>↑↓</kbd> 이동
      </span>
      <span>
        <kbd>↵</kbd> 선택
      </span>
      <span>
        <kbd>esc</kbd> 닫기
      </span>
    </div>
  );
}
