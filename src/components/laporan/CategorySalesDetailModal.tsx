'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  ShoppingBag,
  Search,
  Receipt,
  Calendar,
  Clock,
  User,
  ChevronRight,
  TrendingUp,
  Package,
  Layers,
  ArrowUpDown,
  Coins,
} from 'lucide-react';
import { Transaction, normalizeProductCategory } from '@/types/pos';
import { formatRupiah, formatDate } from '@/lib/utils';
import { useProductStore } from '@/lib/store/useProductStore';

interface CategorySalesDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  periodLabel: string;
  filteredTransactions: Transaction[];
  onOpenKantinReceipt?: (tx: Transaction) => void;
}

interface GroupedProductSales {
  id: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
  costPrice: number;
  omset: number;
  profit: number;
}

export const CategorySalesDetailModal: React.FC<CategorySalesDetailModalProps> = ({
  isOpen,
  onClose,
  categoryName,
  periodLabel,
  filteredTransactions,
  onOpenKantinReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'TRANSACTIONS'>('PRODUCTS');
  const storeProducts = useProductStore((state) => state.products);

  // Group items by category and compute stats
  const { productList, matchingTransactions, totalCategoryOmset, totalCategoryQty, totalCategoryProfit } = useMemo(() => {
    const itemMap: Record<string, GroupedProductSales> = {};
    const txSet = new Set<string>();
    const txList: Array<{ tx: Transaction; categoryItemsQty: number; categoryItemsAmount: number }> = [];

    let totalOmset = 0;
    let totalQty = 0;
    let totalProfit = 0;

    const validTx = filteredTransactions.filter((t) => t.status === 'COMPLETED');

    validTx.forEach((tx) => {
      let txCatQty = 0;
      let txCatAmount = 0;

      tx.items.forEach((item) => {
        const itemCat = normalizeProductCategory(item.product.category);
        if (itemCat.toLowerCase() === categoryName.toLowerCase()) {
          const key = item.product.id || item.product.name;
          const price = item.product.price;

          // Lookup cost price from store if missing on item
          const matchedProd = storeProducts.find(
            (p) => (item.product.id && p.id === item.product.id) ||
                   (p.name && item.product.name && p.name.trim().toLowerCase() === item.product.name.trim().toLowerCase())
          );
          const cost = item.product.costPrice ?? matchedProd?.costPrice ?? 0;
          const cuanPerUnit = Math.max(0, price - cost);
          const itemOmset = price * item.quantity;
          const itemProfit = cuanPerUnit * item.quantity;

          if (!itemMap[key]) {
            itemMap[key] = {
              id: key,
              name: item.product.name,
              unit: item.product.unit || 'pcs',
              qty: 0,
              price,
              costPrice: cost,
              omset: 0,
              profit: 0,
            };
          }

          itemMap[key].qty += item.quantity;
          itemMap[key].omset += itemOmset;
          itemMap[key].profit += itemProfit;

          totalOmset += itemOmset;
          totalQty += item.quantity;
          totalProfit += itemProfit;

          txCatQty += item.quantity;
          txCatAmount += itemOmset;
        }
      });

      if (txCatQty > 0) {
        txList.push({
          tx,
          categoryItemsQty: txCatQty,
          categoryItemsAmount: txCatAmount,
        });
      }
    });

    const sortedProducts = Object.values(itemMap).sort((a, b) => b.omset - a.omset);

    return {
      productList: sortedProducts,
      matchingTransactions: txList,
      totalCategoryOmset: totalOmset,
      totalCategoryQty: totalQty,
      totalCategoryProfit: totalProfit,
    };
  }, [filteredTransactions, categoryName, storeProducts]);

  // Filtered products for search
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return productList;
    return productList.filter((p) => p.name.toLowerCase().includes(q));
  }, [productList, searchTerm]);

  // Filtered transactions for search
  const filteredTxList = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return matchingTransactions;
    return matchingTransactions.filter(
      (m) =>
        m.tx.invoiceNumber.toLowerCase().includes(q) ||
        (m.tx.customerName && m.tx.customerName.toLowerCase().includes(q)) ||
        (m.tx.cashierName && m.tx.cashierName.toLowerCase().includes(q))
    );
  }, [matchingTransactions, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#f8fafc] rounded-[28px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md bg-gradient-to-tr from-[#a62512] to-[#eb4b2b] shadow-[#a62512]/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a62512] bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                  Rincian Kategori
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
                {categoryName}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Periode: {periodLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200/80">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
              <span className="text-[10px] font-bold text-slate-500 block">Total Omset</span>
              <span className="text-xs sm:text-sm font-black text-[#a62512] mt-0.5 block truncate">
                {formatRupiah(totalCategoryOmset)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-center">
              <span className="text-[10px] font-bold text-slate-500 block">Total Terjual</span>
              <span className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 block truncate">
                {totalCategoryQty} pcs
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-center">
              <span className="text-[10px] font-bold text-emerald-800 block">Total Keuntungan</span>
              <span className="text-xs sm:text-sm font-black text-emerald-700 mt-0.5 block truncate">
                {formatRupiah(totalCategoryProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Tab & Search Bar */}
        <div className="p-3 sm:p-4 pb-2 space-y-2.5 bg-white border-b border-slate-200/60">
          {/* Tab buttons */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('PRODUCTS')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'PRODUCTS'
                  ? 'bg-white text-[#a62512] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Per Barang ({productList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TRANSACTIONS')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'TRANSACTIONS'
                  ? 'bg-white text-[#a62512] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Daftar Nota ({matchingTransactions.length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'PRODUCTS' ? 'Cari nama produk...' : 'Cari nomor nota atau kasir...'}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#a62512] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {activeTab === 'PRODUCTS' ? (
            filteredProducts.length > 0 ? (
              <div className="space-y-2">
                {filteredProducts.map((p, idx) => {
                  const sharePct = totalCategoryOmset > 0 ? Math.round((p.omset / totalCategoryOmset) * 100) : 0;

                  return (
                    <div
                      key={p.id || idx}
                      className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 block leading-tight">
                            {p.name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium block">
                            Harga Jual: {formatRupiah(p.price)} / {p.unit}
                            {p.costPrice > 0 && ` • Modal: ${formatRupiah(p.costPrice)}`}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs sm:text-sm font-black text-[#a62512] block">
                            {formatRupiah(p.omset)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {p.qty} {p.unit} terjual
                          </span>
                        </div>
                      </div>

                      {/* Contribution progress bar */}
                      <div className="space-y-1 pt-1 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                          <span>Kontribusi terhadap kategori</span>
                          <span className="font-bold text-slate-700">{sharePct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#a62512] transition-all duration-500"
                            style={{ width: `${sharePct}%` }}
                          />
                        </div>
                      </div>

                      {/* Profit estimate badge if available */}
                      {p.profit > 0 && (
                        <div className="flex items-center justify-between text-[10.5px] font-semibold text-emerald-800 bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-100">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-emerald-600" />
                            <span>Keuntungan Bersih:</span>
                          </span>
                          <span className="font-black text-emerald-700">{formatRupiah(p.profit)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-2">
                <Package className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Produk Tidak Ditemukan</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Tidak ada barang yang cocok dengan kata kunci pencarian.
                </p>
              </div>
            )
          ) : (
            filteredTxList.length > 0 ? (
              <div className="space-y-2">
                {filteredTxList.map((m, idx) => {
                  const txDate = m.tx.createdAt ? m.tx.createdAt.split('T')[0] : '';
                  const txTime = m.tx.createdAt ? m.tx.createdAt.split('T')[1]?.slice(0, 5) : '';

                  return (
                    <div
                      key={m.tx.id || idx}
                      onClick={() => onOpenKantinReceipt?.(m.tx)}
                      className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-[#a62512]/60 hover:shadow-xs transition-all cursor-pointer group space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-[#a62512] transition-colors">
                              {m.tx.customerName || 'Pelanggan Umum'}
                            </span>
                            <span className="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {m.tx.paymentMethod}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mt-1">
                            <span className="flex items-center gap-0.5">
                              <Calendar className="w-3 h-3" />
                              {formatDate(txDate)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {txTime} WIB
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 font-medium text-slate-600">
                              <User className="w-3 h-3" />
                              {m.tx.cashierName || 'Kasir'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs sm:text-sm font-black text-[#a62512]">
                            {formatRupiah(m.categoryItemsAmount)}
                          </span>
                          <span className="text-[10px] text-slate-500 block font-medium">
                            {m.categoryItemsQty} pcs {categoryName}
                          </span>
                        </div>
                      </div>

                      {/* Items preview in this receipt */}
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 truncate max-w-[240px]">
                          {m.tx.items
                            .filter((i) => normalizeProductCategory(i.product.category).toLowerCase() === categoryName.toLowerCase())
                            .map((i) => `${i.product.name} (${i.quantity}x)`)
                            .join(', ')}
                        </span>
                        <span className="text-[#a62512] font-bold group-hover:underline flex items-center gap-0.5 shrink-0">
                          Lihat Nota
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-2xl border border-slate-200/80 p-6 space-y-2">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Nota Tidak Ditemukan</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Tidak ada transaksi yang cocok pada kategori ini.
                </p>
              </div>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200/80 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Total {filteredProducts.length} produk • {filteredTxList.length} nota
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
