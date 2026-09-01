import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, PaymentMethod, Product } from '@/types/pos';
import { useTransactionStore } from '@/lib/store/useTransactionStore';
import { useProductStore } from '@/lib/store/useProductStore';

interface CartState {
  items: CartItem[];
  customerName: string;
  tableOrCourtNumber: string;
  discountAmount: number;
  discountPercent: number;
  discountType: 'fixed' | 'percent';
  taxRate: number;
  cashierName: string;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  notes: string;
  isProcessing: boolean;

  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemNote: (productId: string, note: string) => void;
  setCustomerInfo: (name: string, courtOrTable: string) => void;
  setDiscount: (value: number, type: 'fixed' | 'percent') => void;
  setTaxRate: (rate: number) => void;
  setCashierName: (name: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCashReceived: (amount: number) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
  processTransaction: () => Promise<void>;

  getSubtotal: () => number;
  getDiscountTotal: () => number;
  getTaxTotal: () => number;
  getGrandTotal: () => number;
  getChange: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerName: '',
      tableOrCourtNumber: '',
      discountAmount: 0,
      discountPercent: 0,
      discountType: 'fixed',
      taxRate: 0,
      cashierName: 'Yuli',
      paymentMethod: 'CASH',
      cashReceived: 0,
      notes: '',
      isProcessing: false,

      addItem: (product: Product, quantity = 1) => {
        const { items } = get();
        const existingIndex = items.findIndex((i) => i.product.id === product.id);

        if (existingIndex > -1) {
          const updated = [...items];
          const newQty = updated[existingIndex].quantity + quantity;
          if (product.stock && newQty > product.stock) return;
          updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
          set({ items: updated });
        } else {
          if (product.stock <= 0) return;
          set({ items: [...items, { product, quantity, note: '' }] });
        }
      },

      removeItem: (productId) => {
        set((state) => ({ items: state.items.filter((i) => i.product.id !== productId) }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => {
            if (i.product.id === productId) {
              const maxStock = i.product.stock || 9999;
              return { ...i, quantity: Math.min(quantity, maxStock) };
            }
            return i;
          }),
        }));
      },

      updateItemNote: (productId, note) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId ? { ...i, note } : i
          ),
        }));
      },

      setCustomerInfo: (customerName, tableOrCourtNumber) => {
        set({ customerName, tableOrCourtNumber });
      },

      setDiscount: (value, type) => {
        if (type === 'percent') {
          set({ discountPercent: Math.min(100, Math.max(0, value)), discountType: 'percent' });
        } else {
          set({ discountAmount: Math.max(0, value), discountType: 'fixed' });
        }
      },

      setTaxRate: (taxRate) => set({ taxRate: Math.max(0, taxRate) }),
      setCashierName: (cashierName) => set({ cashierName }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setCashReceived: (cashReceived) => set({ cashReceived }),
      setNotes: (notes) => set({ notes }),

      clearCart: () => {
        set({
          items: [],
          customerName: '',
          tableOrCourtNumber: '',
          discountAmount: 0,
          discountPercent: 0,
          discountType: 'fixed',
          cashReceived: 0,
          notes: '',
          paymentMethod: 'CASH',
        });
      },

      processTransaction: async () => {
        const state = get();
        set({ isProcessing: true });

        const subtotal = state.getSubtotal();
        const discountTotal = state.getDiscountTotal();
        const taxTotal = state.getTaxTotal();
        const grandTotal = state.getGrandTotal();
        const change = state.getChange();

        const invoiceNumber = `GOR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

        const transaction = {
          invoiceNumber,
          cashierName: state.cashierName,
          customerName: state.customerName || undefined,
          tableOrCourtNumber: state.tableOrCourtNumber || undefined,
          items: state.items,
          subtotal,
          discountTotal,
          taxTotal,
          serviceTotal: 0,
          grandTotal,
          paymentMethod: state.paymentMethod,
          amountPaid: state.cashReceived,
          change,
          status: 'COMPLETED' as const,
          notes: state.notes || undefined,
        };

        // Save transaction to DB first
        await useTransactionStore.getState().addTransaction({
          ...transaction,
          createdAt: new Date().toISOString(),
        });

        // Deduct stock via product store after transaction is saved
        const stockUpdates = state.items.map((item) => ({
          id: item.product.id,
          delta: -item.quantity,
        }));
        for (const { id, delta } of stockUpdates) {
          await useProductStore.getState().updateStock(id, delta);
        }

        set({ isProcessing: false });
      },

      getSubtotal: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.product.price * item.quantity, 0);
      },

      getDiscountTotal: () => {
        const { getSubtotal, discountType, discountPercent, discountAmount } = get();
        const subtotal = getSubtotal();
        if (discountType === 'percent') {
          return Math.round((subtotal * discountPercent) / 100);
        }
        return Math.min(subtotal, discountAmount);
      },

      getTaxTotal: () => {
        const { getSubtotal, getDiscountTotal, taxRate } = get();
        const taxableAmount = Math.max(0, getSubtotal() - getDiscountTotal());
        return Math.round((taxableAmount * taxRate) / 100);
      },

      getGrandTotal: () => {
        const { getSubtotal, getDiscountTotal, getTaxTotal } = get();
        return Math.max(0, getSubtotal() - getDiscountTotal() + getTaxTotal());
      },

      getChange: () => {
        const { cashReceived, getGrandTotal, paymentMethod } = get();
        if (paymentMethod !== 'CASH') return 0;
        return Math.max(0, cashReceived - getGrandTotal());
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((acc, item) => acc + item.quantity, 0);
      },
    }),
    {
      name: 'kasir_cart_storage',
      partialize: (state) => ({
        items: state.items,
        customerName: state.customerName,
        tableOrCourtNumber: state.tableOrCourtNumber,
        discountAmount: state.discountAmount,
        discountPercent: state.discountPercent,
        discountType: state.discountType,
        paymentMethod: state.paymentMethod,
        notes: state.notes,
        cashierName: state.cashierName,
      }),
    }
  )
);
