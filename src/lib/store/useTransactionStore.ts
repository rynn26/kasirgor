import { create } from 'zustand';
import { Transaction, DailySummary, CartItem, PaymentMethod } from '@/types/pos';
import { 
  fetchTransactions, 
  createTransaction, 
  fetchTransactionsByDate,
  cancelTransaction as dbCancelTransaction,
  deleteTransaction as dbDeleteTransaction,
  updateTransaction as dbUpdateTransaction,
} from '@/lib/db/transactions';
import { getJakartaToday, toJakartaDateString } from '@/lib/bookingUtils';

interface TransactionState {
  transactions: Transaction[];
  selectedTransaction: Transaction | null;
  isLoading: boolean;
  error: string | null;

  loadTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<Transaction>;
  cancelTransaction: (id: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (
    id: string,
    data: {
      items: CartItem[];
      paymentMethod?: PaymentMethod;
      customerName?: string;
      tableOrCourtNumber?: string;
      notes?: string;
      amountPaid?: number;
      status?: 'COMPLETED' | 'CANCELLED';
    }
  ) => Promise<Transaction>;
  setSelectedTransaction: (transaction: Transaction | null) => void;
  getDailySummary: (targetDate?: string) => DailySummary;
  loadTransactionsByDate: (date: string) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  selectedTransaction: null,
  isLoading: false,
  error: null,

  loadTransactions: async () => {
    set({ isLoading: true, error: null });
    try {
      const transactions = await fetchTransactions();
      set({ transactions, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal memuat transaksi', isLoading: false });
    }
  },

  addTransaction: async (transaction) => {
    set({ isLoading: true, error: null });
    try {
      const created = await createTransaction(transaction);
      set((state) => ({
        transactions: [created, ...state.transactions],
        isLoading: false,
      }));

      // Record Activity Log
      try {
        const { recordActivityLog } = await import('@/lib/db/activityLogs');
        const { useShiftStore } = await import('@/lib/store/useShiftStore');
        const cashier = useShiftStore.getState().cashierName || 'Kasir';
        const itemCount = transaction.items.reduce((s, i) => s + i.quantity, 0);
        const itemSummary = transaction.items
          .map((i) => `${i.quantity}x ${i.product?.name || 'Produk'}`)
          .join(', ');
        recordActivityLog({
          staffName: cashier,
          role: cashier.toLowerCase() === 'owner' ? 'Owner' : 'Kasir',
          actionType: 'CREATE_TRANSACTION',
          title: 'Transaksi Penjualan Kantin',
          details: `Kasir ${cashier} memproses penjualan: ${itemSummary || `${itemCount} barang`} senilai Rp ${created.grandTotal.toLocaleString('id-ID')} via ${created.paymentMethod}.`,
          metadata: {
            transactionId: created.id,
            invoiceNumber: created.invoiceNumber,
            total: created.grandTotal,
            paymentMethod: created.paymentMethod,
          },
        });
      } catch {}

      return created;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal menyimpan transaksi', isLoading: false });
      throw err;
    }
  },

  cancelTransaction: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const target = get().transactions.find((t) => t.id === id);
      await dbCancelTransaction(id);
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === id ? { ...t, status: 'CANCELLED' as const } : t
        ),
        isLoading: false,
      }));

      // Record Activity Log
      try {
        const { recordActivityLog } = await import('@/lib/db/activityLogs');
        const { useShiftStore } = await import('@/lib/store/useShiftStore');
        const cashier = useShiftStore.getState().cashierName || 'Kasir / Owner';
        const itemSummary = target?.items && target.items.length > 0
          ? target.items.map((i) => `${i.quantity}x ${i.product?.name || 'Produk'}`).join(', ')
          : 'produk kantin';
        recordActivityLog({
          staffName: cashier,
          role: cashier.toLowerCase() === 'owner' ? 'Owner' : 'Kasir',
          actionType: 'CANCEL_TRANSACTION',
          title: 'Batalkan Transaksi Kantin',
          details: `${cashier} membatalkan pesanan: ${itemSummary} senilai Rp ${(target?.grandTotal || 0).toLocaleString('id-ID')}.`,
          metadata: {
            transactionId: id,
            invoiceNumber: target?.invoiceNumber,
            total: target?.grandTotal,
          },
        });
      } catch {}
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal membatalkan transaksi', isLoading: false });
      throw err;
    }
  },

  deleteTransaction: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const target = get().transactions.find((t) => t.id === id);
      await dbDeleteTransaction(id);
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
        selectedTransaction: state.selectedTransaction?.id === id ? null : state.selectedTransaction,
        isLoading: false,
      }));

      // Record Activity Log
      try {
        const { recordActivityLog } = await import('@/lib/db/activityLogs');
        const { useShiftStore } = await import('@/lib/store/useShiftStore');
        const cashier = useShiftStore.getState().cashierName || 'Kasir / Owner';
        const itemSummary = target?.items && target.items.length > 0
          ? target.items.map((i) => `${i.quantity}x ${i.product?.name || 'Produk'}`).join(', ')
          : 'produk kantin';
        recordActivityLog({
          staffName: cashier,
          role: cashier.toLowerCase() === 'owner' ? 'Owner' : 'Kasir',
          actionType: 'DELETE_TRANSACTION',
          title: 'Hapus Transaksi Kantin',
          details: `${cashier} menghapus transaksi: ${itemSummary} senilai Rp ${(target?.grandTotal || 0).toLocaleString('id-ID')}.`,
          metadata: {
            transactionId: id,
            invoiceNumber: target?.invoiceNumber,
            total: target?.grandTotal,
          },
        });
      } catch {}
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal menghapus transaksi', isLoading: false });
      throw err;
    }
  },

  updateTransaction: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await dbUpdateTransaction(id, data);
      set((state) => ({
        transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
        selectedTransaction: state.selectedTransaction?.id === id ? updated : state.selectedTransaction,
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal mengupdate transaksi', isLoading: false });
      throw err;
    }
  },

  setSelectedTransaction: (transaction) => {
    set({ selectedTransaction: transaction });
  },

  getDailySummary: (targetDate?: string) => {
    const { transactions } = get();
    const dateToFilter = targetDate || getJakartaToday();
    const completed = transactions.filter(
      (t) => t.status === 'COMPLETED' && toJakartaDateString(t.createdAt) === dateToFilter
    );

    const totalRevenue = completed.reduce((sum, t) => sum + t.grandTotal, 0);
    const totalTransactions = completed.length;
    const totalItemsSold = completed.reduce(
      (sum, t) => sum + t.items.reduce((iSum, item) => iSum + item.quantity, 0),
      0
    );
    const averageBasketSize =
      totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    const cashRevenue = completed
      .filter((t) => t.paymentMethod === 'CASH')
      .reduce((sum, t) => sum + t.grandTotal, 0);

    const qrisRevenue = completed
      .filter((t) => t.paymentMethod === 'QRIS')
      .reduce((sum, t) => sum + t.grandTotal, 0);

    return {
      totalRevenue,
      totalTransactions,
      totalItemsSold,
      averageBasketSize,
      cashRevenue,
      qrisRevenue,
      transferRevenue: 0,
    };
  },

  loadTransactionsByDate: async (date) => {
    set({ isLoading: true, error: null });
    try {
      const transactions = await fetchTransactionsByDate(date);
      set({ transactions, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal memuat transaksi', isLoading: false });
    }
  },
}));

