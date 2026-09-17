import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 실행취소 로직은 actions 훅 + utils로 분리됨
const actionsSource = readFileSync(
  resolve('app/ingredient/manage/useIngredientManageActions.js'),
  'utf8'
);
const utilsSource = readFileSync(resolve('app/ingredient/manage/ingredientManageUtils.js'), 'utf8');
const pageSource = readFileSync(resolve('app/ingredient/manage/page.jsx'), 'utf8');
const pageHookSource = readFileSync(
  resolve('app/ingredient/manage/useIngredientManagePage.js'),
  'utf8'
);
const pageStateSource = readFileSync(
  resolve('app/ingredient/manage/useIngredientManagePageState.js'),
  'utf8'
);
const batchSelectionSource = readFileSync(
  resolve('app/ingredient/manage/useIngredientBatchSelection.js'),
  'utf8'
);
const headerActionsSource = readFileSync(
  resolve('app/ingredient/manage/IngredientManagePageHeaderActions.jsx'),
  'utf8'
);
const dialogsSource = readFileSync(
  resolve('app/ingredient/manage/IngredientManagePageDialogs.jsx'),
  'utf8'
);
const viewContentSource = readFileSync(
  resolve('app/ingredient/manage/IngredientManageViewContent.jsx'),
  'utf8'
);
const panelSource = readFileSync(
  resolve('app/ingredient/manage/IngredientManagePanel.jsx'),
  'utf8'
);
const settingsPanelSource = readFileSync(
  resolve('app/ingredient/manage/IngredientSettingsPanel.jsx'),
  'utf8'
);
const batchToolbarSource = readFileSync(resolve('components/ingredient/BatchToolbar.jsx'), 'utf8');
const paletteSource = readFileSync(resolve('hooks/usePaletteItems.js'), 'utf8');
const manageRowSource = readFileSync(resolve('components/ingredient/ManageRow.jsx'), 'utf8');
const actionCellSource = readFileSync(
  resolve('components/ingredient/manage-row/ManageRowActionCell.jsx'),
  'utf8'
);
const issuesViewSource = readFileSync(resolve('components/ingredient/IssuesView.jsx'), 'utf8');

