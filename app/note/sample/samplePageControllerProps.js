import {
  buildSampleActionsProps,
  buildSampleHeaderProps,
  buildSampleLoadErrorProps,
} from './samplePageControllerTopProps';
import {
  buildSampleCalendarProps,
  buildSampleFilterProps,
  buildSampleRecordsProps,
} from './samplePageControllerViewProps';
import {
  buildSampleCompareBarProps,
  buildSampleDialogsProps,
} from './samplePageControllerDialogProps';

export function buildSamplePageControllerProps({
  router,
  pageState,
  batch,
  compare,
  recordActions,
  confirmElement,
  canEdit = false,
}) {
  const { detailRec, setDetailRec, loading, viewMode } = pageState;

  const openWrite = () => {
    if (!canEdit) return;
    router.push('/note/sample/write');
  };
  const openSampleEditor = sample => {
    if (!canEdit || sample?.id == null) return;
    router.push(`/note/sample/${sample.id}`);
  };
  const editDetail = () => {
    if (!canEdit || !detailRec) return;
    setDetailRec(null);
    router.push(`/note/sample/${detailRec.id}`);
  };
  const navigation = { openWrite, openSampleEditor, editDetail };
  const context = {
    pageState,
    batch,
    compare,
    recordActions,
    confirmElement,
    navigation,
    canEdit,
  };

  return {
    loadErrorProps: buildSampleLoadErrorProps(context),
    headerProps: buildSampleHeaderProps(context),
    actionsProps: buildSampleActionsProps(context),
    filterProps: buildSampleFilterProps(context),
    calendarVisible: !loading && viewMode === 'calendar',
    calendarProps: buildSampleCalendarProps(context),
    recordsProps: buildSampleRecordsProps(context),
    compareBarProps: buildSampleCompareBarProps(context),
    dialogsProps: buildSampleDialogsProps(context),
  };
}
