export function buildSampleCalendarProps({ pageState }) {
  const { calDays, calMonth, samplesByDate, today, goPrevMonth, goNextMonth, setDetailRec } =
    pageState;

  return {
    days: calDays,
    calMonth,
    samplesByDate,
    today,
    onPrevMonth: goPrevMonth,
    onNextMonth: goNextMonth,
    onOpenSample: setDetailRec,
  };
}
