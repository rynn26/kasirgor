import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppUnit = 'POS_TOKO' | 'BOOKING_LAPANGAN';
export type ShiftType = 'SHIFT_PAGI' | 'SHIFT_SORE';

export interface ShiftInfo {
  id: ShiftType;
  name: string;
  timeRange: string;
  isAvailable: boolean;
}

export const SHIFT_OPTIONS: ShiftInfo[] = [
  {
    id: 'SHIFT_PAGI',
    name: 'Shift Pagi - Siang',
    timeRange: '08:00 - 17:00',
    isAvailable: true,
  },
  {
    id: 'SHIFT_SORE',
    name: 'Shift Sore - Malam',
    timeRange: '17:00 - 23:00',
    isAvailable: true,
  },
];

interface ShiftState {
  isShiftActive: boolean;
  selectedUnit: AppUnit | null;
  selectedShift: ShiftInfo | null;
  openingCash: number;
  cashierName: string;
  startTime: string | null;

  // Actions
  setUnit: (unit: AppUnit) => void;
  selectShift: (shift: ShiftInfo) => void;
  startShift: (cashierName: string, openingCash: number) => void;
  closeShift: () => void;
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      isShiftActive: true,
      selectedUnit: 'POS_TOKO',
      selectedShift: SHIFT_OPTIONS[0],
      openingCash: 500000,
      cashierName: 'Andi',
      startTime: '08:00 AM',

      setUnit: (unit: AppUnit) => set({ selectedUnit: unit }),

      selectShift: (shift: ShiftInfo) => set({ selectedShift: shift }),

      startShift: (cashierName: string, openingCash: number) => {
        set({
          isShiftActive: true,
          cashierName,
          openingCash,
          startTime: new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      },

      closeShift: () =>
        set({
          isShiftActive: false,
          selectedUnit: null,
          selectedShift: null,
          openingCash: 0,
        }),
    }),
    {
      name: 'kasir_shift_storage',
    }
  )
);
