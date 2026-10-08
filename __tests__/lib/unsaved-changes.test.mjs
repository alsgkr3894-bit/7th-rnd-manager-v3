import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  confirmUnsavedLeave,
  hasUnsavedChanges,
  isLeavingLinkClick,
  registerUnsavedChanges,
  resetUnsavedChanges,
} from '../../lib/ui/unsaved-changes.js';

// 2026-10-08: 저장 안 한 변경이 있어도 사이드바·링크·단축키 등으로 이동하면 확인 없이 사라지던 문제.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const originalWindow = globalThis.window;
let confirmMock;

beforeEach(() => {
  resetUnsavedChanges();
  confirmMock = jest.fn(() => true);
  globalThis.window = { confirm: confirmMock };
});

afterEach(() => {
  resetUnsavedChanges();
  globalThis.window = originalWindow;
});

describe('공용 저장 안 한 변경 목록', () => {
  test('등록이 없으면 묻지 않고 이동한다', () => {
    expect(hasUnsavedChanges()).toBe(false);
    expect(confirmUnsavedLeave()).toBe(true);
    expect(confirmMock).not.toHaveBeenCalled();
  });

  test('등록돼 있으면 확인창을 띄우고, 취소하면 이동하지 않는다', () => {
    registerUnsavedChanges('저장 안 함');
    confirmMock.mockReturnValueOnce(false);
    expect(hasUnsavedChanges()).toBe(true);
    expect(confirmUnsavedLeave(1000)).toBe(false);
    expect(confirmMock).toHaveBeenCalledWith('저장 안 함');
  });

  test('등록을 해제하면 다시 묻지 않는다(저장·화면 닫힘)', () => {
    const unregister = registerUnsavedChanges('저장 안 함');
    unregister();
    expect(hasUnsavedChanges()).toBe(false);
    expect(confirmUnsavedLeave()).toBe(true);
    expect(confirmMock).not.toHaveBeenCalled();
  });

  test('여러 화면이 등록돼 있으면 가장 나중 문구를 보여주고, 하나를 해제해도 나머지는 남는다', () => {
    const first = registerUnsavedChanges('첫 번째');
    registerUnsavedChanges('두 번째');
    confirmUnsavedLeave(1000);
    expect(confirmMock).toHaveBeenLastCalledWith('두 번째');
    first();
    expect(hasUnsavedChanges()).toBe(true);
  });

  test('"이동"을 고른 직후 같은 클릭이 두 번째 입구를 지나도 확인창은 한 번만', () => {
    registerUnsavedChanges('저장 안 함');
    expect(confirmUnsavedLeave(1000)).toBe(true);
    expect(confirmUnsavedLeave(1500)).toBe(true);
    expect(confirmMock).toHaveBeenCalledTimes(1);
    // 시간이 충분히 지나면 다시 묻는다
    expect(confirmUnsavedLeave(5000)).toBe(true);
    expect(confirmMock).toHaveBeenCalledTimes(2);
  });

  test('취소한 뒤에는 면제 시간이 생기지 않는다', () => {
    registerUnsavedChanges('저장 안 함');
    confirmMock.mockReturnValue(false);
    expect(confirmUnsavedLeave(1000)).toBe(false);
    expect(confirmUnsavedLeave(1100)).toBe(false);
    expect(confirmMock).toHaveBeenCalledTimes(2);
  });
});

describe('어떤 링크 클릭이 "떠나는" 클릭인가', () => {
  const current = { origin: 'http://localhost:3000', pathname: '/note/write' };
  const link = { origin: 'http://localhost:3000', pathname: '/cost/margin' };
  const click = { button: 0 };

  test('같은 사이트의 다른 화면 링크는 떠나는 클릭', () => {
    expect(isLeavingLinkClick(click, link, current)).toBe(true);
    expect(isLeavingLinkClick(click, { ...link, target: '_self' }, current)).toBe(true);
  });

  test('새 탭·새 창·휠클릭·다운로드·다른 사이트·같은 화면(쿼리만 다름)은 아니다', () => {
    expect(isLeavingLinkClick({ button: 0, ctrlKey: true }, link, current)).toBe(false);
    expect(isLeavingLinkClick({ button: 0, metaKey: true }, link, current)).toBe(false);
    expect(isLeavingLinkClick({ button: 0, shiftKey: true }, link, current)).toBe(false);
    expect(isLeavingLinkClick({ button: 1 }, link, current)).toBe(false);
    expect(isLeavingLinkClick({ button: 0, defaultPrevented: true }, link, current)).toBe(false);
    expect(isLeavingLinkClick(click, { ...link, target: '_blank' }, current)).toBe(false);
    expect(isLeavingLinkClick(click, { ...link, hasDownload: true }, current)).toBe(false);
    expect(isLeavingLinkClick(click, { ...link, origin: 'https://example.com' }, current)).toBe(
      false
    );
    expect(isLeavingLinkClick(click, { ...link, pathname: '/note/write' }, current)).toBe(false);
  });
});

describe('연결', () => {
  test('useBeforeUnload가 공용 목록에 등록한다 → 노트 작성·수정·식자재 폼·연구일지 4곳이 자동 보호', () => {
    const hook = read('hooks/useBeforeUnload.js');
    expect(hook).toContain('registerUnsavedChanges(safeMessage)');
    expect(hook).toContain('unregister();');
    for (const page of [
      'app/note/write/useNoteWriteController.js',
      'app/note/[id]/page.jsx',
      'app/ingredient/manage/useIngredientFormController.js',
      'app/note/journal/useJournalLeaveGuard.js',
    ]) {
      expect(read(page)).toContain('useBeforeUnload(');
    }
  });

  test('이동 입구마다 이동 전에 확인한다', () => {
    const entries = {
      'components/Sidebar.jsx': 'if (!confirmUnsavedLeave()) return;',
      'components/TopBar.jsx': 'canEdit && confirmUnsavedLeave()',
      'components/command-palette/useCommandPaletteState.js': 'if (!confirmUnsavedLeave()) return;',
      'components/topbar/NotificationPopover.jsx': 'if (confirmUnsavedLeave()) router.push(n.href)',
      'components/topbar/ProfileMenu.jsx': 'if (!confirmUnsavedLeave()) return;',
      'hooks/useAppBrands.js': 'if (!confirmUnsavedLeave()) return;',
      'components/AppShell.jsx': 'if (confirmUnsavedLeave()) router.push(tab.href);',
    };
    for (const [file, expected] of Object.entries(entries)) {
      expect(read(file)).toContain(expected);
    }
  });

  test('브랜드 전환은 확인을 먼저 받고, 서버 큐 비우기·전환보다 앞선다', () => {
    const src = read('hooks/useAppBrands.js');
    expect(src.indexOf('if (!confirmUnsavedLeave()) return;')).toBeLessThan(
      src.indexOf('await drainServerStoreSyncQueue()')
    );
  });

  test('단축키 이동도 확인을 거치고, 앱 전체 링크 가로채기가 AppShell에 붙어 있다', () => {
    const shell = read('components/AppShell.jsx');
    expect(shell).toContain('router: guardedRouter,');
    expect(shell).toContain('<UnsavedLinkGuard />');
    expect(read('components/UnsavedLinkGuard.jsx')).toContain(
      "document.addEventListener('click', onClick, true)"
    );
  });

  test('replace(저장 후 이동)는 확인 대상이 아니다 — 저장 직후 확인창이 뜨면 안 된다', () => {
    const shell = read('components/AppShell.jsx');
    expect(shell).toContain('...router,');
    expect(shell).not.toMatch(/replace:\s*\(/);
  });
});
