import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PaymentMethod } from '@/types/pos';

export interface BookingDraft {
  id: string;
  createdAt: string; // ISO string
  customerName: string;
  phone: string;
  selectedSport: string;
  memberType: 'MEMBER' | 'INSIDENTIL';
  bookingDate: string;
  date: string;
  selectedMemberDayIndex: number;
  startTime: string;
  endTime: string;
  courtCount: number;
  selectedCourtIds: string[];
  dpAmount: number;
  totalSewa?: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  cashierName?: string;
}

interface BookingDraftState {
  drafts: BookingDraft[];
  activeDraftId: string | null;
  saveDraft: (draft: Omit<BookingDraft, 'id' | 'createdAt'>, existingId?: string) => string;
  deleteDraft: (id: string) => void;
  clearAllDrafts: () => void;
  getDraft: (id: string) => BookingDraft | undefined;
  setActiveDraftId: (id: string | null) => void;
}

export const useBookingDraftStore = create<BookingDraftState>()(
  persist(
    (set, get) => ({
      drafts: [],
      activeDraftId: null,

      saveDraft: (draftData, existingId) => {
        const id = existingId || `DRAFT-BKG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const newDraft: BookingDraft = {
          ...draftData,
          id,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          const filtered = state.drafts.filter((d) => d.id !== id);
          return {
            drafts: [newDraft, ...filtered],
            activeDraftId: id,
          };
        });

        return id;
      },

      deleteDraft: (id) => {
        set((state) => ({
          drafts: state.drafts.filter((d) => d.id !== id),
          activeDraftId: state.activeDraftId === id ? null : state.activeDraftId,
        }));
      },

      clearAllDrafts: () => {
        set({ drafts: [], activeDraftId: null });
      },

      getDraft: (id) => {
        return get().drafts.find((d) => d.id === id);
      },

      setActiveDraftId: (id) => {
        set({ activeDraftId: id });
      },
    }),
    {
      name: 'kasir_booking_drafts_storage',
    }
  )
);
