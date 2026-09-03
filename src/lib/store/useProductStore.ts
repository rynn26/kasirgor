import { create } from 'zustand';
import { Product, ProductCategory } from '@/types/pos';
import { fetchProducts, createProduct, updateProduct, deleteProduct, updateStock } from '@/lib/db/products';

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
      const { newStock } = await updateStock(id, delta);
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id
            ? { ...p, stock: newStock, isAvailable: newStock > 0 }
            : p
        ),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Gagal update stok' });
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
