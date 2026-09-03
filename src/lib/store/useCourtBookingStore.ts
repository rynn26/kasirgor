import { create } from 'zustand';
import { Court, CourtBooking, BookingStatus, AdditionalItem } from '@/types/booking';
import { PaymentMethod } from '@/types/pos';
import { fetchCourts, fetchBookings, createBooking, settleBooking as dbSettleBooking, cancelBooking, deleteBooking as dbDeleteBooking, updateBooking as dbUpdateBooking, updateCourt as dbUpdateCourt } from '@/lib/db/bookings';

interface CourtBookingState {
  courts: Court[];
  bookings: CourtBooking[];
  selectedBooking: CourtBooking | null;
  selectedDate: string;
  isLoading: boolean;
  error: string | null;

  loadCourts: () => Promise<void>;
  loadBookings: (date?: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
  setSelectedBooking: (booking: CourtBooking | null) => void;
  addBooking: (
    data: Omit<CourtBooking, 'id' | 'createdAt' | 'bookingCode' | 'additionalItems'> & {
      additionalItems?: Omit<AdditionalItem, 'id'>[];
    }
  ) => Promise<CourtBooking>;
  settleBooking: (
    bookingId: string,
    data: {
      settlementAmount: number;
      paymentMethod: PaymentMethod;
      cashier: string;
      additionalItems?: Omit<AdditionalItem, 'id'>[];
    }
  ) => Promise<CourtBooking>;
  cancelBooking: (bookingId: string) => Promise<void>;
  updateBooking: (bookingId: string, data: Parameters<typeof dbUpdateBooking>[1]) => Promise<CourtBooking>;
  deleteBooking: (bookingId: string) => Promise<void>;
  updateCourt: (courtId: string, data: Partial<Pick<Court, 'name' | 'type' | 'pricePerHour' | 'description' | 'isAvailable'>>) => Promise<Court>;
  getBookingsForDate: (date: string) => CourtBooking[];
}

export const useCourtBookingStore = create<CourtBookingState>((set, get) => ({
  courts: [],
  bookings: [],
  selectedBooking: null,
  selectedDate: new Date().toISOString().split('T')[0],
  isLoading: false,
  error: null,

  loadCourts: async () => {
    set({ isLoading: true, error: null });
    try {
      const courts = await fetchCourts();
      set({ courts, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal memuat lapangan', isLoading: false });
    }
  },

  loadBookings: async (date?: string) => {
    set({ isLoading: true, error: null });
    try {
      // If date is provided, fetch for that date; otherwise fetch all bookings so pelunasan, history, and schedule pages have all data
      const bookings = await fetchBookings(date);
      set({ bookings, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal memuat booking', isLoading: false });
    }
  },

  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedBooking: (booking) => set({ selectedBooking: booking }),

  addBooking: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newBooking = await createBooking(data);
      set((state) => ({
        bookings: [newBooking, ...state.bookings],
        isLoading: false,
      }));
      return newBooking;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal membuat booking', isLoading: false });
      throw err;
    }
  },

  settleBooking: async (bookingId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await dbSettleBooking(bookingId, data);
      set((state) => ({
        bookings: state.bookings.map((b) => (b.id === bookingId ? updated : b)),
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal menyelesaikan booking', isLoading: false });
      throw err;
    }
  },

  cancelBooking: async (bookingId) => {
    set({ isLoading: true, error: null });
    try {
      await cancelBooking(bookingId);
      set((state) => ({
        bookings: state.bookings.map((b) =>
          b.id === bookingId ? { ...b, status: 'CANCELLED' as BookingStatus } : b
        ),
        selectedBooking: state.selectedBooking?.id === bookingId ? { ...state.selectedBooking, status: 'CANCELLED' as BookingStatus } : state.selectedBooking,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal membatalkan booking', isLoading: false });
      throw err;
    }
  },

  updateBooking: async (bookingId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await dbUpdateBooking(bookingId, data);
      set((state) => ({
        bookings: state.bookings.map((b) => (b.id === bookingId ? updated : b)),
        selectedBooking: state.selectedBooking?.id === bookingId ? updated : state.selectedBooking,
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal memperbarui booking', isLoading: false });
      throw err;
    }
  },

  deleteBooking: async (bookingId) => {
    set({ isLoading: true, error: null });
    try {
      await dbDeleteBooking(bookingId);
      set((state) => ({
        bookings: state.bookings.filter((b) => b.id !== bookingId),
        selectedBooking: state.selectedBooking?.id === bookingId ? null : state.selectedBooking,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal menghapus booking', isLoading: false });
      throw err;
    }
  },

  updateCourt: async (courtId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await dbUpdateCourt(courtId, data);
      set((state) => ({
        courts: state.courts.map((c) => (c.id === courtId ? updated : c)),
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal memperbarui lapangan', isLoading: false });
      throw err;
    }
  },

  getBookingsForDate: (date) => {
    const { bookings } = get();
    return bookings.filter((b) => {
      if (b.status === 'CANCELLED') return false;
      if (b.date === date) return true;
      if (Array.isArray(b.memberDates) && b.memberDates.includes(date)) return true;
      return false;
    });
  },
}));
