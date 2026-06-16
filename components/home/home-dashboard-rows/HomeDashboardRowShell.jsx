import { WidgetShell } from '@/components/home/WidgetShell';

export function pairDashboardRow(left, right, rowKey) {
  if (!left && !right) return null;
  if (left && right) {
    return (
      <div key={rowKey} className="row-2b motion-stagger">
        {left}
        {right}
      </div>
    );
  }

  return (
    <div key={rowKey} className="row-2b motion-stagger">
      <div style={{ gridColumn: '1 / -1' }}>{left || right}</div>
    </div>
  );
}

export function HomeDashboardWidgetFrame({ context, widgetKey, label, children }) {
  return (
    <WidgetShell
      widgetKey={widgetKey}
      label={label}
      isCollapsed={context.isCollapsed(widgetKey)}
      onToggle={context.toggleCollapse}
    >
      {children}
    </WidgetShell>
  );
}
