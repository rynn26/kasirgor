import { create } from 'zustand';

interface ToastState {
  message: string | null;
  isVisible: boolean;
  showToast: (message?: string) => void;
  hideToast: () => void;
}

let timeoutId: NodeJS.Timeout | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  isVisible: false,

  showToast: (message = 'Berhasil ditambahkan') => {
    if (timeoutId) clearTimeout(timeoutId);

    set({ message, isVisible: true });

    timeoutId = setTimeout(() => {
      set({ isVisible: false });
    }, 1600);
  },

  hideToast: () => {
    if (timeoutId) clearTimeout(timeoutId);
    set({ isVisible: false });
  },
}));