describe('ingredient manage undo guards', () => {
  test('page는 actions 훅에 위임하고 직접 restore를 호출하지 않는다', () => {
    expect(pageSource).not.toContain("restoreRecord('cost_ingredients', backup.ingredient).catch");
    expect(pageSource).not.toContain("restoreRecord('cost_ingredients', rec.ingredient).catch");
    // page는 조립 훅(useIngredientManagePage)을 통해 useIngredientManageActions를 로드한다
    expect(pageSource).toContain('useIngredientManagePage');
    expect(pageHookSource).toContain('useIngredientManageActions');
  });

  test('삭제 실행취소는 restoreRecord 실패를 숨기지 않는다', () => {
    expect(utilsSource).toContain("from '@/lib/auth/guard'");
    expect(utilsSource).toContain("assertActiveAdmin('식자재 삭제 실행취소')");
    expect(actionsSource).toContain('restoreDeletedIngredientBackup');
    expect(actionsSource).toContain('restoreDeletedIngredientBackups');
    expect(actionsSource).toContain("showToast('실행취소 실패: ' + err.message, 'error')");
  });

  test('제때 범위 동기화 유틸도 실행 함수 레벨 권한 가드를 둔다', () => {
    expect(utilsSource).toContain("assertActiveAdmin('식자재 제때 범위 동기화')");
    expect(utilsSource.indexOf("assertActiveAdmin('식자재 제때 범위 동기화')")).toBeLessThan(
      utilsSource.indexOf('const managed = await getManagedProducts();')
    );
  });

  test('일괄 실행취소는 실패 개수를 사용자 메시지로 만든다', () => {
    expect(utilsSource).toContain('throw new Error(`${failures.length}개 항목 복구 실패`)');
    expect(actionsSource).toContain("console.error('[IngredientManage] undo batch delete failed'");
  });

  test('일괄 삭제는 부분 실패를 사용자에게 노출한다', () => {
    expect(actionsSource).toContain(
      'const { removed, failures } = await bulkDeleteIngredients(ids)'
    );
    expect(actionsSource).toContain('buildBulkDeleteToast');
    expect(utilsSource).toContain('${removed.length}개 삭제됨 · ${failures.length}개 실패');
  });

  test('warnIngredientCascadeFailures는 cascade 실패 건수를 toast로 노출한다', () => {
    expect(utilsSource).toContain('warnIngredientCascadeFailures');
    expect(utilsSource).toContain('cascadeErrors');
    expect(utilsSource).toContain('showToast');
    // 건수 계산: records[].cascadeErrors.length 합산
    expect(utilsSource).toContain('cascadeErrors?.length');
  });

  test('단건 삭제 후 warnIngredientCascadeFailures가 호출된다', () => {
    expect(actionsSource).toContain('warnIngredientCascadeFailures([backup])');
  });

  test('일괄 삭제 후 warnIngredientCascadeFailures가 호출된다', () => {
    expect(actionsSource).toContain('warnIngredientCascadeFailures(removed)');
  });

  test('삭제 preview는 최신 삭제 대상 요청만 반영한다', () => {
    expect(pageStateSource).toContain('deletePreviewRequestRef');
    expect(pageStateSource).toContain('deletePreviewRequestRef.current === requestId');
    expect(pageStateSource).toContain('preview?.ingredient?.id === row.id');
  });

  test('highlightId state는 URL 파라미터 소비 effect보다 먼저 선언된다', () => {
    const stateIndex = pageStateSource.indexOf(
      'const [highlightId, setHighlightId] = useState(null);'
    );
    expect(stateIndex).toBeGreaterThan(-1);
    expect(stateIndex).toBeLessThan(
      pageStateSource.indexOf('if (highlightParam) setHighlightId(highlightParam);')
    );
    // rows 로드 후 자동 해제 로직은 IngredientManagePanel로 이동됨
    expect(panelSource).toContain('onHighlightClear');
    expect(panelSource).toContain('clearTimerRef');
  });

  test('식자재 팔레트 deep link는 제품코드 fallback과 페이지 이동 하이라이트를 지원한다', () => {
    expect(paletteSource).toContain('&productCode=');
    expect(pageStateSource).toContain('const [highlightProductCode, setHighlightProductCode]');
    expect(pageStateSource).toContain("params.get('productCode')");
    expect(pageStateSource).toContain("url.searchParams.delete('productCode')");
    expect(panelSource).toContain('highlightProductCode');
    expect(panelSource).toContain('const targetPage = Math.floor(index / PAGE_SIZE) + 1;');
    expect(panelSource).toContain('if (targetPage !== page) goTo(targetPage);');
    expect(panelSource).toContain('scrollIntoView({ block:');
    expect(manageRowSource).toContain('data-ingredient-highlighted');
  });

  test('식자재 일괄 삭제는 바로 실행하지 않고 인라인 확인을 거친다', () => {
    expect(batchToolbarSource).toContain("setConfirm({ type: 'delete' })");
    expect(batchToolbarSource).toContain("confirm.type === 'delete'");
    expect(batchToolbarSource).toContain('onDelete();');
    expect(batchToolbarSource).toContain('삭제 후 토스트에서 실행취소할 수 있습니다.');
  });

  test('배치 모드 전체 선택은 현재 페이지가 아니라 검색·필터가 적용된 목록 전체를 대상으로 한다', () => {
    expect(batchSelectionSource).toContain('setSelected');
    expect(batchSelectionSource).toContain('filtered.filter(r => r.id != null).map(r => r.id)');
    expect(batchSelectionSource).toContain('selectableIds.every(id => selected.has(id))');
    expect(batchSelectionSource).toContain(
      'setSelected(allFilteredSelected ? new Set() : new Set(selectableIds))'
    );
    expect(headerActionsSource).toContain('selectableCount={selectableCount}');
    expect(headerActionsSource).toContain('allSelected={allSelected}');
    expect(headerActionsSource).toContain('onToggleSelectAll={onToggleSelectAll}');
    expect(pageSource).toContain('selectableCount={batch.selectableIds.length}');
    expect(pageSource).toContain('allSelected={batch.allFilteredSelected}');
    expect(pageSource).toContain('onToggleSelectAll={batch.toggleSelectAll}');
    expect(batchToolbarSource).toContain('onToggleSelectAll');
    expect(batchToolbarSource).toContain('전체 선택 (${selectableCount})');
    expect(batchToolbarSource).toContain('전체 해제');
  });

  test('일괄 삭제 확인 문구·버튼은 선택 전체가 아니라 실제 삭제 가능 개수를 보여준다', () => {
    // selected.size(단종/분류변경까지 포함하는 넓은 선택)를 그대로 쓰면 "5개를 삭제할까요?"
    // 라고 물어놓고 제때 연동 행은 제외돼 실제론 더 적게 지워지는 것처럼 보인다.
    expect(batchToolbarSource).toContain('deletableCount');
    expect(batchToolbarSource).toContain('safeDeletableCount');
    expect(batchToolbarSource).toContain('제때 연동');
    expect(batchSelectionSource).toContain('deletableSelectedCount');
    expect(batchSelectionSource).toContain('isDeletableIngredientRow');
    expect(headerActionsSource).toContain('deletableCount={deletableSelectedCount}');
    expect(pageSource).toContain('deletableSelectedCount={batch.deletableSelectedCount}');
  });

  test('일괄 삭제는 선택 목록에서 수동·제품코드 없는 행만 걸러 실행한다', () => {
    // 단종/분류 변경(선택 가능 범위 = selectable = id만 있으면 됨)과 달리
    // 일괄 삭제는 제때 연동 행을 대상에서 제외해야 한다 — manageRowUtils의 공용 판정
    // 함수(isDeletableIngredientRow)를 재사용해 판정 기준이 목록/배치삭제/확인문구에서
    // 어긋나지 않게 한다.
    expect(actionsSource).toContain(
      "import { isDeletableIngredientRow } from '@/components/ingredient/manage-row/manageRowUtils'"
    );
    expect(actionsSource).toContain('(rows || []).filter(isDeletableIngredientRow).map(r => r.id)');
    expect(actionsSource).toContain('deletableIds.has(id)');
  });

  test('viewer는 식자재 행/이슈/설정 쓰기 액션을 화면과 훅에서 먼저 차단한다', () => {
    expect(pageHookSource).toContain('canEdit: !isViewer');
    expect(pageSource).toContain('isViewer={isViewer}');
    expect(viewContentSource).toContain('canEdit={!isViewer}');
    // 분류/태그 제거 확인 다이얼로그·수정 폼은 IngredientManagePageDialogs로 분리됐고,
    // 그 컴포넌트가 최상단에서 viewer 여부로 렌더 자체를 막는다.
    expect(dialogsSource).toContain('if (isViewer) return null;');
    expect(dialogsSource).toContain('{confirmRemove && (');
    expect(dialogsSource).toContain('{formTarget !== null && (');
    expect(actionsSource).toContain('canEdit = false');
    expect(actionsSource).toContain('if (!canEdit) return');
    expect(panelSource).toContain('isViewer = false');
    expect(panelSource).toContain('isViewer={isViewer}');
    expect(manageRowSource).toContain('isViewer = false');
    expect(manageRowSource).toContain(': isViewer');
    expect(actionCellSource).toContain('disabled={isViewer}');
    expect(settingsPanelSource).toContain('canEdit = false');
    expect(settingsPanelSource).toContain('disabled={!canEdit}');
    expect(issuesViewSource).toContain('isViewer = false');
    expect(issuesViewSource).toContain('disabled={isViewer}');
  });
});
