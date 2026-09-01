import { create } from 'zustand';
import { Court, CourtBooking, BookingStatus, PaymentMethod, AdditionalItem } from '@/types/booking';
import { fetchCourts, fetchBookings, createBooking, settleBooking as dbSettleBooking, cancelBooking } from '@/lib/db/bookings';

// Re-export COURTS_DATA constant for backward compatibility with existing components
export const COURTS_DATA: Court[] = [
  {
    id: 'court-00001',
    name: 'Lapangan 1 (VIP Vinyl BWF)',
    type: 'VIP Vinyl BWF',
    pricePerHour: 80000,
    description: 'Karpet Standar BWF Hijau, Pencahayaan 1000 Lux LED',
    isAvailable: true,
  },
  {
    id: 'court-00002',
    name: 'Lapangan 2 (Karpet Standar)',
    type: 'Standar Karpet',
    pricePerHour: 60000,
    description: 'Karpet Karet Matras Badminton, Ruang Luas',
    isAvailable: true,
  },
  {
    id: 'court-00003',
    name: 'Lapangan 3 (Karpet Standar)',
    type: 'Standar Karpet',
    pricePerHour: 60000,
    description: 'Karpet Karet Matras Badminton, Ventilasi Sejuk',
    isAvailable: true,
  },
  {
    id: 'court-00004',
    name: 'Lapangan 4 (Parket Kayu)',
    type: 'Parket Kayu',
    pricePerHour: 50000,
    description: 'Lantai Kayu Solid Anti-Slip',
    isAvailable: true,
  },
];

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
      const bookings = await fetchBookings(date || get().selectedDate);
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
        isLoading: false,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal membatalkan booking', isLoading: false });
      throw err;
    }
  },

  getBookingsForDate: (date) => {
    const { bookings } = get();
    return bookings.filter((b) => b.date === date && b.status !== 'CANCELLED');
  },
}));
