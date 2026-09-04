export type ProductCategory = 
  | 'Semua'
  | 'Makanan & Snack'
  | 'Minuman Dingin'
  | 'Perlengkapan Olahraga'
  | 'Makanan'
  | 'Snack & Cemilan'
  | 'Peralatan & Raket'
  | 'Aksesoris & Grip'
  | 'Pakaian & Kaos Kaki';

export const PRODUCT_CATEGORIES = [
  'Makanan & Snack',
  'Minuman Dingin',
  'Perlengkapan Olahraga',
] as const;

export function normalizeProductCategory(rawCategory?: string | null): ProductCategory {
  if (!rawCategory) return 'Makanan & Snack';
  const trimmed = rawCategory.trim();
  if (
    trimmed === 'Makanan' ||
    trimmed === 'Snack & Cemilan' ||
    trimmed.toLowerCase() === 'snack' ||
    trimmed.toLowerCase() === 'makanan'
  ) {
    return 'Makanan & Snack';
  }
  if (
    trimmed === 'Peralatan & Raket' ||
    trimmed === 'Aksesoris & Grip' ||
    trimmed === 'Pakaian & Kaos Kaki'
  ) {
    return 'Perlengkapan Olahraga';
  }
  return trimmed as ProductCategory;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  price: number;
  costPrice?: number;
  stock: number;
  minimumStock?: number; // batas stok minimum sebelum dianggap menipis
  unit: string; // 'pcs', 'slop', 'botol', 'porsi', 'pasang', etc.
  image?: string;
  barcode?: string;
  description?: string;
  isAvailable: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPerItem?: number; // Rupiah
  note?: string;
}

export type PaymentMethod = 'CASH' | 'QRIS';

export interface Transaction {
  id: string;
  invoiceNumber: string;
  createdAt: string; // ISO String
  cashierName: string;
  customerName?: string;
  tableOrCourtNumber?: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  serviceTotal: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  status: 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export interface DailySummary {
  totalRevenue: number;
  totalTransactions: number;
  totalItemsSold: number;
  averageBasketSize: number;
  cashRevenue: number;
  qrisRevenue: number;
  transferRevenue: number;
}
