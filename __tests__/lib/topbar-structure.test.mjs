import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const topBarSrc = readFileSync(resolve('components/TopBar.jsx'), 'utf-8');
const companyPickerSrc = readFileSync(resolve('components/topbar/CompanyPicker.jsx'), 'utf-8');
const notifSrc = readFileSync(resolve('components/topbar/NotificationPopover.jsx'), 'utf-8');
const profileMenuSrc = readFileSync(resolve('components/topbar/ProfileMenu.jsx'), 'utf-8');
const themeToggleSrc = readFileSync(resolve('components/topbar/ThemeToggle.jsx'), 'utf-8');

describe('TopBar 서브컴포넌트 분리 구조', () => {
  test('TopBar.jsx가 4개 서브컴포넌트를 사용한다', () => {
    expect(topBarSrc).toContain('<CompanyPicker');
    expect(topBarSrc).toContain('<ThemeToggle');
    expect(topBarSrc).toContain('<NotificationPopover');
    expect(topBarSrc).toContain('<ProfileMenu');
  });

  test('TopBar.jsx가 clearAuthCookie를 직접 import하지 않는다', () => {
    expect(topBarSrc).not.toContain('clearAuthCookie');
  });

  test('TopBar.jsx가 getInitial을 직접 import하지 않는다', () => {
    expect(topBarSrc).not.toContain('getInitial');
  });

  test('TopBar.jsx 새 노트 버튼은 viewer에서 비활성화된다', () => {
    expect(topBarSrc).toContain('canEdit = false');
    expect(topBarSrc).toContain("if (canEdit) router.push('/note/write')");
    expect(topBarSrc).toContain('disabled={!canEdit}');
  });

  test('ProfileMenu.jsx가 clearAuthCookie를 import한다', () => {
    expect(profileMenuSrc).toContain('clearAuthCookie');
    expect(profileMenuSrc).toContain('handleLogout');
  });

  test('ProfileMenu.jsx가 getInitial로 아바타 이니셜을 표시한다', () => {
    expect(profileMenuSrc).toContain('getInitial');
  });

  test('NotificationPopover.jsx가 meta 알림 아이콘 매핑을 포함한다', () => {
    expect(notifSrc).toContain('alert');
    expect(notifSrc).toContain('note');
    expect(notifSrc).toContain('notif-pop');
  });

  test('CompanyPicker.jsx가 company-wrap과 company-drop을 포함한다', () => {
    expect(companyPickerSrc).toContain('company-wrap');
    expect(companyPickerSrc).toContain('company-drop');
    expect(companyPickerSrc).toContain('company-pick');
  });

  test('ThemeToggle.jsx가 dark/light 아이콘 토글을 포함한다', () => {
    expect(themeToggleSrc).toContain('Icon.sun');
    expect(themeToggleSrc).toContain('Icon.moon');
  });
});
