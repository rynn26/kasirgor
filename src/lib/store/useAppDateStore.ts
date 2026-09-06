import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LaporanPeriod = 'BULAN_INI' | 'BULAN_LALU' | 'HARI_INI' | 'MINGGU_INI' | 'CUSTOM';

interface AppDateState {
  selectedDate: string; // 'YYYY-MM-DD'
  customStartDate: string; // 'YYYY-MM-DD'
  customEndDate: string; // 'YYYY-MM-DD'
  period: LaporanPeriod;
  isCustomActive: boolean;

  setSelectedDate: (date: string) => void;
  setDateRange: (start: string, end: string) => void;
  setPeriod: (period: LaporanPeriod) => void;
  resetToToday: () => void;
}

const getTodayString = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const useAppDateStore = create<AppDateState>()(
  persist(
    (set) => ({
      selectedDate: getTodayString(),
      customStartDate: getTodayString(),
      customEndDate: getTodayString(),
      period: 'HARI_INI',
      isCustomActive: false,

      setSelectedDate: (date: string) => {
        set({
          selectedDate: date,
          customStartDate: date,
          customEndDate: date,
          period: 'CUSTOM',
          isCustomActive: true,
        });
      },

      setDateRange: (start: string, end: string) => {
        const [s, e] = start <= end ? [start, end] : [end, start];
        set({
          selectedDate: s,
          customStartDate: s,
          customEndDate: e,
          period: 'CUSTOM',
          isCustomActive: true,
        });
      },

      setPeriod: (period: LaporanPeriod) => {
        set({
          period,
          isCustomActive: period === 'CUSTOM',
        });
      },

      resetToToday: () => {
        const today = getTodayString();
        set({
          selectedDate: today,
          customStartDate: today,
          customEndDate: today,
          period: 'HARI_INI',
          isCustomActive: false,
        });
      },
    }),
    {
      name: 'kasir_active_date_store',
    }
  )
);
