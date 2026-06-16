import { ExportResultActions, ExportResultLoading, ExportResultTabs } from './ExportResultControls';

export const ORIGIN_RESULT_TABS = [
  { key: 'store', label: '매장비치용' },
  { key: 'fridge', label: '냉장고부착용' },
  { key: 'delivery', label: '배달플랫폼용' },
  { key: 'statement', label: '원산지 정보' },
];

export function OriginResultLoading() {
  return <ExportResultLoading />;
}

export function OriginResultTopTabs() {
  return (
    <ExportResultTabs
      tabs={[{ key: 'origin', label: '원산지표시판' }]}
      activeKey="origin"
      className="origin-result-tabs-top"
    />
  );
}

export function OriginResultSubTabs({ tab, onTabChange }) {
  return <ExportResultTabs tabs={ORIGIN_RESULT_TABS} activeKey={tab} onChange={onTabChange} />;
}

export function OriginResultActions({ exporting, onEditIngredientNames, onPdf, onExcel }) {
  return (
    <ExportResultActions
      exporting={exporting}
      onPdf={onPdf}
      onExcel={onExcel}
      extraActions={[
        { key: 'ingredient-names', label: '✏️ 식자재명 편집', onClick: onEditIngredientNames },
      ]}
    />
  );
}
