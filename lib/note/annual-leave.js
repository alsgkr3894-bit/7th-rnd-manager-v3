export const LEAVE_TYPES = Object.freeze({ 연차: 1, 반차: 0.5 });
const DAY_MS = 86_400_000;

export function isLeaveType(type) {
  return Object.hasOwn(LEAVE_TYPES, type);
}

export function isValidDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
  );
}

function anniversary(hireDate, year) {
  const month = Number(hireDate.slice(5, 7));
  const day = Number(hireDate.slice(8, 10));
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, maxDay)).padStart(2, '0')}`;
}

function previousDay(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

export function getLeaveCycle(hireDate, today) {
  if (!isValidDateKey(hireDate) || !isValidDateKey(today) || today < hireDate) return null;
  const year = Number(today.slice(0, 4));
  const startThisYear = anniversary(hireDate, year);
  const startYear = today >= startThisYear ? year : year - 1;
  return {
    start: anniversary(hireDate, startYear),
    end: previousDay(anniversary(hireDate, startYear + 1)),
  };
}

export function calculateLeaveBalance({ hireDate, annualLeaveDays, schedules = [], today }) {
  const cycle = getLeaveCycle(hireDate, today);
  const granted = Number(annualLeaveDays);
  if (!cycle || !Number.isFinite(granted) || granted < 0) return null;
  const leaveYear = Number(cycle.start.slice(0, 4)) - Number(hireDate.slice(0, 4)) + 1;
  const daysRemaining = Math.round((Date.parse(cycle.end) - Date.parse(today)) / 86_400_000 + 1);
  const entries = schedules
    .flatMap(schedule => {
      if (!isLeaveType(schedule?.type) || !isValidDateKey(schedule.date)) {
        return [];
      }
      const endDate =
        isValidDateKey(schedule.endDate) && schedule.endDate >= schedule.date
          ? schedule.endDate
          : schedule.date;
      const start = schedule.date > cycle.start ? schedule.date : cycle.start;
      const end = endDate < cycle.end ? endDate : cycle.end;
      if (start > end) return [];
      const countedDates = [];
      for (let timestamp = Date.parse(start); timestamp <= Date.parse(end); timestamp += DAY_MS) {
        const day = new Date(timestamp);
        if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) {
          countedDates.push(day.toISOString().slice(0, 10));
        }
      }
      return [
        {
          id: schedule.id,
          title: schedule.title || schedule.type,
          type: schedule.type,
          start,
          end,
          countedDates,
          days: countedDates.length * LEAVE_TYPES[schedule.type],
          status: end < today ? '사용' : '예정',
        },
      ];
    })
    .sort((a, b) => a.start.localeCompare(b.start) || String(a.id).localeCompare(String(b.id)));
  const used = entries.reduce((total, entry) => total + entry.days, 0);
  return { ...cycle, leaveYear, daysRemaining, granted, used, remaining: granted - used, entries };
}
