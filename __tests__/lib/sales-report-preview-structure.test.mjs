import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('sales report preview structure', () => {
  test('판매량 보고서 page는 미리보기 렌더링을 전용 컴포넌트에 위임한다', () => {
    const pageSource = readFileSync(resolve('app/report/sales/page.jsx'), 'utf8');
    const previewSource = readFileSync(
      resolve('components/report/sales/SalesReportPreview.jsx'),
      'utf8'
    );
    const moverSource = readFileSync(
      resolve('components/report/sales/SalesPizzaMoverSection.jsx'),
      'utf8'
    );
    const rankSource = readFileSync(
      resolve('components/report/sales/SalesRankTableSection.jsx'),
      'utf8'
    );
    const categoryBarSource = readFileSync(
      resolve('components/report/sales/SalesCategoryBarRows.jsx'),
      'utf8'
    );
    const categoryBarRowSource = readFileSync(
      resolve('components/report/sales/SalesCategoryBarRow.jsx'),
      'utf8'
    );
    const categoryBarMetricsSource = readFileSync(
      resolve('components/report/sales/salesCategoryBarMetrics.js'),
      'utf8'
    );
    const rankTableSource = readFileSync(
      resolve('components/report/sales/SalesRankTable.jsx'),
      'utf8'
    );
    const rankTableRowsSource = readFileSync(
      resolve('components/report/sales/SalesRankTableRows.jsx'),
      'utf8'
    );
    const compareSource = readFileSync(
      resolve('components/report/sales/SalesCompareTableSection.jsx'),
      'utf8'
    );
    const excludedSource = readFileSync(
      resolve('components/report/sales/SalesExcludedListSection.jsx'),
      'utf8'
    );

    expect(pageSource).toContain(
      "SalesReportPreview from '@/components/report/sales/SalesReportPreview'"
    );
    expect(pageSource).toContain('readSalesReportQuery');
    expect(pageSource).toContain('new URLSearchParams(window.location.search)');
    expect(pageSource).toContain("params.get('year')");
    expect(pageSource).toContain("params.get('view')");
    expect(pageSource).toContain("params.get('cmpYear')");
    expect(pageSource).toContain('<SalesReportPreview');
    expect(pageSource).not.toContain('피자 전월 대비 상승 / 하락 TOP 5');
    expect(previewSource).toContain("from './SalesPizzaMoverSection'");
    expect(previewSource).toContain("from './SalesRankTableSection'");
    expect(previewSource).toContain("from './SalesCompareTableSection'");
    expect(previewSource).toContain("from './SalesExcludedListSection'");
    expect(previewSource).toContain('<SalesPizzaMoverSection');
    expect(previewSource).toContain('<SalesRankTableSection');
    expect(previewSource).toContain('<SalesCompareTableSection');
    expect(previewSource).toContain('<SalesExcludedListSection');
    expect(previewSource).not.toContain('피자 전월 대비 상승 / 하락 TOP 5');
    expect(previewSource).toContain("scope === 'all' ? '전체 메뉴'");
    expect(previewSource).not.toContain("safeScope === 'pizza' ? '피자' : '사이드'");
    expect(moverSource).toContain('피자 {compareLabel} 대비 상승 / 하락 TOP 5');
    expect(moverSource).toContain('periodCompareLabel');
    // 단종 메뉴는 상승/하락/베스트/워스트 집계에서 제외되고, 그 사실을 안내 문구로 알린다.
    expect(moverSource).toContain('eligible = all.filter(item => !item.discontinued)');
    expect(moverSource).toContain('단종·비정규 메뉴는 상승·하락·베스트·워스트 집계에서 제외됩니다');
    expect(rankTableRowsSource).toContain("from '@/components/sales/DiscontinuedBadge'");
    expect(rankTableRowsSource).toContain("from '@/components/sales/IrregularMenuBadge'");
    // menu_master에 없는 판매명(unregistered)은 관리자에게 "단종" 버튼을 보여주고,
    // 이미 단종 처리된 비정규메뉴는 DiscontinuedBadge 대신 IrregularMenuBadge로 구분하며
    // 배지 자체에서 onUnmark로 되돌릴 수 있다.
    expect(rankTableRowsSource).toContain('item.irregular ? (');
    expect(rankTableRowsSource).toContain('item.discontinued && <DiscontinuedBadge />');
    expect(rankTableRowsSource).toContain(
      'onUnmark={canUnmark ? () => onUnmarkIrregular(item.name) : undefined}'
    );
    expect(rankTableRowsSource).toContain('item.unregistered && canEdit && canMark');
    expect(rankTableRowsSource).toContain('onMarkIrregular(item.name)');
    // 버튼 라벨은 "단종"(짧은 명칭) — "단종 처리"라는 옛 라벨 문구는 더 이상 없어야 한다.
    expect(rankTableRowsSource).not.toContain('단종 처리');
    expect(rankSource).toContain('export function SalesRankTableSection');
    expect(rankSource).toContain("from './SalesCategoryBarRows'");
    expect(rankSource).toContain("from './SalesRankTable'");
    expect(rankSource).toContain('<SalesRankTable');
    expect(rankSource).toContain('<SalesCategoryBarRows');
    expect(rankSource).not.toContain("from './SalesRankTableRows'");
    expect(rankSource).not.toContain('function SalesVariantRows');
    expect(rankSource).not.toContain('className="paper-table"');
    expect(categoryBarSource).toContain('export function SalesCategoryBarRows');
    expect(categoryBarSource).toContain("from './SalesCategoryBarRow'");
    expect(categoryBarSource).toContain('<SalesCategoryBarRow');
    expect(categoryBarSource).not.toContain('pct.toFixed(1)');
    expect(categoryBarRowSource).toContain("from './salesCategoryBarMetrics'");
    expect(categoryBarRowSource).toContain('export function SalesCategoryBarRow');
    expect(categoryBarRowSource).not.toContain('safeQuantity(item.quantity)');
    expect(categoryBarRowSource).toContain('pct.toFixed(1)');
    expect(categoryBarRowSource).toContain('formatNumber(quantity)');
    expect(categoryBarMetricsSource).toContain('export function buildSalesCategoryBarMetrics');
    expect(categoryBarMetricsSource).toContain('safeQuantity(item.quantity)');
    expect(categoryBarMetricsSource).toContain('dotOpacity');
    expect(categoryBarMetricsSource).toContain('barOpacity');
    expect(categoryBarSource).not.toContain('export function SalesRankTable');
    expect(rankTableSource).toContain('export function SalesRankTable');
    expect(rankTableSource).toContain("from './SalesRankTableRows'");
    expect(rankTableSource).toContain('<SalesRankItemRows');
    expect(rankTableSource).toContain('className="paper-table"');
    expect(rankTableSource).not.toContain('export function SalesCategoryBarRows');
    expect(rankTableSource).not.toContain('function SalesVariantRows');
    expect(rankTableSource).not.toContain('function SalesRankDeltaCell');
    expect(rankTableRowsSource).toContain('export function SalesVariantRows');
    expect(rankTableRowsSource).toContain('export function SalesRankDeltaCell');
    expect(rankTableRowsSource).toContain('export function SalesRankItemRows');
    expect(rankTableRowsSource).toContain('safeQuantity(item.prevQty)');
    expect(compareSource).toContain('export function SalesCompareTableSection');
    expect(excludedSource).toContain('export function SalesExcludedListSection');
  });

  test('비정규메뉴 단종 처리 — canEdit·onMarkIrregular가 page부터 순위행까지 배선돼 있다', () => {
    const pageSource = readFileSync(resolve('app/report/sales/page.jsx'), 'utf8');
    const previewSource = readFileSync(
      resolve('components/report/sales/SalesReportPreview.jsx'),
      'utf8'
    );
    const rankSectionSource = readFileSync(
      resolve('components/report/sales/SalesRankTableSection.jsx'),
      'utf8'
    );
    const rankTableSource = readFileSync(
      resolve('components/report/sales/SalesRankTable.jsx'),
      'utf8'
    );
    const rankTableRowsSource = readFileSync(
      resolve('components/report/sales/SalesRankTableRows.jsx'),
      'utf8'
    );
    const irregularHookSource = readFileSync(resolve('hooks/useIrregularMenuNames.js'), 'utf8');
    const nameSetsHookSource = readFileSync(resolve('hooks/useMenuMasterNameSets.js'), 'utf8');

    expect(pageSource).toContain("from '@/hooks/useMenuMasterNameSets'");
    expect(pageSource).toContain("from '@/hooks/useIrregularMenuNames'");
    expect(pageSource).toContain("from '@/hooks/useCurrentRole'");
    expect(pageSource).toContain('async function handleMarkIrregular(menuName)');
    expect(pageSource).toContain('addRefDiscontinued({ menuName })');
    expect(pageSource).toContain('async function handleUnmarkIrregular(menuName)');
    expect(pageSource).toContain('deleteRefDiscontinuedByName(menuName)');
    expect(pageSource).toContain('canEdit={canEdit}');
    expect(pageSource).toContain('onMarkIrregular={handleMarkIrregular}');
    expect(pageSource).toContain('onUnmarkIrregular={handleUnmarkIrregular}');

    expect(previewSource).toContain('canEdit={canEdit}');
    expect(previewSource).toContain('onMarkIrregular={onMarkIrregular}');
    expect(previewSource).toContain('onUnmarkIrregular={onUnmarkIrregular}');
    expect(rankSectionSource).toContain('canEdit={canEdit}');
    expect(rankSectionSource).toContain('onMarkIrregular={onMarkIrregular}');
    expect(rankSectionSource).toContain('onUnmarkIrregular={onUnmarkIrregular}');
    expect(rankTableSource).toContain('canEdit={canEdit}');
    expect(rankTableSource).toContain('onMarkIrregular={onMarkIrregular}');
    expect(rankTableSource).toContain('onUnmarkIrregular={onUnmarkIrregular}');
    expect(rankTableRowsSource).toContain('canEdit = false');
    expect(rankTableRowsSource).toContain('onMarkIrregular');
    expect(rankTableRowsSource).toContain('onUnmarkIrregular');

    expect(irregularHookSource).toContain('export function useIrregularMenuNames');
    expect(irregularHookSource).toContain('EMPTY_SET');
    expect(nameSetsHookSource).toContain('export function useMenuMasterNameSets');
    expect(nameSetsHookSource).toContain('buildDiscontinuedMenuNameSet');
    expect(nameSetsHookSource).toContain('buildMenuMasterNameSet');
  });

  test('IrregularMenuBadge는 onUnmark가 있을 때만 해제 버튼을 보여준다', () => {
    const badgeSource = readFileSync(resolve('components/sales/IrregularMenuBadge.jsx'), 'utf8');
    expect(badgeSource).toContain('export function IrregularMenuBadge({ onUnmark })');
    expect(badgeSource).toContain("const canUnmark = typeof onUnmark === 'function'");
    expect(badgeSource).toContain('{canUnmark && (');
  });
});
