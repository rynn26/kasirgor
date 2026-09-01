export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export interface MemberScheduleInfo {
  dayIndex: number;
  dayName: string;
  monthName: string;
  monthIndex: number;
  year: number;
  dates: string[];
  sessionCount: number;
  formattedDatesList: string;
}

/**
 * Calculates recurring weekly dates in the selected month
 * e.g. for Monday (Senin) in September 2026 -> returns [2026-09-07, 2026-09-14, 2026-09-21, 2026-09-28] (4x pertemuan)
 */
export function getMemberDatesInMonth(dateStr: string, chosenDayIndex?: number): MemberScheduleInfo {
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  const monthIndex = isNaN(d.getMonth()) ? new Date().getMonth() : d.getMonth();
  const dayIndex = chosenDayIndex !== undefined && chosenDayIndex >= 0 && chosenDayIndex <= 6
    ? chosenDayIndex
    : (isNaN(d.getDay()) ? 1 : d.getDay());

  const dates: string[] = [];
  const cur = new Date(year, monthIndex, 1);

  while (cur.getMonth() === monthIndex) {
    if (cur.getDay() === dayIndex) {
      const pad = (n: number) => String(n).padStart(2, '0');
      dates.push(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`);
    }
    cur.setDate(cur.getDate() + 1);
  }

  const dayName = DAY_NAMES[dayIndex];
  const monthName = MONTH_NAMES[monthIndex];

  const formattedDatesList = dates
    .map((dt) => {
      const parts = dt.split('-');
      return `${parseInt(parts[2], 10)} ${monthName.slice(0, 3)}`;
    })
    .join(', ');

  return {
    dayIndex,
    dayName,
    monthName,
    monthIndex,
    year,
    dates,
    sessionCount: dates.length,
    formattedDatesList,
  };
}
