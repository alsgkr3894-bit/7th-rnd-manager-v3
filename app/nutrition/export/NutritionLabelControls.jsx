import { ExportResultActions, ExportResultLoading, ExportResultTabs } from './ExportResultControls';

export const NUTRITION_LABEL_TABS = [
  { key: 'poster', label: '통합 포스터' },
  { key: 'pizza', label: '피자', orderCategory: 'pizza' },
  { key: 'side', label: '사이드·파스타', orderCategory: 'side' },
  { key: 'topping', label: '추가토핑', orderCategory: 'topping' },
  { key: 'set', label: '세트박스·하프앤하프', orderCategory: 'set' },
  { key: 'drink', label: '음료', orderCategory: 'drink' },
];

/** 카테고리별 "출력명·순서" 편집 대상 라벨 — 버튼/모달 제목에 사용 */
export const NUTRITION_LABEL_ORDER_CATEGORY_NAMES = {
  pizza: '피자',
  side: '사이드·파스타',
  topping: '추가토핑',
  set: '세트박스·하프앤하프',
  drink: '음료',
};

export function NutritionLabelLoading() {
  return <ExportResultLoading />;
}

export function NutritionLabelTabs({ tab, onTabChange }) {
  return <ExportResultTabs tabs={NUTRITION_LABEL_TABS} activeKey={tab} onChange={onTabChange} />;
}

export function NutritionLabelActions({ exporting, onPdf, onExcel, onEditMenuNames, tab }) {
  // 통합 포스터 탭은 여러 카테고리가 섞여 보이므로, 탭에 카테고리가 지정된 경우에만
  // 그 카테고리 전용 "출력명·순서" 편집 버튼을 보여준다.
  const category = NUTRITION_LABEL_TABS.find(item => item.key === tab)?.orderCategory || null;
  const categoryLabel = category ? NUTRITION_LABEL_ORDER_CATEGORY_NAMES[category] : '';
  const extraActions = category
    ? [
        {
          key: 'menu-names',
          label: `출력명·순서 (${categoryLabel})`,
          onClick: () => onEditMenuNames?.(category),
        },
      ]
    : [];
  return (
    <ExportResultActions exporting={exporting} onPdf={onPdf} onExcel={onExcel} extraActions={extraActions} />
  );
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
