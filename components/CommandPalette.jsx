'use client';
import { PaletteInput, PaletteFooter } from './command-palette/PaletteInput';
import { PaletteResultList } from './command-palette/PaletteResultList';
import { useCommandPaletteState } from './command-palette/useCommandPaletteState';

/**
 * ⌘K 통합 검색 팔레트 (AppShell에서 dynamic import).
 * 상태/키보드/랭킹은 command-palette/useCommandPaletteState, 순수 헬퍼는 paletteUtils 참고.
 */
export default function CommandPalette({ open, onClose, canEdit = false }) {
  const palette = useCommandPaletteState({ open, onClose, canEdit });

  if (!open) return null;

  return (
    <div className="palette-scrim" role="presentation" onClick={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-label="통합 검색"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <PaletteInput
          inputRef={palette.inputRef}
          value={palette.q}
          onChange={palette.handleQueryChange}
          onKeyDown={palette.handleKey}
        />
        <PaletteResultList palette={palette} />
        <PaletteFooter />
      </div>
    </div>
  );
}
