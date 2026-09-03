import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '@/types/pos';

export interface PosDraft {
  id: string;
  createdAt: string; // ISO string
  customerName?: string;
  tableOrCourtNumber?: string;
  items: CartItem[];
  discountAmount: number;
  discountPercent: number;
  discountType: 'fixed' | 'percent';
  notes?: string;
  cashierName?: string;
  subtotal: number;
  grandTotal: number;
  totalItems: number;
}

interface PosDraftState {
  drafts: PosDraft[];
  saveDraft: (draft: Omit<PosDraft, 'id' | 'createdAt'>) => string;
  deleteDraft: (id: string) => void;
  clearAllDrafts: () => void;
  getDraft: (id: string) => PosDraft | undefined;
}

export const usePosDraftStore = create<PosDraftState>()(
  persist(
    (set, get) => ({
      drafts: [],

      saveDraft: (draftData) => {
        const id = `DRAFT-POS-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const newDraft: PosDraft = {
          ...draftData,
          id,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          // Simpan di paling atas (urutan terbaru)
          drafts: [newDraft, ...state.drafts],
        }));

        return id;
      },

      deleteDraft: (id) => {
        set((state) => ({
          drafts: state.drafts.filter((d) => d.id !== id),
        }));
      },

      clearAllDrafts: () => {
        set({ drafts: [] });
      },

      getDraft: (id) => {
        return get().drafts.find((d) => d.id === id);
      },
    }),
    {
      name: 'kasir_pos_drafts_storage',
    }
  )
);
