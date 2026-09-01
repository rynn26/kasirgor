import { create } from 'zustand';

interface ToastState {
  message: string | null;
  isVisible: boolean;
  timeoutId: NodeJS.Timeout | null;
  showToast: (message?: string) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  message: null,
  isVisible: false,
  timeoutId: null,

  showToast: (message = 'Berhasil ditambahkan') => {
    const { timeoutId } = get();
    if (timeoutId) clearTimeout(timeoutId);

    const newTimeoutId = setTimeout(() => {
      set({ isVisible: false, timeoutId: null });
    }, 1600);

    set({ message, isVisible: true, timeoutId: newTimeoutId });
  },

  hideToast: () => {
    const { timeoutId } = get();
    if (timeoutId) clearTimeout(timeoutId);
    set({ isVisible: false, timeoutId: null });
  },
}));
