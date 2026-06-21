/**
 * 홈 인사말 서브라인 생성 — 오늘 할 일·경보·미매칭·단가없음·미업로드·백업 상태를 요약.
 * 액션 가능한 항목이 하나도 없으면 격려 문구를 반환한다.
 */
export function buildGreetingSubline({
  todosCount,
  alertCount,
  openIssueCount,
  noPriceCount,
  staleModules,
  backupReminder,
}) {
  const hasTodos = todosCount > 0;
  const hasAlert = alertCount > 0;
  const hasUnmatched = openIssueCount > 0;
  const hasNoPrice = noPriceCount > 0;
  const hasStale = staleModules.length > 0;
  const hasBackup = backupReminder?.stale;
  if (!hasTodos && !hasAlert && !hasUnmatched && !hasNoPrice && !hasStale && !hasBackup)
    return '오늘도 좋은 하루 보내세요.';
  const parts = [];
  if (hasTodos)
    parts.push(
      <>
        오늘 할 일 <b>{todosCount}건</b>
      </>
    );
  if (hasAlert)
    parts.push(
      <>
        원가율 경보 <b>{alertCount}건</b>
      </>
    );
  if (hasUnmatched)
    parts.push(
      <>
        미매칭 <b>{openIssueCount}건</b>
      </>
    );
  if (hasNoPrice)
    parts.push(
      <>
        단가없음 <b>{noPriceCount}개</b>
      </>
    );
  if (hasStale)
    parts.push(
      <>
        <b>{staleModules.join('·')}</b> 미업로드
      </>
    );
  if (hasBackup)
    parts.push(
      <>{backupReminder.never ? '백업 이력 없음' : `${backupReminder.daysSince}일 전 백업`}</>
    );
  const hasActionable = hasTodos || hasAlert || hasUnmatched;
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 ? ' · ' : ''}
          {part}
        </span>
      ))}
      {hasActionable ? '이 있어요.' : '.'}
    </>
  );
}
