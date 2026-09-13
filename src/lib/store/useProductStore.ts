import { create } from 'zustand';
import { Product, ProductCategory } from '@/types/pos';
import { fetchProducts, createProduct, updateProduct, deleteProduct, updateStock, setStockExact } from '@/lib/db/products';

interface ProductState {
  products: Product[];
  selectedCategory: ProductCategory;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  setSelectedCategory: (category: ProductCategory) => void;
  setSearchQuery: (query: string) => void;
  loadProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, updatedFields: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateStock: (id: string, delta: number) => Promise<void>;
  setStockExact: (id: string, newStock: number) => Promise<void>;
  filteredProducts: () => Product[];
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  selectedCategory: 'Semua',
  searchQuery: '',
  isLoading: false,
  error: null,

  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  loadProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const products = await fetchProducts();
      set({ products, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal memuat produk', isLoading: false });
    }
  },

  addProduct: async (newProdData) => {
    set({ isLoading: true, error: null });
    try {
      const newProduct = await createProduct(newProdData);
      set((state) => ({
        products: [newProduct, ...state.products],
        isLoading: false,
      }));

      // Record Activity Log so Owner automatically receives Push Notification
      try {
        const { recordActivityLog } = await import('@/lib/db/activityLogs');
        const { useShiftStore } = await import('@/lib/store/useShiftStore');
        const cashier = useShiftStore.getState().cashierName || 'Kasir / Owner';
        await recordActivityLog({
          staffName: cashier,
          role: cashier.toLowerCase() === 'owner' ? 'Owner' : 'Kasir',
          actionType: 'CREATE_PRODUCT',
          title: 'Produk Baru Ditambahkan',
          details: `${cashier} menambahkan produk baru "${newProduct.name}" (${newProduct.category}) dengan stok ${newProduct.stock} ${newProduct.unit || 'pcs'}.`,
          metadata: {
            productId: newProduct.id,
            name: newProduct.name,
            price: newProduct.price,
            stock: newProduct.stock,
          },
        });
      } catch (logErr) {
        console.error('Failed to log addProduct activity:', logErr);
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal menambah produk', isLoading: false });
      throw err;
    }
  },

  updateProduct: async (id, updatedFields) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateProduct(id, updatedFields);
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? updated : p)),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal update produk', isLoading: false });
      throw err;
    }
  },

  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteProduct(id);
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal hapus produk', isLoading: false });
      throw err;
    }
  },

  updateStock: async (id, delta) => {
    try {
      const prod = get().products.find((p) => p.id === id);
      const { newStock } = await updateStock(id, delta);
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id
            ? { ...p, stock: newStock, isAvailable: newStock > 0 }
            : p
        ),
      }));

      // Realtime push notification for Owner when stock decreases and hits low/zero threshold
      if (delta < 0 && prod) {
        const threshold = prod.minimumStock ?? 15;
        if (newStock === 0) {
          import('@/lib/notifications/webPush').then(({ notifyOwner }) => {
            notifyOwner({
              title: '🚨 Peringatan: Stok Habis!',
              body: `Stok produk "${prod.name}" telah HABIS (0 ${prod.unit || 'pcs'}). Segera lakukan restock!`,
              url: '/produk',
              tag: `stock-empty-${id}`,
            });
          }).catch(() => {});
        } else if (newStock <= threshold) {
          import('@/lib/notifications/webPush').then(({ notifyOwner }) => {
            notifyOwner({
              title: '⚠️ Peringatan: Stok Menipis!',
              body: `Stok produk "${prod.name}" tersisa ${newStock} ${prod.unit || 'pcs'} (Batas minimum: ${threshold}). Segera lakukan pemesanan ulang.`,
              url: '/produk',
              tag: `stock-low-${id}`,
            });
          }).catch(() => {});
        }
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal update stok' });
      throw err;
    }
  },

  setStockExact: async (id, exactStock) => {
    try {
      const prod = get().products.find((p) => p.id === id);
      const { newStock } = await setStockExact(id, exactStock);
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id
            ? { ...p, stock: newStock, isAvailable: newStock > 0 }
            : p
        ),
      }));

      if (prod) {
        // Record Activity Log so Owner automatically receives Push Notification
        try {
          if (prod.stock !== newStock) {
            const { recordActivityLog } = await import('@/lib/db/activityLogs');
            const { useShiftStore } = await import('@/lib/store/useShiftStore');
            const cashier = useShiftStore.getState().cashierName || 'Kasir / Owner';
            const isIncrease = newStock > prod.stock;
            await recordActivityLog({
              staffName: cashier,
              role: cashier.toLowerCase() === 'owner' ? 'Owner' : 'Kasir',
              actionType: 'EDIT_PRODUCT',
              title: isIncrease ? 'Penambahan Stok Produk' : 'Pengurangan / Penyesuaian Stok',
              details: `${cashier} memperbarui stok "${prod.name}" dari ${prod.stock} menjadi ${newStock} ${prod.unit || 'pcs'}.`,
              metadata: {
                productId: id,
                name: prod.name,
                oldStock: prod.stock,
                newStock,
              },
            });
          }
        } catch (logErr) {
          console.error('Failed to log stock activity:', logErr);
        }

        const threshold = prod.minimumStock ?? 15;
        if (newStock === 0) {
          import('@/lib/notifications/webPush').then(({ notifyOwner }) => {
            notifyOwner({
              title: '🚨 Peringatan: Stok Habis!',
              body: `Stok produk "${prod.name}" telah HABIS (0 ${prod.unit || 'pcs'}). Segera lakukan restock!`,
              url: '/produk',
              tag: `stock-empty-${id}`,
            });
          }).catch(() => {});
        } else if (newStock <= threshold) {
          import('@/lib/notifications/webPush').then(({ notifyOwner }) => {
            notifyOwner({
              title: '⚠️ Peringatan: Stok Menipis!',
              body: `Stok produk "${prod.name}" tersisa ${newStock} ${prod.unit || 'pcs'} (Batas minimum: ${threshold}). Segera lakukan pemesanan ulang.`,
              url: '/produk',
              tag: `stock-low-${id}`,
            });
          }).catch(() => {});
        }
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal mengubah stok' });
      throw err;
    }
  },

  filteredProducts: () => {
    const { products, selectedCategory, searchQuery } = get();
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === 'Semua' ||
        p.category === selectedCategory ||
        (selectedCategory === 'Makanan & Snack' && (p.category === 'Makanan' || p.category === 'Snack & Cemilan')) ||
        (selectedCategory === 'Perlengkapan Olahraga' && (p.category === 'Peralatan & Raket' || p.category === 'Aksesoris & Grip' || p.category === 'Pakaian & Kaos Kaki'));
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  },
}));
