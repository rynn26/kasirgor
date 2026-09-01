import { create } from 'zustand';
import { Transaction, DailySummary } from '@/types/pos';
import { fetchTransactions, createTransaction, fetchTransactionsByDate } from '@/lib/db/transactions';

interface TransactionState {
  transactions: Transaction[];
  selectedTransaction: Transaction | null;
  isLoading: boolean;
  error: string | null;

  loadTransactions: () => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<Transaction>;
  setSelectedTransaction: (transaction: Transaction | null) => void;
  getDailySummary: () => DailySummary;
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
      return created;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal menyimpan transaksi', isLoading: false });
      throw err;
    }
  },

  setSelectedTransaction: (transaction) => {
    set({ selectedTransaction: transaction });
  },

  getDailySummary: () => {
    const { transactions } = get();
    const today = new Date().toISOString().split('T')[0];
    const completed = transactions.filter(
      (t) => t.status === 'COMPLETED' && t.createdAt.startsWith(today)
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

    const transferRevenue = completed
      .filter((t) => t.paymentMethod === 'TRANSFER' || t.paymentMethod === 'DEBIT')
      .reduce((sum, t) => sum + t.grandTotal, 0);

    return {
      totalRevenue,
      totalTransactions,
      totalItemsSold,
      averageBasketSize,
      cashRevenue,
      qrisRevenue,
      transferRevenue,
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
