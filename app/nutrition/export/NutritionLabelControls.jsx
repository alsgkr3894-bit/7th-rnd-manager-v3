import { ExportResultActions, ExportResultLoading, ExportResultTabs } from './ExportResultControls';

export const NUTRITION_LABEL_TABS = [
  { key: 'poster', label: '통합 포스터' },
  { key: 'pizza', label: '피자' },
  { key: 'side', label: '사이드·파스타' },
  { key: 'topping', label: '추가토핑' },
  { key: 'set', label: '세트박스·하프앤하프' },
  { key: 'drink', label: '음료' },
];

export function NutritionLabelLoading() {
  return <ExportResultLoading />;
}

export function NutritionLabelTabs({ tab, onTabChange }) {
  return <ExportResultTabs tabs={NUTRITION_LABEL_TABS} activeKey={tab} onChange={onTabChange} />;
}

export function NutritionLabelActions({ exporting, onPdf, onExcel }) {
  return <ExportResultActions exporting={exporting} onPdf={onPdf} onExcel={onExcel} />;
}

export function PizzaViewControls({ pizzaView, onPizzaViewChange, onOpenSliceConfig }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        marginBottom: 10,
        flexWrap: 'wrap',
      }}
    >
      {['150g', 'slice'].map(value => (
        <button
          key={value}
          type="button"
          className={'chip ' + (pizzaView === value ? 'active' : '')}
          onClick={() => onPizzaViewChange(value)}
        >
          {value === '150g' ? '150g 기준' : '조각 기준'}
        </button>
      ))}
      {pizzaView === 'slice' && (
        <button
          type="button"
          className="btn sm"
          style={{ marginLeft: 'auto' }}
          onClick={onOpenSliceConfig}
        >
          ⚙ 조각수 설정
        </button>
      )}
    </div>
  );
}
