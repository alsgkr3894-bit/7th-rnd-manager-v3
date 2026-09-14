import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

describe('사이드바 접기(데스크톱)', () => {
  const shellSource = src('components/AppShell.jsx');
  const sidebarSource = src('components/Sidebar.jsx');
  const layoutCss = src('app/styles/layout.css');
  const chromeCss = src('app/styles/components/chrome.css');

  test('AppShell이 collapsed 상태를 localStorage로 복원·저장하고 Sidebar에 내려준다', () => {
    expect(shellSource).toContain("import { tryLS, setLS } from '@/lib/note/storage'");
    expect(shellSource).toContain(
      "import { normalizeSidebarCollapsed } from '@/lib/ui/sidebar-state'"
    );
    expect(shellSource).toContain(
      'const [sidebarCollapsed, setSidebarCollapsed] = useState(false)'
    );
    expect(shellSource).toContain(
      "setSidebarCollapsed(normalizeSidebarCollapsed(tryLS(KEYS.SIDEBAR_COLLAPSED, '0')))"
    );
    expect(shellSource).toContain('function toggleSidebarCollapsed(next)');
    expect(shellSource).toContain("setLS(KEYS.SIDEBAR_COLLAPSED, next ? '1' : '0')");
    expect(shellSource).toContain("sidebarCollapsed ? 'sidebar-collapsed' : ''");
    expect(shellSource).toContain('collapsed={sidebarCollapsed}');
    expect(shellSource).toContain('onToggleCollapse={toggleSidebarCollapsed}');
  });

  test('Sidebar가 collapsed/onToggleCollapse를 받아 접기 버튼과 레일 동작을 제공한다', () => {
    expect(sidebarSource).toContain('collapsed = false');
    expect(sidebarSource).toContain('onToggleCollapse');
    expect(sidebarSource).toContain('className="sidebar-collapse-btn"');
    expect(sidebarSource).toContain('onClick={() => onToggleCollapse?.(!collapsed)}');
    // 접힘 상태에서 그룹을 누르면 먼저 펼치고 그 그룹을 연다(자식이 바로 보이게).
    expect(sidebarSource).toContain('if (collapsed) onToggleCollapse?.(false);');
    expect(sidebarSource).toContain('toggle(item.id, collapsed);');
  });

  test('레이아웃 CSS가 접힘 폭을 데스크톱(≥769px)에만 적용하고 모바일 오버레이는 그대로 둔다', () => {
    expect(layoutCss).toContain('.sidebar-collapse-btn');
    expect(layoutCss).toContain('@media (min-width: 769px)');
    expect(layoutCss).toContain('.app.sidebar-collapsed {');
    expect(layoutCss).toContain('grid-template-columns: 64px 1fr');
    // 모바일 슬라이드 오버레이(768px 이하)는 chrome.css가 여전히 소유 — layout.css가 건드리지 않는다.
    expect(chromeCss).toContain('@media (max-width: 768px)');
    expect(chromeCss).toContain('transform: translateX(-100%)');
  });
});
