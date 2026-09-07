import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getJakartaToday } from '@/lib/bookingUtils';

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

export const useAppDateStore = create<AppDateState>()(
  persist(
    (set) => ({
      selectedDate: getJakartaToday(),
      customStartDate: getJakartaToday(),
      customEndDate: getJakartaToday(),
      period: 'HARI_INI',
      isCustomActive: false,

      setSelectedDate: (date: string) => {
        const today = getJakartaToday();
        const isToday = date === today;
        set({
          selectedDate: date,
          customStartDate: date,
          customEndDate: date,
          period: isToday ? 'HARI_INI' : 'CUSTOM',
          isCustomActive: !isToday,
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
        const today = getJakartaToday();
        set({
          period,
          isCustomActive: period === 'CUSTOM',
          ...(period === 'HARI_INI'
            ? {
                selectedDate: today,
                customStartDate: today,
                customEndDate: today,
                isCustomActive: false,
              }
            : {}),
        });
      },

      resetToToday: () => {
        const today = getJakartaToday();
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
      onRehydrateStorage: () => (state) => {
        if (state) {
          const today = getJakartaToday();
          if (state.period === 'HARI_INI' || !state.isCustomActive) {
            state.selectedDate = today;
            state.customStartDate = today;
            state.customEndDate = today;
            state.isCustomActive = false;
            state.period = 'HARI_INI';
          }
        }
      },
    }
  )
);
