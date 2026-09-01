export type ProductCategory = 
  | 'Semua'
  | 'Peralatan & Raket'
  | 'Aksesoris & Grip'
  | 'Pakaian & Kaos Kaki'
  | 'Minuman Dingin'
  | 'Makanan'
  | 'Snack & Cemilan';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  price: number;
  costPrice?: number;
  stock: number;
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

export type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER' | 'DEBIT';

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
