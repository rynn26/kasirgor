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

export const getDefaultShift = (name?: string): ShiftInfo => {
  if (name && name.toLowerCase() === 'asfia') {
    return SHIFT_OPTIONS[1]; // Shift Sore - Malam
  }
  const currentHour = new Date().getHours();
  return currentHour >= 16 ? SHIFT_OPTIONS[1] : SHIFT_OPTIONS[0];
};

export const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      isShiftActive: true,
      selectedUnit: 'POS_TOKO',
      selectedShift: SHIFT_OPTIONS[0],
      openingCash: 0,
      cashierName: 'Yuli',
      startTime: '08:00 AM',

      setUnit: (unit: AppUnit) => set({ selectedUnit: unit }),

      selectShift: (shift: ShiftInfo) => set({ selectedShift: shift }),

      startShift: (cashierName: string, openingCash: number) => {
        set((state) => ({
          isShiftActive: true,
          cashierName,
          selectedShift: cashierName.toLowerCase() === 'asfia' && state.selectedShift?.id === 'SHIFT_PAGI' 
            ? SHIFT_OPTIONS[1] 
            : state.selectedShift,
          openingCash,
          startTime: new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }));
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
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.cashierName || ['andi', 'admin', 'kasir', 'user'].includes(state.cashierName.toLowerCase())) {
            state.cashierName = 'Yuli';
          }
          if (state.cashierName?.toLowerCase() === 'asfia' && (!state.selectedShift || state.selectedShift.id === 'SHIFT_PAGI')) {
            state.selectedShift = SHIFT_OPTIONS[1];
          }
        }
      },
    }
  )
);
