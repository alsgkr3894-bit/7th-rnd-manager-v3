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
}) {
  const { detailRec, setDetailRec, loading, viewMode } = pageState;

  const openWrite = () => router.push('/note/sample/write');
  const openSampleEditor = sample => router.push(`/note/sample/${sample.id}`);
  const editDetail = () => {
    if (!detailRec) return;
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
