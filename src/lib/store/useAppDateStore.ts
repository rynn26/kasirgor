import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LaporanPeriod = 'BULAN_INI' | 'HARI_INI' | 'MINGGU_INI' | 'CUSTOM';

interface AppDateState {
  selectedDate: string; // 'YYYY-MM-DD'
  period: LaporanPeriod;
  isCustomActive: boolean;

  setSelectedDate: (date: string) => void;
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
      period: 'HARI_INI',
      isCustomActive: false,

      setSelectedDate: (date: string) => {
        set({
          selectedDate: date,
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
        set({
          selectedDate: getTodayString(),
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
